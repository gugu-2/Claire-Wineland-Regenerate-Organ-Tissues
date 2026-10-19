from typing import Dict, List, Optional

NUCLEASE_SIZES_BP = {
    "SpCas9": 4200,
    "SaCas9": 3150,
    "Cas12a": 3900,
    "Cas9_BaseEditor_CBE": 5100,
    "Cas9_BaseEditor_ABE": 5200,
    "PrimeEditor_PE2": 6300
}

PROMOTER_SIZES_BP = {
    "EFS": 230,      # Minimal elongation factor 1a short promoter
    "UBC": 400,      # Ubiquitin C
    "CMV": 600,      # Cytomegalovirus
    "CAG": 1700,     # Strong synthetic mammalian promoter (huge)
    "Synapsin": 480  # Neuron-specific promoter (hSyn1)
}

AAV_MAX_PACKAGING_BP = 4700
AAV_ITRS_BP = 290 # 2x 145bp inverted terminal repeats
AAV_POLYA_BP = 180
AAV_GRNA_U6_BP = 350

TISSUE_DELIVERY_PROFILES = {
    "HSPCs": {
        "name": "CD34+ Hematopoietic Stem & Progenitor Cells",
        "primary_recommendation": "Ex-Vivo RNP Electroporation (Neon / 4D-Nucleofector)",
        "vector_class": "Non-Viral RNP",
        "rationale": "All approved clinical precedents (Casgevy, CTX001) utilize ex-vivo Cas9 ribonucleoprotein (RNP) electroporation. Transient activity (12-24h) minimizes off-target cutting with zero risk of insertional oncogenesis.",
        "precedent": "Vertex/CRISPR Therapeutics (Casgevy, FDA Approved Dec 2023; NCT03745287)",
        "immunogenicity_risk": "LOW (Transient peptide exposure, washed prior to re-infusion)",
        "off_target_risk": "MINIMAL (Rapid protein turnover ~24h)",
        "suitable_modalities": ["RNP", "LNP_mRNA"]
    },
    "CNS_NEURONS": {
        "name": "Central Nervous System / Striatal & Cortical Neurons",
        "primary_recommendation": "Recombinant AAV9 (Retro-orbital / Intraparenchymal / ICV)",
        "vector_class": "Adeno-Associated Virus (AAV9)",
        "rationale": "Post-mitotic non-dividing neurons cannot be efficiently electroporated in vivo. AAV9 crosses the blood-brain barrier and exhibits high neuronal tropism. Single-vector delivery requires compact nucleases (SaCas9).",
        "precedent": "Novartis Zolgensma (AAV9 Gene Replacement; FDA Approved 2019)",
        "immunogenicity_risk": "MODERATE (Pre-existing neutralising anti-AAV9 antibodies must be screened)",
        "off_target_risk": "MODERATE-HIGH (Constitutive viral expression; microRNA de-targeting advised)",
        "suitable_modalities": ["AAV9", "AAV-PHP.eB"]
    },
    "LIVER": {
        "name": "Hepatic Parenchyma / Hepatocytes",
        "primary_recommendation": "Systemic Lipid Nanoparticles (LNP) encapsulating mRNA + sgRNA",
        "vector_class": "Lipid Nanoparticle (LNP)",
        "rationale": "Systemic intravenous LNP injection naturally accumulates in liver fenestrations (ApoE-mediated hepatocyte uptake). Transient mRNA expression prevents chronic off-target accumulation.",
        "precedent": "Intellia Therapeutics NTLA-2001 (In Vivo CRISPR for ATTR Amyloidosis; NEJM 2021) & Verve Therapeutics VERVE-101",
        "immunogenicity_risk": "LOW-MODERATE (Transient mild transaminitis; pre-medication with dexamethasone)",
        "off_target_risk": "LOW (mRNA cleared within 48-72 hours)",
        "suitable_modalities": ["LNP_mRNA", "AAV8"]
    },
    "RETINA": {
        "name": "Retinal Pigment Epithelium / Photoreceptors",
        "primary_recommendation": "Subretinal AAV2 or AAV5 Vector",
        "vector_class": "Adeno-Associated Virus (AAV2 / AAV5)",
        "rationale": "Subretinal space is an immune-privileged compartment requiring localized micro-injection with low systemic biodistribution.",
        "precedent": "Spark Therapeutics Luxturna (AAV2; FDA Approved 2017) & Editas Medicine EDIT-101 (In Vivo CRISPR for LCA10)",
        "immunogenicity_risk": "LOW (Ocular immune privilege)",
        "off_target_risk": "MODERATE (Long-term retinal expression)",
        "suitable_modalities": ["AAV2", "AAV5"]
    },
    "T_CELLS": {
        "name": "Primary Human CD4+ / CD8+ T-Lymphocytes (CAR-T / HIV Resistance)",
        "primary_recommendation": "Ex-Vivo Cas9 RNP Electroporation + Lentiviral CAR Transduction",
        "vector_class": "Hybrid RNP + Lentiviral",
        "rationale": "Multiplex editing (e.g. TRAC, PD-1, and CCR5 triple knockout) is achieved at >85% efficiency using high-concentration synthetic RNP electroporation without viral toxicity.",
        "precedent": "Stadtmauer et al., Science 2020 (First-in-human multiplex CRISPR T-cell trial; NCT03399773)",
        "immunogenicity_risk": "LOW (Ex-vivo washed prior to lymphodepletion and re-infusion)",
        "off_target_risk": "MINIMAL (Transient nuclease persistence)",
        "suitable_modalities": ["RNP", "Lentivirus_integrating"]
    }
}

def calculate_aav_packaging(nuclease_type: str = "SpCas9", promoter_type: str = "EFS") -> Dict:
    """
    Calculates total AAV vector payload size and determines packaging viability
    relative to the 4.7 kb physical capsid packaging threshold.
    """
    nuclease_bp = NUCLEASE_SIZES_BP.get(nuclease_type, 4200)
    promoter_bp = PROMOTER_SIZES_BP.get(promoter_type, 230)

    total_cargo_bp = (
        AAV_ITRS_BP +          # 290 bp
        promoter_bp +          # 230 bp (EFS)
        nuclease_bp +          # 4200 bp (SpCas9) or 3150 bp (SaCas9)
        AAV_POLYA_BP +         # 180 bp
        AAV_GRNA_U6_BP         # 350 bp (U6 promoter + gRNA scaffold)
    )

    is_overflow = total_cargo_bp > AAV_MAX_PACKAGING_BP
    margin_bp = AAV_MAX_PACKAGING_BP - total_cargo_bp

    if total_cargo_bp <= 4450:
        verdict = "OPTIMAL_AAV_PACKAGING"
        status_color = "emerald"
        message = f"Fits safely within single AAV capsid ({total_cargo_bp} bp / 4,700 bp). Packaging margin: +{margin_bp} bp."
    elif total_cargo_bp <= AAV_MAX_PACKAGING_BP:
        verdict = "TIGHT_AAV_PACKAGING"
        status_color = "amber"
        message = f"Approaching maximum capsid packaging limit ({total_cargo_bp} bp / 4,700 bp). Packaging margin: +{margin_bp} bp. Minimal promoter required."
    else:
        verdict = "AAV_CAPSID_OVERFLOW_FATAL"
        status_color = "rose"
        message = (
            f"PACKAGING FAILURE: Total payload ({total_cargo_bp} bp) exceeds maximum physical AAV capacity (4,700 bp) by {abs(margin_bp)} bp. "
            "Capsid will suffer from truncated genomes and severe titer drops. Recommendation: Switch to SaCas9 (3,150 bp) or dual-AAV split intein system."
        )

    return {
        "nuclease_type": nuclease_type,
        "nuclease_size_bp": nuclease_bp,
        "promoter_type": promoter_type,
        "promoter_size_bp": promoter_bp,
        "total_cargo_bp": total_cargo_bp,
        "max_aav_capacity_bp": AAV_MAX_PACKAGING_BP,
        "margin_bp": margin_bp,
        "is_overflow": is_overflow,
        "verdict": verdict,
        "status_color": status_color,
        "packaging_message": message,
        "breakdown_bp": {
            "itrs": AAV_ITRS_BP,
            "promoter": promoter_bp,
            "nuclease_cDNA": nuclease_bp,
            "polyA": AAV_POLYA_BP,
            "u6_gRNA_scaffold": AAV_GRNA_U6_BP
        }
    }

def evaluate_delivery_strategy(target_tissue: str, nuclease_type: str = "SpCas9", promoter_type: str = "EFS") -> Dict:
    """
    Evaluates optimal delivery vector, clinical precedent, and AAV packaging constraints
    for a given target tissue and CRISPR nuclease effector.
    """
    profile = TISSUE_DELIVERY_PROFILES.get(target_tissue, TISSUE_DELIVERY_PROFILES["HSPCs"])
    packaging = calculate_aav_packaging(nuclease_type, promoter_type)

    return {
        "target_tissue": target_tissue,
        "target_name": profile["name"],
        "recommended_modality": profile["primary_recommendation"],
        "vector_class": profile["vector_class"],
        "biological_rationale": profile["rationale"],
        "clinical_precedent": profile["precedent"],
        "immunogenicity_risk": profile["immunogenicity_risk"],
        "off_target_profile": profile["off_target_risk"],
        "aav_packaging_evaluation": packaging
    }
