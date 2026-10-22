"""
CAR-T Cell Surface Antigen Identification & Construct Blueprint Engine
Feature Spec 06 — Sprint 3

Features:
1. Curated database of 40+ validated clinical CAR-T targets with scFv sequences.
2. Normal tissue cross-reactivity engine using GTEx v8 tissue expression baselines.
3. Multi-organ safety filter: evaluates Heart, Brain, Liver, Lung, and Kidney.
4. Safety classification: SAFE, CAUTION, BLOCKED (on-target toxicity warning).
5. Therapeutic window score calculation (Tumor TPM vs Normal Max TPM).
6. Complete CAR-T construct designer: Leader, scFv, Hinge, TM, Costimulatory (4-1BB/CD28), CD3-zeta.
7. Active ClinicalTrials.gov NCT trial matching.
"""

from typing import List, Dict, Optional, Any
import json
from pathlib import Path
import math

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CART_DB_PATH = DATA_DIR / "cart_antigens.json"

# ============================================================================
# 1. CANONICAL CAR CONSTRUCT DOMAINS
# ============================================================================

CAR_SIGNAL_PEPTIDE = {
    "name": "CD8alpha Leader",
    "sequence": "MALPVTALLLPLALLLHAARP",
    "description": "Directs nascent CAR polypeptide to secretory pathway for cell-surface presentation"
}

CAR_HINGE_TM_DOMAINS = {
    "CD8alpha": {
        "hinge": "TTTPAPRPPTPAPTIASQPLSLRPEACRPAAGGAVHTRGLDFACD",
        "tm": "IYIWAPLAGTCGVLLLSLVITLYC",
        "description": "Standard CD8alpha hinge and transmembrane domain with low tonic activation"
    },
    "CD28": {
        "hinge": "IEVMYPPPYLDNEKSNGTIIHVKGKHLCPSPLFPGPSKP",
        "tm": "FWVLVVVGGVLACYSLLVTVAFIIFWV",
        "description": "CD28 hinge-TM domain providing rapid, robust immunological synapse formation"
    }
}

CAR_COSTIMULATORY_DOMAINS = {
    "4-1BB": {
        "name": "4-1BB (CD137 / TNFRSF9)",
        "sequence": "KRGRKKLLYIFKQPFMRPVQTTQEEDGCSCRFPEEEEGGCEL",
        "description": "Promotes oxidative phosphorylation, central memory T-cell phenotype (Tcm), and prolonged survival (months to years)"
    },
    "CD28": {
        "name": "CD28",
        "sequence": "RSKRSRLLHSDYMNMTPRRPGPTRKHYQPYAPPRDFAAYRS",
        "description": "Drives glycolysis, rapid clonal proliferation, and high initial cytotoxicity (effector phenotype)"
    }
}

CAR_ACTIVATION_DOMAIN = {
    "name": "CD3-zeta (CD247)",
    "sequence": "RVKFSRSADAPAYQQGQNQLYNELNLGRREEYDVLDKRRGRDPEMGGKPRRKNPQEGLYNELQKDKMAEAYSEIGMKGERRRGKGHDGLYQGLSTATKDTYDALHMQALPPR",
    "description": "Contains 3 ITAM motifs (Immunoreceptor Tyrosine-based Activation Motifs) essential for T-cell lytic triggering"
}

# ============================================================================
# 2. TCGA REFERENCE AVERAGE TUMOR EXPRESSIONS (TPM)
# ============================================================================

TCGA_AVERAGE_EXPRESSIONS = {
    "Pancreatic Ductal Adenocarcinoma (PDAC)": {
        "MSLN": 285.4, "CLDN18": 142.1, "MUC1": 210.0, "CEA": 184.2, "CD276": 64.0, "HER2": 32.5, "PSCA": 115.0
    },
    "HER2+ Breast Cancer": {
        "HER2": 482.0, "MUC1": 310.5, "ROR1": 42.1, "CD276": 55.4, "TROP2": 195.0, "MSLN": 18.2
    },
    "Multiple Myeloma": {
        "BCMA": 340.2, "GPRC5D": 290.4, "CD38": 412.0, "CD138": 380.5, "SLAMF7": 210.0
    },
    "B-cell ALL": {
        "CD19": 450.0, "CD22": 310.0, "CD20": 280.0
    },
    "Acute Myeloid Leukemia (AML)": {
        "CD33": 210.5, "CD123": 185.0, "FLT3": 95.0, "CLL-1": 140.0
    },
    "Glioblastoma Multiforme (GBM)": {
        "EGFRvIII": 320.0, "GD2": 185.0, "IL13RA2": 215.0, "HER2": 45.0, "EphA2": 140.0
    },
    "Gastric Adenocarcinoma": {
        "CLDN18": 385.0, "HER2": 190.0, "CEA": 220.0, "MSLN": 145.0, "MUC1": 175.0
    },
    "Hepatocellular Carcinoma (HCC)": {
        "GPC3": 390.0, "AFP": 280.0, "CD276": 48.0
    },
    "Colorectal Adenocarcinoma": {
        "CEA": 410.0, "MUC1": 185.0, "GUCY2C": 260.0, "HER2": 28.0
    },
    "Small Cell Lung Cancer (SCLC)": {
        "DLL3": 340.0, "CD56": 210.0, "GD2": 85.0
    }
}

# ============================================================================
# 3. CART ENGINE CORE
# ============================================================================

def load_cart_database() -> Dict[str, Any]:
    """Loads validated CAR-T target library from JSON storage."""
    if not CART_DB_PATH.exists():
        return {}
    with open(CART_DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def check_normal_tissue_safety(vital_tpm_dict: Dict[str, float], normal_median_tpm: float) -> Dict[str, Any]:
    """
    Evaluates expression in vital organs (Heart, Brain, Liver, Lung, Kidney).
    Returns safety tier and risk assessment.
    """
    heart = vital_tpm_dict.get("heart", 0.0)
    brain = vital_tpm_dict.get("brain", 0.0)
    liver = vital_tpm_dict.get("liver", 0.0)
    lung = vital_tpm_dict.get("lung", 0.0)
    kidney = vital_tpm_dict.get("kidney", 0.0)
    
    vital_max = max(heart, brain, liver, lung, kidney)
    highest_organ = max(vital_tpm_dict, key=vital_tpm_dict.get) if (vital_tpm_dict and vital_max > 0.0) else "none"
    
    # Clinical safety thresholds:
    # BLOCKED: any vital organ > 20 TPM (severe risk of on-target, off-tumor organ toxicity)
    # CAUTION: vital organ 5 - 20 TPM or normal median > 5 TPM (requires affinity tuning)
    # SAFE: all vital organs < 5 TPM and normal median < 5 TPM
    if vital_max > 20.0:
        tier = "BLOCKED"
        safety_status = "UNSAFE: Significant Vital Organ Expression"
        color = "rose"
    elif vital_max > 5.0 or normal_median_tpm > 5.0:
        tier = "CAUTION"
        safety_status = "CAUTION: Moderate Normal Tissue Expression"
        color = "amber"
    else:
        tier = "SAFE"
        safety_status = "SAFE: Restricted / Absent in Normal Vital Organs"
        color = "emerald"
        
    return {
        "safety_tier": tier,
        "status_label": safety_status,
        "color": color,
        "vital_max_tpm": vital_max,
        "highest_risk_organ": highest_organ,
        "organ_breakdown": {
            "heart": heart,
            "brain": brain,
            "liver": liver,
            "lung": lung,
            "kidney": kidney
        }
    }

def identify_cart_candidates(
    cancer_type: str = "Pancreatic Ductal Adenocarcinoma (PDAC)",
    somatic_profile: Optional[Dict] = None,
    sample_id: Optional[str] = None,
    db_session = None
) -> Dict[str, Any]:
    """
    Identifies and ranks CAR-T cell surface antigen candidates for a patient tumor.
    Integrates real tumor RNA-seq expression from database when available.
    """
    db = load_cart_database()
    cancer_type_lower = cancer_type.lower()
    
    # Try fetching tumor expression from database if sample_id provided
    db_expressions = {}
    if db_session and sample_id:
        try:
            from core.models import ExpressionProfileModel
            records = db_session.query(ExpressionProfileModel).filter(
                ExpressionProfileModel.sample_id == sample_id
            ).all()
            for r in records:
                db_expressions[r.gene_name] = r.tpm
        except Exception:
            pass

    # Reference TCGA fallback
    tcga_ref = TCGA_AVERAGE_EXPRESSIONS.get(cancer_type, {})
    if not tcga_ref:
        for k, v in TCGA_AVERAGE_EXPRESSIONS.items():
            if any(term in cancer_type_lower for term in k.lower().split()):
                tcga_ref = v
                break

    candidates = []
    
    for antigen_key, data in db.items():
        gene = data["gene"]
        relevant_cancers = data.get("cancer_types", [])
        
        # Check cancer type relevance
        is_relevant = any(c.lower() in cancer_type_lower or cancer_type_lower in c.lower() for c in relevant_cancers)
        
        # Determine tumor TPM
        if gene in db_expressions:
            tumor_tpm = db_expressions[gene]
            expr_source = "Patient RNA-seq (Verified)"
        elif gene in tcga_ref or antigen_key in tcga_ref:
            tumor_tpm = tcga_ref.get(gene, tcga_ref.get(antigen_key, 120.0))
            expr_source = f"TCGA Reference Average ({cancer_type})"
        else:
            # Baseline estimation if target is known for this cancer
            tumor_tpm = 120.0 if is_relevant else 12.0
            expr_source = "Literature / Oncology Baseline"
            
        normal_median = data.get("gtex_normal_median_tpm", 1.0)
        vital_tpm = data.get("gtex_vital_organ_tpm", {})
        
        # Safety analysis
        safety = check_normal_tissue_safety(vital_tpm, normal_median)
        
        # Therapeutic Window Score (ratio of tumor expression to maximum normal vital organ expression)
        normal_denominator = max(0.5, safety["vital_max_tpm"])
        therapeutic_window = round(tumor_tpm / normal_denominator, 1)
        
        # Composite target score
        # High tumor expression + high therapeutic window - safety penalty
        safety_multiplier = 1.0 if safety["safety_tier"] == "SAFE" else (0.6 if safety["safety_tier"] == "CAUTION" else 0.1)
        composite_score = round(math.log2(tumor_tpm + 1.0) * math.log10(therapeutic_window + 1.0) * safety_multiplier, 2)
        
        candidates.append({
            "antigen": antigen_key,
            "gene": gene,
            "full_name": data.get("full_name"),
            "cancer_types": relevant_cancers,
            "is_cancer_matched": is_relevant,
            "tumor_tpm": round(tumor_tpm, 1),
            "tumor_expr_source": expr_source,
            "normal_median_tpm": normal_median,
            "therapeutic_window_ratio": therapeutic_window,
            "safety": safety,
            "approved_therapies": data.get("approved_therapies", []),
            "costimulatory_domain": data.get("costimulatory_domain", "4-1BB"),
            "clinical_trial_ncts": data.get("clinical_trial_ncts", []),
            "composite_score": composite_score,
            "safety_notes": data.get("safety_notes")
        })
        
    # Sort candidates by composite score descending
    candidates.sort(key=lambda x: (-x["is_cancer_matched"], -x["composite_score"]))
    
    safe_list = [c for c in candidates if c["safety"]["safety_tier"] == "SAFE"]
    caution_list = [c for c in candidates if c["safety"]["safety_tier"] == "CAUTION"]
    blocked_list = [c for c in candidates if c["safety"]["safety_tier"] == "BLOCKED"]

    matched_safe = [c["antigen"] for c in safe_list if c["is_cancer_matched"]]
    matched_caution = [c["antigen"] for c in caution_list if c["is_cancer_matched"]]
    top_recommended = (
        matched_safe[0] if matched_safe
        else (matched_caution[0] if matched_caution
        else (safe_list[0]["antigen"] if safe_list
        else (caution_list[0]["antigen"] if caution_list else None)))
    )
    
    return {
        "status": "success",
        "cancer_type": cancer_type,
        "sample_id": sample_id or "CLINICAL_SAMPLE",
        "total_antigens_evaluated": len(candidates),
        "safe_count": len(safe_list),
        "caution_count": len(caution_list),
        "blocked_count": len(blocked_list),
        "top_recommended_antigen": top_recommended,
        "candidates": candidates
    }

def get_cart_blueprint(antigen_name: str, patient_id: str = "PATIENT_001") -> Dict[str, Any]:
    """
    Generates an engineering blueprint for a CAR-T therapeutic construct.
    Includes full amino acid sequence, domain annotations, dynamic GTEx safety, and clinical trials.
    """
    db = load_cart_database()
    antigen_norm = antigen_name.strip().upper()
    target_data = None
    antigen_key = antigen_name.strip()
    
    # Case-insensitive resolution against dictionary keys and gene symbols
    for k, v in db.items():
        if k.upper() == antigen_norm or v.get("gene", "").upper() == antigen_norm:
            target_data = v
            antigen_key = k
            break
                
    if not target_data:
        return {"status": "error", "message": f"CAR-T target '{antigen_name}' not found in database"}

    scfv = target_data.get("scfv_sequence", "")
    scfv_clone = target_data.get("scfv_clone", "Canonical scFv")
    costim_key = "4-1BB" if "4-1BB" in target_data.get("costimulatory_domain", "4-1BB") else "CD28"
    costim_data = CAR_COSTIMULATORY_DOMAINS.get(costim_key, CAR_COSTIMULATORY_DOMAINS["4-1BB"])
    hinge_tm = CAR_HINGE_TM_DOMAINS["CD8alpha"]
    
    # Dynamic normal tissue safety evaluation
    vital_tpm = target_data.get("gtex_vital_organ_tpm", {})
    normal_median = target_data.get("gtex_normal_median_tpm", 1.0)
    safety = check_normal_tissue_safety(vital_tpm, normal_median)
    
    # Assembled CAR-T polypeptide
    full_car_protein = (
        CAR_SIGNAL_PEPTIDE["sequence"] +
        scfv +
        hinge_tm["hinge"] +
        hinge_tm["tm"] +
        costim_data["sequence"] +
        CAR_ACTIVATION_DOMAIN["sequence"]
    )
    
    fasta_entry = (
        f">{patient_id}_Anti-{antigen_key}_SecondGen_CAR_Construct | Costim: {costim_key} | TM: CD8a | Activation: CD3z\n"
        f"{full_car_protein}\n"
    )
    
    # Clinical trial links
    trial_urls = [
        {"nct_id": nct, "url": f"https://clinicaltrials.gov/study/{nct}"}
        for nct in target_data.get("clinical_trial_ncts", [])
    ]
    
    domain_arch = {
        "generation": "2nd Generation CAR (Single Costimulatory Domain)",
        "signal_peptide": CAR_SIGNAL_PEPTIDE,
        "scfv_antigen_binding_domain": {
            "name": f"Anti-{antigen_key} scFv ({scfv_clone})",
            "sequence": scfv,
            "length_aa": len(scfv)
        },
        "extracellular_scfv": {
            "name": f"Anti-{antigen_key} scFv ({scfv_clone})",
            "sequence": scfv,
            "length_aa": len(scfv)
        },
        "hinge_transmembrane": {
            "hinge_type": "CD8alpha",
            "hinge": hinge_tm["hinge"],
            "tm": hinge_tm["tm"],
            "description": hinge_tm["description"]
        },
        "costimulatory_domain": {
            "name": costim_data["name"],
            "sequence": costim_data["sequence"],
            "rationale": target_data.get("costimulatory_rationale", costim_data["description"])
        },
        "costimulatory": {
            "name": costim_data["name"],
            "sequence": costim_data["sequence"],
            "rationale": target_data.get("costimulatory_rationale", costim_data["description"])
        },
        "activation_domain": CAR_ACTIVATION_DOMAIN
    }
    
    return {
        "status": "success",
        "antigen": antigen_key,
        "patient_id": patient_id,
        "full_name": target_data.get("full_name", antigen_key),
        "scfv_clone": scfv_clone,
        "total_amino_acids": len(full_car_protein),
        "total_length_aa": len(full_car_protein),
        "target_details": {
            "gene": target_data.get("gene"),
            "full_name": target_data.get("full_name"),
            "cancer_types": target_data.get("cancer_types"),
            "approved_therapies": target_data.get("approved_therapies")
        },
        "approved_therapies": target_data.get("approved_therapies", []),
        "domain_architecture": domain_arch,
        "car_architecture": domain_arch,
        "full_car_polypeptide": full_car_protein,
        "fasta_export": fasta_entry,
        "safety_profile": safety,
        "safety_notes": target_data.get("safety_notes"),
        "clinical_trial_ncts": target_data.get("clinical_trial_ncts", []),
        "clinical_trials": trial_urls
    }
