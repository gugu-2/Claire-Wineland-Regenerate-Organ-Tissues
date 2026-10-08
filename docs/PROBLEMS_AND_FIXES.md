# PROBLEMS_AND_FIXES.md — Known Issues, Gaps, and How to Fix Them

> This document is honest. Every real problem in the codebase is listed here,
> with enough detail to fix it without starting over.
>
> Priority levels: 🔴 Critical | 🟡 Important | 🟢 Enhancement

---

## Part A — Simulation / Heuristic Code That Needs Real Science

These are places where we have placeholder or approximate logic that should be replaced with published algorithms.

---

### 🔴 PROBLEM 1: Off-Target Scanning Is Simulated, Not Real

**File:** `backend/modules/crispr_designer.py`, Lines 217-224

**What it does now:**
```python
# Generates only 3 manually constructed off-target variants
simulated_off_targets = [
    (ref_guide[:2] + ("A" if ref_guide[2] != "A" else "T") + ref_guide[3:], "TGG"),
    (ref_guide[:6] + ("G" if ref_guide[6] != "G" else "C") + ref_guide[7:], "TGG"),
    (ref_guide[:17] + ("C" if ref_guide[17] != "C" else "A") + ref_guide[18:], "NAG"),
]
```

**Why it's wrong:** A real off-target scan checks millions of genomic loci, not 3 hand-crafted ones. This means the CFD specificity score is meaningless as an absolute safety metric — it's only useful as a relative comparison between guides with the same simulated variants.

**How to fix it — Option A (Easy, Recommended):**
Integrate with **CRISPOR** (Python-based, no external binary required):
```python
# Install: pip install crispor
import crispor
results = crispor.getOfftargets(guide_seq, genome="hg38", pam="NGG")
```

**How to fix it — Option B (Better, Requires Tool):**
Use **Cas-OFFinder** binary:
```python
# Write guides to temp file, call binary, parse output
import subprocess, tempfile
# cas-offinder input.txt GRCh38.fa 2 output.txt
```

**How to fix it — Option C (Best, Cloud-based):**
Call the **CRISPOR web API**:
```
POST https://crispor.tefor.net/crispor.py
params: seq=<guide>, org=hg38, pam=NGG
```

**Hint:** The background job infrastructure is already set up perfectly for this (SQLite-backed async job). Just replace the simulation body in `run_cas_offinder_background()`.

---

### 🔴 PROBLEM 2: Knowledge Copilot Has No Real LLM

**File:** `backend/modules/knowledge_copilot.py`, Lines 133-146

**What it does now:**
```python
# Comment in code:
# "Since we don't have a local LLM in this environment, we simulate the LLM's synthesis"
# → just formats retrieved RAG chunks into a string
```

**Why it's wrong:** A researcher asks "Why does KRAS G12D resist cetuximab?" and gets back a formatted list of retrieved literature snippets, not a synthesized answer. It doesn't reason. It doesn't connect ideas. It doesn't generate new insights.

**How to fix it:**

Option A — **Google Gemini API** (free tier available):
```python
import google.generativeai as genai
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-pro")
response = model.generate_content(
    f"You are an oncology research copilot. Context:\n{joined_context}\n\nQuestion: {query_text}\n\nAnswer:"
)
synthesis = response.text
```

Option B — **Ollama (local, no API key)**:
```python
import requests
resp = requests.post("http://localhost:11434/api/generate", json={
    "model": "llama3.2", 
    "prompt": f"Context:\n{joined_context}\n\nQuestion: {query_text}",
    "stream": False
})
synthesis = resp.json()["response"]
```

**Hint:** Add `GEMINI_API_KEY` and `OLLAMA_URL` to `.env.example`. Check for Gemini key first, fall back to Ollama, fall back to current format.

---

### 🟡 PROBLEM 3: MSI Detection Is a Heuristic, Not a Statistical Model

**File:** `backend/modules/tumor_genomics.py`, Lines 170-193

**What it does now:**
```python
# Heuristic: if indel fraction > 0.30 → likely MSI-H
# This is an approximation, not a validated algorithm
```

**Why it's wrong:** MSI status is an FDA-approved biomarker that determines immunotherapy eligibility (pembrolizumab). Getting it wrong could exclude a patient from life-saving treatment. The real algorithm requires repeat region analysis.

**How to fix it:**
The published statistical method uses microsatellite repeat loci directly:
```python
# From the MSIsensor-pro paper (Jia et al. 2020):
# MSI score = (number of unstable microsatellite sites) / (total sites analyzed)
# Threshold: score > 0.20 → MSI-H
MSI_LOCI = [
    # Published panel of 40 microsatellite sites from Bethesda panel
    {"chrom": "chr2", "pos": 47641560, "repeat": "T", "length": 26},  # BAT26
    {"chrom": "chr2", "pos": 47641560, "repeat": "A", "length": 25},  # BAT25
    # ... 38 more
]
```

**Hint:** You can implement a simplified version by adding a `microsatellite_repeat_scan()` function that checks VAF variance at known repeat loci. This is far better than the current indel-fraction heuristic.

---

### 🟡 PROBLEM 4: Tumor Purity Is a VAF Mode Heuristic

**File:** `backend/modules/tumor_genomics.py`, Lines 299-329

**What it does now:**
```python
# "A simple heuristic: the peak of the heterozygous somatic variant VAF
# Distribution mode × 2 = estimated tumor purity"
method = "VAF distribution mode x 2 (heterozygous diploid heuristic)"
```

**Why it's wrong:** This ignores copy number variation, polyploidy, tumor heterogeneity, and subclonal populations. A highly aneuploid tumor will have completely wrong purity estimates.

**How to fix it:**
Use the **PURPLE algorithm** approach:
```python
# Step 1: Compute VAF histogram
# Step 2: Find dominant VAF peak (most clonal SNVs)
# Step 3: Apply copy-number correction: purity = VAF_peak × ploidy / (0.5 × ploidy)
# For diploid tumor: purity ≈ VAF_peak × 2
# For aneuploid: needs actual copy number from WGS depth

def estimate_purity_with_ploidy(vafs, ploidy=2.0):
    from statistics import mode, mean
    sorted_vafs = sorted(vafs)
    peak_vaf = max(set([round(v, 1) for v in sorted_vafs]), 
                   key=[round(v, 1) for v in sorted_vafs].count)
    purity = min(1.0, peak_vaf * ploidy)
    return purity
```

---

### 🟡 PROBLEM 5: Variant Annotation Coordinate Mapping Uses a Heuristic Fallback

**File:** `backend/modules/variant_annotation.py`, Line 170

**What it does now:**
```python
# "Coordinate heuristic for standard benchmarks"
# Falls back to a linear offset estimate when Ensembl data is unavailable
```

**Why it's wrong:** Incorrect coordinate mapping causes variants to be annotated against the wrong genomic position, potentially mislabeling a pathogenic variant as benign.

**How to fix it:**
Ensure the Ensembl cache is always warm for the 4 benchmark genes before any annotation runs:
```python
# In main.py startup (on_startup):
for gene in ["CCR5", "HBB", "BRCA2", "KRAS", "TP53", "EGFR"]:
    fetch_gene_data_ensembl(gene)  # Populates cache at startup
```

---

## Part B — Empty Pass Statements (Silent Failures)

These are `pass` statements in exception handlers that swallow errors silently.

---

### 🔴 PROBLEM 6: `review_gate.py` Silently Drops File I/O Errors

**File:** `backend/modules/review_gate.py`, Lines 176, 209

**What it does now:**
```python
try:
    # file operations
except Exception:
    pass  # SILENT FAILURE — review data is lost
```

**Why it's wrong:** If the review file cannot be written (disk full, permissions), the expert's approval decision is silently lost. No error is returned to the frontend. The researcher thinks the review was saved.

**How to fix it:**
```python
import logging
logger = logging.getLogger(__name__)

except Exception as e:
    logger.error(f"Failed to save review data: {e}", exc_info=True)
    raise HTTPException(status_code=500, detail=f"Review save failed: {str(e)}")
```

---

### 🟡 PROBLEM 7: `somatic_variant_caller.py` Silently Falls Back on VAF Parse Failure

**File:** `backend/modules/somatic_variant_caller.py`, Lines 192, 201

**What it does now:**
```python
except (ValueError, IndexError):
    pass  # Returns 0.5 VAF (50%) as default — WRONG for most cases
```

**Why it's wrong:** When VAF cannot be parsed from the VCF FORMAT field, the function returns `0.5` (50% allele frequency). This makes every variant look like a dominant clone regardless of its actual frequency.

**How to fix it:**
```python
except (ValueError, IndexError) as e:
    logger.warning(f"VAF parse failed for variant: {e}. Returning None instead of 0.5.")
    return None  # Caller must handle missing VAF explicitly

# In the caller (call_somatic_variants):
vaf = _extract_vaf(vcf_parts)
if vaf is None:
    variant["vaf_parse_warning"] = "Could not parse VAF from FORMAT field; CCF estimate unreliable"
    vaf = 0.5  # Still use 0.5 but flag it clearly
```

---

## Part C — Missing Features That Have Placeholder Tables

These database tables exist but have no computation behind them.

---

### 🟡 PROBLEM 8: Neoantigen Table Exists But Is Never Populated

**File:** `backend/core/models.py`

**What exists:** The `NeoantigenPredictionModel` table is defined and created.

**What's missing:** No endpoint computes neoantigen predictions. No peptide-MHC binding prediction runs.

**Why it matters:** Neoantigens are the key to personalized cancer immunotherapy. If the platform can predict which mutations generate immunogenic peptides, it can suggest the exact tumor epitopes that should be targeted by the T-cell response — whether through vaccines, CAR-T design, or checkpoint blockade selection.

**How to fix it — Step 1 (Fast, MHC binding approximation):**
```python
# Karpathy-style simple affinity prediction using BLOSUM62 scores
def predict_neoantigen_affinity(peptide_9mer: str, hla_allele: str) -> float:
    # Load published IC50 binding data for common HLA alleles
    # NetMHCpan score approximation using position-specific scoring matrices
    ...
```

**How to fix it — Step 2 (Real, call NetMHCpan REST):**
```python
# NetMHCpan 4.1 REST API (free academic use):
resp = requests.post("https://services.healthtech.dtu.dk/services/NetMHCpan-4.1/",
    data={"peptide": peptide, "allele": "HLA-A*02:01"})
```

---

### 🟡 PROBLEM 9: The AART Endpoints Are Missing the `/api/` Prefix

**File:** `backend/main.py`

**What it does now:** ART endpoints are at `/aart/*` instead of `/api/aart/*`

```python
@app.post("/aart/scan-array")    # ← inconsistent
@app.get("/api/status")          # ← all other endpoints have /api/
```

**Why it's wrong:** When the Vite proxy is configured to forward `/api/*` to the backend, ART requests bypass the proxy entirely and hit the backend directly. This works in dev but will break in any production deployment behind a reverse proxy.

**How to fix it:**
```python
# In main.py, change all /aart/* to /api/aart/*
@app.post("/api/aart/scan-array")
@app.post("/api/aart/predict-rna-structure")
@app.post("/api/aart/analyze-locus")
@app.post("/api/aart/therapeutic-potential")
@app.get("/api/aart/reference")

# In frontend/src/services/api.js, update all:
const res = await fetch(`${API_BASE}/aart/reference`);
# → 
const res = await fetch(`${API_BASE}/aart/reference`);  # already uses API_BASE correctly
```

**Hint:** Also add `/api/aart` prefix to the `vite.config.js` proxy target.

---

## Part D — Frontend Issues

---

### 🟡 PROBLEM 10: No Error Boundaries — One Bad API Response Crashes the Whole Tab

**Files:** All component files

**What it does now:** If an API response contains unexpected structure (null fields, missing keys), a JavaScript `TypeError` propagates up and the entire tab goes blank with "Something went wrong" from React.

**How to fix it:**
Add a React Error Boundary around each tab:
```jsx
// components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return (
      <div className="p-8 text-red-400">
        <h2>Something went wrong in this tab</h2>
        <pre className="text-xs mt-2">{this.state.error?.message}</pre>
        <button onClick={() => this.setState({ hasError: false })}>Retry</button>
      </div>
    );
    return this.props.children;
  }
}

// In App.jsx, wrap each tab:
{activeTab === 'crispr' && <ErrorBoundary><CrisprDesignerView ... /></ErrorBoundary>}
```

---

### 🟡 PROBLEM 11: No Loading State Management — Multiple Requests Can Fire Simultaneously

**Files:** Multiple component files

**What happens:** If a user clicks "Design Guides" twice, two simultaneous API calls fire. The second response may arrive before the first, causing the display to flicker between results or show stale data.

**How to fix it:**
Add an abort controller pattern:
```javascript
const controllerRef = useRef(null);

const handleDesign = async () => {
  if (controllerRef.current) controllerRef.current.abort(); // Cancel previous
  controllerRef.current = new AbortController();
  setLoading(true);
  try {
    const result = await api.designCrispr(payload, controllerRef.current.signal);
    setGuides(result.candidates);
  } catch (e) {
    if (e.name !== 'AbortError') setError(e.message);
  }
  setLoading(false);
};
```

---

### 🟢 PROBLEM 12: No Keyboard Shortcuts

**What's missing:** Power users (researchers) expect keyboard shortcuts. Ctrl+Enter to submit a form. Escape to close modals. Tab to navigate between fields.

**How to fix it:**
```javascript
useEffect(() => {
  const handler = (e) => {
    if (e.ctrlKey && e.key === 'Enter') handleDesign();
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, []);
```

---

## Part E — Architecture Gaps

---

### 🟡 PROBLEM 13: No WebSocket Support — Real-Time Updates Require Polling

**What happens:** The off-target background job requires the frontend to poll `GET /api/crispr/off-target-scan/{job_id}` repeatedly to check for completion. This is inefficient and adds latency.

**How to fix it:**
Add WebSocket support to FastAPI (it's built-in):
```python
from fastapi import WebSocket

@app.websocket("/ws/offtarget/{job_id}")
async def offtarget_ws(websocket: WebSocket, job_id: str):
    await websocket.accept()
    while True:
        job = get_offtarget_job(job_id)
        await websocket.send_json({"status": job["status"], "progress": job["progress"]})
        if job["status"] in ["COMPLETED", "FAILED"]:
            break
        await asyncio.sleep(2)
    await websocket.close()
```

This is also the foundation for the **Live Playground** feature.

---

### 🟡 PROBLEM 14: Single-User Architecture — No Multi-Session Isolation

**What happens:** The SQLite database is shared. If two researchers run the platform simultaneously (on different machines pointing to the same backend), their data can collide. Sample IDs are not namespaced by user.

**How to fix it (simple):**
Add a `researcher_id` parameter to every request and filter all queries by it:
```python
class CrisprDesignRequest(BaseModel):
    researcher_id: str = "default"  # Add to all request models
    ...
```

---

### 🟢 PROBLEM 15: Knowledge Graph Is Static JSON, Not a Live Graph

**File:** `backend/data/knowledge_graph.json`

**What it does now:** A hardcoded JSON file with ~50 gene-disease-therapy relationships. It never updates.

**What it should do:** Every successful research session should contribute new knowledge to the graph. Every PubMed search result that gets saved should enrich the graph.

**How to fix it:**
Move the knowledge graph into a proper graph database like **NetworkX** (pure Python):
```python
import networkx as nx

def load_knowledge_graph_as_nx() -> nx.DiGraph:
    G = nx.DiGraph()
    # Load existing JSON into graph
    # Add relationships as edges with metadata
    return G

def add_research_finding(gene: str, finding_type: str, detail: str, pmid: str):
    G.add_edge(gene, detail, type=finding_type, pmid=pmid, added=datetime.now())
    # Persist to JSON
```

---

## Summary: Fix Priority Order

| Priority | Problem | Estimated Time | Impact |
|---------|---------|---------------|--------|
| 🔴 1 | Real off-target scanning (CRISPOR) | 2-3 hours | High — scientific validity |
| 🔴 2 | LLM knowledge copilot (Gemini/Ollama) | 1-2 hours | High — usability |
| 🔴 3 | Fix `/aart/` prefix to `/api/aart/` | 20 min | High — deployment correctness |
| 🟡 4 | Fix silent pass failures (logging) | 1 hour | Medium — reliability |
| 🟡 5 | Fix VAF parse failure return | 30 min | Medium — data accuracy |
| 🟡 6 | Neoantigen prediction (NetMHCpan) | 4-6 hours | High — immunotherapy use case |
| 🟡 7 | Error boundaries (React) | 1 hour | Medium — user experience |
| 🟡 8 | WebSocket for real-time jobs | 2-3 hours | Medium — performance |
| 🟡 9 | MSI → statistical model | 3-4 hours | Medium — clinical accuracy |
| 🟢 10 | Keyboard shortcuts | 1 hour | Low — convenience |
| 🟢 11 | Multi-user isolation | 2-3 hours | Low (single-user tool) |
| 🟢 12 | Live knowledge graph | 4-6 hours | Medium — long-term value |

---

*Problems and Fixes document — Genomic Research Copilot — October 2026*
