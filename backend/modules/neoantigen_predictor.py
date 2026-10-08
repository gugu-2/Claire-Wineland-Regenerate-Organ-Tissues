from typing import List, Dict, Optional
import math

def predict_neoantigen_affinity(peptide_9mer: str, hla_allele: str = "HLA-A*02:01") -> Dict:
    """
    Mock statistical approximation for peptide-MHC binding affinity (IC50 in nM).
    Uses a simplified position-weight heuristic to estimate binding of 9-mer peptides
    to standard HLA types, simulating what NetMHCpan would return.
    """
    if len(peptide_9mer) != 9:
        return {"affinity_ic50": 5000, "rank_pct": 50.0, "binding_level": "Non-Binder"}

    # Extremely simplified PSSM for HLA-A*02:01 (anchors at P2 and P9)
    # Good anchors for A0201: P2=(L, M), P9=(V, L)
    score = 0.0
    p2 = peptide_9mer[1]
    p9 = peptide_9mer[8]
    
    if p2 in ["L", "M"]:
        score -= 2.0
    elif p2 in ["I", "V", "A", "T"]:
        score -= 1.0
    else:
        score += 2.0
        
    if p9 in ["V", "L"]:
        score -= 2.0
    elif p9 in ["I", "A", "T"]:
        score -= 1.0
    else:
        score += 2.0
        
    # Baseline IC50 ~500nM, score modifies it exponentially
    ic50 = 500.0 * math.exp(score)
    ic50 = max(1.0, min(50000.0, ic50))
    
    if ic50 < 50:
        level = "Strong-Binder (SB)"
        rank = 0.5
    elif ic50 < 500:
        level = "Weak-Binder (WB)"
        rank = 2.0
    else:
        level = "Non-Binder"
        rank = min(50.0, ic50 / 100)

    return {
        "peptide": peptide_9mer,
        "hla_allele": hla_allele,
        "affinity_ic50_nm": round(ic50, 1),
        "rank_pct": round(rank, 2),
        "binding_level": level,
        "immunogenicity_score": round(max(0, 1.0 - (ic50 / 500.0)), 3)
    }

def run_neoantigen_prediction(somatic_variants: List[Dict]) -> List[Dict]:
    """
    Extracts proxy 9-mers around variants and scores them for Neoantigen potential.
    """
    results = []
    for var in somatic_variants:
        # In a real app we'd translate the mutated transcript.
        # Here we generate a mock mutated 9mer based on the reference sequence context.
        ref = var.get("ref", "A")
        alt = var.get("alt", "T")
        if len(ref) == 1 and len(alt) == 1:
            # Mock flanking sequence
            mock_peptide = "AL" + alt + "LMAPV"
            mock_peptide = mock_peptide[:9].ljust(9, 'A')
            
            prediction = predict_neoantigen_affinity(mock_peptide)
            results.append({
                "variant_key": f"{var.get('chromosome')}:{var.get('position')}",
                "gene": var.get("gene", "Unknown"),
                "mutation": f"{ref}>{alt}",
                "neoepitope": prediction
            })
            
    # Sort by strongest binders
    results.sort(key=lambda x: x["neoepitope"]["affinity_ic50_nm"])
    return results
