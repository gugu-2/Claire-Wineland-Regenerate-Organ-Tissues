# Feature Spec 01 — True Atomistic WebGL 3D Molecular Viewer

> **Status:** Not Started  
> **Priority:** 🔴 Sprint 1 (First to Build)  
> **Estimated Effort:** 5–7 development days  
> **Replaces:** The current CSS/SVG cartoon in `frontend/src/components/playground/MolecularViewer.jsx`

---

## 1. What This Does for the User

Right now, when a researcher goes to the Playground (Tab 9) → Mode 2 (3D Molecular Viewer), they see an abstract animated blob that spins. It conveys zero scientific information.

**After this feature is built**, the researcher will:
- See the actual physical crystal structure of the Cas9 protein with the guide RNA inserted into the binding channel, wrapped around target DNA.
- Rotate, zoom, and pan the molecule with their mouse or touchpad.
- Click on the **PAM recognition site** (the NGG sequence) and have it glow and display a tooltip: "NGG PAM — 3'-end recognition; required for Cas9 to bind."
- Click on the **catalytic cut sites** (RuvC domain on the non-target strand; HNH domain on the target strand) and see the specific amino acid residues responsible for cutting.
- See the patient's **somatic mutation** (e.g., the G→A change in KRAS G12D) highlighted in amber on the target DNA strand with a label showing its effect.
- Measure the physical distance between the guide RNA and the mutation in Ångströms.
- Switch between visualization modes: **Ribbon/Cartoon** (shows protein secondary structure), **Space-Fill** (shows physical atom volumes), and **Surface** (shows electrostatic potential).

---

## 2. System Architecture

```
+-----------------------------------------------------------------------+
|                    BROWSER (React 18 SPA)                             |
|                                                                       |
|  [MolecularViewer.jsx]                                                |
|       |                                                               |
|       |-- useEffect: fetch PDB file from RCSB API                    |
|       |       URL: https://files.rcsb.org/download/4ZT0.cif          |
|       |                                                               |
|       |-- Pass .cif text data to Mol* Viewer                        |
|       |       molstar.init(containerDiv, pdbData)                    |
|       |                                                               |
|       |-- After load, call viewer API to:                            |
|              highlight(residues: [HIS840, ASP10])  -- catalytic      |
|              highlight(chain: 'C', pos: 20)        -- PAM site       |
|              annotate(chain: 'B', pos: 12)         -- mutation pos   |
|                                                                       |
|  [WebGL Canvas] <-- Mol* renders everything here natively            |
|       |                                                               |
|  [Control Panel UI]                                                   |
|       Buttons: Ribbon | Space-Fill | Surface | Reset View            |
|       Toggles: Show Guide RNA | Show PAM | Show Mutation Site         |
|       Display: Distance Ruler (Ångström readout)                     |
+-----------------------------------------------------------------------+
            |
            | (No backend needed for basic PDB file fetch)
            |
+-----------------------------------------------------------------------+
|  RCSB PDB CDN (External)                                             |
|  https://files.rcsb.org/download/{PDB_ID}.cif                        |
|  (Files are public, no API key needed, <5MB per structure)           |
+-----------------------------------------------------------------------+
            |
            | (Optional: backend can cache or provide custom structures)
            |
+-----------------------------------------------------------------------+
|  BACKEND (Optional Endpoint)                                         |
|  GET /api/structure/{pdb_id}                                         |
|  - Fetches from RCSB, caches locally in api_cache table              |
|  - Returns: raw .cif file bytes                                      |
|  - Prevents CORS issues, allows offline mode                         |
+-----------------------------------------------------------------------+
```

---

## 3. Technology Stack

### Core 3D Rendering Engine — Mol* (Molstar)

| Item | Detail |
|------|--------|
| **Library** | `molstar` (the industry-standard open-source WebGL molecular viewer) |
| **npm package** | `npm install molstar` |
| **Version** | `molstar@^4.x.x` (latest stable) |
| **Why Mol*?** | Used by RCSB PDB official website, UniProt, AlphaFold DB. Battle-tested against millions of molecular structures. Supports CIF, PDB, mmCIF, SDF, MOL2. Superior performance over 3Dmol.js for large macromolecular complexes. |
| **Alternatives considered** | `3dmol.js` (simpler API but less performant for large complexes), `NGL Viewer` (deprecated), `Speck.js` (beautiful but limited interaction) |
| **License** | MIT (free for commercial and research use) |

### Structure File Formats

| Format | Description | Use |
|--------|-------------|-----|
| `.cif` / `.mmCIF` | Crystallographic Information File (modern standard) | Primary format for Mol* |
| `.pdb` (legacy) | Older format, max 99,999 atoms | Fallback for older structures |
| `.bcif` | Binary CIF (compressed, faster loading) | Preferred for large complexes |

### Key PDB Structures to Pre-Load

| PDB ID | Molecule | Resolution | Why Important |
|--------|----------|------------|----------------|
| `4ZT0` | SpCas9 + sgRNA + target DNA | 2.5 Å | Primary structure for CRISPR visualization |
| `6O0Y` | AsCas12a + crRNA + target DNA | 2.7 Å | Shows Cas12a staggered cut mechanism |
| `6MCB` | SaCas9 + sgRNA + target DNA | 2.6 Å | Shows compact SaCas9 for AAV delivery |
| `7T2E` | SpCas9 Base Editor (CBE) + DNA | 3.1 Å | Shows deaminase domain architecture |

### Additional npm Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `molstar` | `^4.6.0` | Core molecular viewer |
| `immer` | `^10.x` | Immutable state updates for viewer selections |
| `zustand` | `^4.x` | Lightweight state store for viewer mode & highlights |
| `@radix-ui/react-toggle-group` | `^1.x` | Accessible button group for Ribbon/SpaceFill/Surface toggle |

### Backend (Optional Caching)

| Tool | Purpose |
|------|---------|
| `httpx` (Python) | Async HTTP client to fetch PDB files from RCSB |
| `aiofiles` | Write structure files to local cache asynchronously |
| SQLite `api_cache` table | Already exists; reuse it to cache .cif text by PDB ID |

---

## 4. Data Flow — Step by Step

```
STEP 1:  User opens Playground Tab 9 → Clicks "3D Molecular Viewer"
         ↓
STEP 2:  MolecularViewer.jsx mounts and calls:
         fetch('https://files.rcsb.org/download/4ZT0.cif')
         (OR: fetch('/api/structure/4ZT0') which returns cached version)
         ↓
STEP 3:  .cif file (~4MB) arrives as text blob in browser memory
         ↓
STEP 4:  Mol* PluginContext is initialized on a <div ref={viewerRef}>:
         const plugin = createPluginAsync(viewerRef.current, {
           renderer: { backgroundColor: Color(0x080c14) },
           layout: { initial: { isExpanded: false } }
         });
         ↓
STEP 5:  Structure is loaded into Mol*:
         const data = await plugin.builders.data.rawData(cifText, { label: 'SpCas9-sgRNA-DNA' });
         const trajectory = await plugin.builders.structure.parseTrajectory(data, 'mmcif');
         await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default');
         ↓
STEP 6:  Post-load highlights are applied:
         - Catalytic residues (HIS840, ASP10) → colored RED
         - PAM recognition residues (ARG1333, ARG1335) → colored GREEN
         - sgRNA strand (chain B) → colored ORANGE
         - Target DNA strand (chain C) → colored CYAN
         - Patient mutation position (calculated from guide alignment) → colored AMBER
         ↓
STEP 7:  User interacts:
         - Left-click-drag → rotate
         - Right-click-drag → pan
         - Scroll wheel → zoom
         - Click on atom → shows tooltip with amino acid name, chain, residue number
         - Distance tool → click 2 atoms → ruler appears showing Ångström distance
```

---

## 5. Backend Module Design

### New File: `backend/modules/structure_fetcher.py`

```
FUNCTION: fetch_pdb_structure(pdb_id: str) -> str
  INPUT:  pdb_id (e.g., "4ZT0")
  OUTPUT: Raw .cif text content as string

  ALGORITHM:
    1. Check api_cache table for key = f"pdb_structure_{pdb_id}"
    2. If found and not expired (TTL: 7 days) → return cached text
    3. If not found:
       a. Call RCSB API: GET https://files.rcsb.org/download/{pdb_id}.cif
       b. Store in api_cache table
       c. Return text

FUNCTION: get_structure_annotations(pdb_id: str, guide_seq: str) -> dict
  INPUT:  pdb_id, 20nt guide RNA sequence
  OUTPUT: {
    catalytic_residues: [{ chain, residue_number, label }],
    pam_residues: [{ chain, residue_number, label }],
    guide_chains: ["B"],
    dna_chains: ["C", "D"],
    patient_mutation_position: { chain: "C", residue_number: 12, label: "G12D" }
  }
  
  PURPOSE: Tells the frontend exactly which atoms/residues to highlight
  
FUNCTION: get_structure_metadata(pdb_id: str) -> dict
  OUTPUT: {
    title: "Crystal structure of Streptococcus pyogenes Cas9",
    resolution_angstrom: 2.5,
    deposition_date: "2015-08-26",
    organism: "Streptococcus pyogenes",
    method: "X-RAY DIFFRACTION",
    chains: { A: "Cas9 protein", B: "sgRNA", C: "Target DNA", D: "Non-target DNA" }
  }
```

### New FastAPI Endpoint in `backend/main.py`

```
GET  /api/structure/{pdb_id}
     → Returns: { cif_data: "<raw .cif text>", metadata: {...}, annotations: {...} }

GET  /api/structure/{pdb_id}/annotations?guide_seq={seq}
     → Returns: annotations dict for the given guide sequence
```

---

## 6. Frontend Component Design

### Updated File: `frontend/src/components/playground/MolecularViewer.jsx`

```
STATE VARIABLES:
  - viewerPlugin: Mol* PluginContext instance (stored in useRef)
  - representationMode: 'ribbon' | 'spacefill' | 'surface'
  - loadingState: 'idle' | 'fetching' | 'parsing' | 'ready' | 'error'
  - activeHighlights: { catalytic: bool, pam: bool, guide: bool, mutation: bool }
  - selectedAtom: { chain, residue, name } | null
  - pdbId: string (default '4ZT0', can be changed by user)
  - distanceMeasurement: { atom1, atom2, angstroms } | null

PROPS ACCEPTED:
  - guideSeq: string (20nt, comes from active CRISPR guide selection)
  - mutationLabel: string (e.g., "G12D")
  - pdbId: string (optional override)

UI LAYOUT:
  ┌─────────────────────────────────────────────────────────────────────┐
  │ [Ribbon] [Space-Fill] [Surface]    PDB: 4ZT0    Resolution: 2.5 Å  │
  │ ──────────────────────────────────────────────────────────────────  │
  │                                                                     │
  │              [3D WebGL CANVAS — Mol* renders here]                  │
  │              (occupies full height: 500px min)                      │
  │                                                                     │
  ├─────────────────────────────────────────────────────────────────────┤
  │ HIGHLIGHTS:  [✔ Catalytic Sites]  [✔ PAM Region]                   │
  │              [✔ sgRNA Guide]      [✔ Patient Mutation]             │
  │              [Distance Ruler ↔ Click 2 atoms]                      │
  ├─────────────────────────────────────────────────────────────────────┤
  │ ATOM TOOLTIP (when atom clicked):                                   │
  │  Residue: HIS840 | Chain: A (Cas9) | Role: HNH Catalytic Domain    │
  │  Distance to mutation: 14.3 Å                                      │
  └─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Integration With Existing Code

- **Playground Tab:** `PlaygroundView.jsx` already has a `mode: 'molecular'` tab. Replace the import of the old `MolecularViewer.jsx` with the new one — zero routing changes needed.
- **Guide Context:** When the user selects a guide RNA in Tab 2 (CRISPR Designer), the selected guide's 20nt sequence is stored in App.jsx global state. Pass it as `guideSeq` prop to `MolecularViewer.jsx`.
- **Vite Config:** The Mol* library uses WebAssembly. Add to `vite.config.js`:
  ```js
  optimizeDeps: { exclude: ['molstar'] }
  server: { headers: { 'Cross-Origin-Embedder-Policy': 'require-corp' } }
  ```

---

## 8. Execution Plan

| Day | Task |
|-----|------|
| **Day 1** | Install `molstar` npm package. Create a bare-minimum React wrapper that loads a hard-coded `.cif` URL and renders the Mol* canvas. Confirm WebGL loads in Vite dev server. |
| **Day 2** | Implement `structure_fetcher.py` backend module and `/api/structure/{pdb_id}` endpoint. Wire frontend to fetch through backend (avoids CORS). |
| **Day 3** | Apply post-load highlight logic for catalytic residues (HNH His840, RuvC Asp10), PAM site residues, and sgRNA chain. |
| **Day 4** | Add representation mode toggle (Ribbon / Space-Fill / Surface) using Mol* API calls. |
| **Day 5** | Implement atom click handler → show tooltip overlay with residue info. Implement distance measurement tool. |
| **Day 6** | Connect to App.jsx global state: pick up the active guide sequence and automatically highlight it on the DNA strand. |
| **Day 7** | Performance testing with large complexes. Fine-tune loading states, error handling if RCSB is unavailable, fallback to cached file. |
