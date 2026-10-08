import math
from typing import Dict, List, Optional, Tuple

def calculate_excision_efficiency(guide_a_eff: float, guide_b_eff: float, distance_bp: int, pam_orientation: str) -> float:
    """
    Predicts dual-guide deletion efficiency based on individual cleavage frequencies,
    intervening distance, and PAM orientation synergy.
    """
    # Baseline is the product of both cut probabilities (both cuts must occur)
    joint_cut_prob = guide_a_eff * guide_b_eff

    # Distance penalty: excisions between 30bp and 350bp have highest efficiency.
    # Larger excisions (>1kb) drop off as chromosomal ends are prone to separate repair or translocations.
    if 30 <= distance_bp <= 350:
        dist_factor = 1.15
    elif distance_bp < 30:
        dist_factor = 0.75  # steric hindrance between two Cas9 complexes
    elif distance_bp <= 1000:
        dist_factor = 0.90
    else:
        dist_factor = 0.65

    # PAM orientation bonus (Canver et al. Nature 2015; He et al. 2016)
    # PAM-OUT orientation prevents re-cleavage of partially repaired junctions and steric collision
    if pam_orientation == "PAM_OUT":
        pam_factor = 1.20
    elif pam_orientation == "PAM_IN":
        pam_factor = 0.90
    else:
        pam_factor = 1.00  # TANDEM

    score = joint_cut_prob * dist_factor * pam_factor
    return round(max(0.05, min(0.95, score)), 2)

def design_dual_guide_pairs(
    target_gene: str,
    target_domain: str,
    candidates: List[Dict],
    min_excision_bp: int = 25,
    max_excision_bp: int = 600
) -> List[Dict]:
    """
    Identifies synergistic paired guide combinations flanking the designated target locus
    to achieve targeted microhomology-mediated or NHEJ genomic excision.
    """
    if len(candidates) < 2:
        return []

    pairs = []
    # Evaluate all pairwise combinations
    for i in range(len(candidates)):
        for j in range(i + 1, len(candidates)):
            g1 = candidates[i]
            g2 = candidates[j]

            # Determine relative genomic order
            offset1 = g1.get("start_offset", 0)
            offset2 = g2.get("start_offset", 0)
            if offset1 > offset2:
                upstream, downstream = g2, g1
            else:
                upstream, downstream = g1, g2

            # Calculate Cas9 cut site (3 bp upstream of PAM)
            # For (+) strand: cut site is start_offset + 17
            # For (-) strand: cut site is start_offset + 3
            cut1 = upstream.get("start_offset", 0) + (17 if upstream.get("strand") == "+" else 3)
            cut2 = downstream.get("start_offset", 0) + (17 if downstream.get("strand") == "+" else 3)

            distance = abs(cut2 - cut1)
            if distance < min_excision_bp or distance > max_excision_bp:
                continue

            # Determine PAM orientation
            strand1 = upstream.get("strand", "+")
            strand2 = downstream.get("strand", "+")

            if strand1 == "-" and strand2 == "+":
                pam_orientation = "PAM_OUT"  # Optimal: PAMs point outwards
                orientation_desc = "PAM-Outward (Synergistic; prevents steric hindrance and junction re-cutting)"
            elif strand1 == "+" and strand2 == "-":
                pam_orientation = "PAM_IN"
                orientation_desc = "PAM-Inward (May suffer from Cas9 steric clash if <50bp)"
            else:
                pam_orientation = "TANDEM"
                orientation_desc = "Tandem Unidirectional (Standard co-cleavage)"

            eff1 = upstream.get("on_target_efficiency_patient", 0.70)
            eff2 = downstream.get("on_target_efficiency_patient", 0.70)

            excision_score = calculate_excision_efficiency(eff1, eff2, distance, pam_orientation)

            pairs.append({
                "pair_id": f"Dual_{upstream['guide_id']}_x_{downstream['guide_id']}",
                "target_gene": target_gene,
                "target_domain": target_domain,
                "upstream_guide": {
                    "guide_id": upstream["guide_id"],
                    "sequence": upstream["patient_guide_20nt"],
                    "pam": upstream["pam_sequence"],
                    "strand": strand1,
                    "cut_offset": cut1,
                    "efficiency": eff1
                },
                "downstream_guide": {
                    "guide_id": downstream["guide_id"],
                    "sequence": downstream["patient_guide_20nt"],
                    "pam": downstream["pam_sequence"],
                    "strand": strand2,
                    "cut_offset": cut2,
                    "efficiency": eff2
                },
                "excision_distance_bp": distance,
                "pam_orientation": pam_orientation,
                "orientation_description": orientation_desc,
                "predicted_excision_efficiency": excision_score,
                "predicted_excision_pct": f"{int(excision_score * 100)}%",
                "translocation_risk_tier": "LOW_RISK" if distance <= 350 else "MODERATE_RISK"
            })

    # Sort by predicted excision efficiency descending
    pairs.sort(key=lambda p: p["predicted_excision_efficiency"], reverse=True)
    return pairs[:6]
