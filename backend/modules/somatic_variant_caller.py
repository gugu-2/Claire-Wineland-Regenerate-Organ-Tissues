"""
somatic_variant_caller.py
──────────────────────────
Phase 1 — Somatic Cancer Foundation

Identifies somatic-only (cancer-specific) mutations by subtracting germline
variants (present in matched normal blood sample) from a tumor biopsy VCF.

Key outputs per somatic variant:
  - Variant Allele Frequency (VAF)
  - Cancer Cell Fraction (CCF)
  - Clonal classification: TRUNCAL (>60% CCF) vs. SUBCLONAL (<60% CCF)
  - Safe CRISPR targeting flag (only TRUNCAL mutations are safe to target)
"""
from typing import Dict, List, Optional, Tuple
import re

# Minimum CCF to consider a mutation safe to target with CRISPR.
# Targeting subclonal mutations risks leaving resistant clones intact
# and may provide them with a selective growth advantage.
MIN_SAFE_CRISPR_CCF = 0.60

# Minimum VAF to call a variant in tumor (filters sequencing noise)
MIN_TUMOR_VAF = 0.05

# Default tumor purity if not provided (80% is a typical solid tumor estimate)
DEFAULT_TUMOR_PURITY = 0.80

# Known somatic hotspot amino-acid changes indexed by (gene, aa_change)
SOMATIC_HOTSPOT_DB: Dict[str, Dict] = {
    "KRAS_G12D": {
        "gene": "KRAS", "amino_acid_change": "G12D", "codon": 12,
        "hgvs_cdna": "c.35G>A", "hgvs_protein": "p.Gly12Asp",
        "cancer_types": ["Pancreatic PDAC", "Colorectal CRC", "NSCLC", "Endometrial"],
        "oncokb_tier": "2A",
        "cosmic_count": 41247,
        "cosmic_id": "COSM521",
        "is_oncogenic": True,
        "crispr_strategy": "Seed mismatch at position 17 (G→A SNV falls in seed region). "
                           "High discrimination ratio expected (mutant:wildtype ≥ 15×).",
        "known_fda_therapy": "No direct FDA-approved KRAS G12D therapy; Adagrasib/Sotorasib for G12C only.",
        "resistance_mechanism": "Secondary KRAS amplification; downstream RAF/MEK bypass",
    },
    "KRAS_G12V": {
        "gene": "KRAS", "amino_acid_change": "G12V",
        "hgvs_cdna": "c.35G>T", "hgvs_protein": "p.Gly12Val",
        "cancer_types": ["PDAC", "CRC", "NSCLC"],
        "oncokb_tier": "2A", "cosmic_count": 21894, "cosmic_id": "COSM520",
        "is_oncogenic": True,
        "crispr_strategy": "G12V creates novel 5'-NGG PAM site on mutant allele — mutation-created PAM strategy.",
    },
    "KRAS_G12C": {
        "gene": "KRAS", "amino_acid_change": "G12C",
        "hgvs_cdna": "c.34G>T", "hgvs_protein": "p.Gly12Cys",
        "cancer_types": ["NSCLC", "CRC"],
        "oncokb_tier": "1",
        "cosmic_count": 16743,
        "is_oncogenic": True,
        "known_fda_therapy": "Sotorasib (AMG 510) — FDA Approved 2021; Adagrasib — FDA Approved 2022",
        "crispr_strategy": "G12C creates unique cysteine — allele-specific base-editor CBE can introduce G12G reversion.",
    },
    "TP53_R175H": {
        "gene": "TP53", "amino_acid_change": "R175H",
        "hgvs_cdna": "c.524G>A", "hgvs_protein": "p.Arg175His",
        "cancer_types": ["Breast", "Ovarian", "CRC", "Lung", "AML"],
        "oncokb_tier": "1",
        "cosmic_count": 19842, "cosmic_id": "COSM10656",
        "is_oncogenic": True,
        "crispr_strategy": "R175H falls in DNA-binding domain. ABE base editor (A→G) can correct R175H (CGT→CGC) to wildtype Arg.",
        "note": "TP53 R175H is a dominant-negative gain-of-function mutation — disruption alone insufficient; correction needed.",
    },
    "TP53_R248W": {
        "gene": "TP53", "amino_acid_change": "R248W",
        "hgvs_cdna": "c.742C>T", "hgvs_protein": "p.Arg248Trp",
        "cancer_types": ["Breast", "Lung", "CRC", "GBM"],
        "oncokb_tier": "1", "cosmic_count": 16231, "is_oncogenic": True,
        "crispr_strategy": "CBE correction: C→T reversion restores Arg at codon 248.",
    },
    "EGFR_L858R": {
        "gene": "EGFR", "amino_acid_change": "L858R",
        "hgvs_cdna": "c.2573T>G", "hgvs_protein": "p.Leu858Arg",
        "cancer_types": ["NSCLC — Adenocarcinoma"],
        "oncokb_tier": "1",
        "cosmic_count": 28941, "cosmic_id": "COSM6224",
        "is_oncogenic": True,
        "known_fda_therapy": "Erlotinib, Gefitinib, Afatinib, Osimertinib (all FDA-approved for EGFR L858R)",
        "crispr_strategy": "L858R (T→G at c.2573) falls in kinase domain. Guide targeting c.2573 position with A-T mismatch at position 18 achieves high discrimination.",
    },
    "BRAF_V600E": {
        "gene": "BRAF", "amino_acid_change": "V600E",
        "hgvs_cdna": "c.1799T>A", "hgvs_protein": "p.Val600Glu",
        "cancer_types": ["Melanoma", "Colorectal", "Thyroid", "NSCLC", "GBM"],
        "oncokb_tier": "1",
        "cosmic_count": 52341, "cosmic_id": "COSM476",
        "is_oncogenic": True,
        "known_fda_therapy": "Vemurafenib, Dabrafenib + Trametinib (FDA-approved for melanoma)",
        "crispr_strategy": "V600E (T→A transversion) creates a unique restriction site. ABE or NHEJ knockout strategy viable.",
    },
    "BRCA2_loss": {
        "gene": "BRCA2", "amino_acid_change": "Frameshift/LOF",
        "cancer_types": ["Breast", "Ovarian", "Pancreatic", "Prostate"],
        "oncokb_tier": "1",
        "is_oncogenic": True,
        "known_fda_therapy": "Olaparib, Rucaparib, Niraparib (PARP inhibitors — FDA approved for BRCA2-deficient tumors)",
        "crispr_strategy": "HDR-based correction using a donor template to restore the wild-type reading frame. "
                           "Prime Editing preferred (no DSB) to avoid further genomic instability in BRCA2-null cells.",
        "note": "BRCA2 loss sensitizes to PARP inhibitors — CRISPR correction strategy depends on whether the goal is tumor suppression or sensitization.",
    },
    "IDH1_R132H": {
        "gene": "IDH1", "amino_acid_change": "R132H",
        "hgvs_cdna": "c.395G>A", "hgvs_protein": "p.Arg132His",
        "cancer_types": ["Glioma Grade II/III", "AML"],
        "oncokb_tier": "1",
        "cosmic_count": 8923,
        "is_oncogenic": True,
        "known_fda_therapy": "Enasidenib (AML), Ivosidenib (AML, Cholangiocarcinoma) — FDA approved",
        "crispr_strategy": "R132H (G→A) falls at seed position 16 in most guide designs. ABE correction is ideal — A→G reverts to wildtype Arg.",
    },
    "EGFR_exon19del": {
        "gene": "EGFR", "amino_acid_change": "Exon 19 Deletion",
        "cancer_types": ["NSCLC — Adenocarcinoma"],
        "oncokb_tier": "1",
        "cosmic_count": 31472,
        "is_oncogenic": True,
        "known_fda_therapy": "Osimertinib, Erlotinib (FDA-approved)",
        "crispr_strategy": "Exon 19 deletions (15–18 bp) create unique junction sequences. Junction-spanning sgRNA enables tumor-specific guide design.",
    },
    "MYC_amplification": {
        "gene": "MYC", "amino_acid_change": "Amplification (CNV)",
        "cancer_types": ["Breast", "Colorectal", "Gastric", "NSCLC", "Lymphoma"],
        "oncokb_tier": "2B",
        "is_oncogenic": True,
        "crispr_strategy": "CRISPRi (dCas9-KRAB) transcriptional repression of MYC promoter/enhancer preferred over cutting (MYC amplified 10–50× — DSBs cause catastrophic chromosomal instability).",
    },
}


def parse_vcf_to_variant_dict(vcf_content: str) -> Dict[str, Dict]:
    """
    Parses a VCF string into a dict keyed by 'chr:pos:ref>alt' for fast lookup.
    """
    variant_dict: Dict[str, Dict] = {}
    for line in vcf_content.strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = re.split(r"\t+", line)
        if len(parts) < 5:
            continue
        chrom = parts[0]
        if not chrom.startswith("chr"):
            chrom = f"chr{chrom}"
        try:
            pos = int(parts[1])
        except ValueError:
            continue
        ref = parts[3].upper()
        alt_field = parts[4].upper()
        # Handle multi-allelic sites — take first alt
        alt = alt_field.split(",")[0]

        # Extract VAF from FORMAT/SAMPLE fields
        vaf = _extract_vaf(parts)

        key = f"{chrom}:{pos}:{ref}>{alt}"
        variant_dict[key] = {
            "chromosome": chrom,
            "position": pos,
            "ref": ref,
            "alt": alt,
            "vaf": vaf,
            "raw_parts": parts,
        }
    return variant_dict


def _extract_vaf(vcf_parts: List[str]) -> float:
    """
    Attempts to extract Variant Allele Frequency from VCF FORMAT/SAMPLE columns.
    Falls back to 0.5 (heterozygous assumption) if not parseable.
    """
    if len(vcf_parts) < 10:
        return 0.5
    fmt_fields = vcf_parts[8].split(":")
    sample_fields = vcf_parts[9].split(":")
    # Look for AF or AD fields
    if "AF" in fmt_fields:
        idx = fmt_fields.index("AF")
        try:
            return float(sample_fields[idx].split(",")[0])
        except (ValueError, IndexError):
            pass
    if "AD" in fmt_fields:
        idx = fmt_fields.index("AD")
        try:
            counts = [int(x) for x in sample_fields[idx].split(",")]
            total = sum(counts)
            if total > 0 and len(counts) > 1:
                return counts[1] / total
        except (ValueError, IndexError):
            pass
    return 0.5


def subtract_germline(
    tumor_variants: Dict[str, Dict],
    normal_variants: Dict[str, Dict],
) -> Dict[str, Dict]:
    """
    Subtracts any variant key present in the normal VCF from the tumor VCF.
    Returns only somatic (tumor-exclusive) variants.
    """
    somatic: Dict[str, Dict] = {}
    for key, v in tumor_variants.items():
        if key not in normal_variants:
            somatic[key] = v
    return somatic


def classify_clonality(ccf: float) -> str:
    """Returns TRUNCAL, SUBCLONAL, or RARE based on Cancer Cell Fraction."""
    if ccf >= MIN_SAFE_CRISPR_CCF:
        return "TRUNCAL"
    elif ccf >= 0.20:
        return "SUBCLONAL"
    else:
        return "RARE_SUBCLONE"


def estimate_ccf(vaf: float, tumor_purity: float, local_copy_number: int = 2) -> float:
    """
    Estimates Cancer Cell Fraction (CCF) from Variant Allele Frequency.
    CCF = (VAF × (purity × CN + 2 × (1 - purity))) / (purity × 1)
    Simplified for diploid regions: CCF ≈ VAF × 2 / tumor_purity
    Capped at 1.0.
    """
    if tumor_purity <= 0:
        return min(vaf * 2, 1.0)
    ccf = (vaf * (tumor_purity * local_copy_number + 2 * (1 - tumor_purity))) / (
        tumor_purity * (local_copy_number / 2)
    )
    return round(min(ccf, 1.0), 3)


def lookup_somatic_hotspot(gene: str, amino_acid_change: str) -> Optional[Dict]:
    """Looks up a known somatic hotspot by gene + amino acid change string."""
    key = f"{gene}_{amino_acid_change}"
    return SOMATIC_HOTSPOT_DB.get(key)


def call_somatic_variants(
    tumor_vcf_content: str,
    normal_vcf_content: str,
    tumor_purity: float = DEFAULT_TUMOR_PURITY,
) -> Tuple[List[Dict], Dict]:
    """
    Main entry point.

    1. Parses both VCFs into variant dicts.
    2. Subtracts germline variants to isolate somatic mutations.
    3. Filters by minimum VAF (removes sequencing noise).
    4. Calculates CCF and clonal classification for each somatic variant.
    5. Annotates against SOMATIC_HOTSPOT_DB.
    6. Flags safe CRISPR targets (TRUNCAL only).

    Returns:
        (somatic_variants_list, summary_stats)
    """
    tumor_variants = parse_vcf_to_variant_dict(tumor_vcf_content)
    normal_variants = parse_vcf_to_variant_dict(normal_vcf_content)

    somatic_raw = subtract_germline(tumor_variants, normal_variants)

    somatic_variants: List[Dict] = []
    truncal_count = 0
    subclonal_count = 0
    hotspot_count = 0

    for key, v in somatic_raw.items():
        vaf = v.get("vaf", 0.5)
        # Filter out very low VAF variants (likely sequencing artifacts)
        if vaf < MIN_TUMOR_VAF:
            continue

        ccf = estimate_ccf(vaf, tumor_purity)
        clonal_class = classify_clonality(ccf)
        is_safe_target = clonal_class == "TRUNCAL"

        # Attempt hotspot annotation
        hotspot_info = None
        # We don't know gene/AA change from VCF alone — will be enriched by
        # variant_annotation.py COSMIC lookup later. Mark as "Novel" for now.

        variant_record = {
            "variant_key": key,
            "chromosome": v["chromosome"],
            "position": v["position"],
            "ref": v["ref"],
            "alt": v["alt"],
            "variant_allele_frequency": round(vaf, 4),
            "cancer_cell_fraction": ccf,
            "clonal_classification": clonal_class,
            "is_safe_crispr_target": is_safe_target,
            "tumor_purity_used": tumor_purity,
            "hotspot_annotation": hotspot_info,
            "crispr_targeting_rationale": (
                f"TRUNCAL mutation (CCF={ccf:.0%}) present in virtually all tumor cells. "
                "Safe to design CRISPR guides — any edit will affect the dominant clone."
                if is_safe_target else
                f"SUBCLONAL / RARE mutation (CCF={ccf:.0%}). CRISPR targeting this "
                "mutation will only affect a minority of tumor cells. "
                "⚠️ Risk of clonal selection — CRISPR-resistant subclones may dominate after treatment."
            ),
        }
        somatic_variants.append(variant_record)

        if clonal_class == "TRUNCAL":
            truncal_count += 1
        else:
            subclonal_count += 1

    # Sort: truncal first, then by descending CCF
    somatic_variants.sort(
        key=lambda x: (x["clonal_classification"] != "TRUNCAL", -x["cancer_cell_fraction"])
    )

    summary = {
        "total_tumor_variants": len(tumor_variants),
        "total_normal_variants": len(normal_variants),
        "total_somatic_variants": len(somatic_variants),
        "truncal_variants": truncal_count,
        "subclonal_variants": subclonal_count,
        "safe_crispr_targets": truncal_count,
        "tumor_purity": tumor_purity,
        "warning": (
            "No truncal somatic mutations identified. This may indicate low tumor purity, "
            "a highly heterogeneous tumor, or insufficient sequencing depth."
            if truncal_count == 0 else None
        ),
    }

    return somatic_variants, summary


def enrich_with_hotspot_annotations(
    somatic_variants: List[Dict],
) -> List[Dict]:
    """
    Attempts post-hoc hotspot matching based on position ranges.
    In production this would be replaced by COSMIC API lookup;
    for local operation, it uses the curated SOMATIC_HOTSPOT_DB.
    """
    # Build a reverse lookup: chromosome + position → hotspot key
    POSITION_HOTSPOTS: Dict[str, str] = {
        "chr12:25398284": "KRAS_G12D",
        "chr12:25398285": "KRAS_G12V",
        "chr12:25398284_T>G": "KRAS_G12C",
        "chr17:7674220": "TP53_R175H",
        "chr17:7673803": "TP53_R248W",
        "chr7:55191822": "EGFR_L858R",
        "chr7:140453136": "BRAF_V600E",
        "chr2:209113113": "IDH1_R132H",
    }

    for v in somatic_variants:
        pos_key = f"{v['chromosome']}:{v['position']}"
        hotspot_key = POSITION_HOTSPOTS.get(pos_key)
        if hotspot_key and hotspot_key in SOMATIC_HOTSPOT_DB:
            hs = SOMATIC_HOTSPOT_DB[hotspot_key]
            v["hotspot_annotation"] = hs
            v["gene"] = hs["gene"]
            v["amino_acid_change"] = hs["amino_acid_change"]
            v["oncokb_tier"] = hs.get("oncokb_tier", "Unknown")
            v["cosmic_id"] = hs.get("cosmic_id", "")
            v["cosmic_count"] = hs.get("cosmic_count", 0)
            v["is_oncogenic"] = hs.get("is_oncogenic", False)
            v["crispr_strategy"] = hs.get("crispr_strategy", "")
            v["known_fda_therapy"] = hs.get("known_fda_therapy", "None currently approved")
            # Update CRISPR target rationale with clinical context
            if v["is_safe_crispr_target"]:
                v["crispr_targeting_rationale"] = (
                    f"TRUNCAL driver mutation — {hs['gene']} {hs['amino_acid_change']} "
                    f"(COSMIC count: {hs.get('cosmic_count', 'N/A')}). "
                    f"OncoKB Tier {hs.get('oncokb_tier', '?')}. "
                    f"CRISPR Strategy: {hs.get('crispr_strategy', 'Custom allele-specific guide design required.')}"
                )

    return somatic_variants
