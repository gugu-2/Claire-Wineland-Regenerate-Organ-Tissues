# ROADMAP.md — What to Build Next

> This is the research agenda. Ordered by impact.
> Every item here could save a life. Treat it that way.

---

## How to Read This Document

Each feature is described with:
- **Why it matters** — the biological or research motivation
- **What to build** — the concrete implementation
- **Difficulty** — time estimate for one focused developer
- **Dependencies** — what must exist first

---

## Phase 1 — Fix the Foundation (Do These First)

### 1.1 Real Off-Target Scanning via CRISPOR
**Why:** The current 3-variant simulation is scientifically meaningless for safety decisions.  
**Build:** Integrate CRISPOR Python library or REST API. Return genome-wide off-target sites with gene annotations.  
**Difficulty:** 2-3 days  
**Impact:** 🔴 Critical — affects every CRISPR design decision

### 1.2 LLM-Powered Knowledge Copilot (Gemini API)
**Why:** Researchers need natural language answers, not formatted text dumps.  
**Build:** Add `GEMINI_API_KEY` config. Call Gemini Pro with retrieved PubMed context.  
**Difficulty:** 1 day  
**Impact:** 🔴 High — makes the copilot actually useful

### 1.3 Fix /aart/ URL Prefix Inconsistency
**Why:** ART endpoints bypass the Vite proxy. Will break in production.  
**Build:** Rename all `/aart/*` to `/api/aart/*`. Update frontend api.js.  
**Difficulty:** 20 minutes  
**Impact:** 🔴 High — affects deployment

---

## Phase 2 — The Real-Time Playground

This is the most transformative feature. See `REALTIME_PLAYGROUND.md` for full design.

### 2.1 WebSocket Infrastructure
**Build:** Add `/ws/playground` endpoint to FastAPI. Create `usePlaygroundWS.js` hook.  
**Difficulty:** 1-2 days

### 2.2 DNA Sequence Interactive Track
**Build:** `DnaTrack.jsx` — SVG-rendered nucleotides with color coding, click highlighting, guide overlay.  
**Difficulty:** 1-2 days

### 2.3 CRISPR Binding Animator
**Build:** `BindingAnimator.jsx` — step-by-step base pairing animation with mismatch detection.  
**Difficulty:** 1 day

### 2.4 Cancer Clone Evolution Simulator
**Build:** `clone_simulator.py` backend module + `CloneEvolutionChart.jsx` animated area chart.  
**Difficulty:** 3-4 days  
**Impact:** 🟣 Breakthrough — first platform to show tumor evolution in response to therapy in real time

### 2.5 3D Molecular Viewer (3Dmol.js)
**Build:** `MolecularViewer.jsx` with Cas9 structure, guide binding, mutation highlights.  
**Difficulty:** 2-3 days  
**Impact:** 🟣 Breakthrough — visual intuition for molecular mechanisms

---

## Phase 3 — Immunotherapy Suite

Cancer immunotherapy is the most active research area in oncology today. The platform needs first-class support.

### 3.1 Neoantigen Prediction Engine
**Why:** Neoantigens are tumor-specific peptides that T-cells can recognize. Predicting them is central to personalized cancer vaccines and adoptive T-cell therapy design.  
**Build:**
```python
# backend/modules/neoantigen_predictor.py
def predict_neoantigens(somatic_mutations: List[Dict], hla_alleles: List[str]) -> List[Dict]:
    """
    For each somatic mutation:
    1. Extract the mutant peptide (8-11-mer centered on mutation)
    2. Predict MHC-I binding affinity using NetMHCpan REST API
    3. Predict proteasomal processing (TAP transport score)
    4. Rank neoantigens by: binding affinity × expression × mutation CCF
    """
```
**Difficulty:** 3-4 days  
**Impact:** 🟣 Breakthrough — enables personalized vaccine design from patient tumor data

### 3.2 CAR-T Target Identification
**Why:** CAR-T therapy requires finding tumor-specific surface antigens. The platform's CNV + expression data can prioritize targets.  
**Build:**
```python
def identify_cart_targets(tumor_profile: Dict) -> List[Dict]:
    """
    Scan tumor for:
    - Overexpressed surface proteins (from RNA expression proxy)
    - Tumor-specific splice variants
    - ART-influenced surface remodeling (novel angle!)
    - HER2, CD19, BCMA, GD2, EGFRvIII status
    """
```
**Difficulty:** 2-3 days  
**Impact:** 🔴 High — directly actionable for immunotherapy decisions

### 3.3 Tumor Immune Microenvironment (TIME) Modeler
**Why:** Whether immunotherapy works depends on the immune cells inside the tumor. A "hot" tumor (T-cell infiltrated) responds to checkpoint blockade. A "cold" tumor does not.  
**Build:**
- TMB + MSI → immune activation score
- Viral vector choice → predicted immune cell recruitment
- Model: cold tumor → combination therapy (oncolytic virus + checkpoint inhibitor)
**Difficulty:** 2-3 days  
**Impact:** 🔴 High — changes viral chassis and checkpoint inhibitor recommendations

---

## Phase 4 — Multi-Omics Integration

### 4.1 RNA-seq Integration (Gene Expression Upload)
**Why:** DNA variants tell you what mutations exist. RNA expression tells you which genes are actually active. A mutation in a gene that isn't expressed doesn't matter. A highly expressed oncogene without a mutation might still be the best target.  
**Build:**
- Upload tab for RNA-seq count matrix (CSV)
- Normalize counts (TPM or RPKM)
- Color-code CRISPR guide targets by expression level
- Flag guides targeting unexpressed genes as low priority
**Difficulty:** 3-4 days

### 4.2 Proteomics Overlay
**Why:** Some cancer drivers operate at the protein level (post-translational modifications, protein-protein interactions) without DNA sequence changes.  
**Build:**
- Import phosphoproteomics data (CSV with protein, modification, abundance)
- Overlay kinase activity onto tumor genomics summary
- Flag kinase-active pathways as therapy targets (e.g., active MAPK → MEK inhibitor)
**Difficulty:** 4-5 days

### 4.3 Single-Cell Data Support
**Why:** Bulk tumor sequencing averages across millions of cells, hiding rare drug-resistant subclones. Single-cell sequencing reveals the full cellular landscape.  
**Build:**
- Import single-cell VCF or cluster assignment file
- Show clone composition as a UMAP-like 2D scatter plot
- Color cells by mutation status, therapy sensitivity
**Difficulty:** 5-7 days (significant new visualization work)

---

## Phase 5 — Novel Enzyme Integration (ART + Beyond)

### 5.1 ART-Based Genome Writing Simulator
**Why:** If the ART RT can be directed by custom repeat arrays to write DNA at specific loci (hypothesis from Yoon 2026), this would be a fundamentally new genome editing modality — no cuts, programmable arrays, dual RNA-DNA action.  
**Build:**
```python
def design_art_genome_writer(
    target_locus: str,
    desired_edit: str,
    array_unit_count: int = 10
) -> Dict:
    """
    Hypothetical ART genome writer design:
    1. Design a custom repeat array encoding the desired edit sequence
    2. Each spacer unit encodes a different RT template fragment
    3. Partner protein delivers the RT-ncRNA complex to the target
    4. Returns: array sequence, RT construct, partner protein type
    
    STATUS: Speculative research tool. ART function not yet confirmed.
    All outputs are design hypotheses for experimental testing.
    """
```
**Difficulty:** 2-3 days (pure computational design)  
**Impact:** 🟣 Breakthrough — first computational tool for ART-based genome design

### 5.2 Retron Integration
**Why:** Retrons (bacterial RT systems) are already being used for genome editing in mammalian cells (RetronEditor, Broad Institute 2022). Our platform should support them.  
**Build:** Add retron to the "edit modality" selector alongside Cas9, base editing, prime editing.  
**Difficulty:** 2-3 days

### 5.3 Diversity-Generating Retroelement (DGR) Analyzer
**Why:** DGRs generate intentional sequence diversity at specific loci. They could be engineered to create diverse antibody libraries or T-cell receptor variants for immunotherapy.  
**Build:** Add DGR scanner to the ART module. Classify RT sequences as ART, retron, DGR, or group II intron.  
**Difficulty:** 2 days

---

## Phase 6 — Autonomous Research Agents

The Yoon et al. 2026 paper showed that autonomous AI agents can discover new biology. We should build this capability into the platform.

### 6.1 Hypothesis Generator
**Why:** After analyzing a tumor profile, the system should autonomously propose testable hypotheses.  
**Build:**
```python
def generate_research_hypotheses(tumor_profile: Dict, crispr_designs: List[Dict]) -> List[Dict]:
    """
    Looks at the tumor's mutation landscape and generates:
    - "KRAS G12D × TP53 R248W co-occurrence suggests synthetic lethality with PARP inhibition"
    - "High TMB + MSI-H suggests pembrolizumab responder — test neoantigen load"
    - "ART-type RT detected adjacent to phage integration site — possible mobile element"
    """
```

### 6.2 Literature Watchdog
**Schedule:** Runs every 24 hours, checks PubMed for papers matching the research sample's gene targets.  
**Build:** `/schedule` slash command already available. Create a recurring PubMed query and push new papers to the knowledge graph.

### 6.3 Cross-Sample Pattern Learning
**Why:** After 100 patient samples, the platform has learned patterns. Which mutations co-occur? Which guide designs consistently fail? Which viral chassis works best for which tumor type?  
**Build:** `pattern_miner.py` — SQLite-backed cross-sample statistics. Surface as a "What We've Learned" dashboard.  
**Difficulty:** 4-5 days

---

## Phase 7 — Collaboration and Data Sharing

### 7.1 Research Session Export/Import
**Why:** Researchers need to share their work. Currently all data is in a local SQLite file.  
**Build:** Export full session as a portable JSON bundle (all variants, guides, designs, reviews). Import on any instance.

### 7.2 Protocol Publisher
**Why:** When a researcher designs a successful CRISPR protocol (guide, oligos, delivery strategy), they should be able to publish it to a shared database.  
**Build:** A curated protocol database. Any researcher can submit. Submissions are validated against the 6-point expert review checklist.

### 7.3 Live Annotation Collaboration
**Why:** Two researchers should be able to annotate the same tumor profile simultaneously, like Google Docs for genomics.  
**Build:** Add collaborative cursor tracking via WebSocket. Show which regions each researcher is looking at.

---

## The Research Timeline

```
NOW         Phase 1: Fix foundation (1-2 weeks)
            ↓
SOON        Phase 2: Real-time playground (3-4 weeks)
            ↓
Q1 2027     Phase 3: Immunotherapy suite (2-3 weeks)
            ↓
Q2 2027     Phase 4: Multi-omics (3-4 weeks)
            ↓
Q3 2027     Phase 5: Novel enzymes (ART, DGR, retrons) (2-3 weeks)
            ↓
Q4 2027     Phase 6: Autonomous agents (4-6 weeks)
            ↓
2028        Phase 7: Collaboration + data sharing
```

---

## The Metrics That Matter

At the end of each phase, ask:
- Can a researcher using this platform **find a drug target faster** than without it?
- Can they **design a safer CRISPR edit** than before?
- Does the visualization give them **insight they couldn't have had from a table**?
- Would this tool have **changed the outcome** for someone like the founder's father or grandmother?

If the answer is yes, we are doing the right thing.

---

*Roadmap — Genomic Research Copilot — October 2026*
