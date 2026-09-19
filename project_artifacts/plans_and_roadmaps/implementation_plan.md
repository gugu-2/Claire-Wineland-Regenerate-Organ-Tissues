# Precision Cancer Cure OS — Detailed Implementation Plan
## Expanding the Genomic Research Copilot into Oncology

**Version:** 1.0  
**Date:** September 2026  
**Status:** Awaiting User Approval

---

## Background & Goal

The existing platform is a world-class germline CRISPR design tool. This plan transforms it into a **Precision Cancer Cure OS** — supporting somatic cancer targeting, oncolytic virotherapy planning, CAR-T cell design, and neoantigen vaccine generation.

Inspired by:
1. **Dr. Beata Halassy** — virologist who engineered Measles Virus + VSV to destroy her own breast cancer tumor
2. **CRISPR gene correction** — correcting the cancer-causing mutation (BRCA2, KRAS, TP53) rather than just attacking the tumor

**Core insight from 5 expert agents:** The platform's existing patient-specific VCF personalization engine is the exact foundation needed for cancer. Cancer is a VCF — just a somatic one.

---

## Architecture Reality Check (from Code Review)

### ✅ What Already Exists (Keep & Extend)

| File | Current Capability | How It's Extended |
|------|-------------------|-------------------|
| `sample_intake.py` | Parses germline VCFs, builds personalized sequence | Extended with tumor-normal pair input and VAF parsing |
| `crispr_designer.py` | PAM scanning on patient-specific sequence | Extended with allele-specific discrimination scoring |
| `azimuth_cfd.py` | On-target + off-target CFD scoring | Extended with tumor microenvironment penalty weights |
| `variant_annotation.py` | ClinVar + gnomAD lookup | Extended with COSMIC + OncoKB somatic cancer databases |
| `delivery_advisor.py` | AAV/LNP/RNP tissue delivery profiles | Extended with intratumoral injection + oncolytic virus chassis |
| `review_gate.py` | 3-point expert review checklist | Extended with 6-point oncology-specific checklist |
| `security.py` | SHA-256 audit trail + HIPAA pseudonymization | Extended with tumor-type encryption and multi-reviewer consensus |
| `models.py` | SampleModel, VariantModel, ExpertReviewModel | Extended with 4 new database tables |
| `main.py` | 20+ FastAPI endpoints | Extended with 8 new oncology endpoints |

### ❌ Critical Gap (Must Build)
**The platform has no tumor-vs-germline distinction.** Every VCF is treated as a germline mutation. This is the #1 thing to fix before any cancer use case can be supported safely.

---

## Implementation: 4 Phases

```
Phase 1 (Months 1–3):   Somatic Foundation       ← MOST CRITICAL
Phase 2 (Months 3–6):   OncoCRISPR Designer      ← HIGHEST VALUE
Phase 3 (Months 6–12):  OncoViral Therapy Planner ← GROUNDBREAKING
Phase 4 (Months 12–18): Advanced Cancer AI        ← COMPETITIVE MOAT
```

---

## Phase 1: Somatic Cancer Foundation
**Duration:** ~3 months | **Priority:** 🔴 CRITICAL — nothing else works without this

### Goal
Build the core infrastructure that distinguishes tumor mutations from germline mutations. Without this, any CRISPR guide designed by the platform could accidentally target healthy cells.

---

### 1.1 Backend: `somatic_variant_caller.py` (NEW FILE)

**Location:** `backend/modules/somatic_variant_caller.py`

**What it does:**
- Accepts TWO VCFs simultaneously: a tumor biopsy VCF and a matched normal (blood) VCF for the same patient
- Subtracts all germline variants (present in normal VCF) from the tumor VCF
- Returns only **somatic-only mutations** — mutations exclusive to cancer cells
- Calculates **Variant Allele Frequency (VAF)** for each somatic mutation
- Assigns **clonal classification**: Truncal (>60% VAF = in all tumor cells) vs. Subclonal (<60% VAF = in a subset)

**Key logic:**
```
Somatic Variants = All Tumor Variants − Germline Variants (with VAF > 0.05 threshold)
Clonal CCF (Cancer Cell Fraction) = (2 × VAF) / tumor_purity_estimate
```

**Outputs per variant:**
```json
{
  "chromosome": "chr12",
  "position": 25398284,
  "ref": "C",
  "alt": "A",
  "gene": "KRAS",
  "amino_acid_change": "G12D",
  "variant_allele_frequency": 0.78,
  "clonal_classification": "TRUNCAL",
  "cancer_cell_fraction": 0.94,
  "is_safe_crispr_target": true,
  "reasoning": "High CCF (94%) confirms this mutation is present in virtually all tumor cells. Safe to target with CRISPR."
}
```

**Minimum CCF threshold for safe CRISPR targeting:** 60%  
If CCF < 60%, the system must display a red warning: *"Subclonal mutation — CRISPR will only affect a minority of tumor cells and risk selecting for resistant clones."*

---

### 1.2 Backend: `tumor_genomics.py` (NEW FILE)

**Location:** `backend/modules/tumor_genomics.py`

**What it does:**
- **Tumor Mutational Burden (TMB) calculation:** Count non-synonymous somatic mutations per megabase in coding regions. Display FDA biomarker thresholds (≥10 mut/Mb = high TMB → immunotherapy eligible)
- **Microsatellite Instability (MSI) detection:** Evaluate shifts in microsatellite repeat lengths between tumor and normal, returning MSI-High/MSI-Low/MSS classification
- **Tumor Purity Estimation:** Simple algorithm to estimate what fraction of cells in the biopsy are actually cancer cells (vs. stromal/immune cell contamination)
- **Copy Number Variation (CNV) summary:** Parse CNV INFO fields from VCF to flag amplified oncogenes (e.g., HER2 amplified 20× in breast cancer) and deleted tumor suppressors

**Output Summary Card:**
```json
{
  "tmb_score": 14.2,
  "tmb_classification": "TMB-High",
  "fda_immunotherapy_eligible": true,
  "msi_status": "MSS",
  "tumor_purity": 0.82,
  "significant_amplifications": ["ERBB2 (HER2) ×18", "CDK4 ×6"],
  "significant_deletions": ["CDKN2A (p16) homozygous deletion", "RB1 loss"]
}
```

---

### 1.3 Database: New Tables in `models.py`

#### New Table: `TumorSampleModel`
Extends the existing `SampleModel` with oncology-specific fields:

```python
class TumorSampleModel(Base):
    __tablename__ = "tumor_samples"
    
    tumor_sample_id = Column(String(64), primary_key=True)
    patient_sample_id = Column(String(64))      # links to matched normal SampleModel
    cancer_type = Column(String(128))            # "NSCLC", "Breast Cancer", "GBM"
    cancer_stage = Column(String(32))            # "Stage IIIB"
    biopsy_site = Column(String(128))            # "Primary Tumor", "Liver Metastasis"
    tumor_purity = Column(Float)                 # 0.0 – 1.0
    tmb_score = Column(Float)                    # mutations per megabase
    tmb_classification = Column(String(32))      # "TMB-High", "TMB-Low"
    msi_status = Column(String(16))              # "MSI-H", "MSS", "MSI-L"
    sample_type_flag = Column(String(32), default="TUMOR")  # TUMOR vs GERMLINE flag
```

#### New Table: `SomaticMutationModel`
```python
class SomaticMutationModel(Base):
    __tablename__ = "somatic_mutations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    tumor_sample_id = Column(String(64), ForeignKey("tumor_samples.tumor_sample_id"))
    chromosome = Column(String(16))
    position = Column(Integer)
    ref = Column(String(256))
    alt = Column(String(256))
    gene = Column(String(64))
    amino_acid_change = Column(String(64))       # "G12D", "R175H"
    variant_allele_frequency = Column(Float)     # 0.0 – 1.0
    cancer_cell_fraction = Column(Float)         # 0.0 – 1.0
    clonal_classification = Column(String(32))  # TRUNCAL / SUBCLONAL
    cosmic_id = Column(String(64), nullable=True)
    oncokb_tier = Column(String(16), nullable=True)  # "1", "2A", "2B", "3A"
    is_oncogenic = Column(Boolean, default=False)
    is_safe_crispr_target = Column(Boolean, default=False)
```

---

### 1.4 Backend: Extended `variant_annotation.py`

**Modification to existing file** — add COSMIC and OncoKB lookup:

**New function: `annotate_somatic_variant(variant: Dict) -> Dict`**

Logic:
1. First check local curated somatic hotspot DB (KRAS G12D, TP53 R175H, EGFR L858R, BRAF V600E, etc.)
2. Query **COSMIC API** (REST v3.4): `https://cancer.sanger.ac.uk/api/v1/variants` using HGVS notation
3. Query **OncoKB API** (free academic tier): `https://www.oncokb.org/api/v1/annotate/mutations/byHGVSg`
4. Return combined annotation with:
   - COSMIC mutation count (how many tumors in COSMIC have this exact mutation)
   - OncoKB actionability tier (Tier 1 = FDA-approved targeted therapy exists)
   - Known resistance mechanisms for this mutation

**New curated somatic hotspot entries to add:**
```python
SOMATIC_HOTSPOT_DB = {
    "KRAS_G12D": {
        "gene": "KRAS", "amino_acid_change": "G12D",
        "hgvs": "12:25398284:C>A",
        "cancer_types": ["PDAC", "CRC", "NSCLC"],
        "oncokb_tier": "2A",
        "cosmic_count": 41247,
        "crispr_strategy": "PAM-creating allele-specific guide (G12D creates novel PAM)",
        "fda_targeted_therapy": "Sotorasib (AMG 510) for KRAS G12C only; G12D: Adagrasib (limited)"
    },
    "TP53_R175H": { ... },
    "EGFR_L858R": { ... },
    "BRAF_V600E": { ... },
    "BRCA2_loss": { ... },
    "IDH1_R132H": { ... }
}
```

---

### 1.5 New API Endpoints in `main.py`

#### `POST /api/oncology/tumor-normal-ingest`
**Purpose:** Accept paired tumor + normal VCF content, return pure somatic variant profile

**Request body:**
```json
{
  "patient_id": "PATIENT_005",
  "cancer_type": "NSCLC",
  "cancer_stage": "IIIB",
  "tumor_vcf_content": "##fileformat=VCFv4.2\n...",
  "normal_vcf_content": "##fileformat=VCFv4.2\n..."
}
```

**Response:** Somatic variant profile with VAF, clonal classification, COSMIC annotation, OncoKB tier

#### `GET /api/oncology/tumor-mutational-burden/{tumor_sample_id}`
**Purpose:** Returns TMB score, MSI status, CNV summary, immunotherapy eligibility flag

---

### 1.6 Compliance: Updated `review_gate.py`

Replace the 3-point checklist with a **6-point oncology checklist** (backwards compatible — non-oncology samples still use 3-point):

```python
# Oncology-specific additions (active when sample_type_flag == "TUMOR")
checklist_tumor_normal_completed = Column(Boolean, default=False)
checklist_clonal_fraction_assessed = Column(Boolean, default=False)  
checklist_cnv_impact_evaluated = Column(Boolean, default=False)

# Original 3 items remain:
checklist_offtarget_reviewed = Column(Boolean, default=True)
checklist_personal_snps_checked = Column(Boolean, default=True)
checklist_wetlab_validation_mandated = Column(Boolean, default=True)
```

**New mandatory disclaimer when tumor sample type is detected:**
> ⚠️ *ONCOLOGY MODE: This sample is flagged as a somatic tumor specimen. All CRISPR designs target cancer-specific somatic mutations. Wet-lab validation must include both tumor cell lines AND matched normal cells to confirm tumor-specific editing. IBC (Institutional Biosafety Committee) pre-approval is required.*

---

### 1.7 Frontend: Sample Intake Extension

**File:** `frontend/src/components/SampleIntakeView.jsx`

**Add:** A new "Sample Type" toggle at the top of the intake form:
- 🔵 **Germline Research** (existing behavior, default)
- 🔴 **Tumor / Oncology** (new — activates dual VCF input)

When "Tumor / Oncology" is selected:
- Show **two VCF upload areas**: "Tumor Biopsy VCF" + "Matched Normal (Blood) VCF"
- Show cancer type selector (dropdown: NSCLC, Breast, CRC, GBM, AML, etc.)
- Show cancer stage input
- Display a red "ONCOLOGY MODE ACTIVE" banner that persists across all tabs

---

## Phase 2: OncoCRISPR Designer
**Duration:** Months 3–6 | **Priority:** 🟠 HIGH — core oncology CRISPR capability

### Goal
Extend the existing CRISPR designer to support allele-specific oncogene targeting — designing guides that cut the mutant cancer allele while leaving the healthy wildtype allele untouched.

---

### 2.1 Backend: `allele_specific_designer.py` (NEW FILE)

**Location:** `backend/modules/allele_specific_designer.py`

**Core Algorithm: Allele-Specific Discrimination Scoring**

The key challenge: design a guide where the somatic mutation (e.g., KRAS G12D: C→A at codon 12) falls in a position that maximizes cleavage of the mutant allele while minimizing cleavage of the wildtype allele.

**Strategy 1 — Mutation-Created PAM:**
Check if the somatic mutation converts a non-PAM sequence to NGG (or vice versa). If the mutation creates a new NGG PAM site, a guide targeting this site will only cut the tumor allele (the healthy allele has no PAM → no cutting).

```
Wildtype: ...AATAATGT... (no NGG)  → No cleavage ✅
Tumor:    ...AATAANGG... (NGG PAM) → Cleavage of cancer allele ✅
```

**Strategy 2 — Seed Region Mismatch Engineering:**
Position the somatic mutation in the guide's seed region (positions 14–20, PAM-proximal). The guide is designed to perfectly match the mutant allele at this position. Against the wildtype allele, there is a single-nucleotide mismatch in the seed region — typically reducing cleavage by 70–95%.

**Output per allele-specific guide:**
```json
{
  "guide_id": "ASG_KRAS_G12D_001",
  "target_mutation": "KRAS G12D (c.35G>A)",
  "strategy": "SEED_MISMATCH_ENGINEERING",
  "mutant_allele_efficiency": 0.84,
  "wildtype_allele_efficiency": 0.04,
  "discrimination_ratio": 21.0,
  "discrimination_verdict": "EXCELLENT — 21× preferential tumor cell targeting",
  "seed_mismatch_position": 17,
  "recommendation": "APPROVED FOR FURTHER VALIDATION"
}
```

**Discrimination Ratio threshold:** ≥ 10× (mutant/wildtype cleavage) required for approval

---

### 2.2 Extended `crispr_designer.py`

**Modification:** Add `design_mode` parameter to `scan_candidate_guides()`:
- `design_mode="germline"` — existing behavior (unchanged)
- `design_mode="oncology_allele_specific"` — activates allele-specific algorithm

**New function: `score_cnv_adjusted_offtarget(guide, cnv_profile)`**
- For every off-target site identified, multiply the CFD off-target cleavage probability by the copy number at that locus
- If a potential off-target sequence overlaps a region amplified 20×, the risk is 20× higher than standard CFD predicts
- Flag any off-target site overlapping known tumor suppressor gene loci (TP53, RB1, CDKN2A)

---

### 2.3 Extended `azimuth_cfd.py`

**Add tumor microenvironment penalty weights:**

```python
TUMOR_CONTEXT_PENALTIES = {
    "TP53_mutant_context": -0.12,    # p53 loss blunts DSB apoptosis response
    "BRCA_mutant_context": -0.18,    # Impaired HDR — prefer base editing
    "hypoxic_tumor": -0.08,          # Reduced HDR efficiency in hypoxia
    "high_copy_number_locus": -0.15  # Per copy above 4: increased instability risk
}
```

**New function: `score_azimuth_tumor_adjusted(guide_seq, tumor_context)`**
- Applies context-specific penalties before returning the final efficiency score
- Recommends alternative nuclease if penalties reduce efficiency below 0.5

---

### 2.4 New API Endpoints

#### `POST /api/crispr/allele-specific-design`
**Purpose:** Takes a somatic mutation + patient's tumor sequence, returns allele-specific guide candidates

**Request:**
```json
{
  "tumor_sample_id": "TUMOR_005_KRAS_G12D",
  "target_mutation": "KRAS G12D",
  "tumor_sequence": "ATGACTGAATATAAACTTGTGG...",
  "germline_sequence": "ATGACTGAATATAAACTTGTGG...",
  "pam_type": "SpCas9_NGG"
}
```

**Response:** List of allele-specific guide candidates with discrimination ratios and strategy classification

#### `POST /api/oncology/cnv-adjusted-offtarget`
**Purpose:** Adjusts existing CFD off-target scores for copy number variation at each off-target locus

---

### 2.5 Frontend: New `OncoCrisprDesignerView.jsx`

**New tab:** "🎯 OncoCRISPR" added to the main navigation

**UI Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  TMB Dashboard                                           │
│  TMB: 14.2 mut/Mb [HIGH] | MSI: MSS | Purity: 82%      │
├───────────────────────┬─────────────────────────────────┤
│ Driver Mutation Table │ Allele-Specific Guide Designer  │
│                       │                                 │
│ KRAS G12D — Tier 2A  │ Guide: ASG_KRAS_G12D_001        │
│ VAF: 78% (TRUNCAL)   │ Mutant efficiency:  84%         │
│ COSMIC Count: 41,247 │ Wildtype efficiency: 4%         │
│                       │ Discrimination: 21× ✅ EXCELLENT│
│ TP53 R248W — Tier 1  │                                 │
│ VAF: 62% (TRUNCAL)   │ Strategy: Seed mismatch pos.17  │
│                       │                                 │
├───────────────────────┴─────────────────────────────────┤
│ ⚠️  ONCOLOGY SAFETY: All designs require tumor-matched  │
│ normal cell line validation before wet-lab progression  │
└─────────────────────────────────────────────────────────┘
```

**Key features:**
- Ranked driver mutation table with OncoKB tier badges
- Side-by-side wildtype vs. tumor sequence visualization
- Discrimination ratio color coding: Green (≥10×), Amber (5–10×), Red (<5×)
- "Escalate to Expert Review" button that pre-fills the oncology 6-point checklist

---

## Phase 3: OncoViral Therapy Planner
**Duration:** Months 6–12 | **Priority:** 🟡 MEDIUM-HIGH — groundbreaking, higher complexity

### Goal
Build a first-in-class computational module for oncolytic virus engineering — inspired directly by what Dr. Beata Halassy did manually in her lab, this automates and formalizes the viral chassis selection, promoter design, and payload engineering process.

---

### 3.1 Backend: `viral_tropism_modeler.py` (NEW FILE)

**Location:** `backend/modules/viral_tropism_modeler.py`

**Viral Backbone Database (local):**
```python
ONCOLYTIC_VIRUS_BACKBONES = {
    "HSV1_Herpes": {
        "name": "Herpes Simplex Virus Type 1 (HSV-1)",
        "genome_size_kb": 152,
        "bsl_level": 2,
        "tumor_selectivity_mechanism": "IFN pathway deficiency exploitation",
        "natural_tropism": ["Neural", "Epithelial"],
        "fda_approved_derivative": "T-VEC (Imlygic) — Melanoma",
        "payload_capacity_kb": 30,
        "intratumoral_delivery": True,
        "systemic_delivery": False,
        "best_for_cancers": ["Melanoma", "Glioblastoma", "Head & Neck"],
        "immune_stimulation": "HIGH — GM-CSF payload standard",
        "modifications_needed": ["ICP34.5 deletion (neurovirulence)", "ICP47 deletion (MHC-I restoration)"]
    },
    "Adenovirus_Ad5": {
        "name": "Adenovirus Type 5 (Ad5)",
        "genome_size_kb": 36,
        "bsl_level": 2,
        "fda_approved_derivative": "DNX-2401 (Glioblastoma trials)",
        "best_for_cancers": ["NSCLC", "Colorectal", "Pancreatic"],
        "modifications_needed": ["E1B-55K deletion (p53-selective replication)", "E3 deletion (payload space)"]
    },
    "Measles_Virus_MV": {
        "name": "Measles Virus (MV-Edmonston strain)",
        "bsl_level": 2,
        "tumor_selectivity_mechanism": "CD46 receptor overexpression on cancer cells",
        "best_for_cancers": ["Myeloma", "Ovarian", "Breast"],
        "notable_case": "Used by Dr. Beata Halassy for breast cancer self-treatment (2024)"
    },
    "VSV_Indiana": {
        "name": "Vesicular Stomatitis Virus (VSV)",
        "bsl_level": 2,
        "tumor_selectivity_mechanism": "IFN-deficient cancer cells permissive; IFN-intact normal cells resistant",
        "best_for_cancers": ["Hepatocellular", "Melanoma", "Blood Cancers"],
        "notable_case": "Used in combination with MV by Dr. Beata Halassy"
    },
    "Newcastle_Disease_NDV": {
        "name": "Newcastle Disease Virus (NDV)",
        "bsl_level": 2,
        "tumor_selectivity_mechanism": "Natural preference for human cancer cells; non-pathogenic in humans",
        "best_for_cancers": ["Melanoma", "Pancreatic", "Colorectal"]
    }
}
```

**Key functions:**
- `recommend_viral_chassis(cancer_type, tmb_score, msi_status, immune_status)` → ranked backbone list
- `design_tumor_specific_promoter(oncogene_expression_profile)` → returns promoter sequence + synthetic construct
- `calculate_viral_immunogenicity_risk(patient_hla_type, viral_backbone)` → pre-existing immunity risk score
- `design_cytokine_payload(target_immune_response)` → recommends GM-CSF, IL-12, IFN-β, or CD40L payload

---

### 3.2 Extended `delivery_advisor.py`

**Add new section: `ONCOLYTIC_DELIVERY_PROFILES`**

```python
ONCOLYTIC_DELIVERY_PROFILES = {
    "INTRATUMORAL_INJECTION": {
        "name": "Direct Intratumoral Injection",
        "recommended_for": ["Accessible solid tumors", "Melanoma", "Head & Neck"],
        "precedent": "T-VEC (FDA-approved intratumoral HSV-1)",
        "bsl_requirement": "BSL-2 containment for viral preparation",
        "immune_activation": "LOCAL — converts cold tumor to hot",
        "volume_per_injection_ml": "Up to 4mL per lesion",
        "dosing_schedule": "Every 2 weeks × 6 cycles (T-VEC standard)"
    },
    "INTRAVENOUS_SYSTEMIC": {
        "name": "Systemic Intravenous Administration",
        "recommended_for": ["Metastatic disease", "Hematological malignancies"],
        "risk": "HIGH — requires prior immunological assessment; cytokine storm risk"
    }
}
```

---

### 3.3 New API Endpoints

#### `POST /api/oncolytic/recommend-chassis`
**Request:** cancer type, TMB score, patient immune status  
**Response:** Ranked list of 3 viral backbones with rationale, BSL level, FDA precedent

#### `POST /api/oncolytic/design-payload`
**Request:** selected backbone, desired immune mechanism  
**Response:** cytokine payload design + synthetic promoter sequence + Golden Gate assembly strategy

#### `GET /api/oncolytic/viral-database`
**Response:** Full list of all oncolytic virus backbones with metadata

---

### 3.4 Frontend: `OncoViralPlannerView.jsx` (NEW COMPONENT)

**New tab:** "🦠 Viral Therapy" added to navigation

**UI Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ ONCOLYTIC VIRUS THERAPY PLANNER                              │
│ ⚠️ BSL-2 RESEARCH TOOL — Requires IBC Approval             │
├──────────────────────────┬───────────────────────────────────┤
│ Virus Chassis Selector   │ Blueprint Summary                 │
│                          │                                   │
│ 🥇 HSV-1 (T-VEC family) │ Selected: HSV-1 Modified          │
│    FDA Precedent: T-VEC  │ ICP34.5 deleted ✅                │
│    Best for: Melanoma    │ ICP47 deleted ✅                  │
│                          │ GM-CSF payload: 492 bp            │
│ 🥈 VSV (Indiana strain)  │ TERT promoter: tumor-specific     │
│    Used by Dr. Halassy   │ Delivery: Intratumoral injection  │
│    Best for: Breast      │                                   │
│                          │ Immunogenicity Risk: LOW          │
│ 🥉 MV (Edmonston)        │ Estimated viral titer needed:     │
│    Used by Dr. Halassy   │ 1×10⁶ – 1×10⁸ TCID50/mL          │
│    Best for: Myeloma     │                                   │
├──────────────────────────┴───────────────────────────────────┤
│ PAYLOAD DESIGN                                               │
│ Cytokine: [GM-CSF ▼]  Promoter: [TERT (tumor-specific) ▼]  │
│ BSL Level: 2 | Assembly Strategy: Golden Gate (BsaI)        │
└──────────────────────────────────────────────────────────────┘
```

---

## Phase 4: Advanced Cancer AI Features
**Duration:** Months 12–18 | **Priority:** 🟢 STRATEGIC — competitive moat

### 4.1 CAR-T Cell Designer

**New module:** `backend/modules/car_t_designer.py`

Designs:
- **CAR construct:** scFv antigen-binding domain (target: CD19, HER2, EGFRvIII, MSLN, GD2), hinge region, transmembrane domain, co-stimulatory domains (4-1BB vs. CD28 comparison)
- **CRISPR knockout panel:** TRAC (endogenous TCR removal), B2M (allogeneic), PD-1 (anti-exhaustion), TET2 (persistence enhancement)
- **Integration strategy:** Targeted insertion at TRAC locus using HDR template via Cas12a + long ssDNA donor

**New frontend component:** `CarTDesignerView.jsx`

---

### 4.2 Neoantigen & mRNA Vaccine Generator

**New module:** `backend/modules/neoantigen_predictor.py`

Logic:
1. Take all somatic missense mutations from the tumor profile
2. For each mutation, compute the mutant peptide sequence (8-11 mer sliding window)
3. Query **NetMHCpan API** (public endpoint) with patient's HLA type
4. Rank neoantigens by predicted HLA binding affinity (IC50 < 500 nM = strong binder)
5. Design synthetic mRNA sequence for top 20 neoantigens (BioNTech-style personalized vaccine format)

---

### 4.3 Tumor Evolution Predictor

**New module:** `backend/modules/tumor_evolution.py`

Uses phylogenetics-style algorithms:
- Build a simple clonal evolution tree from VAF data (truncal → subclonal branches)
- Predict which subclones are likely to survive CRISPR targeting (those without the targeted mutation)
- Suggest "second-strike" preemptive guide designs for predicted resistance clones
- Warn if targeting a subclonal mutation could give selective advantage to other clones

---

### 4.4 Patient Digital Twin Dashboard

**Extended:** `ResearchReportView.jsx` → new "Patient Timeline" tab

- After initial analysis, allows uploading of follow-up liquid biopsy data (ctDNA)
- Tracks clonal dynamics over time (was the KRAS G12D clone eliminated or expanding?)
- Updates CRISPR guide relevance scores based on current tumor evolution state
- Longitudinal audit trail: every ctDNA upload creates a timestamped checkpoint

---

## Complete File Manifest

### New Backend Files (5 total)
| File | Phase | Complexity |
|------|-------|-----------|
| `backend/modules/somatic_variant_caller.py` | Phase 1 | Medium |
| `backend/modules/tumor_genomics.py` | Phase 1 | Low–Medium |
| `backend/modules/allele_specific_designer.py` | Phase 2 | High |
| `backend/modules/viral_tropism_modeler.py` | Phase 3 | High |
| `backend/modules/neoantigen_predictor.py` | Phase 4 | High |

### Modified Backend Files (5 total)
| File | Change | Phase |
|------|--------|-------|
| `backend/modules/variant_annotation.py` | Add `annotate_somatic_variant()`, COSMIC/OncoKB queries | Phase 1 |
| `backend/modules/crispr_designer.py` | Add `design_mode` param, `score_cnv_adjusted_offtarget()` | Phase 2 |
| `backend/modules/azimuth_cfd.py` | Add `score_azimuth_tumor_adjusted()`, tumor penalties | Phase 2 |
| `backend/modules/delivery_advisor.py` | Add `ONCOLYTIC_DELIVERY_PROFILES` | Phase 3 |
| `backend/modules/review_gate.py` | Extend checklist to 6-point for oncology samples | Phase 1 |

### New Database Tables (4 total)
| Table | Phase |
|-------|-------|
| `tumor_samples` | Phase 1 |
| `somatic_mutations` | Phase 1 |
| `viral_blueprints` | Phase 3 |
| `neoantigen_predictions` | Phase 4 |

### New API Endpoints (8 total)
| Endpoint | Method | Phase |
|---------|--------|-------|
| `/api/oncology/tumor-normal-ingest` | POST | Phase 1 |
| `/api/oncology/tumor-mutational-burden/{id}` | GET | Phase 1 |
| `/api/crispr/allele-specific-design` | POST | Phase 2 |
| `/api/oncology/cnv-adjusted-offtarget` | POST | Phase 2 |
| `/api/oncolytic/recommend-chassis` | POST | Phase 3 |
| `/api/oncolytic/design-payload` | POST | Phase 3 |
| `/api/oncolytic/viral-database` | GET | Phase 3 |
| `/api/oncology/neoantigen-predict` | POST | Phase 4 |

### New Frontend Components (4 total)
| Component | Phase |
|-----------|-------|
| `OncoCrisprDesignerView.jsx` | Phase 2 |
| `OncoViralPlannerView.jsx` | Phase 3 |
| `CarTDesignerView.jsx` | Phase 4 |
| Extended `SampleIntakeView.jsx` (oncology toggle) | Phase 1 |

---

## Compliance & Safety Additions

| Addition | Phase | Driver |
|----------|-------|--------|
| Tumor vs. Germline sample type mandatory flag | Phase 1 | FDA SaMD |
| 6-point oncology Expert Review checklist | Phase 1 | GCP, ICH E6 |
| BSL-2 IBC pre-approval reminder for viral therapy | Phase 3 | NIH DURC |
| Minimum 60% CCF threshold for safe CRISPR targeting | Phase 1 | Clinical Safety |
| CNV-adjusted off-target warnings | Phase 2 | Patient Safety |
| Multi-reviewer consensus for oncology reviews | Phase 2 | GCP |
| Updated disclaimer for oncology mode | Phase 1 | FDA, Legal |

---

## Open Questions for Your Decision

> [!IMPORTANT]
> **Q1: Do you want to start with Phase 1 immediately?**  
> Phase 1 is a prerequisite for everything else. It involves no risk to the existing codebase — all new code goes into new files. The only modification to existing files is adding a new function to `variant_annotation.py`.

> [!IMPORTANT]
> **Q2: Real external API access or local simulation first?**  
> COSMIC requires an academic license (free). OncoKB also requires free registration. Do you want to:  
> (a) Build with real API integrations from day one, or  
> (b) Start with a local curated somatic hotspot database (KRAS, TP53, EGFR, BRAF, BRCA2) and add live APIs later?

> [!NOTE]
> **Q3: Which cancer types should be prioritized for Phase 1 benchmark samples?**  
> Recommended: NSCLC (KRAS/EGFR), Breast (BRCA2/HER2), Colorectal (KRAS/BRAF), and GBM (IDH1/EGFR amplification).

> [!NOTE]
> **Q4: Phase ordering preference?**  
> All agents recommend Phase 1 → Phase 2 → Phase 3. But if oncolytic virotherapy is more exciting to you personally, Phase 3 could be prototyped in parallel with Phase 2 as a standalone module.
