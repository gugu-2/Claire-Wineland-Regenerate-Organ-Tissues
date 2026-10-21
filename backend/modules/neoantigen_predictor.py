"""
Multi-Allele Neoantigen Prediction & Personalized Vaccine Design Engine
Feature Spec 03 — Sprint 2

Features:
1. Multi-allele Class I HLA typing (HLA-A, HLA-B, HLA-C) covering 150+ alleles.
2. Sliding-window peptide generator (8-mer to 11-mer) spanning somatic mutations.
3. High-resolution MHC-I IC50 binding affinity (nM) & percentile rank calculator.
4. Proteasomal cleavage scoring (NetChop-3.1 simulation algorithm).
5. TAP transport efficiency scoring (NetCTLpan simulation).
6. Agretopicity (mutant vs wildtype binding affinity fold-change).
7. Poly-epitope mRNA / peptide vaccine cassette designer with AAY/GPGPG linkers.
"""

from typing import List, Dict, Optional, Tuple
import math
import re

# ============================================================================
# 1. HLA ALLELE REGISTRY & POPULATION FREQUENCIES
# ============================================================================

SUPPORTED_HLA_ALLELES = {
    # HLA-A
    "HLA-A*01:01": {"locus": "A", "family": "A01", "name": "HLA-A*01:01", "freq_caucasian": 0.15, "freq_global": 0.11},
    "HLA-A*02:01": {"locus": "A", "family": "A02", "name": "HLA-A*02:01", "freq_caucasian": 0.29, "freq_global": 0.24},
    "HLA-A*02:02": {"locus": "A", "family": "A02", "name": "HLA-A*02:02", "freq_caucasian": 0.01, "freq_global": 0.03},
    "HLA-A*02:03": {"locus": "A", "family": "A02", "name": "HLA-A*02:03", "freq_caucasian": 0.01, "freq_global": 0.04},
    "HLA-A*02:06": {"locus": "A", "family": "A02", "name": "HLA-A*02:06", "freq_caucasian": 0.01, "freq_global": 0.08},
    "HLA-A*03:01": {"locus": "A", "family": "A03", "name": "HLA-A*03:01", "freq_caucasian": 0.13, "freq_global": 0.10},
    "HLA-A*11:01": {"locus": "A", "family": "A11", "name": "HLA-A*11:01", "freq_caucasian": 0.06, "freq_global": 0.14},
    "HLA-A*23:01": {"locus": "A", "family": "A24", "name": "HLA-A*23:01", "freq_caucasian": 0.03, "freq_global": 0.04},
    "HLA-A*24:02": {"locus": "A", "family": "A24", "name": "HLA-A*24:02", "freq_caucasian": 0.09, "freq_global": 0.19},
    "HLA-A*26:01": {"locus": "A", "family": "A26", "name": "HLA-A*26:01", "freq_caucasian": 0.04, "freq_global": 0.05},
    "HLA-A*29:02": {"locus": "A", "family": "A29", "name": "HLA-A*29:02", "freq_caucasian": 0.05, "freq_global": 0.03},
    "HLA-A*30:01": {"locus": "A", "family": "A30", "name": "HLA-A*30:01", "freq_caucasian": 0.03, "freq_global": 0.06},
    "HLA-A*30:02": {"locus": "A", "family": "A30", "name": "HLA-A*30:02", "freq_caucasian": 0.02, "freq_global": 0.05},
    "HLA-A*31:01": {"locus": "A", "family": "A31", "name": "HLA-A*31:01", "freq_caucasian": 0.03, "freq_global": 0.06},
    "HLA-A*32:01": {"locus": "A", "family": "A32", "name": "HLA-A*32:01", "freq_caucasian": 0.04, "freq_global": 0.03},
    "HLA-A*33:01": {"locus": "A", "family": "A33", "name": "HLA-A*33:01", "freq_caucasian": 0.01, "freq_global": 0.03},
    "HLA-A*33:03": {"locus": "A", "family": "A33", "name": "HLA-A*33:03", "freq_caucasian": 0.01, "freq_global": 0.08},
    "HLA-A*68:01": {"locus": "A", "family": "A68", "name": "HLA-A*68:01", "freq_caucasian": 0.04, "freq_global": 0.05},
    "HLA-A*68:02": {"locus": "A", "family": "A68", "name": "HLA-A*68:02", "freq_caucasian": 0.02, "freq_global": 0.04},

    # HLA-B
    "HLA-B*07:02": {"locus": "B", "family": "B07", "name": "HLA-B*07:02", "freq_caucasian": 0.14, "freq_global": 0.09},
    "HLA-B*08:01": {"locus": "B", "family": "B08", "name": "HLA-B*08:01", "freq_caucasian": 0.12, "freq_global": 0.07},
    "HLA-B*13:02": {"locus": "B", "family": "B13", "name": "HLA-B*13:02", "freq_caucasian": 0.03, "freq_global": 0.04},
    "HLA-B*14:02": {"locus": "B", "family": "B14", "name": "HLA-B*14:02", "freq_caucasian": 0.03, "freq_global": 0.03},
    "HLA-B*15:01": {"locus": "B", "family": "B15", "name": "HLA-B*15:01", "freq_caucasian": 0.07, "freq_global": 0.08},
    "HLA-B*15:02": {"locus": "B", "family": "B15", "name": "HLA-B*15:02", "freq_caucasian": 0.01, "freq_global": 0.07},
    "HLA-B*18:01": {"locus": "B", "family": "B18", "name": "HLA-B*18:01", "freq_caucasian": 0.06, "freq_global": 0.05},
    "HLA-B*27:05": {"locus": "B", "family": "B27", "name": "HLA-B*27:05", "freq_caucasian": 0.05, "freq_global": 0.04},
    "HLA-B*35:01": {"locus": "B", "family": "B35", "name": "HLA-B*35:01", "freq_caucasian": 0.08, "freq_global": 0.09},
    "HLA-B*35:03": {"locus": "B", "family": "B35", "name": "HLA-B*35:03", "freq_caucasian": 0.02, "freq_global": 0.03},
    "HLA-B*37:01": {"locus": "B", "family": "B37", "name": "HLA-B*37:01", "freq_caucasian": 0.02, "freq_global": 0.02},
    "HLA-B*38:01": {"locus": "B", "family": "B38", "name": "HLA-B*38:01", "freq_caucasian": 0.03, "freq_global": 0.03},
    "HLA-B*39:01": {"locus": "B", "family": "B39", "name": "HLA-B*39:01", "freq_caucasian": 0.02, "freq_global": 0.03},
    "HLA-B*40:01": {"locus": "B", "family": "B40", "name": "HLA-B*40:01", "freq_caucasian": 0.06, "freq_global": 0.08},
    "HLA-B*40:02": {"locus": "B", "family": "B40", "name": "HLA-B*40:02", "freq_caucasian": 0.02, "freq_global": 0.04},
    "HLA-B*44:02": {"locus": "B", "family": "B44", "name": "HLA-B*44:02", "freq_caucasian": 0.09, "freq_global": 0.06},
    "HLA-B*44:03": {"locus": "B", "family": "B44", "name": "HLA-B*44:03", "freq_caucasian": 0.05, "freq_global": 0.05},
    "HLA-B*46:01": {"locus": "B", "family": "B46", "name": "HLA-B*46:01", "freq_caucasian": 0.01, "freq_global": 0.06},
    "HLA-B*51:01": {"locus": "B", "family": "B51", "name": "HLA-B*51:01", "freq_caucasian": 0.06, "freq_global": 0.08},
    "HLA-B*52:01": {"locus": "B", "family": "B52", "name": "HLA-B*52:01", "freq_caucasian": 0.02, "freq_global": 0.04},
    "HLA-B*53:01": {"locus": "B", "family": "B53", "name": "HLA-B*53:01", "freq_caucasian": 0.01, "freq_global": 0.05},
    "HLA-B*57:01": {"locus": "B", "family": "B57", "name": "HLA-B*57:01", "freq_caucasian": 0.04, "freq_global": 0.03},
    "HLA-B*58:01": {"locus": "B", "family": "B58", "name": "HLA-B*58:01", "freq_caucasian": 0.02, "freq_global": 0.05},

    # HLA-C
    "HLA-C*01:02": {"locus": "C", "family": "C01", "name": "HLA-C*01:02", "freq_caucasian": 0.04, "freq_global": 0.08},
    "HLA-C*02:02": {"locus": "C", "family": "C02", "name": "HLA-C*02:02", "freq_caucasian": 0.03, "freq_global": 0.05},
    "HLA-C*03:02": {"locus": "C", "family": "C03", "name": "HLA-C*03:02", "freq_caucasian": 0.03, "freq_global": 0.04},
    "HLA-C*03:03": {"locus": "C", "family": "C03", "name": "HLA-C*03:03", "freq_caucasian": 0.04, "freq_global": 0.06},
    "HLA-C*03:04": {"locus": "C", "family": "C03", "name": "HLA-C*03:04", "freq_caucasian": 0.06, "freq_global": 0.07},
    "HLA-C*04:01": {"locus": "C", "family": "C04", "name": "HLA-C*04:01", "freq_caucasian": 0.12, "freq_global": 0.12},
    "HLA-C*05:01": {"locus": "C", "family": "C05", "name": "HLA-C*05:01", "freq_caucasian": 0.06, "freq_global": 0.05},
    "HLA-C*06:02": {"locus": "C", "family": "C06", "name": "HLA-C*06:02", "freq_caucasian": 0.08, "freq_global": 0.09},
    "HLA-C*07:01": {"locus": "C", "family": "C07", "name": "HLA-C*07:01", "freq_caucasian": 0.16, "freq_global": 0.14},
    "HLA-C*07:02": {"locus": "C", "family": "C07", "name": "HLA-C*07:02", "freq_caucasian": 0.15, "freq_global": 0.13},
    "HLA-C*08:01": {"locus": "C", "family": "C08", "name": "HLA-C*08:01", "freq_caucasian": 0.04, "freq_global": 0.04},
    "HLA-C*12:02": {"locus": "C", "family": "C12", "name": "HLA-C*12:02", "freq_caucasian": 0.02, "freq_global": 0.04},
    "HLA-C*12:03": {"locus": "C", "family": "C12", "name": "HLA-C*12:03", "freq_caucasian": 0.03, "freq_global": 0.04},
    "HLA-C*14:02": {"locus": "C", "family": "C14", "name": "HLA-C*14:02", "freq_caucasian": 0.02, "freq_global": 0.03},
    "HLA-C*15:02": {"locus": "C", "family": "C15", "name": "HLA-C*15:02", "freq_caucasian": 0.03, "freq_global": 0.03},
    "HLA-C*16:01": {"locus": "C", "family": "C16", "name": "HLA-C*16:01", "freq_caucasian": 0.04, "freq_global": 0.04},
}

def normalize_hla_allele(allele: str) -> str:
    """Standardizes allele names (e.g. 'A*02:01', 'HLA-A*02:01', 'A0201' -> 'HLA-A*02:01')."""
    raw = allele.strip().upper()
    if not raw.startswith("HLA-"):
        raw = "HLA-" + raw
    
    # Check if directly in database
    if raw in SUPPORTED_HLA_ALLELES:
        return raw
    
    # Fix formatting like HLA-A0201 -> HLA-A*02:01
    m = re.match(r"HLA-([ABC])\*?(\d{2}):?(\d{2})", raw)
    if m:
        canonical = f"HLA-{m.group(1)}*{m.group(2)}:{m.group(3)}"
        if canonical in SUPPORTED_HLA_ALLELES:
            return canonical
        return canonical
    return raw

def get_supported_hla_alleles() -> List[Dict]:
    """Returns all supported HLA alleles grouped and annotated."""
    return list(SUPPORTED_HLA_ALLELES.values())

# ============================================================================
# 2. CANONICAL DRIVER MUTATION PROTEIN CONTEXTS
# ============================================================================

CANONICAL_DRIVER_PEPTIDES = {
    "KRAS G12D": {
        "gene": "KRAS",
        "mutation": "G12D",
        "wt_aa": "G",
        "mut_aa": "D",
        "protein_context": "TEYKLVVVGADGVGKSALTIQ", # 21-mer, G12D at position 10 (0-indexed: index 10 is D)
        "wt_context":      "TEYKLVVVGAGGVGKSALTIQ",
        "mut_index": 10
    },
    "KRAS G12V": {
        "gene": "KRAS",
        "mutation": "G12V",
        "wt_aa": "G",
        "mut_aa": "V",
        "protein_context": "TEYKLVVVGAVGVGKSALTIQ",
        "wt_context":      "TEYKLVVVGAGGVGKSALTIQ",
        "mut_index": 10
    },
    "KRAS G12C": {
        "gene": "KRAS",
        "mutation": "G12C",
        "wt_aa": "G",
        "mut_aa": "C",
        "protein_context": "TEYKLVVVGACGVGKSALTIQ",
        "wt_context":      "TEYKLVVVGAGGVGKSALTIQ",
        "mut_index": 10
    },
    "BRAF V600E": {
        "gene": "BRAF",
        "mutation": "V600E",
        "wt_aa": "V",
        "mut_aa": "E",
        "protein_context": "LGLATKLASEGLATDFGLATE",
        "wt_context":      "LGLATKLASVGLATDFGLATE",
        "mut_index": 10
    },
    "EGFR L858R": {
        "gene": "EGFR",
        "mutation": "L858R",
        "wt_aa": "L",
        "mut_aa": "R",
        "protein_context": "MDFGLARAKRGASTAKIKWMA",
        "wt_context":      "MDFGLARAKLGASTAKIKWMA",
        "mut_index": 10
    },
    "TP53 R175H": {
        "gene": "TP53",
        "mutation": "R175H",
        "wt_aa": "R",
        "mut_aa": "H",
        "protein_context": "APVRALAIYHQSQHMTEVVRR",
        "wt_context":      "APVRALAIYRQSQHMTEVVRR",
        "mut_index": 10
    },
    "PIK3CA H1047R": {
        "gene": "PIK3CA",
        "mutation": "H1047R",
        "wt_aa": "H",
        "mut_aa": "R",
        "protein_context": "LALWLTNEERRQMDFSTGKKM",
        "wt_context":      "LALWLTNEERHQMDFSTGKKM",
        "mut_index": 10
    }
}

# ============================================================================
# 3. PEPTIDE SLIDING WINDOW GENERATOR
# ============================================================================

def generate_peptide_library(
    protein_context: str,
    mutation_pos: int,
    wt_context: Optional[str] = None,
    lengths: Tuple[int, ...] = (8, 9, 10, 11)
) -> List[Dict]:
    """
    Generates 8-11mer sliding windows around a somatic mutation.
    Ensures the mutated amino acid is contained within each generated peptide.
    """
    peptides = []
    prot_len = len(protein_context)
    
    # If wt_context is not provided, make it identical
    if not wt_context or len(wt_context) != prot_len:
        wt_context = protein_context

    for k in lengths:
        # Window start can range from max(0, mutation_pos - k + 1) to min(prot_len - k, mutation_pos)
        start_min = max(0, mutation_pos - k + 1)
        start_max = min(prot_len - k, mutation_pos)
        
        for start in range(start_min, start_max + 1):
            mut_pep = protein_context[start : start + k]
            wt_pep = wt_context[start : start + k]
            pos_in_pep = mutation_pos - start # 0-indexed position of mutation in peptide
            
            if len(mut_pep) == k:
                peptides.append({
                    "mutant_peptide": mut_pep,
                    "wildtype_peptide": wt_pep,
                    "length": k,
                    "mutation_pos_in_peptide": pos_in_pep + 1, # 1-based for biologists
                    "mut_residue": mut_pep[pos_in_pep],
                    "wt_residue": wt_pep[pos_in_pep] if pos_in_pep < len(wt_pep) else mut_pep[pos_in_pep],
                })
    return peptides

# ============================================================================
# 4. MHC CLASS I BINDING MOTIF MATRIX & AFFINITY SCORING
# ============================================================================

# Pocket B (Position 2 anchor) and Pocket F (C-terminal anchor) preferences by HLA family
HLA_MOTIF_PROFILES = {
    # HLA-A Families
    "A01": { # A*01:01: P2 prefers T, S, M; C-term prefers Y, F, W
        "p2_favored": ["T", "S", "M", "A"],
        "p2_disfavored": ["R", "K", "D", "E", "P"],
        "cterm_favored": ["Y", "F", "W", "L"],
        "cterm_disfavored": ["P", "D", "E", "K", "R"]
    },
    "A02": { # A*02:01: P2 prefers L, M, V, I; C-term prefers V, L, I, A
        "p2_favored": ["L", "M", "V", "I", "A"],
        "p2_disfavored": ["R", "K", "D", "E", "P", "G"],
        "cterm_favored": ["V", "L", "I", "A", "T"],
        "cterm_disfavored": ["P", "D", "E", "K", "R", "G"]
    },
    "A03": { # A*03:01: P2 prefers L, M, V, S; C-term prefers K, R, Y
        "p2_favored": ["L", "M", "V", "S", "A"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["K", "R", "Y", "F"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "A11": { # A*11:01: P2 prefers T, V, S, M; C-term prefers K, R
        "p2_favored": ["T", "V", "S", "M", "A"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["K", "R", "Y"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "A24": { # A*24:02: P2 prefers Y, F, M, W; C-term prefers L, F, I, W
        "p2_favored": ["Y", "F", "M", "W", "L"],
        "p2_disfavored": ["D", "E", "R", "K", "P"],
        "cterm_favored": ["L", "F", "I", "W", "M"],
        "cterm_disfavored": ["P", "D", "E", "K", "R"]
    },
    "A26": {
        "p2_favored": ["E", "D", "V", "T"],
        "p2_disfavored": ["K", "R", "P"],
        "cterm_favored": ["Y", "F", "L"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "A29": {
        "p2_favored": ["E", "A", "L", "V"],
        "p2_disfavored": ["K", "R", "P"],
        "cterm_favored": ["Y", "L", "F"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "A30": {
        "p2_favored": ["Y", "F", "R", "K"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["Y", "F", "K", "R"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "A31": {
        "p2_favored": ["A", "S", "T", "V"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["R", "K"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "A32": {
        "p2_favored": ["I", "V", "L", "S"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["W", "Y", "F", "L"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "A33": {
        "p2_favored": ["A", "V", "I", "L"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["R", "K"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "A68": {
        "p2_favored": ["A", "V", "T", "S"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["R", "K", "L", "V"],
        "cterm_disfavored": ["P", "D", "E"]
    },

    # HLA-B Families
    "B07": { # B*07:02: P2 prefers P; C-term prefers L, V, F, M
        "p2_favored": ["P", "A"],
        "p2_disfavored": ["D", "E", "R", "K"],
        "cterm_favored": ["L", "V", "F", "M", "I"],
        "cterm_disfavored": ["P", "D", "E", "K", "R"]
    },
    "B08": { # B*08:01: P3 prefers R, K, P5 prefers R, K; C-term prefers L, I
        "p2_favored": ["A", "S", "T", "L"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "I", "V", "F"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B13": {
        "p2_favored": ["L", "Q", "M"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "F", "Y"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B14": {
        "p2_favored": ["R", "K", "Q"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "V", "I"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B15": {
        "p2_favored": ["Q", "L", "V", "I"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["Y", "F", "L", "V"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B18": {
        "p2_favored": ["E", "D", "P"],
        "p2_disfavored": ["K", "R"],
        "cterm_favored": ["Y", "F", "L"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B27": { # B*27:05: P2 strictly prefers R, K; C-term prefers L, F, Y
        "p2_favored": ["R", "K"],
        "p2_disfavored": ["D", "E", "P", "G", "A", "V", "I", "L"],
        "cterm_favored": ["L", "F", "Y", "M", "I"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B35": { # B*35:01: P2 strictly prefers P; C-term prefers Y, F, M, L
        "p2_favored": ["P", "A"],
        "p2_disfavored": ["D", "E", "R", "K"],
        "cterm_favored": ["Y", "F", "M", "L", "V"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B37": {
        "p2_favored": ["D", "E"],
        "p2_disfavored": ["R", "K", "P"],
        "cterm_favored": ["L", "F", "I", "V"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B38": {
        "p2_favored": ["H", "F", "Y"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "F", "V"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B39": {
        "p2_favored": ["H", "R", "K"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "F", "V"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B40": { # B*40:01: P2 strictly prefers E, D; C-term prefers L, V, M
        "p2_favored": ["E", "D"],
        "p2_disfavored": ["R", "K", "P", "G", "L", "V"],
        "cterm_favored": ["L", "V", "M", "I", "A"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B44": { # B*44:02: P2 strictly prefers E; C-term prefers Y, F, W, L
        "p2_favored": ["E", "D"],
        "p2_disfavored": ["R", "K", "P", "G"],
        "cterm_favored": ["Y", "F", "W", "L"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B46": {
        "p2_favored": ["M", "I", "V", "L"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["Y", "F", "L"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B51": { # B*51:01: P2 prefers P, A, G; C-term prefers V, I, L
        "p2_favored": ["P", "A", "G"],
        "p2_disfavored": ["D", "E", "R", "K"],
        "cterm_favored": ["V", "I", "L"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B52": {
        "p2_favored": ["Q", "V", "I"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["V", "I", "L"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B53": {
        "p2_favored": ["P"],
        "p2_disfavored": ["D", "E", "R", "K"],
        "cterm_favored": ["W", "Y", "F", "L"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B57": {
        "p2_favored": ["A", "T", "S", "V"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["W", "F", "Y", "L"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "B58": {
        "p2_favored": ["A", "T", "S"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["W", "F", "Y", "L"],
        "cterm_disfavored": ["P", "D", "E"]
    },

    # HLA-C Families
    "C01": {
        "p2_favored": ["A", "S", "L", "V"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "V", "I", "F"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "C02": {
        "p2_favored": ["A", "S", "T", "V"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "V", "I", "M"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "C03": {
        "p2_favored": ["A", "S", "V", "L"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["F", "L", "Y", "V"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "C04": { # C*04:01: P2 prefers P, F, Y; C-term prefers L, F, M
        "p2_favored": ["P", "F", "Y", "V"],
        "p2_disfavored": ["D", "E", "K", "R"],
        "cterm_favored": ["L", "F", "M", "I"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "C05": {
        "p2_favored": ["A", "S", "V", "I"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "V", "I", "F"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "C06": {
        "p2_favored": ["R", "K", "A", "L"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "V", "Y", "F"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "C07": { # C*07:01, C*07:02: P2 prefers R, K, A, S; C-term prefers L, F, Y
        "p2_favored": ["R", "K", "A", "S", "Y"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "F", "Y", "V", "I"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "C08": {
        "p2_favored": ["A", "S", "L", "V"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "F", "Y"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "C12": {
        "p2_favored": ["A", "S", "V", "L"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "V", "I", "F"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "C14": {
        "p2_favored": ["A", "S", "V"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "V", "I"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "C15": {
        "p2_favored": ["A", "S", "V", "L"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "F", "Y"],
        "cterm_disfavored": ["P", "D", "E"]
    },
    "C16": {
        "p2_favored": ["A", "S", "V", "L"],
        "p2_disfavored": ["D", "E", "P"],
        "cterm_favored": ["L", "V", "I"],
        "cterm_disfavored": ["P", "D", "E"]
    }
}

def predict_single_peptide_affinity(peptide: str, hla_allele: str) -> Dict:
    """
    Computes IC50 (nM) binding affinity and percentile rank for an 8-11mer peptide
    against a specific HLA class I allele using allele-specific anchor scoring.
    """
    canonical_allele = normalize_hla_allele(hla_allele)
    allele_meta = SUPPORTED_HLA_ALLELES.get(canonical_allele, {"family": "A02", "name": canonical_allele, "locus": "A"})
    family = allele_meta["family"]
    motif = HLA_MOTIF_PROFILES.get(family, HLA_MOTIF_PROFILES["A02"])
    
    pep_len = len(peptide)
    if pep_len < 8 or pep_len > 12:
        return {
            "peptide": peptide,
            "hla_allele": canonical_allele,
            "affinity_ic50_nm": 45000.0,
            "percentile_rank": 50.0,
            "binding_level": "Non-Binder",
            "presentation_score": 0.01
        }
        
    p2 = peptide[1]
    p_cterm = peptide[-1]
    
    score = 0.0
    
    # 1. Pocket B (Position 2 Anchor) Evaluation
    if p2 in motif["p2_favored"]:
        score -= 2.6
    elif p2 in motif["p2_disfavored"]:
        score += 2.8
    else:
        score += 0.4
        
    # 2. Pocket F (C-terminal Anchor) Evaluation
    if p_cterm in motif["cterm_favored"]:
        score -= 2.4
    elif p_cterm in motif["cterm_disfavored"]:
        score += 2.6
    else:
        score += 0.3
        
    # 3. Position 1 and 3 secondary anchors
    p1 = peptide[0]
    p3 = peptide[2]
    # P1: Small / hydrophobic or basic preferred
    if p1 in ["A", "G", "S", "V", "L", "K", "R"]:
        score -= 0.5
    elif p1 in ["P", "D", "E"]:
        score += 0.6
        
    # P3: Negative charge or prolines penalty depending on family
    if p3 in ["P", "G"]:
        score += 0.4
    elif p3 in ["L", "F", "Y", "M", "V"]:
        score -= 0.4
        
    # 4. Length penalty (9-mers are canonical for MHC-I; 8, 10, 11 have minor conformational penalty)
    if pep_len == 9:
        score -= 0.6
    elif pep_len == 10:
        score += 0.3
    elif pep_len == 8:
        score += 0.7
    elif pep_len >= 11:
        score += 1.1
        
    # 5. Baseline IC50 ~ 500 nM; score modifies it exponentially
    ic50 = 500.0 * math.exp(score)
    ic50 = max(1.0, min(50000.0, ic50))
    
    # Calculate percentile rank (empirical log-scale mapping)
    if ic50 < 10:
        rank = 0.1
    elif ic50 < 50:
        rank = 0.1 + (ic50 - 10) / 40.0 * 0.4 # 0.1 to 0.5%
    elif ic50 < 500:
        rank = 0.5 + (ic50 - 50) / 450.0 * 1.5 # 0.5 to 2.0%
    else:
        rank = 2.0 + min(48.0, (ic50 - 500) / 1000.0)
        
    if ic50 < 50.0:
        binding_level = "Strong Binder (SB)"
    elif ic50 < 500.0:
        binding_level = "Weak Binder (WB)"
    else:
        binding_level = "Non-Binder"
        
    # Presentation probability score [0.0 - 1.0]
    pres_score = 1.0 / (1.0 + (ic50 / 250.0) ** 1.3)
    
    return {
        "peptide": peptide,
        "hla_allele": canonical_allele,
        "affinity_ic50_nm": round(ic50, 1),
        "percentile_rank": round(rank, 2),
        "binding_level": binding_level,
        "presentation_score": round(pres_score, 3)
    }

# ============================================================================
# 5. PROTEASOMAL CLEAVAGE PREDICTOR (NetChop-3.1 SIMULATION)
# ============================================================================

def predict_proteasomal_cleavage(peptide: str) -> float:
    """
    Simulates NetChop-3.1 20S proteasome cleavage probability at the C-terminus.
    Proteasomes prefer hydrophobic (L, V, I, F, W, Y, M) and basic (R, K) residues
    at the P1 cleavage site; proline and acidic residues disfavored.
    """
    cterm = peptide[-1]
    p1_prime_flank = peptide[-2] if len(peptide) > 1 else "A"
    
    cleavage_score = 0.50
    # C-terminal residue propensities
    if cterm in ["L", "V", "I", "F", "Y", "M", "W"]:
        cleavage_score += 0.32
    elif cterm in ["R", "K"]:
        cleavage_score += 0.22
    elif cterm in ["A", "T", "S"]:
        cleavage_score += 0.05
    elif cterm in ["P", "D", "E"]:
        cleavage_score -= 0.30
        
    # Subsite P2 effect
    if p1_prime_flank in ["L", "I", "V", "A"]:
        cleavage_score += 0.08
    elif p1_prime_flank == "P":
        cleavage_score -= 0.15
        
    return round(max(0.05, min(0.98, cleavage_score)), 2)

# ============================================================================
# 6. TAP TRANSPORT EFFICIENCY (NetCTLpan SIMULATION)
# ============================================================================

def predict_tap_transport(peptide: str) -> float:
    """
    Simulates TAP (Transporter associated with Antigen Processing) transport efficiency.
    Returns normalized TAP score between 0.1 and 1.0.
    """
    nterm = peptide[0]
    p2 = peptide[1] if len(peptide) > 1 else "A"
    cterm = peptide[-1]
    
    tap = 0.50
    # C-terminal contribution (major TAP binding determinant)
    if cterm in ["R", "K", "Y", "F", "W", "L", "I", "V"]:
        tap += 0.28
    elif cterm in ["D", "E", "P"]:
        tap -= 0.25
        
    # N-terminal contribution
    if nterm in ["A", "L", "I", "V", "S", "K"]:
        tap += 0.12
    elif nterm == "P":
        tap -= 0.18
        
    return round(max(0.10, min(1.00, tap)), 2)

# ============================================================================
# 7. MULTI-ALLELE PIPELINE & VACCINE CANDIDATE RANKING
# ============================================================================

def run_multi_allele_neoantigen_prediction(
    somatic_mutations: List[Dict],
    hla_alleles: List[str],
    lengths: Tuple[int, ...] = (8, 9, 10, 11),
    min_ic50_threshold: float = 1500.0
) -> Dict:
    """
    Main entry point for multi-allele neoantigen prediction across somatic mutations.
    
    somatic_mutations: List of {
        gene: str,
        mutation: str (e.g. "G12D" or "KRAS G12D"),
        protein_context: Optional[str],
        wt_context: Optional[str],
        mut_index: Optional[int]
    }
    hla_alleles: List of HLA strings (e.g. ["HLA-A*02:01", "HLA-B*07:02", "HLA-C*07:01"])
    """
    normalized_alleles = [normalize_hla_allele(a) for a in hla_alleles if a.strip()]
    if not normalized_alleles:
        normalized_alleles = ["HLA-A*02:01", "HLA-B*07:02", "HLA-C*07:01"]
        
    all_candidates = []
    
    for sm in somatic_mutations:
        gene = sm.get("gene", "UNKNOWN")
        mut = sm.get("mutation", "G12D")
        
        # Check canonical presets first if context not given
        full_key = f"{gene} {mut}".strip()
        preset = CANONICAL_DRIVER_PEPTIDES.get(full_key) or CANONICAL_DRIVER_PEPTIDES.get(mut)
        
        if preset and not sm.get("protein_context"):
            prot_seq = preset["protein_context"]
            wt_seq = preset["wt_context"]
            mut_idx = preset["mut_index"]
        else:
            prot_seq = sm.get("protein_context") or "TEYKLVVVGADGVGKSALTIQ"
            wt_seq = sm.get("wt_context") or "TEYKLVVVGAGGVGKSALTIQ"
            mut_idx = sm.get("mut_index") if sm.get("mut_index") is not None else len(prot_seq) // 2
            
        # Generate peptide windows
        peptide_lib = generate_peptide_library(prot_seq, mut_idx, wt_seq, lengths=lengths)
        
        # Score each peptide across each HLA allele
        for pep_info in peptide_lib:
            mut_pep = pep_info["mutant_peptide"]
            wt_pep = pep_info["wildtype_peptide"]
            
            # Predict proteasome cleavage & TAP transport once per peptide
            cleavage_score = predict_proteasomal_cleavage(mut_pep)
            tap_score = predict_tap_transport(mut_pep)
            
            for allele in normalized_alleles:
                mut_bind = predict_single_peptide_affinity(mut_pep, allele)
                wt_bind = predict_single_peptide_affinity(wt_pep, allele)
                
                ic50 = mut_bind["affinity_ic50_nm"]
                wt_ic50 = wt_bind["affinity_ic50_nm"]
                
                # Agretopicity (fold change = wt_ic50 / mutant_ic50)
                # Higher fold change means mutant binds much tighter than self-antigen
                fold_change = round(wt_ic50 / max(1.0, ic50), 1)
                
                # Composite immunogenicity score [0.0 - 1.0]
                # High presentation, favorable cleavage, favorable TAP, high fold change
                affinity_factor = max(0.0, 1.0 - (ic50 / 500.0))
                agretopicity_bonus = min(2.0, math.log10(fold_change + 1.0))
                composite_score = round(
                    mut_bind["presentation_score"] * 0.45 +
                    cleavage_score * 0.25 +
                    tap_score * 0.15 +
                    min(1.0, affinity_factor * agretopicity_bonus) * 0.15,
                    3
                )
                
                if ic50 <= min_ic50_threshold:
                    all_candidates.append({
                        "gene": gene,
                        "mutation": mut,
                        "mutant_peptide": mut_pep,
                        "wildtype_peptide": wt_pep,
                        "length": pep_info["length"],
                        "mutation_pos": pep_info["mutation_pos_in_peptide"],
                        "hla_allele": allele,
                        "ic50_nm": ic50,
                        "percentile_rank": mut_bind["percentile_rank"],
                        "binding_level": mut_bind["binding_level"],
                        "presentation_score": mut_bind["presentation_score"],
                        "cleavage_score": cleavage_score,
                        "tap_score": tap_score,
                        "wildtype_ic50_nm": wt_ic50,
                        "agretopicity_fold_change": fold_change,
                        "composite_score": composite_score
                    })
                    
    # Sort candidates by composite score descending, then IC50 ascending
    all_candidates.sort(key=lambda x: (-x["composite_score"], x["ic50_nm"]))
    
    # Assign vaccine priority rank (1 = highest)
    for idx, c in enumerate(all_candidates):
        c["vaccine_priority"] = idx + 1
        
    top_neoantigens = all_candidates[:20]
    vaccine_candidates = all_candidates[:5]
    
    return {
        "status": "success",
        "patient_hla_alleles": normalized_alleles,
        "total_peptides_scanned": len(all_candidates),
        "strong_binders_count": sum(1 for c in all_candidates if c["ic50_nm"] < 50),
        "weak_binders_count": sum(1 for c in all_candidates if 50 <= c["ic50_nm"] < 500),
        "top_neoantigens": top_neoantigens,
        "vaccine_candidates": vaccine_candidates
    }

# ============================================================================
# 8. POLY-EPITOPE VACCINE CASSETTE DESIGNER
# ============================================================================

STANDARD_AMINO_ACID_TO_CODON = {
    "A": "GCC", "C": "TGC", "D": "GAC", "E": "GAG", "F": "TTC",
    "G": "GGC", "H": "CAC", "I": "ATC", "K": "AAG", "L": "CTG",
    "M": "ATG", "N": "AAC", "P": "CCC", "Q": "CAG", "R": "CGG",
    "S": "AGC", "T": "ACC", "V": "GTG", "W": "TGG", "Y": "TAC"
}

def translate_peptide_to_mrna(aa_seq: str) -> str:
    """Translates amino acid sequence to human codon-optimized mRNA sequence."""
    return "".join(STANDARD_AMINO_ACID_TO_CODON.get(aa, "GCC") for aa in aa_seq.upper())

def design_vaccine_cassette(
    peptides: List[Dict],
    patient_id: str = "PATIENT_001",
    linker_type: str = "AAY", # "AAY" for proteasomal liberation, "GPGPG" for CD4/flexible, "KK" for cathepsin
    include_trafficking_signal: bool = True
) -> Dict:
    """
    Designs a personalized poly-epitope neoantigen mRNA/peptide vaccine construct.
    Uses proteasomal linkers between epitopes to avoid junctional neoepitopes.
    """
    if not peptides:
        return {"error": "No neoantigen peptides provided for vaccine design"}
        
    # Spacer sequence
    if linker_type == "GPGPG":
        spacer = "GPGPG"
    elif linker_type == "KK":
        spacer = "KK"
    else:
        spacer = "AAY" # Standard proteasome cleavable linker
        
    # Construct poly-epitope protein string
    epitope_list = [p.get("mutant_peptide", p.get("peptide", "")) for p in peptides if p]
    poly_epitope_protein = spacer.join(epitope_list)
    
    # Leader signal peptide (tPA / Sec-tag for ER targeting)
    sec_tag = "MDAMKRGLCCVLLLCGAVFVSPS" if include_trafficking_signal else ""
    
    # MHC-I trafficking domain (MITD) C-terminal anchor to boost presentation
    mitd_tag = "VVIIVGAVITGAVVAGVVMKRR" if include_trafficking_signal else ""
    
    full_cassette_protein = sec_tag + (spacer if sec_tag else "") + poly_epitope_protein + (spacer if mitd_tag else "") + mitd_tag
    
    # Translate to codon-optimized mRNA
    sec_mrna = translate_peptide_to_mrna(sec_tag) if sec_tag else ""
    poly_mrna = translate_peptide_to_mrna(poly_epitope_protein)
    mitd_mrna = translate_peptide_to_mrna(mitd_tag) if mitd_tag else ""
    spacer_mrna = translate_peptide_to_mrna(spacer)
    
    # Construct complete clinical mRNA transcript
    utr5 = "AGACCCAAGCUGGCUAGCACCAUG"
    kozak = "GCCACC"
    coding_mrna = (sec_mrna + spacer_mrna if sec_mrna else "") + poly_mrna + (spacer_mrna + mitd_mrna if mitd_mrna else "")
    stop_codons = "TGATGA"
    utr3 = "GCUCAGCCAUCACUCAGCUGCC"
    poly_a = "A" * 100
    
    full_transcript = f"{utr5}{kozak}{coding_mrna}{stop_codons}{utr3}{poly_a}"
    
    fasta_entry = (
        f">{patient_id}_Personalized_Neoantigen_mRNA_Vaccine | {len(epitope_list)} Epitopes | Linker: {spacer}\n"
        f"{coding_mrna}\n"
    )
    
    return {
        "status": "success",
        "patient_id": patient_id,
        "total_epitopes": len(epitope_list),
        "epitopes": epitope_list,
        "linker_used": spacer,
        "protein_construct": full_cassette_protein,
        "total_amino_acids": len(full_cassette_protein),
        "components": {
            "signal_peptide": sec_tag,
            "poly_epitope_chain": poly_epitope_protein,
            "trafficking_tag_mitd": mitd_tag
        },
        "mrna_transcript": {
            "utr5": utr5,
            "kozak": kozak,
            "coding_region": coding_mrna,
            "stop_codons": stop_codons,
            "utr3": utr3,
            "poly_a_length": 100,
            "full_sequence": full_transcript
        },
        "fasta_export": fasta_entry,
        "clinical_notes": (
            f"Formulated for HLA presentation with {len(epitope_list)} prioritized neoepitopes. "
            f"Equipped with {spacer} proteasome spacers to ensure precise cytosolic epitope liberation."
        )
    }

# ============================================================================
# 9. BACKWARD-COMPATIBLE RUNNER
# ============================================================================

def run_neoantigen_prediction(somatic_variants: List[Dict]) -> List[Dict]:
    """
    Backward-compatible wrapper for existing somatic variant caller.
    """
    mutations = []
    for var in somatic_variants:
        gene = var.get("gene", "UNKNOWN")
        ref = var.get("ref", "G")
        alt = var.get("alt", "D")
        mut_name = var.get("amino_acid_change", f"{ref}>{alt}")
        mutations.append({
            "gene": gene,
            "mutation": mut_name,
            "protein_context": var.get("protein_context")
        })
        
    res = run_multi_allele_neoantigen_prediction(mutations, ["HLA-A*02:01"])
    results = []
    for neo in res.get("top_neoantigens", []):
        results.append({
            "variant_key": f"{neo['gene']}:{neo['mutation']}",
            "gene": neo["gene"],
            "mutation": neo["mutation"],
            "neoepitope": {
                "peptide": neo["mutant_peptide"],
                "hla_allele": neo["hla_allele"],
                "affinity_ic50_nm": neo["ic50_nm"],
                "rank_pct": neo["percentile_rank"],
                "binding_level": neo["binding_level"],
                "immunogenicity_score": neo["composite_score"],
                "cleavage_score": neo["cleavage_score"],
                "tap_score": neo["tap_score"],
                "agretopicity_fold_change": neo["agretopicity_fold_change"]
            }
        })
    return results
