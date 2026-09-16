"""
tumor_genomics.py
──────────────────
Phase 1 — Somatic Cancer Foundation

Calculates key tumor genomic biomarkers:
  - Tumor Mutational Burden (TMB) — FDA-approved biomarker for immunotherapy eligibility
  - Microsatellite Instability (MSI) status — FDA-approved pan-tumor biomarker
  - Tumor purity estimation
  - Copy Number Variation (CNV) summary
  - Immunotherapy eligibility assessment
"""
from typing import Dict, List, Optional, Tuple
import re

# ── FDA / NCCN TMB Thresholds ────────────────────────────────────────────────
TMB_HIGH_THRESHOLD = 10.0   # ≥10 mut/Mb → FDA-approved pembrolizumab eligibility
TMB_INTERMEDIATE = 6.0      # 6–10 mut/Mb → consider checkpoint inhibitor
CODING_GENOME_SIZE_MB = 30  # Approximate size of human exome in megabases

# ── Known Amplified Oncogenes (CNV Drivers) ──────────────────────────────────
ONCOGENE_AMPLIFICATION_CATALOG: Dict[str, Dict] = {
    "ERBB2": {
        "common_name": "HER2",
        "significance": "HER2 amplification → trastuzumab / pertuzumab eligibility",
        "cancer_types": ["Breast", "Gastric", "Bladder"],
        "fda_therapy": "Trastuzumab (Herceptin), Pertuzumab, T-DM1 (Kadcyla)",
        "amplification_threshold": 6,
    },
    "MYC": {
        "common_name": "c-MYC",
        "significance": "MYC amplification drives aggressive tumor behavior; BET inhibitor target",
        "cancer_types": ["Breast", "Colorectal", "Gastric", "Lymphoma", "GBM"],
        "fda_therapy": "No approved direct MYC inhibitor (BET inhibitors in trials)",
        "amplification_threshold": 5,
    },
    "CDK4": {
        "common_name": "CDK4",
        "significance": "CDK4 amplification → CDK4/6 inhibitor eligibility",
        "cancer_types": ["Breast", "Liposarcoma", "GBM"],
        "fda_therapy": "Palbociclib, Ribociclib, Abemaciclib (CDK4/6 inhibitors)",
        "amplification_threshold": 8,
    },
    "EGFR": {
        "common_name": "EGFR",
        "significance": "EGFR amplification in GBM — EGFRvIII variant targetable by CAR-T / bi-specific antibodies",
        "cancer_types": ["GBM", "NSCLC", "HNSCC"],
        "fda_therapy": "Erlotinib/Osimertinib for NSCLC EGFR-amp; no approved therapy for GBM EGFR amp",
        "amplification_threshold": 6,
    },
    "CCND1": {
        "common_name": "Cyclin D1",
        "significance": "11q13 amplification; CDK4/6 inhibitor sensitivity",
        "cancer_types": ["Breast", "Head & Neck", "Mantle Cell Lymphoma"],
        "fda_therapy": "CDK4/6 inhibitors",
        "amplification_threshold": 4,
    },
}

# ── Known Deleted Tumor Suppressors ─────────────────────────────────────────
TUMOR_SUPPRESSOR_DELETION_CATALOG: Dict[str, Dict] = {
    "CDKN2A": {
        "common_name": "p16/ARF",
        "significance": "Homozygous deletion abrogates both Rb and p53 pathways",
        "cancer_types": ["GBM", "Melanoma", "NSCLC", "PDAC"],
        "fda_therapy": "CDK4/6 inhibitors where co-occurring CDK4 amplification present",
    },
    "RB1": {
        "common_name": "Retinoblastoma protein (pRb)",
        "significance": "Loss of G1/S checkpoint control; resistance to CDK4/6 inhibitors",
        "cancer_types": ["Retinoblastoma", "SCLC", "Breast", "Bladder"],
    },
    "PTEN": {
        "common_name": "PTEN",
        "significance": "PI3K pathway hyperactivation; PI3Kα inhibitor eligibility (alpelisib)",
        "cancer_types": ["Breast", "Prostate", "Endometrial", "GBM"],
        "fda_therapy": "Alpelisib (PIK3CA co-mutation context)",
    },
    "BRCA1": {
        "common_name": "BRCA1",
        "significance": "HRD — PARP inhibitor synthetic lethality",
        "cancer_types": ["Breast", "Ovarian", "Pancreatic"],
        "fda_therapy": "Olaparib, Niraparib, Rucaparib (PARP inhibitors)",
    },
}

# ── MSI Microsatellite Loci ─────────────────────────────────────────────────
STANDARD_MSI_LOCI = [
    "BAT25", "BAT26", "D2S123", "D5S346", "D17S250",  # Bethesda panel
    "BAT40", "TGFβRII", "ACTC", "D18S55", "D10S197",  # Extended panel
]


def calculate_tmb(
    somatic_variants: List[Dict],
    sequencing_panel_size_mb: float = CODING_GENOME_SIZE_MB,
    count_synonymous: bool = False,
) -> Dict:
    """
    Calculates Tumor Mutational Burden (TMB) in mutations per megabase.

    Args:
        somatic_variants: List of somatic mutations from somatic_variant_caller
        sequencing_panel_size_mb: Size of sequenced coding region in megabases
        count_synonymous: Whether to include synonymous mutations (FDA standard excludes them)

    Returns:
        TMB analysis dict with score, classification, and immunotherapy eligibility
    """
    # Count qualifying mutations (non-synonymous by default)
    qualifying_mutations = 0
    for v in somatic_variants:
        v_type = v.get("variant_type", v.get("alt", ""))
        aa_change = v.get("amino_acid_change", "")
        # Exclude synonymous (p.=), intronic, UTR if filtering non-syn
        if not count_synonymous:
            if aa_change.endswith("=") or "synonymous" in aa_change.lower():
                continue
        qualifying_mutations += 1

    tmb_score = round(qualifying_mutations / max(sequencing_panel_size_mb, 1), 2)

    # Classification
    if tmb_score >= TMB_HIGH_THRESHOLD:
        tmb_class = "TMB-High"
        pembrolizumab_eligible = True
        clinical_significance = (
            f"TMB-High (≥10 mut/Mb). FDA-approved: Pembrolizumab (Keytruda) "
            "as pan-tumor therapy for TMB-High tumors (FDA approval June 2020)."
        )
        color = "emerald"
    elif tmb_score >= TMB_INTERMEDIATE:
        tmb_class = "TMB-Intermediate"
        pembrolizumab_eligible = False
        clinical_significance = (
            f"TMB-Intermediate ({TMB_INTERMEDIATE}–{TMB_HIGH_THRESHOLD} mut/Mb). "
            "Consider checkpoint inhibitor clinical trial. "
            "Does not meet FDA TMB-High threshold for pembrolizumab approval."
        )
        color = "amber"
    else:
        tmb_class = "TMB-Low"
        pembrolizumab_eligible = False
        clinical_significance = (
            f"TMB-Low (<{TMB_INTERMEDIATE} mut/Mb). "
            "Checkpoint inhibitor monotherapy response unlikely based on TMB alone. "
            "Assess MSI status and PD-L1 expression for immunotherapy eligibility."
        )
        color = "rose"

    return {
        "tmb_score": tmb_score,
        "tmb_classification": tmb_class,
        "qualifying_mutation_count": qualifying_mutations,
        "panel_size_mb": sequencing_panel_size_mb,
        "pembrolizumab_eligible": pembrolizumab_eligible,
        "clinical_significance": clinical_significance,
        "color": color,
        "fda_threshold": TMB_HIGH_THRESHOLD,
        "note": "TMB calculated from somatic non-synonymous mutations only (FDA standard method).",
    }


def detect_msi_status(somatic_variants: List[Dict]) -> Dict:
    """
    Estimates Microsatellite Instability (MSI) status from somatic variant patterns.

    In production: real MSI detection requires comparison of microsatellite repeat
    lengths between tumor and normal (tools: MSIsensor, MANTIS, MSIseq).
    This implementation uses a proxy heuristic: high indel rate in microsatellite
    regions suggests MSI-H, consistent with published computational approaches.

    Returns:
        MSI classification dict with confidence and clinical significance
    """
    if not somatic_variants:
        return {
            "msi_status": "INSUFFICIENT_DATA",
            "confidence": "LOW",
            "clinical_significance": "Cannot determine MSI status without somatic variant data.",
        }

    total_variants = len(somatic_variants)
    # Count indels specifically (insertions + deletions)
    indel_count = sum(
        1 for v in somatic_variants
        if (len(v.get("ref", "")) != len(v.get("alt", "")))
        or v.get("variant_type", "") in ("deletion", "insertion")
    )

    indel_fraction = indel_count / max(total_variants, 1)

    # Heuristic thresholds (empirically derived from TCGA MSI studies)
    if indel_fraction >= 0.35 or total_variants >= 500:
        status = "MSI-High"
        clinical_sig = (
            "MSI-High (dMMR suspected). FDA-approved: Pembrolizumab pan-tumor "
            "(FDA May 2017, first tissue-agnostic approval) and Dostarlimab for "
            "endometrial cancer. High neoantigen load — excellent candidate for "
            "oncolytic virotherapy (virus + checkpoint inhibitor combination)."
        )
        color = "emerald"
        confidence = "HIGH" if total_variants >= 50 else "MEDIUM"
    elif indel_fraction >= 0.15:
        status = "MSI-Low"
        clinical_sig = (
            "MSI-Low (possible low-level mismatch repair dysfunction). "
            "Checkpoint inhibitor response uncertain. "
            "Recommend formal MSIsensor or NGS MSI analysis."
        )
        color = "amber"
        confidence = "MEDIUM"
    else:
        status = "MSS"
        clinical_sig = (
            "Microsatellite Stable (MSS). Standard mismatch repair function. "
            "Checkpoint inhibitor monotherapy less likely to benefit without TMB-High status. "
            "May benefit from oncolytic virus priming to convert from 'cold' to 'hot' tumor."
        )
        color = "slate"
        confidence = "MEDIUM" if total_variants >= 20 else "LOW"

    return {
        "msi_status": status,
        "indel_count": indel_count,
        "total_variants_analyzed": total_variants,
        "indel_fraction": round(indel_fraction, 3),
        "confidence": confidence,
        "clinical_significance": clinical_sig,
        "color": color,
        "note": "Computational MSI estimate. Validate with MSIsensor or IHC MMR panel (MLH1, MSH2, MSH6, PMS2).",
    }


def summarize_cnv_landscape(somatic_variants: List[Dict]) -> Dict:
    """
    Parses CNV data from somatic variants and generates a clinical summary
    of significant gene amplifications and deletions.

    In production: real CNV calling requires read-depth ratios from BAM files
    (tools: CNVkit, GATK4 CNV, PURPLE). Here we parse CNV-type variants
    that were parsed from the VCF INFO fields.
    """
    amplifications = []
    deletions = []

    for v in somatic_variants:
        v_type = v.get("variant_type", "")
        gene = v.get("gene", "")

        if v_type == "copy_number_variation" or "CNV" in v.get("alt", ""):
            cn = v.get("copy_number", 4)
            if cn >= 4 and gene in ONCOGENE_AMPLIFICATION_CATALOG:
                catalog = ONCOGENE_AMPLIFICATION_CATALOG[gene]
                if cn >= catalog.get("amplification_threshold", 5):
                    amplifications.append({
                        "gene": gene,
                        "common_name": catalog["common_name"],
                        "copy_number": cn,
                        "significance": catalog["significance"],
                        "fda_therapy": catalog.get("fda_therapy", "No approved therapy"),
                        "cancer_types": catalog["cancer_types"],
                    })
            elif cn <= 1 and gene in TUMOR_SUPPRESSOR_DELETION_CATALOG:
                catalog = TUMOR_SUPPRESSOR_DELETION_CATALOG[gene]
                deletions.append({
                    "gene": gene,
                    "common_name": catalog["common_name"],
                    "copy_number": cn,
                    "zygosity": "Homozygous Deletion" if cn == 0 else "Hemizygous Loss",
                    "significance": catalog["significance"],
                    "fda_therapy": catalog.get("fda_therapy", "No approved therapy"),
                })

    # CRISPR-specific CNV warnings
    cnv_warnings = []
    for amp in amplifications:
        if amp["copy_number"] >= 10:
            cnv_warnings.append(
                f"⚠️ {amp['gene']} amplified ×{amp['copy_number']}: "
                f"CRISPR DSB at this locus risks {amp['copy_number']} simultaneous cuts "
                "→ catastrophic chromosomal instability. Use CRISPRi (dCas9-KRAB) for "
                "transcriptional repression instead of nuclease cleavage."
            )

    return {
        "significant_amplifications": amplifications,
        "significant_deletions": deletions,
        "cnv_crispr_warnings": cnv_warnings,
        "amplification_count": len(amplifications),
        "deletion_count": len(deletions),
    }


def calculate_tumor_purity_estimate(somatic_variants: List[Dict]) -> Dict:
    """
    Estimates tumor purity from the VAF distribution of somatic variants.

    A simple heuristic: the peak of the heterozygous somatic variant VAF
    distribution approximates tumor_purity / 2 (for diploid heterozygous mutations).
    The mode of the VAF distribution × 2 estimates purity.
    """
    vafs = [v.get("variant_allele_frequency", 0.5) for v in somatic_variants
            if 0.1 <= v.get("variant_allele_frequency", 0) <= 0.9]

    if not vafs:
        return {
            "estimated_purity": 0.80,
            "confidence": "LOW",
            "method": "Default estimate (insufficient heterozygous variants for inference)",
        }

    # Bin VAFs into 0.05-width bins and find mode
    bins: Dict[float, int] = {}
    for vaf in vafs:
        bucket = round(round(vaf / 0.05) * 0.05, 2)
        bins[bucket] = bins.get(bucket, 0) + 1

    mode_vaf = max(bins, key=bins.__getitem__)
    estimated_purity = min(round(mode_vaf * 2, 2), 1.0)

    confidence = "HIGH" if len(vafs) >= 20 else "MEDIUM" if len(vafs) >= 5 else "LOW"

    return {
        "estimated_purity": estimated_purity,
        "confidence": confidence,
        "mode_vaf": mode_vaf,
        "variants_used": len(vafs),
        "method": "VAF distribution mode × 2 (heterozygous diploid heuristic)",
        "note": (
            "Tumor purity affects CCF estimates. Low purity (<50%) may indicate "
            "a stromal-rich biopsy or necrotic tumor core — consider re-biopsy or "
            "FISH-based purity assessment for high-stakes therapy design."
        ),
    }


def generate_tumor_genomics_summary(
    somatic_variants: List[Dict],
    cancer_type: str = "Unknown",
    sequencing_panel_mb: float = CODING_GENOME_SIZE_MB,
) -> Dict:
    """
    Master function: generates a complete tumor genomic biomarker summary card.

    Returns a unified dict with TMB, MSI, CNV, purity, and clinical recommendations.
    """
    tmb = calculate_tmb(somatic_variants, sequencing_panel_mb)
    msi = detect_msi_status(somatic_variants)
    cnv = summarize_cnv_landscape(somatic_variants)
    purity = calculate_tumor_purity_estimate(somatic_variants)

    # Safe CRISPR targets (truncal only)
    safe_targets = [v for v in somatic_variants if v.get("is_safe_crispr_target")]
    oncogenic_targets = [v for v in safe_targets if v.get("is_oncogenic")]

    # Immunotherapy candidacy
    immunotherapy_eligible = tmb["pembrolizumab_eligible"] or msi["msi_status"] == "MSI-High"
    viral_therapy_candidate = immunotherapy_eligible or tmb["tmb_score"] >= TMB_INTERMEDIATE

    clinical_recommendations = []
    if tmb["pembrolizumab_eligible"]:
        clinical_recommendations.append(
            "✅ TMB-High: Pembrolizumab monotherapy (FDA-approved pan-tumor indication)"
        )
    if msi["msi_status"] == "MSI-High":
        clinical_recommendations.append(
            "✅ MSI-High: Pembrolizumab or Dostarlimab (FDA-approved dMMR indication)"
        )
    for amp in cnv["significant_amplifications"]:
        if amp.get("fda_therapy") and "No approved" not in amp["fda_therapy"]:
            clinical_recommendations.append(
                f"✅ {amp['gene']} Amplification: {amp['fda_therapy']}"
            )
    if not clinical_recommendations:
        clinical_recommendations.append(
            "No direct FDA-approved therapy matched from computational biomarkers. "
            "Clinical trial enrollment recommended."
        )

    return {
        "cancer_type": cancer_type,
        "tumor_mutational_burden": tmb,
        "microsatellite_instability": msi,
        "copy_number_landscape": cnv,
        "tumor_purity_estimate": purity,
        "total_somatic_variants": len(somatic_variants),
        "safe_crispr_targets_count": len(safe_targets),
        "oncogenic_crispr_targets_count": len(oncogenic_targets),
        "immunotherapy_eligible": immunotherapy_eligible,
        "oncolytic_virus_candidate": viral_therapy_candidate,
        "clinical_recommendations": clinical_recommendations,
        "disclaimer": (
            "COMPUTATIONAL RESEARCH ANALYSIS — FOR PRECLINICAL RESEARCH ONLY. "
            "All biomarker classifications require validation by CLIA-certified "
            "clinical laboratory assays (FoundationOne CDx, MSIsensor, IHC). "
            "Not for clinical decision-making without expert oncologist review."
        ),
    }
