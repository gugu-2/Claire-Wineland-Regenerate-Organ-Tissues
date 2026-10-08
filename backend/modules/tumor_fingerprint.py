from typing import Dict, List
import math
import random

def generate_tumor_fingerprint(
    tmb_score: float,
    msi_score: float,
    purity: float,
    dominant_clone_ccf: float,
    immune_infiltration: float,
    druggable_targets_count: int,
    best_crispr_efficiency: float,
    art_integration_prob: float = 0.5
) -> Dict:
    """
    Generates a normalized polar coordinate 'Fingerprint' for a tumor.
    All axes are normalized 0 to 1.
    """
    # Normalize TMB (assume max ~ 50 for normalization purposes)
    norm_tmb = min(1.0, tmb_score / 50.0)
    
    # Normalize druggable targets (assume max ~ 10)
    norm_targets = min(1.0, druggable_targets_count / 10.0)
    
    # The axes for the radar chart
    axes = [
        {"axis": "Tumor Mutational Burden (TMB)", "value": norm_tmb, "raw": f"{tmb_score} mut/Mb"},
        {"axis": "Microsatellite Instability (MSI)", "value": msi_score, "raw": f"{msi_score:.2f} score"},
        {"axis": "Tumor Purity", "value": purity, "raw": f"{purity*100:.0f}%"},
        {"axis": "Dominant Clone CCF", "value": dominant_clone_ccf, "raw": f"{dominant_clone_ccf*100:.0f}%"},
        {"axis": "Immune Infiltration", "value": immune_infiltration, "raw": f"{immune_infiltration*100:.0f}%"},
        {"axis": "ART Integration Prob", "value": art_integration_prob, "raw": f"{art_integration_prob*100:.0f}%"},
        {"axis": "Druggable Targets", "value": norm_targets, "raw": f"{druggable_targets_count} targets"},
        {"axis": "Max CRISPR Efficiency", "value": best_crispr_efficiency, "raw": f"{best_crispr_efficiency*100:.0f}%"}
    ]
    
    # Generate a unique hash for the visual glyph
    glyph_seed = f"{tmb_score}_{msi_score}_{purity}"
    
    return {
        "fingerprint_axes": axes,
        "glyph_seed": glyph_seed,
        "clinical_summary": f"A unique genomic fingerprint reflecting {'high' if tmb_score > 10 else 'low'} TMB and {'high' if purity > 0.5 else 'low'} purity."
    }
