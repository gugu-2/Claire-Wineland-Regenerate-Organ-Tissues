from typing import Dict, List
from modules.crispr_designer import score_azimuth_on_target

def simulate_guide_evolution_robustness(guide_20nt: str, pam: str = "TGG") -> Dict:
    """
    Evaluates how robust a guide RNA is to single-nucleotide mutations in the tumor.
    Generates all 60 possible 1-nt point mutations in the target sequence,
    scores their CRISPR cleavage efficiency (Azimuth proxy), and measures fragility.
    """
    bases = ['A', 'C', 'G', 'T']
    
    # Baseline efficiency
    baseline_score, _, _ = score_azimuth_on_target(guide_20nt, pam)
    
    fragility_map = []
    escape_mutations = 0
    total_mutations = 0
    
    for pos in range(len(guide_20nt)):
        orig_base = guide_20nt[pos]
        pos_scores = []
        for mut_base in bases:
            if mut_base == orig_base:
                continue
                
            total_mutations += 1
            mutated_guide = guide_20nt[:pos] + mut_base + guide_20nt[pos+1:]
            mut_score, _, _ = score_azimuth_on_target(mutated_guide, pam)
            
            # If efficiency drops by more than 50% relative to baseline, it's an "escape"
            is_escape = mut_score < (baseline_score * 0.5)
            if is_escape:
                escape_mutations += 1
                
            pos_scores.append({
                "mutation": f"{orig_base}{pos+1}{mut_base}",
                "efficiency": mut_score,
                "is_escape": is_escape
            })
            
        # Average efficiency drop for this position
        avg_pos_score = sum(x["efficiency"] for x in pos_scores) / 3.0
        fragility = max(0, baseline_score - avg_pos_score)
        
        fragility_map.append({
            "position": pos + 1,
            "original_base": orig_base,
            "fragility_score": round(fragility, 3), # Higher means mutation here ruins the guide
            "mutations": pos_scores
        })
        
    robustness_score = 1.0 - (escape_mutations / total_mutations)
    
    return {
        "baseline_efficiency": round(baseline_score, 3),
        "robustness_score": round(robustness_score, 3),
        "escape_mutations_count": escape_mutations,
        "total_possible_mutations": total_mutations,
        "fragility_map": fragility_map,
        "conclusion": "Highly Robust" if robustness_score > 0.8 else "Fragile (High Risk of Tumor Escape)"
    }
