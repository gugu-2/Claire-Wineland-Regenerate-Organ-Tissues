# Feature Spec 06 — CAR-T Cell Surface Antigen Identification Engine

> **Status:** Not Started  
> **Priority:** 🟡 Sprint 3  
> **Estimated Effort:** 5–6 development days  
> **Why Critical:** When a cancer lacks druggable point mutations or is fully resistant to CRISPR and checkpoint inhibitors, CAR-T cell therapy becomes the primary curative option. This module engineers the antigen-targeting arm of CAR-T cells.

---

## 1. What This Does for the User

**After this feature is built**, the researcher will:
- Starting from a patient's tumor profile (from Tab 6), click **"Identify CAR-T Targets"**.
- See a ranked list of **tumor-specific surface proteins** that are highly expressed in the cancer but absent from vital healthy organs (heart, liver, brain, lung, kidney).
- For each antigen (e.g., HER2, BCMA, GD2, EGFRvIII, Mesothelin), see:
  - Tumor expression level (from RNA-seq if uploaded, or from TCGA averages)
  - Normal tissue expression across 54 GTEx tissue types
  - Therapeutic window score (tumor/normal expression ratio)
  - Existing FDA-approved or clinical-trial CAR-T therapies targeting this antigen
  - Whether the antigen has a known scFv antibody binding domain (sequence provided)
- Select an antigen → the platform outputs the **scFv amino acid sequence** for the CAR construct's extracellular binding domain.
- Download a complete **CAR-T Design Blueprint**: antigen name, scFv sequence, costimulatory domain recommendation (CD28 vs. 4-1BB), and known clinical trials using this design.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│               BROWSER (React 18)                                         │
│                                                                          │
│  [OncoCrisprDesignerView.jsx] — New "CAR-T Design" Tab                 │
│                                                                          │
│  Button: "Identify CAR-T Antigen Candidates"                            │
│                                                                          │
│  Results Panel:                                                          │
│    - Antigen Table: Name | Tumor Expr | Normal Max | Safety Window       │
│    - Danger zones highlighted: any normal tissue TPM > 10 → BLOCKED     │
│    - Click antigen → show scFv sequence + CAR construct blueprint        │
│    - Show ClinicalTrials.gov link for this target                       │
└─────────────────────────────────────────────────────────────────────────┘
                      |
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               FASTAPI BACKEND                                            │
│                                                                          │
│  POST /api/oncology/cart-targets                                        │
│    Input: { cancer_type, somatic_profile, expression_profile_id }      │
│    Process: cart_engine.py                                              │
│    Returns: { candidates: [...], unsafe_antigens: [...] }              │
│                                                                          │
│  GET /api/oncology/cart-targets/{antigen}/blueprint                    │
│    Returns: { scfv_sequence, car_design, clinical_trials }             │
└─────────────────────────────────────────────────────────────────────────┘
                      |
              ┌───────┴───────┐
              ▼               ▼
┌─────────────────┐  ┌─────────────────────────────────────────┐
│ GTEx API        │  │ LOCAL ANTIGEN DATABASE                   │
│ Expression data │  │ backend/data/cart_antigens.json          │
│ for 54 normal   │  │ Contains:                                │
│ tissue types    │  │  - 40+ validated CAR-T antigen targets   │
│                 │  │  - scFv sequences (public domain)        │
│                 │  │  - Known ClinicalTrials.gov NCT IDs      │
└─────────────────┘  └─────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Python Libraries (Backend)

| Library | Purpose |
|---------|---------|
| **requests** / **httpx** | Query GTEx v8 API for normal tissue expression |
| **pandas** | Process GTEx expression matrix |
| **biopython** | Handle protein sequences (scFv, antibody domain parsing) |

### Key External Data Sources

| Source | API / Data | Purpose |
|--------|------------|---------|
| **GTEx v8 Portal API** | `https://gtexportal.org/api/v2/expression/geneExpression` | Get expression (median TPM) for any gene across 54 human tissue types |
| **NCBI Protein DB** | Via `external_apis.py` (already exists) | Fetch scFv antibody sequences |
| **ClinicalTrials.gov API v2** | REST | Find active CAR-T trials for each antigen |
| **Human Protein Atlas** | REST API | Protein-level expression validation |

### Internal Data File: `backend/data/cart_antigens.json`

Pre-populated with 40+ validated CAR-T targets:

```json
{
  "CD19": {
    "gene": "CD19", "full_name": "B-Lymphocyte Antigen CD19",
    "cancer_types": ["B-cell ALL", "DLBCL", "CLL", "NHL"],
    "approved_therapies": ["Tisagenlecleucel (Kymriah)", "Axicabtagene ciloleucel (Yescarta)"],
    "scfv_sequence": "EVQLVESGGGLVQPGGSLRLSCAASGFNIKDTYIHWVRQAPGKGLEWVARIYPTNGYTRYADSVKGRFTISADTSKNTAYLQMNSLRAEDTAVYYCSRWGGDGFYAMDYWGQGTLVTVSS...",
    "costimulatory_domain": "4-1BB (CD137)",
    "safety_concern_tissues": ["none — CD19 expressed only in B-cells"],
    "clinical_trial_nct": ["NCT01626495", "NCT02348216"]
  },
  "HER2": {
    "gene": "ERBB2", "full_name": "Human Epidermal Growth Factor Receptor 2",
    "cancer_types": ["HER2+ Breast Cancer", "HER2+ Gastric Cancer", "Osteosarcoma"],
    "scfv_sequence": "...",
    "safety_concern_tissues": ["heart — monitor for cardiotoxicity"],
    "therapeutic_window": "moderate — cardiac monitoring required",
    "costimulatory_domain": "CD28"
  }
}
```

---

## 4. Data Flow — Step by Step

```
STEP 1:  User in OncoCRISPR Tab (6) clicks "Identify CAR-T Antigen Candidates"
         System reads: cancer_type = "HER2+ Breast Cancer" from tumor profile
         ↓
STEP 2:  POST /api/oncology/cart-targets
         Payload: { cancer_type: "HER2+ Breast Cancer", somatic_profile: {...} }
         ↓
STEP 3:  cart_engine.py loads cart_antigens.json
         Filters for cancer-type relevance:
         Matching antigens: ["HER2", "MSLN", "MUC1", "ROR1", "CD276"]
         ↓
STEP 4:  For each candidate antigen, query GTEx API:
         GET https://gtexportal.org/api/v2/expression/geneExpression?gencodeId=ENSG00000141736
         Returns: { data: [{ tissueSiteDetail: "Heart - Left Ventricle", median: 8.2 }, ...] }
         
         Compute:
           tumor_tpm = from expression_profiles table (if uploaded) OR TCGA average for cancer type
           normal_max_tpm = max TPM across all 54 GTEx tissues
           safety_window = tumor_tpm / normal_max_tpm
           is_safe = normal_max_tpm < 10.0  (arbitrary clinical threshold)
         ↓
STEP 5:  Classify each antigen:
         ✅ SAFE:     tumor TPM > 50 AND normal_max_tpm < 5  → strong candidate
         ⚠ CAUTION: tumor TPM > 50 AND normal_max_tpm 5-20 → needs monitoring
         ❌ BLOCKED: normal_max_tpm > 20 in vital organ     → on-target toxicity risk
         ↓
STEP 6:  Return sorted list to frontend:
         Sorted by: safety_window × tumor_expression descending
         ↓
STEP 7:  User clicks "HER2" antigen
         GET /api/oncology/cart-targets/HER2/blueprint
         Returns: {
           scfv_sequence: "EVQLVES...",
           car_structure: {
             extracellular: "HER2-specific scFv (Trastuzumab-derived)",
             hinge_transmembrane: "CD8alpha",
             costimulatory: "4-1BB (CD137)",
             activation_domain: "CD3-zeta"
           },
           nct_trials: ["NCT03740256 — Recruiting", "NCT02713984 — Active"]
         }
```

---

## 5. Backend Module Design

### New File: `backend/modules/cart_engine.py`

```
FUNCTION: identify_cart_candidates(cancer_type: str, somatic_profile: dict) -> list[dict]
  Step 1: Load cart_antigens.json, filter by cancer_type relevance
  Step 2: For each candidate, fetch GTEx expression via query_gtex_expression()
  Step 3: Fetch tumor expression from expression_profiles DB or TCGA reference table
  Step 4: Compute safety_window ratio
  Step 5: Apply safety classification (SAFE / CAUTION / BLOCKED)
  Step 6: Sort by (safety_window × tumor_expression) descending
  Returns: list of candidate dicts

FUNCTION: query_gtex_expression(gene_name: str) -> dict
  Calls GTEx API, returns { tissue_name → median_tpm } for 54 tissues
  Results cached in api_cache table (TTL: 30 days, GTEx data changes rarely)

FUNCTION: get_cart_blueprint(antigen_name: str) -> dict
  Reads from cart_antigens.json
  Returns: { scfv_sequence, car_structure, safety_profile, clinical_trials }

FUNCTION: check_normal_tissue_safety(gtex_data: dict) -> dict
  VITAL ORGANS MONITORED:
    heart: ["Heart - Left Ventricle", "Heart - Atrial Appendage"]
    brain: ["Brain - Cortex", "Brain - Cerebellum"]
    liver: ["Liver"]
    lung: ["Lung"]
    kidney: ["Kidney - Cortex"]
  Returns: { organ → max_tpm, highest_risk_tissue, is_safe_threshold: bool }
```

---

## 6. Frontend Component Design

### New Panel in `OncoCrisprDesignerView.jsx`

```
NEW CAR-T SECTION (below existing allele-specific guides):

┌─────────────────────────────────────────────────────────────────────────┐
│ CAR-T CELL THERAPY ANTIGEN CANDIDATES                                   │
│ Cancer Type: HER2+ Breast Cancer                                        │
│                                                                         │
│ [Run CAR-T Target Analysis]                                             │
├─────────────────────────────────────────────────────────────────────────┤
│ Antigen | Tumor Expr  | Normal Max  | Safety    | Approved Therapy      │
│─────────+─────────────+─────────────+-----------+───────────────────────│
│ HER2    | 312 TPM (↑) | 8.2 TPM    | ⚠ CAUTION | Trastuzumab-CAR      │
│ MSLN    | 247 TPM (↑) | 1.1 TPM    | ✅ SAFE    | Trial: NCT03564067   │
│ MUC1    | 189 TPM (↑) | 3.2 TPM    | ✅ SAFE    | Multiple trials      │
│ CD276   | 45 TPM      | 21.4 TPM   | ❌ BLOCKED | Normal brain express. │
├─────────────────────────────────────────────────────────────────────────┤
│ SELECTED: MSLN (Mesothelin)                                             │
│                                                                         │
│ CAR-T CONSTRUCT BLUEPRINT:                                              │
│   Extracellular:  SS1P-derived Mesothelin scFv                         │
│   Hinge/TM:       CD8α hinge + transmembrane domain                   │
│   Costimulatory:  4-1BB (CD137) — better persistence in solid tumors   │
│   Activation:     CD3-ζ signaling domain                               │
│                                                                         │
│ scFv Sequence (SS1 antibody-derived):                                  │
│ [EVQLVESGG...WGQGTLVTVSS] [Copy Sequence]                              │
│                                                                         │
│ Active Clinical Trials: NCT03564067 (Recruiting, Phase 1, PDAC)       │
│ [View on ClinicalTrials.gov ↗]                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Execution Plan

| Day | Task |
|-----|------|
| **Day 1** | Build `backend/data/cart_antigens.json`: populate 40+ validated targets with scFv sequences, costimulatory domains, clinical trial NCT numbers, safety profiles. |
| **Day 2** | Write `query_gtex_expression()` function using GTEx API v2. Test for HER2 (ERBB2), CD19, MSLN. Cache results in api_cache. |
| **Day 3** | Write `identify_cart_candidates()` + `check_normal_tissue_safety()` + `get_cart_blueprint()`. Unit tests. |
| **Day 4** | Build FastAPI endpoints: `/api/oncology/cart-targets` and `/api/oncology/cart-targets/{antigen}/blueprint`. |
| **Day 5** | Build CAR-T panel UI in `OncoCrisprDesignerView.jsx`. Wire table with safety traffic lights and blueprint display. |
| **Day 6** | Integration test with a TCGA HER2+ breast cancer sample: verify HER2 detected as top candidate, CD19 filtered out as irrelevant. |
