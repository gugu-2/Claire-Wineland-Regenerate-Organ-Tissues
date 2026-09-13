import json
from pathlib import Path
from typing import Dict, List, Optional
from core.config import DATA_DIR

def load_regeneration_protocols() -> List[Dict]:
    with open(DATA_DIR / "regeneration_protocols.json", "r", encoding="utf-8") as f:
        return json.load(f)

def get_protocol_by_lineage(lineage_name: str) -> Optional[Dict]:
    protocols = load_regeneration_protocols()
    for p in protocols:
        if lineage_name.lower() in p["target_lineage"].lower():
            return p
    return protocols[0] if protocols else None

def evaluate_custom_cocktail(
    target_lineage: str,
    selected_factors: List[str],
    delivery_modality: str
) -> Dict:
    """
    Evaluates a user-selected transcription factor cocktail and delivery modality
    for tumorigenic risk, teratoma formation potential, and reprogramming efficiency.
    """
    factors_upper = [f.upper().strip() for f in selected_factors]
    
    # Base risk depending on delivery method
    modality_lower = delivery_modality.lower()
    if "retrovir" in modality_lower:
        base_risk = 0.55
        integration_status = "High risk of insertional oncogenesis via viral genome integration"
    elif "lentivir" in modality_lower:
        base_risk = 0.35
        integration_status = "Moderate risk of insertional mutagenesis (requires copy-number analysis)"
    elif "sendai" in modality_lower or "episom" in modality_lower:
        base_risk = 0.10
        integration_status = "Zero genomic integration (RNA virus or non-replicating episomal plasmids)"
    elif "small molecule" in modality_lower or "mrna" in modality_lower or "chem" in modality_lower:
        base_risk = 0.04
        integration_status = "Chemically defined / transient mRNA: zero genomic footprint"
    else:
        base_risk = 0.20
        integration_status = "Standard delivery modality"

    # Oncogene penalties
    oncogene_flags = []
    has_myc = "C-MYC" in factors_upper or "MYC" in factors_upper
    has_lin28 = "LIN28" in factors_upper or "LIN28A" in factors_upper
    has_klf4 = "KLF4" in factors_upper

    if has_myc:
        base_risk += 0.38
        oncogene_flags.append({
            "factor": "c-MYC",
            "risk_type": "Potent Proto-Oncogene",
            "warning": "c-MYC reactivation induces fatal fibrosarcomas and teratocarcinomas in rodent chimera models. In clinical-grade protocols, c-MYC must be omitted or replaced with L-MYC, Glis1, or small molecules."
        })

    if has_lin28:
        base_risk += 0.12
        oncogene_flags.append({
            "factor": "LIN28",
            "risk_type": "Oncofetal RNA-binding protein",
            "warning": "Associated with Wilms' tumor and neuroblastoma tumorigenesis when expressed persistently."
        })

    if has_klf4:
        base_risk += 0.05
        oncogene_flags.append({
            "factor": "KLF4",
            "risk_type": "Context-dependent zinc-finger regulator",
            "warning": "Dual oncogenic/tumor-suppressor activity depending on cellular transcriptional environment."
        })

    total_risk = min(0.99, max(0.02, base_risk))
    total_risk = round(total_risk, 2)

    if total_risk >= 0.65:
        risk_tier = "CRITICAL_TUMORIGENIC_RISK"
        color = "red"
        clinical_verdict = "NOT RECOMMENDED FOR TRANSLATIONAL/HUMAN PROTOCOLS"
    elif total_risk >= 0.30:
        risk_tier = "MODERATE_RISK"
        color = "amber"
        clinical_verdict = "ACCEPTABLE WITH STRICT VECTOR COPY NUMBER MONITORING"
    else:
        risk_tier = "LOW_TUMORIGENIC_RISK"
        color = "emerald"
        clinical_verdict = "RECOMMENDED TRANSLATIONAL PROTOCOL PROFILE"

    # Recommendation
    recommendations = []
    if has_myc:
        recommendations.append("Substitute c-MYC with L-MYC or small molecule Wnt agonist (CHIR99021) to drastically suppress transformation.")
    if "retrovir" in modality_lower or "lentivir" in modality_lower:
        recommendations.append("Switch to non-integrative Sendai virus (Cytotune) or synthetic modified mRNA to eliminate insertional mutagenesis.")
    recommendations.append("Implement magnetic-activated cell sorting (MACS) or FACS with anti-TRA-1-60/CORIN to eliminate residual undifferentiated pluripotent cells before in vivo graft.")

    return {
        "target_lineage": target_lineage,
        "selected_factors": selected_factors,
        "delivery_modality": delivery_modality,
        "tumorigenic_risk_score": total_risk,
        "risk_tier": risk_tier,
        "risk_color": color,
        "clinical_verdict": clinical_verdict,
        "integration_status": integration_status,
        "oncogene_flags": oncogene_flags,
        "safety_recommendations": recommendations,
        "estimated_reprogramming_efficiency": "1.2% - 4.5%" if not has_myc else "8.0% - 15.0% (at expense of oncogenicity)"
    }
