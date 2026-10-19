# Feature Spec 07 — In-Silico Phage ART Construct Designer (Forward DNA Writing)

**Version:** 1.0  
**Priority:** 🔴 Critical  
**Effort Estimate:** 10 days  
**Status:** Not Started  
**Depends On:** Spec 01 (3D Viewer), existing `backend/modules/aart_modeler.py`

---

## 1. User-Facing Description

A researcher inputs a large therapeutic gene (e.g., 14 kb full-length dystrophin cDNA, 3.5 kb CFTR, 8 kb ABCA4) that is too large to fit into a single AAV capsid (~4.7 kb limit). The ART Writer automatically:

1. **Fragments** the gene into optimally sized tandem repeat subunits sized to the retron/ART reverse transcriptase processivity limit (~200 bp per unit for AART-type systems)
2. **Designs the phage ART array** — spacer sequences, repeat junctions, RT recognition hairpins, and primer binding sites
3. **Outputs a complete construct blueprint** — the full array FASTA, a graphical map, and a wet-lab protocol for ordering synthetic array fragments from IDT/Twist
4. **Estimates insertion efficiency** per cell type based on published ART titration curves

This replaces the need for AAV split-intein workarounds or dual-vector systems. The user clicks "Download FASTA" and immediately orders the construct.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    FRONTEND  (ArtResearchView.jsx)                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  "Forward Design" Tab  (new tab, alongside existing ART tabs)   │ │
│  │                                                                 │ │
│  │  [Gene Input Panel]        [ART System Selector]                │ │
│  │   • Textarea: paste gene   • Type I / II / III radio buttons    │ │
│  │   • Upload FASTA file      • Target cell type dropdown          │ │
│  │   • Gene name autocomplete • RT processivity slider (100-300bp) │ │
│  │                                                                 │ │
│  │  [Run ART Writer Button]                                        │ │
│  │                                                                 │ │
│  │  ─────────────────────────────────────────────────────────────  │ │
│  │                                                                 │ │
│  │  [Construct Map Panel]     [Fragment Table]                     │ │
│  │   • Linear SVG array map   • Unit#, Start, End, Length, GC%    │ │
│  │   • Color-coded by unit    • RT hairpin sequence per unit       │ │
│  │   • Junction indicators    • Spacer sequence                    │ │
│  │                                                                 │ │
│  │  [Efficiency Estimate]     [Export Panel]                       │ │
│  │   • Bar chart (cell types) • Download full array FASTA          │ │
│  │   • % insertion rate       • Download IDT plate order CSV       │ │
│  │   • Citation link          • Copy to Oligo Synthesizer          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
         │  POST /api/art/design-construct
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    BACKEND  (FastAPI)                                 │
│                                                                      │
│  router: backend/routers/art_router.py                               │
│  POST /api/art/design-construct                                      │
│    └── art_construct_designer.py                                     │
│         ├── fragment_gene()          ← BioPython SeqRecord chunker   │
│         ├── design_rt_hairpins()     ← secondary structure scoring   │
│         ├── design_spacers()         ← repeat junction logic         │
│         ├── assemble_array()         ← concatenate full array        │
│         ├── score_gc_balance()       ← flag low/high GC units        │
│         ├── estimate_efficiency()    ← lookup table from literature  │
│         └── export_fasta()           ← BioPython SeqIO write         │
│                                                                      │
│  GET  /api/art/design-construct/{job_id}   ← poll async job         │
│  GET  /api/art/export-fasta/{job_id}       ← download FASTA         │
│  GET  /api/art/export-idt-csv/{job_id}     ← IDT plate order CSV    │
└──────────────────────────────────────────────────────────────────────┘
         │  Async via Celery (same worker as scRNA-seq spec)
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                         │
│                                                                      │
│  SQLite table: art_constructs                                        │
│    id, job_id, gene_name, gene_length_bp, art_type,                 │
│    unit_count, array_fasta, efficiency_json,                         │
│    created_at, status                                                │
│                                                                      │
│  File storage: backend/data/art_exports/{job_id}/                   │
│    array.fasta, idt_order.csv, construct_map.svg                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Package / Version | Purpose |
|-------|-----------|-------------------|---------|
| Backend core | Python 3.11 | — | Runtime |
| Sequence operations | BioPython | `biopython>=1.83` | SeqRecord, SeqIO, chunking, GC content |
| Secondary structure prediction | ViennaRNA | `RNA` (conda `viennarna`) or `forgi` fallback | RT hairpin ΔG scoring |
| Async jobs | Celery + Redis | `celery>=5.3`, `redis>=5.0` | Heavy jobs off main thread |
| Database | SQLite via SQLAlchemy | `sqlalchemy>=2.0` | `art_constructs` table |
| Array assembly | Custom logic | Part of `art_construct_designer.py` | Junction rules, spacer design |
| Construct map export | svgwrite | `svgwrite>=1.4` | Generate linear construct SVG |
| IDT CSV export | csv (stdlib) | — | IDT plate order format |
| Frontend: file upload | react-dropzone | `react-dropzone>=11.7` | FASTA drag-drop |
| Frontend: chart | Recharts | `recharts>=2.9` | Efficiency bar chart |
| Frontend: gene viz | Custom SVG renderer | (in-component) | Inline linear map |

---

## 4. ART Biology Design Rules

### 4.1 Fragmentation Algorithm

```
Input gene: N base pairs

1. Determine unit_size = user-selected RT processivity (default: 200 bp)
2. total_units = ceil(N / unit_size)
3. For each unit i:
   a. start = i * unit_size
   b. end   = min(start + unit_size, N)
   c. Adjust boundaries to avoid cutting within codons (align to codon frame)
   d. Extract subsequence: unit_seq[i] = gene[start:end]
4. Score each unit:
   a. gc = GC_content(unit_seq[i])
   b. Flag if gc < 0.35 or gc > 0.70 (warn user, but don't block)
```

### 4.2 RT Hairpin Design (per unit)

Each unit requires a 3′ RT recognition hairpin (modeled after the AART paper by Yarnall et al., 2023, Nature):

```
Structure:  5'--[UNIT_SEQ]--[STEM_LOOP_HAIRPIN]--[PBS]--3'
                              ↑ 6-8 bp stem
                              ↑ 4 nt loop
                              ↑ Tm target: 52-58°C

Hairpin design:
  stem = reverse_complement(unit_seq[-6:])[:6]  ← last 6 bp of unit annealed back
  loop = "TTTT"                                  ← standard loop
  full_hairpin = stem + loop + reverse_complement(stem)
  PBS = "TTTTTTTTTTTTT"                         ← primer binding site (13 nt polyT)
```

### 4.3 Spacer / Junction Design

Between every two consecutive units, insert a 20 bp spacer:

```
spacer_seq = design_spacer(unit_i, unit_i+1)
Rules:
  - No homology >8bp to flanking unit sequences
  - No secondary structure (ΔG > -2 kcal/mol by Vienna check)
  - GC: 40-60%
  - No BsaI, BsmBI, BbsI restriction sites (for Golden Gate compatibility)
```

### 4.4 Full Array Assembly

```
array = ""
for i in range(total_units):
    array += unit_seq[i]
    array += rt_hairpin[i]
    if i < total_units - 1:
        array += spacer[i]

array_length = len(array)
```

### 4.5 Efficiency Lookup Table

From published literature (Yarnall et al. 2023, Anzalone et al. 2022):

| Cell Type | ART Type I | ART Type II | ART Type III |
|-----------|-----------|------------|--------------|
| HEK293T | 12% | 8% | 22% |
| Primary T cells | 4% | 2% | 9% |
| iPSC | 3% | 1% | 7% |
| Primary hepatocytes | 6% | 4% | 11% |
| Airway organoids | 5% | 3% | 8% |

Stored in `backend/data/art_efficiency_table.json`.

---

## 5. Backend Module Design

### `backend/modules/art_construct_designer.py`

```python
from Bio import SeqIO
from Bio.SeqUtils import gc_fraction
from Bio.Seq import Seq
import svgwrite

def fragment_gene(
    gene_seq: str,
    unit_size: int = 200,
    codon_align: bool = True
) -> list[dict]:
    """
    Split gene into processivity-sized units.
    Returns: list of {unit_index, start, end, sequence, gc_pct, warnings}
    """

def design_rt_hairpin(unit_seq: str) -> dict:
    """
    Design RT recognition hairpin for a single unit.
    Returns: {hairpin_seq, stem, loop, pbs, predicted_tm, delta_g}
    Uses ViennaRNA RNA.fold() for ΔG calculation.
    Fallback: skip ΔG if viennarna not installed, warn user.
    """

def design_spacer(
    upstream_unit: str,
    downstream_unit: str,
    avoid_sites: list[str] = GOLDEN_GATE_SITES
) -> str:
    """
    Design inter-unit spacer sequence.
    Returns: spacer_seq (20 bp)
    Checks: GC%, no restriction sites, no homology >8bp to flanks.
    """

def assemble_array(
    units: list[dict],
    hairpins: list[dict],
    spacers: list[str]
) -> dict:
    """
    Concatenate: unit + hairpin + spacer for each unit.
    Returns: {array_seq, array_length, unit_boundaries}
    """

def score_gc_balance(array_seq: str, window: int = 100) -> list[dict]:
    """
    Sliding window GC content across full array.
    Returns: list of {position, gc_pct, warning} for visualization.
    """

def estimate_efficiency(
    art_type: str,
    cell_type: str
) -> dict:
    """
    Lookup efficiency from backend/data/art_efficiency_table.json.
    Returns: {cell_type, art_type, efficiency_pct, citation}
    """

def export_fasta(
    array_seq: str,
    units: list[dict],
    job_id: str,
    gene_name: str
) -> str:
    """
    Write multi-record FASTA: first record = full array, then each unit.
    Returns: file path to backend/data/art_exports/{job_id}/array.fasta
    """

def export_idt_csv(units: list[dict], hairpins: list[dict], job_id: str) -> str:
    """
    Write IDT plate-order CSV with columns:
    Name, Sequence, Scale, Purification
    Each unit + hairpin pair is one oligo row.
    Returns: file path to backend/data/art_exports/{job_id}/idt_order.csv
    """

def generate_construct_svg(
    units: list[dict],
    spacers: list[str],
    job_id: str
) -> str:
    """
    Draw a linear construct map using svgwrite.
    Color each unit alternately blue/teal, hairpins orange, spacers grey.
    Returns: file path to backend/data/art_exports/{job_id}/construct_map.svg
    """

async def design_construct_job(payload: dict) -> dict:
    """
    Orchestrate full pipeline:
    1. fragment_gene()
    2. design_rt_hairpin() per unit
    3. design_spacer() between units
    4. assemble_array()
    5. score_gc_balance()
    6. estimate_efficiency() for all cell types
    7. export_fasta(), export_idt_csv(), generate_construct_svg()
    8. Write result to art_constructs table
    Returns: {job_id, status, summary, file_paths}
    """
```

### `backend/routers/art_router.py` (extend existing)

```python
@router.post("/api/art/design-construct")
async def design_construct(payload: ArtDesignPayload, background_tasks: BackgroundTasks):
    """Submit async ART construct design job."""

@router.get("/api/art/design-construct/{job_id}")
async def get_construct_result(job_id: str):
    """Poll job status and retrieve results."""

@router.get("/api/art/export-fasta/{job_id}")
async def export_fasta_download(job_id: str):
    """Stream FASTA file download."""

@router.get("/api/art/export-idt-csv/{job_id}")
async def export_idt_csv_download(job_id: str):
    """Stream IDT CSV file download."""
```

### Pydantic Models

```python
class ArtDesignPayload(BaseModel):
    gene_sequence: str          # raw nucleotide string or FASTA
    gene_name: str
    art_type: Literal["I", "II", "III"]
    cell_type: str
    unit_size: int = 200        # bp, 100–300
    codon_align: bool = True

class ArtDesignResult(BaseModel):
    job_id: str
    status: str
    gene_name: str
    gene_length_bp: int
    unit_count: int
    array_length_bp: int
    units: list[UnitDetail]
    efficiency_estimates: list[EfficiencyEstimate]
    file_paths: dict[str, str]
    warnings: list[str]
```

---

## 6. Database Schema

```sql
CREATE TABLE art_constructs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id          TEXT UNIQUE NOT NULL,
    gene_name       TEXT NOT NULL,
    gene_length_bp  INTEGER NOT NULL,
    art_type        TEXT CHECK(art_type IN ('I','II','III')),
    unit_size_bp    INTEGER DEFAULT 200,
    unit_count      INTEGER,
    array_length_bp INTEGER,
    array_fasta     TEXT,              -- full FASTA string (compressed)
    efficiency_json TEXT,              -- JSON of efficiency estimates
    warnings_json   TEXT,
    status          TEXT DEFAULT 'pending',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at    DATETIME
);
```

---

## 7. Frontend Component Design

### `frontend/src/components/ArtResearchView.jsx` — "Forward Design" tab

```
┌─────────────────────────────────────────────────────────────────┐
│  ART Research View                                               │
│  [ART Overview] [Literature] [Forward Design ← NEW TAB]         │
└─────────────────────────────────────────────────────────────────┘

Forward Design Tab layout:

┌──────────────────────┬──────────────────────────────────────────┐
│  Gene Input          │  ART System Configuration                │
│  ──────────────────  │  ──────────────────────────────────────  │
│  Gene name: [_____]  │  System type: (•) I  ( ) II  ( ) III     │
│                      │  Cell type:   [HEK293T          ▼]       │
│  ┌──────────────────┐│  RT processivity: ──●────────── 200 bp   │
│  │ Paste gene here  ││  [100bp]                    [300bp]      │
│  │ (FASTA or plain) ││                                          │
│  │                  ││  Codon alignment: [✓] preserve frame     │
│  │                  ││                                          │
│  └──────────────────┘│                                          │
│  or [📁 Upload FASTA]│                                          │
│                      │                                          │
│  [🧬 Design Construct]                                          │
└──────────────────────┴──────────────────────────────────────────┘

After result loads:

┌─────────────────────────────────────────────────────────────────┐
│  📊 Construct Summary                                            │
│  Gene: DYSTROPHIN (14,272 bp) → 72 units @ 200bp each           │
│  Array total: 18,432 bp  |  ⚠ 3 GC warnings                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Linear Construct Map (SVG inline)                               │
│  ┌──┐⊕┌──┐⊕┌──┐⊕┌──┐⊕ ... ┌──┐                                │
│  │U1│ │U2│ │U3│ │U4│       │U72│                               │
│  └──┘ └──┘ └──┘ └──┘       └──┘                                │
│  [Blue=unit] [Orange=hairpin] [Grey=spacer]                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┬──────────────────────────────────┐
│  Fragment Table              │  Estimated Insertion Efficiency   │
│  ┌──────────────────────────┐│  ┌──────────────────────────────┐│
│  │ # │ Start │ End │ GC%    ││  │ Cell Type      │ ART III     ││
│  │ 1 │ 0     │ 200 │ 52%    ││  │ HEK293T        │ ██████ 22% ││
│  │ 2 │ 200   │ 400 │ 48%    ││  │ Primary T cell │ ███░░░  9% ││
│  │ 3 │ 400   │ 600 │ ⚠ 31% ││  │ iPSC           │ ██░░░░  7% ││
│  └──────────────────────────┘│  └──────────────────────────────┘│
└──────────────────────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Export                                                          │
│  [⬇ Download Full Array FASTA]  [⬇ IDT Plate Order CSV]        │
│  [→ Send to Oligo Synthesizer]  [→ Send to Synthesis API]       │
└─────────────────────────────────────────────────────────────────┘
```

### New frontend files needed

| File | Purpose |
|------|---------|
| `frontend/src/components/art/ForwardDesignTab.jsx` | New tab component |
| `frontend/src/components/art/ConstructMap.jsx` | SVG linear map renderer |
| `frontend/src/components/art/FragmentTable.jsx` | Unit detail table |
| `frontend/src/components/art/EfficiencyChart.jsx` | Bar chart (Recharts) |
| `frontend/src/hooks/useArtDesigner.js` | API call hook, job polling |

---

## 8. Integration Points with Existing Code

| Existing File | How It Integrates |
|---------------|-------------------|
| `backend/modules/aart_modeler.py` | Existing AART reverse design logic — `art_construct_designer.py` calls `aart_modeler.get_efficiency_model()` for cell-type parameters |
| `backend/routers/art_router.py` | Add new endpoints to existing file (don't replace) |
| `frontend/src/components/ArtResearchView.jsx` | Add "Forward Design" as 3rd tab; don't touch existing tabs |
| `backend/modules/oligo_synthesizer.py` | "Send to Oligo Synthesizer" button passes fragment list to existing synthesizer module |
| Spec 08 (Synthesis API) | "Send to Synthesis API" button triggers IDT direct order checkout |
| SQLite `genom.db` | Add `art_constructs` table via new migration script |

---

## 9. Day-by-Day Execution Plan

| Day | Task |
|-----|------|
| 1 | Install `biopython`, `svgwrite`. Set up `art_constructs` DB table migration. Scaffold `art_construct_designer.py` with stub functions. |
| 2 | Implement `fragment_gene()` with codon-frame alignment. Unit tests with short toy gene. |
| 3 | Implement `design_rt_hairpin()` + ViennaRNA integration. Fallback if ViennaRNA absent. |
| 4 | Implement `design_spacer()` with restriction site checker. Implement `assemble_array()`. |
| 5 | Implement `score_gc_balance()`, `estimate_efficiency()`, `export_fasta()`, `export_idt_csv()`. |
| 6 | Implement `generate_construct_svg()` using svgwrite. REST endpoints in `art_router.py`. |
| 7 | Build `ForwardDesignTab.jsx` — gene input panel + ART config panel. |
| 8 | Build `ConstructMap.jsx` SVG inline renderer, `FragmentTable.jsx`. |
| 9 | Build `EfficiencyChart.jsx` (Recharts), `useArtDesigner.js` hook with polling. Export buttons. |
| 10 | End-to-end test: 14kb dystrophin cDNA → full array output. Fix GC warnings display. Push. |

---

## 10. Key References

- Yarnall, M.T.N. et al. (2023) "Drag-and-drop genome insertion of large sequences without double-strand DNA cleavage using CRISPR-directed integrases." *Nature Biotechnology.*  
- Anzalone, A.V. et al. (2022) "Programmable deletion, replacement, integration and inversion of large DNA sequences with twin prime editing." *Nature Biotechnology.*  
- AART system: Sequence-specific reverse transcriptases for genomic writing.
