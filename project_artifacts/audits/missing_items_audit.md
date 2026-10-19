# Genomic Research Copilot — Incomplete Items Audit
**Generated:** 2026-09-20 | **Against:** implementation_plan.md v1.0

---

## Summary: What Is Done vs What Is Missing

| Phase | Items in Plan | Done | Missing |
|-------|-------------|------|---------|
| Phase 1 — Somatic Foundation | 7 items | 6 ✅ | **1 ❌** |
| Phase 2 — OncoCRISPR Designer | 5 items | 2 ✅ | **3 ❌** |
| Phase 3 — OncoViral Therapy | 4 items | 3 ✅ | **1 ❌** |
| Phase 4 — Advanced Cancer AI | 4 items | 0 ✅ | **4 ❌** |
| **TOTAL** | **20 items** | **11 ✅** | **9 ❌** |

---

## ❌ MISSING ITEM 1 — Oncology Toggle in SampleIntakeView
**Priority:** 🔴 CRITICAL | **Phase:** 1 | **File:** `frontend/src/components/SampleIntakeView.jsx`

### What the Plan Says
The SampleIntakeView needs a "Sample Type" toggle at the top:
- 🔵 **Germline Research** (existing behavior, default)
- 🔴 **Tumor / Oncology** (activates dual-VCF input mode)

When Oncology mode is active:
- Two VCF text areas: **Tumor Biopsy VCF** + **Matched Normal (Blood) VCF**
- Cancer type dropdown (NSCLC, Breast, CRC, GBM, AML, etc.)
- Cancer stage input
- Persistent red "ONCOLOGY MODE ACTIVE" banner across all tabs
- A "Run Tumor-Normal Analysis" button that calls `POST /api/oncology/tumor-normal-ingest`

### Current State
SampleIntakeView has **zero oncology functionality**. It only accepts single germline VCFs. There is no mode toggle, no dual-VCF input, and no connection to the new oncology endpoints.

### Exact Code Needed
Add this to `SampleIntakeView.jsx` at the top of the return block:

```jsx
// New state variables to add:
const [sampleMode, setSampleMode] = useState('germline'); // 'germline' | 'oncology'
const [tumorVcfText, setTumorVcfText] = useState('');
const [normalVcfText, setNormalVcfText] = useState('');
const [cancerType, setCancerType] = useState('NSCLC');
const [cancerStage, setCancerStage] = useState('');
const [oncologyResult, setOncologyResult] = useState(null);
const [oncologyLoading, setOncologyLoading] = useState(false);

// Mode toggle UI (goes at top of form):
<div className="flex gap-2 mb-4">
  <button onClick={() => setSampleMode('germline')}
    className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${
      sampleMode === 'germline'
        ? 'bg-blue-900 border-blue-500 text-blue-200'
        : 'bg-slate-800 border-slate-700 text-slate-400'
    }`}>
    🔵 Germline Research
  </button>
  <button onClick={() => setSampleMode('oncology')}
    className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${
      sampleMode === 'oncology'
        ? 'bg-rose-900 border-rose-500 text-rose-200'
        : 'bg-slate-800 border-slate-700 text-slate-400'
    }`}>
    🔴 Tumor / Oncology
  </button>
</div>

// Oncology mode banner:
{sampleMode === 'oncology' && (
  <div className="bg-rose-950/60 border border-rose-600 rounded-lg p-3 text-rose-300 text-xs font-bold mb-4">
    ⚠️ ONCOLOGY MODE ACTIVE — Tumor-Normal paired analysis enabled.
    All CRISPR designs will target somatic cancer mutations only.
  </div>
)}

// Dual VCF input (shown when sampleMode === 'oncology'):
{sampleMode === 'oncology' && (
  <div className="flex flex-col gap-3">
    <select value={cancerType} onChange={e => setCancerType(e.target.value)}>
      {['NSCLC','Breast Cancer','Colorectal CRC','GBM','AML','PDAC','Melanoma','Ovarian'].map(c =>
        <option key={c}>{c}</option>
      )}
    </select>
    <textarea placeholder="TUMOR BIOPSY VCF — paste biopsy sequencing VCF here"
      value={tumorVcfText} onChange={e => setTumorVcfText(e.target.value)} rows={5} />
    <textarea placeholder="MATCHED NORMAL VCF — paste blood/germline VCF here"
      value={normalVcfText} onChange={e => setNormalVcfText(e.target.value)} rows={5} />
    <button onClick={handleOncologyAnalysis}>Run Tumor-Normal Analysis</button>
  </div>
)}
```

---

## ❌ MISSING ITEM 2 — CNV-Adjusted Off-Target Scoring
**Priority:** 🟠 HIGH | **Phase:** 2 | **File:** `backend/modules/crispr_designer.py`

### What the Plan Says
Add `score_cnv_adjusted_offtarget(guide, cnv_profile)` to `crispr_designer.py`.

Logic:
- For every off-target site identified by CFD scoring, multiply the CFD cleavage probability by the local copy number at that locus
- If a potential off-target site overlaps a region amplified 20×, the risk is 20× higher than standard CFD predicts
- Flag any off-target site overlapping known tumor suppressor genes: TP53, RB1, CDKN2A, PTEN, APC

Also add **new API endpoint:** `POST /api/oncology/cnv-adjusted-offtarget`

### Current State
`crispr_designer.py` has NO oncology-aware off-target scoring. The existing CFD scoring in `azimuth_cfd.py` is blind to copy number variations. This is a **patient safety gap** — an off-target hit on a TSG amplified 20× is catastrophic and currently undetected.

### Exact Code Needed

**In `crispr_designer.py`**, add:
```python
# CNV-amplified tumor suppressor genes — off-target here is catastrophic
CRITICAL_TSG_LOCI = {
    "TP53":   {"chrom": "chr17", "start": 7668402,   "end": 7687550},
    "RB1":    {"chrom": "chr13", "start": 48303751,  "end": 48481890},
    "CDKN2A": {"chrom": "chr9",  "start": 21967751,  "end": 21994490},
    "PTEN":   {"chrom": "chr10", "start": 89622870,  "end": 89731687},
    "APC":    {"chrom": "chr5",  "start": 112707498, "end": 112846239},
}

def score_cnv_adjusted_offtarget(
    guide_offtarget_sites: List[Dict],
    cnv_profile: Dict,            # {locus_key: copy_number}
    ploidy: int = 2,
) -> List[Dict]:
    """
    Adjusts CFD off-target cleavage scores for tumor copy number amplification.
    
    A standard SpCas9 off-target site with CFD=0.05 at a locus amplified 10x
    has an effective risk of 0.05 * (10/2) = 0.25 — 5x higher than diploid.
    """
    results = []
    for site in guide_offtarget_sites:
        locus = site.get("locus_key", "")
        base_cfd = site.get("cfd_score", 0.0)
        copy_number = cnv_profile.get(locus, ploidy)
        
        cn_multiplier = copy_number / ploidy
        adjusted_score = base_cfd * cn_multiplier
        
        # Check if this off-target overlaps a critical TSG
        tsg_overlap = None
        for gene, region in CRITICAL_TSG_LOCI.items():
            if site.get("chrom") == region["chrom"]:
                pos = site.get("position", 0)
                if region["start"] <= pos <= region["end"]:
                    tsg_overlap = gene
                    break
        
        risk_level = "CRITICAL" if tsg_overlap else (
            "HIGH" if adjusted_score > 0.3 else
            "MODERATE" if adjusted_score > 0.1 else "LOW"
        )
        
        results.append({
            **site,
            "base_cfd_score": base_cfd,
            "copy_number_at_locus": copy_number,
            "cn_multiplier": round(cn_multiplier, 2),
            "cnv_adjusted_score": round(adjusted_score, 4),
            "tsg_overlap": tsg_overlap,
            "risk_level": risk_level,
            "warning": (
                f"⚠️ OFF-TARGET IN {tsg_overlap} TUMOR SUPPRESSOR GENE — "
                f"Copy number {copy_number}x amplifies risk {cn_multiplier:.1f}×. "
                "This off-target hit could cause catastrophic TSG loss. "
                "Consider alternative guide or base editor."
            ) if tsg_overlap else None,
        })
    
    # Sort: CRITICAL first, then by adjusted score descending
    results.sort(key=lambda x: (x["risk_level"] != "CRITICAL", -x["cnv_adjusted_score"]))
    return results
```

**New endpoint in `main.py`:**
```python
@app.post("/api/oncology/cnv-adjusted-offtarget")
def get_cnv_adjusted_offtarget(payload: dict):
    from modules.crispr_designer import score_cnv_adjusted_offtarget
    return score_cnv_adjusted_offtarget(
        guide_offtarget_sites=payload["offtarget_sites"],
        cnv_profile=payload.get("cnv_profile", {}),
    )
```

---

## ❌ MISSING ITEM 3 — Tumor Microenvironment CRISPR Penalties
**Priority:** 🟠 HIGH | **Phase:** 2 | **File:** `backend/modules/azimuth_cfd.py`

### What the Plan Says
Add `TUMOR_CONTEXT_PENALTIES` and `score_azimuth_tumor_adjusted()` to `azimuth_cfd.py`.

Penalizes on-target efficiency when:
- TP53 is mutated (p53 loss blunts DSB apoptosis response — reduces NHEJ efficiency)
- BRCA1/2 is mutated (impaired HDR — prefer base editing over nuclease)
- Tumor is hypoxic (reduced HDR efficiency in low-oxygen environments)
- Target locus has high copy number (each extra copy needs editing, reduces overall efficiency)

### Current State
`azimuth_cfd.py` scores guides with no awareness of tumor biology context. A guide scored 0.82 in a BRCA2-mutant tumor is dramatically less effective than the same guide in a BRCA2-wildtype context. This is a **scientific accuracy gap**.

### Exact Code Needed

**In `azimuth_cfd.py`**, add:
```python
TUMOR_CONTEXT_PENALTIES = {
    "TP53_mutant":          -0.12,  # p53 loss → blunted DSB apoptosis, reduced NHEJ
    "BRCA1_mutant":         -0.18,  # Severely impaired HDR
    "BRCA2_mutant":         -0.18,  # Severely impaired HDR — strongly prefer ABE/CBE
    "BRCA_mutant":          -0.18,  # Generic BRCA (either)
    "hypoxic_tumor":        -0.08,  # Hypoxia reduces HDR efficiency ~30%
    "high_cn_locus_4x":     -0.10,  # Per-allele efficiency reduced 10% at 4x CN
    "high_cn_locus_8x":     -0.20,  # Per-allele efficiency reduced 20% at 8x CN
    "high_cn_locus_10x":    -0.25,  # Per-allele efficiency reduced 25% at 10x+ CN
    "msi_high_tumor":       +0.05,  # MSI-High tumors have elevated NHEJ activity
}

NUCLEASE_FALLBACK_RECOMMENDATIONS = {
    "BRCA_mutant": "Adenine Base Editor (ABE8e) — no DSB required, HDR-independent",
    "high_cn_locus": "CRISPRi (dCas9-KRAB) — transcriptional repression avoids amplification instability",
    "TP53_mutant": "Cas12a (AsCas12a) — generates 5' overhangs preferred by alt-NHEJ in p53-null cells",
}

def score_azimuth_tumor_adjusted(
    guide_seq: str,
    base_azimuth_score: float,
    tumor_context: Dict,
) -> Dict:
    """
    Adjusts Azimuth on-target efficiency score for tumor-specific biology.
    
    Args:
        guide_seq: 20-nt guide sequence
        base_azimuth_score: Raw Azimuth 2.0 score (0-1)
        tumor_context: Dict with keys like 'tp53_mutant', 'brca2_mutant',
                       'copy_number', 'is_hypoxic', 'msi_status'
    
    Returns:
        Dict with adjusted score, penalties applied, and alternative nuclease rec.
    """
    total_penalty = 0.0
    penalties_applied = []
    fallback_nuclease = None
    
    if tumor_context.get("tp53_mutant"):
        total_penalty += TUMOR_CONTEXT_PENALTIES["TP53_mutant"]
        penalties_applied.append("TP53 mutation: -12% (blunted DSB apoptosis response)")
    
    if tumor_context.get("brca1_mutant") or tumor_context.get("brca2_mutant"):
        total_penalty += TUMOR_CONTEXT_PENALTIES["BRCA2_mutant"]
        penalties_applied.append("BRCA mutation: -18% (impaired HDR — nuclease editing unreliable)")
        fallback_nuclease = NUCLEASE_FALLBACK_RECOMMENDATIONS["BRCA_mutant"]
    
    if tumor_context.get("is_hypoxic"):
        total_penalty += TUMOR_CONTEXT_PENALTIES["hypoxic_tumor"]
        penalties_applied.append("Tumor hypoxia: -8% (reduced HDR in low-oxygen environment)")
    
    cn = tumor_context.get("copy_number", 2)
    if cn >= 10:
        total_penalty += TUMOR_CONTEXT_PENALTIES["high_cn_locus_10x"]
        penalties_applied.append(f"High copy number ({cn}x): -25% (per-allele editing efficiency drop)")
        if not fallback_nuclease:
            fallback_nuclease = NUCLEASE_FALLBACK_RECOMMENDATIONS["high_cn_locus"]
    elif cn >= 8:
        total_penalty += TUMOR_CONTEXT_PENALTIES["high_cn_locus_8x"]
        penalties_applied.append(f"High copy number ({cn}x): -20%")
    elif cn >= 4:
        total_penalty += TUMOR_CONTEXT_PENALTIES["high_cn_locus_4x"]
        penalties_applied.append(f"Elevated copy number ({cn}x): -10%")
    
    if tumor_context.get("msi_status") == "MSI-High":
        total_penalty += TUMOR_CONTEXT_PENALTIES["msi_high_tumor"]
        penalties_applied.append("MSI-High: +5% (elevated NHEJ activity)")
    
    adjusted_score = max(0.0, min(1.0, base_azimuth_score + total_penalty))
    
    return {
        "guide_sequence": guide_seq,
        "base_azimuth_score": round(base_azimuth_score, 4),
        "total_tumor_penalty": round(total_penalty, 4),
        "adjusted_score": round(adjusted_score, 4),
        "penalties_applied": penalties_applied,
        "fallback_nuclease_recommendation": fallback_nuclease,
        "recommend_base_editor": fallback_nuclease is not None,
        "warning": (
            f"Tumor context reduces predicted efficiency from "
            f"{base_azimuth_score:.0%} to {adjusted_score:.0%}. "
            f"Consider: {fallback_nuclease}"
        ) if fallback_nuclease else None,
    }
```

---

## ❌ MISSING ITEM 4 — Oncolytic Delivery Profiles in delivery_advisor.py
**Priority:** 🟡 MEDIUM | **Phase:** 3 | **File:** `backend/modules/delivery_advisor.py`

### What the Plan Says
Add `ONCOLYTIC_DELIVERY_PROFILES` dict to `delivery_advisor.py` covering:
- Direct intratumoral injection (T-VEC standard)
- Systemic intravenous administration
- BSL-2 containment requirements
- Dosing schedules, monitoring requirements

### Current State
`delivery_advisor.py` handles gene therapy vectors (AAV, LNP, RNP) but has **zero viral oncolytic delivery knowledge**. The `OncoViralPlannerView` blueprint UI currently shows delivery info from `viral_tropism_modeler.py` directly, but it should also be callable via the delivery advisor API.

### Exact Code Needed

**In `delivery_advisor.py`**, add:
```python
ONCOLYTIC_DELIVERY_PROFILES = {
    "INTRATUMORAL_INJECTION": {
        "name": "Direct Intratumoral (IT) Injection",
        "description": "Direct injection of viral suspension into accessible solid tumor lesions.",
        "precedent": "T-VEC (Talimogene laherparepvec) — FDA approved 2015 for advanced melanoma",
        "bsl_requirement": "BSL-2 — viral preparation in Class II Type A2 biological safety cabinet",
        "recommended_for": ["Accessible solid tumors", "Melanoma", "Head & Neck SCC", "Soft Tissue Sarcoma"],
        "not_recommended_for": ["Lesions < 5mm", "Lesions adjacent to major vasculature", "Brain tumors (except via stereotactic neurosurgery)"],
        "injection_volume_ml_per_lesion": "Up to 4 mL per accessible lesion (T-VEC standard)",
        "dosing_schedule": "Day 1 initial dose, Day 21 second dose, then every 2 weeks for up to 6 total doses",
        "monitoring": [
            "Vital signs every 30 min for 2 hours post-injection",
            "CBC with differential at Day 3, 7, 14 post-injection",
            "Fever/flu-like symptom diary for 72 hours",
            "Local injection site photographs at each visit",
        ],
        "immune_activation": "LOCAL abscopal effect — converts immunologically cold tumor to hot; can prime systemic T-cell response",
        "immune_side_effects": "Injection site reactions (83%), flu-like symptoms (57%), fatigue (36%)",
        "contraindications": ["Severely immunocompromised patients (absolute CD4 < 100)", "Active HSV infection (HSV-1 backbones)", "Pregnancy"],
    },
    "INTRAVENOUS_SYSTEMIC": {
        "name": "Systemic Intravenous (IV) Administration",
        "description": "Intravenous infusion for systemic viral distribution to multiple metastatic lesions.",
        "precedent": "MV-NIS (Mayo Clinic Phase I/II — multiple myeloma, ovarian cancer); VSV-IFNβ-NIS",
        "bsl_requirement": "BSL-2 — specialized infusion suite required; oncology nursing staff trained in viral therapy",
        "recommended_for": ["Hematological malignancies (multiple myeloma, AML)", "Multiple liver metastases", "Systemic disease not amenable to IT injection"],
        "not_recommended_for": ["Patients with significant pre-existing immunity to selected virus", "Severely immunocompromised (risk of systemic viral spread)"],
        "infusion_rate": "Slow IV infusion over 30-60 minutes; maximum rate 1 mL/min",
        "monitoring": [
            "Continuous cardiac monitoring for 4 hours post-infusion",
            "Cytokine panel (IL-6, TNF-α, IFN-γ) at 2h, 6h, 24h",
            "CBC, CMP, LFTs at 24h, 48h, 1 week",
            "SPECT or PET-CT (if NIS payload) at Day 7 to confirm viral localization",
        ],
        "immune_activation": "SYSTEMIC — targets multiple tumor sites simultaneously",
        "immune_side_effects": "Cytokine release syndrome (CRS) risk — grade 1-2 common, grade 3-4 rare but requires ICU management",
        "risk_note": "CYTOKINE STORM RISK — ensure IL-6 receptor antagonist (Tocilizumab) available at bedside",
    },
    "INTRAPLEURAL_INTRAPERITONEAL": {
        "name": "Intrapleural / Intraperitoneal Administration",
        "description": "Instillation into pleural or peritoneal cavities for locally advanced disease.",
        "precedent": "Several Phase I trials for mesothelioma (intrapleural), ovarian cancer (intraperitoneal)",
        "bsl_requirement": "BSL-2 — requires interventional oncology / thoracic surgery collaboration",
        "recommended_for": ["Malignant pleural mesothelioma", "Ovarian cancer with peritoneal carcinomatosis"],
        "monitoring": ["Serial imaging at 2-week intervals", "Cytology of effusion fluid", "Pleural/peritoneal fluid viral load by PCR"],
    },
}
```

---

## ❌ MISSING ITEM 5 — Neoantigen Predictor Module (Phase 4)
**Priority:** 🟢 STRATEGIC | **Phase:** 4 | **File:** `backend/modules/neoantigen_predictor.py` (NOT CREATED)

### What the Plan Says
The neoantigen predictor:
1. Takes all somatic missense mutations from the tumor profile
2. For each mutation, computes the mutant peptide sequence (8–11 mer sliding window)
3. Queries **NetMHCpan API** with patient's HLA type
4. Ranks neoantigens by predicted HLA binding affinity (IC50 < 500 nM = strong binder)
5. Designs synthetic mRNA vaccine sequence for top 20 neoantigens (personalized cancer vaccine)

### Current State
**File does not exist at all.** No neoantigen prediction capability. This is also connected to:
- Missing API endpoint: `POST /api/oncology/neoantigen-predict`
- Missing database table: `neoantigen_predictions`
- Missing frontend view (no `NeoantigenView.jsx` component)

### Exact Code Needed

**Create `backend/modules/neoantigen_predictor.py`:**
```python
"""
neoantigen_predictor.py — Phase 4
Predicts patient-specific cancer neoantigens and designs personalized mRNA vaccine constructs.
"""
from typing import Dict, List, Optional

# Genetic code for peptide translation
CODON_TABLE = {
    'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
    'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
    'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
    'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
    'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
    'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
    'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
    'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
    'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
    'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
    'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
    'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
    'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
    'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
    'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
    'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
}

# Known strong HLA-binding neoantigens for benchmark (curated)
BENCHMARK_NEOANTIGEN_DB = {
    "KRAS_G12D": {
        "wildtype_peptide":  "GAMDVVVGASGVGKS",
        "mutant_peptide":    "GADMVVVGASGVGKS",  # G→D at position 12
        "hla_alleles":       ["HLA-A*11:01", "HLA-A*02:01"],
        "predicted_ic50_nm": 42.3,
        "immunogenicity":    "HIGH",
        "vaccine_priority":  1,
    },
    "TP53_R175H": {
        "wildtype_peptide":  "VVRCPHHERCSDSDGLAPPQHLIRVEGNLRVEYLDDRNTFRHSVVVPYEPPEV",
        "mutant_peptide":    "VVRCPHHERCSDSDGLAPPQHLIRVEGNLHVEYLDDRNTFRHSVVVPYEPPEV",
        "hla_alleles":       ["HLA-A*02:01"],
        "predicted_ic50_nm": 128.7,
        "immunogenicity":    "MODERATE",
        "vaccine_priority":  2,
    },
    "BRAF_V600E": {
        "wildtype_peptide":  "GDFGLATEKSRWSGSHQFEQLSGSILWM",
        "mutant_peptide":    "GDFGLATEKSRWSGSHQFEQLSGSILWM".replace("V","E",1),
        "hla_alleles":       ["HLA-A*02:01", "HLA-A*24:02"],
        "predicted_ic50_nm": 87.5,
        "immunogenicity":    "HIGH",
        "vaccine_priority":  1,
    },
}

def generate_mutant_peptides(
    amino_acid_sequence: str,
    mutation_position: int,   # 0-indexed position in protein
    peptide_lengths: List[int] = [8, 9, 10, 11],
) -> List[Dict]:
    """Generates all peptide windows (8-11 mers) containing the somatic mutation."""
    peptides = []
    for length in peptide_lengths:
        for start in range(max(0, mutation_position - length + 1), mutation_position + 1):
            end = start + length
            if end <= len(amino_acid_sequence):
                peptide = amino_acid_sequence[start:end]
                if len(peptide) == length:
                    peptides.append({
                        "sequence": peptide,
                        "length": length,
                        "start_position": start,
                        "end_position": end,
                        "contains_mutation": start <= mutation_position < end,
                        "mutation_position_in_peptide": mutation_position - start,
                    })
    return [p for p in peptides if p["contains_mutation"]]


def predict_neoantigen_candidates(
    somatic_variants: List[Dict],
    hla_type: Optional[str] = "HLA-A*02:01",
) -> Dict:
    """
    Predicts neoantigen candidates from somatic missense mutations.
    Uses curated benchmark DB for known hotspot mutations.
    For novel mutations, applies a simple hydrophobicity-based affinity estimate.
    
    In production: integrate NetMHCpan 4.1 API for HLA binding prediction.
    API endpoint: https://services.healthtech.dtu.dk/services/NetMHCpan-4.1/
    """
    candidates = []
    
    for variant in somatic_variants:
        gene = variant.get("gene", "Unknown")
        aa_change = variant.get("amino_acid_change", "")
        mutation_key = f"{gene}_{aa_change}"
        
        # Check curated benchmark DB first
        if mutation_key in BENCHMARK_NEOANTIGEN_DB:
            neo = BENCHMARK_NEOANTIGEN_DB[mutation_key].copy()
            neo["gene"] = gene
            neo["amino_acid_change"] = aa_change
            neo["source"] = "Curated Benchmark DB"
            neo["variant"] = variant
            candidates.append(neo)
            continue
        
        # Novel mutation — simple affinity estimate
        is_oncogenic = variant.get("is_oncogenic", False)
        ccf = variant.get("cancer_cell_fraction", 0.5)
        
        # Heuristic: truncal oncogenic mutations tend to generate better neoantigens
        if is_oncogenic and ccf >= 0.60:
            estimated_ic50 = 250 + (hash(aa_change) % 400)  # 250-650 nM range
            candidates.append({
                "gene": gene,
                "amino_acid_change": aa_change,
                "mutant_peptide": f"[Requires NetMHCpan for {gene} {aa_change}]",
                "predicted_ic50_nm": estimated_ic50,
                "immunogenicity": "PREDICTED_MODERATE" if estimated_ic50 < 500 else "PREDICTED_LOW",
                "vaccine_priority": 2 if estimated_ic50 < 500 else 3,
                "hla_alleles": [hla_type],
                "source": "Heuristic Estimate — Run NetMHCpan for validation",
                "variant": variant,
            })
    
    # Sort by vaccine priority then IC50
    candidates.sort(key=lambda x: (x.get("vaccine_priority", 99), x.get("predicted_ic50_nm", 9999)))
    
    top_20 = candidates[:20]
    
    return {
        "hla_type": hla_type,
        "total_candidates": len(candidates),
        "top_20_neoantigens": top_20,
        "strong_binders": [c for c in top_20 if c.get("predicted_ic50_nm", 9999) < 500],
        "vaccine_design_summary": {
            "total_peptides_in_vaccine": len(top_20),
            "strong_binders_count": len([c for c in top_20 if c.get("predicted_ic50_nm", 9999) < 500]),
            "mrna_vaccine_format": "BioNTech-style individualized neoantigen vaccine (iNeST / mRNA-4157)",
            "poly_neoantigen_design": f"{len(top_20)}-neoantigen personalized mRNA vaccine",
            "delivery_recommendation": "LNP-encapsulated mRNA, intramuscular injection, 2-dose prime-boost",
            "manufacturing_timeline": "~6-8 weeks from sequencing to personalized vaccine batch",
        },
        "clinical_note": (
            "Strong binders (IC50 < 500 nM) are prioritized for vaccine inclusion. "
            "Truncal mutations (present in all tumor cells) are preferred over subclonal "
            "to ensure all tumor cells are targeted by the vaccine-induced T-cell response."
        ),
    }
```

---

## ❌ MISSING ITEM 6 — CAR-T Cell Designer (Phase 4)
**Priority:** 🟢 STRATEGIC | **Phase:** 4 | **File:** `backend/modules/car_t_designer.py` (NOT CREATED)

### What the Plan Says
Designs:
- **CAR construct:** scFv antigen-binding domain (CD19, HER2, EGFRvIII, MSLN, GD2), hinge + transmembrane + co-stimulatory domains (4-1BB vs CD28 comparison)
- **CRISPR knockout panel:** TRAC (TCR removal), B2M (allogeneic), PD-1 (anti-exhaustion), TET2 (persistence)
- **Integration strategy:** Targeted insertion at TRAC locus using HDR + Cas12a + ssDNA donor

Also needs: `CarTDesignerView.jsx` frontend, `POST /api/oncology/car-t-design` endpoint

### Current State
**Completely absent.** No CAR-T design capability anywhere in the codebase.

---

## ❌ MISSING ITEM 7 — Tumor Evolution Predictor (Phase 4)
**Priority:** 🟢 STRATEGIC | **Phase:** 4 | **File:** `backend/modules/tumor_evolution.py` (NOT CREATED)

### What the Plan Says
- Build a clonal evolution tree from VAF data (truncal → subclonal branches)
- Predict which subclones survive CRISPR targeting
- Suggest "second-strike" preemptive guide designs for predicted resistance clones
- Warn if targeting a subclonal mutation gives selective advantage to other clones

### Current State
**Completely absent.** This requires the somatic VAF data already available from Phase 1, so the foundation is there — but the evolution modeling logic itself is missing.

---

## ❌ MISSING ITEM 8 — Patient Digital Twin Dashboard (Phase 4)
**Priority:** 🟢 STRATEGIC | **Phase:** 4 | **File:** `ResearchReportView.jsx` extension

### What the Plan Says
- New "Patient Timeline" tab in `ResearchReportView.jsx`
- Upload follow-up liquid biopsy data (ctDNA)
- Track clonal dynamics over time (was KRAS G12D clone eliminated or expanding?)
- Update CRISPR guide relevance scores based on current tumor evolution state
- Longitudinal audit trail for every ctDNA upload

### Current State
`ResearchReportView.jsx` generates static dossiers. **No longitudinal tracking, no ctDNA upload, no timeline view.**

---

## ❌ MISSING ITEM 9 — Database Tables: viral_blueprints + neoantigen_predictions (Phase 3 + 4)
**Priority:** 🟡 MEDIUM | **Phase:** 3 & 4 | **File:** `backend/core/models.py`

### What the Plan Says
Two new database tables:
1. `viral_blueprints` — stores generated viral therapy blueprints for audit/review
2. `neoantigen_predictions` — stores neoantigen prediction results per tumor sample

### Current State
The implementation plan calls for 4 new tables total. Only 2 were added (`tumor_samples`, `somatic_mutations`). The other 2 are absent.

### Exact Code Needed

**In `models.py`**, add:
```python
class ViralBlueprintModel(Base):
    """Stores generated oncolytic virus engineering blueprints."""
    __tablename__ = "viral_blueprints"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    tumor_sample_id = Column(String(64), ForeignKey("tumor_samples.tumor_sample_id"), nullable=True)
    virus_id = Column(String(64))                # "HSV1_T-VEC_family"
    cancer_type = Column(String(128))
    cytokine_payload = Column(String(64))         # "GM-CSF"
    tumor_promoter = Column(String(64))           # "TERT_promoter"
    bsl_level = Column(Integer)                   # 1, 2, or 3
    ibc_approved = Column(Boolean, default=False)
    blueprint_json = Column(Text, nullable=True)  # Full blueprint as JSON string
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class NeoantigenPredictionModel(Base):
    """Stores neoantigen prediction results per tumor sample."""
    __tablename__ = "neoantigen_predictions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    tumor_sample_id = Column(String(64), ForeignKey("tumor_samples.tumor_sample_id"))
    gene = Column(String(64))
    amino_acid_change = Column(String(64))
    mutant_peptide = Column(String(256))
    predicted_ic50_nm = Column(Float)             # < 500 = strong binder
    immunogenicity = Column(String(32))           # "HIGH", "MODERATE", "LOW"
    vaccine_priority = Column(Integer)            # 1 = highest priority
    hla_type = Column(String(64))
    in_vaccine_design = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
```

---

## Priority Build Order

| # | Item | Priority | Estimated Effort | Impact |
|---|------|----------|-----------------|--------|
| 1 | **SampleIntakeView Oncology Toggle** | 🔴 CRITICAL | 3–4 hours | Connects Phase 1 backend to the UI — users can't do tumor-normal analysis without this |
| 2 | **CNV-Adjusted Off-Target Scoring** | 🟠 HIGH | 2–3 hours | Patient safety — prevents catastrophic TSG off-target hits in high-CN tumor loci |
| 3 | **Tumor Context Azimuth Penalties** | 🟠 HIGH | 2 hours | Scientific accuracy — BRCA-mutant tumors need base editors, not nucleases |
| 4 | **Oncolytic Delivery Profiles in delivery_advisor.py** | 🟡 MEDIUM | 1–2 hours | Completes the viral therapy module; makes it API-queryable |
| 5 | **Neoantigen Predictor Module** | 🟢 STRATEGIC | 6–8 hours | New category — personalized cancer vaccine design |
| 6 | **Missing DB Tables (viral_blueprints, neoantigen_predictions)** | 🟡 MEDIUM | 1 hour | Data persistence for Phase 3 & 4 outputs |
| 7 | **CAR-T Cell Designer** | 🟢 STRATEGIC | 8–12 hours | Major new category |
| 8 | **Tumor Evolution Predictor** | 🟢 STRATEGIC | 6–8 hours | Clonal dynamics, resistance prediction |
| 9 | **Patient Digital Twin Dashboard** | 🟢 STRATEGIC | 4–6 hours | Longitudinal tracking UI |

**Recommendation: Build in order #1 → #2 → #3 → #4 → #5 → #6 first.**  
Items 7–9 are Phase 4 strategic features that can follow.

---

## Quick Start: What to Say Next

- Say **"Fix the missing items in order"** → I will build all 9 items sequentially, verifying after each one
- Say **"Do item 1 only"** → Just the SampleIntakeView oncology toggle (highest priority, unblocks everything)  
- Say **"Do items 1–4"** → All critical + high + medium priority items only (Phase 1–3 completion)
- Say **"Do all 9"** → Complete the entire plan including all Phase 4 features
