# Feature Spec 03 — Multi-Allele NetMHCpan-4.1 Neoantigen Engine

> **Status:** Not Started  
> **Priority:** 🔴 Sprint 2  
> **Estimated Effort:** 4–5 development days  
> **Current Limitation:** `neoantigen_predictor.py` only covers HLA-A*02:01 using a statistical proxy matrix. Real patients have diverse HLA genotypes across 150+ alleles.

---

## 1. What This Does for the User

**After this feature is built**, the researcher will:
- Enter a patient's **HLA type** (from clinical typing, e.g., HLA-A*01:01, HLA-B*07:02, HLA-C*07:01) from the Sample Intake screen.
- Run neoantigen prediction across **all 3 HLA class I alleles simultaneously**.
- See which mutant peptides bind strongly to the patient's specific HLA molecules.
- See a ranked neoantigen vaccine peptide table with IC50 values (in nM), classification (Strong Binder SB < 50nM, Weak Binder WB < 500nM), and immunogenicity scores.
- Export a final **Personalized Neoantigen Vaccine Design** report listing the top 5–10 peptides for mRNA vaccine or adoptive T-cell therapy formulation.
- Also includes **proteasomal cleavage scores** (NetChop-3.1) and **TAP transport scores** (NetCTLpan) to filter for peptides that actually get presented on the cell surface.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                BROWSER (React 18)                                        │
│                                                                          │
│  [OncoCrisprDesignerView.jsx] — Neoantigen Panel                        │
│    User inputs: Patient HLA Alleles (3 inputs: A, B, C)                 │
│    Shows: Ranked peptide table with IC50 per allele                     │
│    Export button: "Download Vaccine Design Report (PDF)"                │
└─────────────────────────────────────────────────────────────────────────┘
                      |
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               FASTAPI BACKEND                                            │
│                                                                          │
│  POST /api/oncology/neoantigen-predict                                  │
│    Payload: { somatic_mutations, hla_alleles: ["A*01:01","B*07:02","C*07:01"] }
│                                                                          │
│  neoantigen_predictor.py (rewritten)                                    │
│    Step 1: Generate mutant peptide library (8-11mer sliding window)     │
│    Step 2: Call NetMHCpan-4.1 subprocess for each allele                │
│    Step 3: Call NetChop-3.1 subprocess for cleavage scores              │
│    Step 4: Combine scores, rank peptides                                │
│    Step 5: Return ranked list                                            │
└─────────────────────────────────────────────────────────────────────────┘
                      |
         ┌────────────┴────────────┐
         ▼                         ▼
┌──────────────────────┐  ┌──────────────────────────┐
│  NetMHCpan-4.1       │  │  NetChop 3.1              │
│  (local binary)      │  │  (local binary)           │
│                      │  │                           │
│  Input: FASTA file   │  │  Input: Peptide sequences │
│  + allele name       │  │  Output: Cleavage prob.   │
│  Output: Ranked      │  │  at each peptide position │
│  peptides with       │  │                           │
│  IC50 values (nM)    │  └──────────────────────────┘
└──────────────────────┘
```

---

## 3. Technology Stack

### Core Prediction Binaries

| Tool | Version | Source |
|------|---------|--------|
| **NetMHCpan-4.1** | 4.1b | DTU Health Tech server (`https://services.healthtech.dtu.dk/services/NetMHCpan-4.1/`) — free for academic use, requires registration |
| **NetChop 3.1** | 3.1 | Same DTU server — predicts proteasomal cleavage sites |
| **NetCTLpan 1.1** | 1.1 | Same DTU server — combines MHC binding + TAP + cleavage |

> **Important Note on Licensing:** NetMHCpan is free for non-commercial academic use. For commercial deployment, DTU Health Tech must be contacted for a license. Alternative: use the **MHCflurry** library (MIT license, installs via pip, slightly less accurate but no license restriction).

### Python Libraries

| Library | pip install | Purpose |
|---------|-------------|---------|
| **mhcflurry** | `mhcflurry` | Open-source alternative to NetMHCpan. MIT license. Covers 100+ alleles. |
| **mhcnames** | `mhcnames` | Standardizes HLA allele nomenclature (e.g., "HLA-A2" → "HLA-A*02:01") |
| **biopython** | `biopython` | Protein sequence utilities (sliding window, FASTA generation) |
| **pandas** | `pandas` | Aggregate and rank peptide binding results |
| **subprocess** | built-in | Call NetMHCpan/NetChop binaries |

### Frontend React Packages

| Package | Purpose |
|---------|---------|
| `react-select` | Searchable dropdown for HLA allele selection (150+ options, needs search) |
| `@tanstack/react-table` | Sortable, filterable peptide results table |
| `recharts` | Bar chart showing IC50 distribution across alleles |

---

## 4. Data Flow — Step by Step

```
STEP 1:  During Sample Intake (Tab 1), user enters HLA type:
         HLA-A: A*01:01
         HLA-B: B*07:02
         HLA-C: C*07:01
         (Stored in selectedSample state in App.jsx)
         ↓
STEP 2:  On OncoCRISPR screen (Tab 6), user runs allele-specific guide design
         Somatic mutations are returned: [{ gene: KRAS, mutation: G12D, protein_context: VVVGADGVGKS }]
         ↓
STEP 3:  User clicks "Predict Neoantigens for All HLA Alleles"
         Frontend POSTs to /api/oncology/neoantigen-predict:
         {
           somatic_mutations: [{ gene: "KRAS", mutation: "G12D", protein_seq: "VVVGADGVGKS..." }],
           hla_alleles: ["A*01:01", "B*07:02", "C*07:01"]
         }
         ↓
STEP 4:  Backend generates peptide library for each mutation:
         For "VVVGADGVGKS" (11 residues), generate 8-11mers:
         8-mers: VVVGADGV, VVGADGVG, VGADGVGK, GADGVGKS
         9-mers: VVVGADGVG, VVGADGVGK, VGADGVGKS
         10-mers: VVVGADGVGK, VVGADGVGKS
         11-mers: VVVGADGVGKS
         (Also generate wildtype equivalents for comparison)
         ↓
STEP 5:  MHCflurry prediction for each peptide × each allele:
         from mhcflurry import Class1PresentationPredictor
         predictor = Class1PresentationPredictor.load()
         results = predictor.predict_to_dataframe(
             peptides=[...], alleles=["HLA-A*01:01", "HLA-B*07:02", ...],
             include_affinity_percentile=True
         )
         Returns: peptide, allele, affinity (nM), percentile_rank, presentation_score
         ↓
STEP 6:  NetChop proteasomal cleavage scoring (subprocess):
         Writes FASTA to /tmp/peptides.fa
         subprocess.run(['netChop', '/tmp/peptides.fa', '-thr', '0.5'])
         Parses output: adds cleavage_score column
         ↓
STEP 7:  Aggregate and rank:
         Final score = presentation_score × cleavage_score
         Filter: IC50 < 500nM AND cleavage_score > 0.5
         Sort by combined score descending
         ↓
STEP 8:  Return to frontend:
         {
           top_neoantigens: [
             { peptide: "VVVGADGVG", allele: "HLA-A*01:01", ic50: 42.5, 
               percentile: 0.2, cleavage: 0.87, class: "Strong Binder",
               wildtype_ic50: 8820.0, fold_change: 207.5 }
           ],
           vaccine_candidates: [top 5 by combined score]
         }
```

---

## 5. Backend Module Design

### Rewritten: `backend/modules/neoantigen_predictor.py`

```
FUNCTION: generate_peptide_library(protein_context: str, mutation_pos: int) -> list[dict]
  INPUT:  Protein sequence centered on mutation, mutation position within string
  OUTPUT: List of { peptide_seq, length, is_mutant, wildtype_seq }
  ALGORITHM: Sliding window 8mer to 11mer across protein context

FUNCTION: predict_mhc_binding(peptides: list, hla_alleles: list) -> DataFrame
  INPUT:  List of peptide sequences, list of HLA allele strings
  OUTPUT: pandas DataFrame with columns: peptide, allele, affinity_nm, percentile
  ENGINE: MHCflurry Class1PresentationPredictor (primary)
           NetMHCpan subprocess (fallback if MHCflurry fails)

FUNCTION: predict_proteasomal_cleavage(peptides: list) -> dict
  INPUT:  List of peptide sequences
  OUTPUT: { peptide_seq → cleavage_probability }
  ENGINE: NetChop 3.1 subprocess
           Fallback: Rule-based scoring (hydrophobic C-terminus residue heuristic)

FUNCTION: calculate_fold_change(mutant_ic50: float, wildtype_ic50: float) -> float
  PURPOSE: Measures how much better the mutant peptide binds vs wildtype
  High fold change = neoantigen is truly tumor-specific (not a self-antigen)

FUNCTION: rank_neoantigens(binding_df, cleavage_scores) -> list[dict]
  ALGORITHM:
    1. Filter: IC50 < 500nM (remove non-binders)
    2. Filter: fold_change > 10x (remove cross-reactive self-peptides)
    3. Sort by: presentation_score × cleavage_score descending
    4. Add classification: SB (<50nM), WB (<500nM)
    5. Return top 20 candidates
```

---

## 6. Frontend Component Design

### Updated section in `OncoCrisprDesignerView.jsx` — HLA Input Panel

```
NEW UI PANEL (added above existing neoantigen table):

┌─────────────────────────────────────────────────────────────────────────┐
│ PATIENT HLA TYPING (Required for Neoantigen Prediction)                 │
├─────────────────────────────────────────────────────────────────────────┤
│ HLA-A Allele: [ A*01:01 ▼ ] (searchable dropdown, 500+ options)        │
│ HLA-B Allele: [ B*07:02 ▼ ]                                            │
│ HLA-C Allele: [ C*07:01 ▼ ]                                            │
│                                                                         │
│ ℹ️ HLA type is obtained from clinical HLA typing lab or from WGS data   │
│    using POLYSOLVER or OptiType tools                                   │
│                             [ Run Multi-Allele Neoantigen Prediction ]  │
└─────────────────────────────────────────────────────────────────────────┘

UPDATED RESULTS TABLE:
┌─────────────────────────────────────────────────────────────────────────┐
│ PERSONALIZED NEOANTIGEN VACCINE CANDIDATES                              │
│ Patient HLA: A*01:01 | B*07:02 | C*07:01                               │
├──────────────────────────────────────────────────────────────────────── │
│ Rank | Peptide      | HLA Allele   | IC50 (nM) | Class | Cleavage | ΔWT │
│──────+──────────────+-─────────────+-──────────+───────+──────────+─────│
│  1   | VVVGADGVG    | A*01:01      |   42.5    |  SB   |   0.87   | 207x│
│  2   | GADGVGKSAL   | B*07:02      |   89.3    |  SB   |   0.71   | 45x │
│  3   | VVGADGVGKS   | A*01:01      |  198.7    |  WB   |   0.55   | 12x │
└─────────────────────────────────────────────────────────────────────────┘
│ [Export Vaccine Design as PDF] [Copy FASTA for mRNA synthesis]         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Execution Plan

| Day | Task |
|-----|------|
| **Day 1** | Install `mhcflurry` and `mhcnames`. Download MHCflurry pre-trained models (`mhcflurry-downloads fetch`). Write unit test: predict binding of KRAS G12D 9-mer to HLA-A*02:01, verify IC50 ~42nM. |
| **Day 2** | Rewrite `neoantigen_predictor.py`: `generate_peptide_library`, `predict_mhc_binding` functions using MHCflurry. |
| **Day 3** | Add `predict_proteasomal_cleavage` using NetChop subprocess (with fallback heuristic). Add `rank_neoantigens` aggregation logic. |
| **Day 4** | Update `OncoCrisprDesignerView.jsx`: add HLA typing input panel with `react-select` searchable dropdowns seeded with the full list of known HLA alleles. |
| **Day 5** | Wire the updated results table with multi-allele breakdown, fold-change column, and PDF export button. End-to-end integration test. |
