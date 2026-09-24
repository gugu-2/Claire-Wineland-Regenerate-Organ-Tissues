"""
aart_modeler.py — Array-Associated Reverse Transcriptase (ART) Research Module
================================================================================
Based on: Yoon, Athukoralage, Ameisen et al. (2026)
"Autonomous AI agents discover reverse transcriptases with tandem repeat arrays"
Anthropic Life Sciences Research Group

ART = Array-Associated Reverse Transcriptases: a novel enzyme family discovered
by Claude AI agents via autonomous genome mining of 1.9 billion metagenomic
protein clusters. Claude identified the system by recognizing CRISPR-like tandem
repeat arrays upstream of a jumbo-phage RT family.

ART SYSTEM ARCHITECTURE (3 components):
  1. ncDNA repeat array (upstream of RT):
     - 5-14+ copies of ~200-nt units (spacer + ~16-17 nt repeat core)
     - Repeat core contains an inverted palindrome (hairpin-forming)
     - Transcribed into discrete, abundant short ncRNAs during phage infection
     - Up to 8% of all phage transcripts at 15 min post-infection (SA1)
  2. RT enzyme with unusual long N-terminal domain (NTD):
     - ~180 residue NTD preceding the RT polymerase domain
     - Retains catalytic YxDD motif in all characterized members
     - Phylogenetically sister to retrons; structurally similar to retron/DGR RTs
     - NTD is the most variable region — potentially confers programmability
  3. Partner protein (directly downstream of RT):
     - Type I: ~600 aa GNAT acetyltransferase-like fold (Listeria + env lineages)
     - Type II: ~270 aa all-helical (Staphylococcus phage SA1 clade)
     - Type III: ~170 aa helical (environmental sub-lineages)

HYPOTHESIZED FUNCTION (retron-like model):
  - Each ncRNA from the array may direct the RT+partner complex to a distinct target
  - Analogous to CRISPR: array = guide bank; RT = effector; partner = executor
  - Mechanism: RT copies ncRNA -> ssDNA, RT-RNA complex holds partner protein
  - Likely functions in anti-phage defense or inter-phage competition
  - Currently UNKNOWN — the defining frontier question for wet-lab follow-up

RESEARCH SIGNIFICANCE:
  - First RT family with CRISPR-like ncDNA repeat arrays
  - Potentially programmable (each spacer could encode different target specificity)
  - May be engineerable as a new genome-editing or gene-regulation tool
  - Complements CRISPR, retrons, and DGRs as novel prokaryotic immunity/evolution tool

RELEVANCE TO CANCER/GENE THERAPY:
  - If ART RT can be redirected via custom repeat arrays → new programmable DNA writer
  - RT-based writing could enable epigenome editing, saturation mutagenesis, or
    high-fidelity HDR templates without double-strand breaks
  - Type I partner (GNAT fold) may acetylate histones or nucleotides — epigenetic angle
  - Natural anti-phage function may be repurposable as oncolytic phage enhancer

References:
  Yoon PH et al. (2026) Autonomous AI agents discover reverse transcriptases
  with tandem repeat arrays. Anthropic preprint.
  DOI: pending (preprint: https://www-cdn.anthropic.com/22573675ada52a8ca8a97a1a4b4326b2f208a071.pdf)
"""

import re
import math
from typing import Dict, List, Optional, Tuple

DNA_COMPLEMENT = str.maketrans("ATCGatcg", "TAGCtagc")


def reverse_complement(seq: str) -> str:
    return seq.translate(DNA_COMPLEMENT)[::-1]


# ============================================================================
# 1. KNOWN ART REPEAT CORE SEQUENCES (from Yoon et al. 2026, Fig. 2G + Fig. 1E)
# ============================================================================

# Representative repeat core sequences from characterized ART systems
# These are the ~16-17 nt conserved repeats that contain inverted palindromes
ART_REPEAT_CORES = {
    "L0050_logan":  "CATGTGTATCGCATGT",   # Logan metagenomic contig (Fig. 1E, main discovery)
    "L0020_jgi":    "TACTTGTAAGAATTTCGCAAGTT",  # jgi12,964 contig (second confirmed locus)
    "MarsHill":     "TATGAATACGTAT",     # MarsHill phage locus (Fig. 2G; 5 repeats shown)
    "SA1_staph":    None,               # SA1 Staphylococcus phage (type II; sequence from BioProject PRJNA836150)
}

# ART partner type classification (Yoon et al. 2026, Fig. 3F-G)
ART_PARTNER_TYPES = {
    "TYPE_I": {
        "name": "GNAT Acetyltransferase-like",
        "approx_aa_length": 600,
        "predicted_fold": "tandem GNAT (GCN5-related N-acetyltransferase)",
        "phage_clade": "Listeria phage + environmental lineages",
        "n_loci": 59,
        "acetyl_coa_binding": True,
        "functional_hypothesis": (
            "Acetyltransferase activity directed by array ncRNAs — may acetylate "
            "nucleotide, DNA, or protein targets to mediate antiphage defense."
        ),
    },
    "TYPE_II": {
        "name": "All-helical (~270 aa)",
        "approx_aa_length": 270,
        "predicted_fold": "all-alpha helical bundle",
        "phage_clade": "Staphylococcus jumbo phage SA1 clade",
        "n_loci": 7,
        "acetyl_coa_binding": False,
        "functional_hypothesis": (
            "Unknown function; no homologs in Pfam or structural databases. "
            "May form RT-RNA-partner effector complex analogous to retron Ec86."
        ),
    },
    "TYPE_III": {
        "name": "Small helical (~170 aa)",
        "approx_aa_length": 170,
        "predicted_fold": "helical",
        "phage_clade": "Environmental sub-lineages",
        "n_loci": 3,
        "acetyl_coa_binding": False,
        "functional_hypothesis": (
            "Smallest partner type; may function as a minimal effector or regulatory subunit."
        ),
    },
}

# ART RT structural hallmarks (Yoon et al. 2026, Fig. 2C-D)
ART_RT_FEATURES = {
    "catalytic_motif": "YxDD",
    "n_terminal_domain_length_aa": 180,   # ~180 residues before the polymerase domain
    "typical_other_rt_ntd": 50,           # Most other RTs have <50 residue NTDs
    "phylogeny": "Sister clade to retrons",
    "solved_structure_homologs": [
        "Retron Ec86 (PDB: 7V9X)",
        "DGR BPP-1 (PDB: 8UBE)",
    ],
    "ntd_known_fold": False,              # NTD shows no detectable Foldseek TM-score to known structures
    "ntd_variability": "HIGH",            # Most variable region of the protein family
}


# ============================================================================
# 2. REPEAT ARRAY SCANNER
# ============================================================================

def scan_for_art_repeat_arrays(
    sequence: str,
    repeat_core: Optional[str] = None,
    min_copies: int = 3,
    max_mismatches: int = 2,
    spacer_range: Tuple[int, int] = (50, 400),
    unit_size: int = 200,
) -> Dict:
    """
    Scans a DNA sequence for ART-like tandem repeat arrays.

    ART arrays consist of:
      - A conserved repeat core (~16-17 nt) containing an inverted palindrome
      - Variable spacer sequences (~110-200 nt) between repeat cores
      - Total unit size: ~200 nt (repeat + spacer)

    This is directly analogous to CRISPR arrays but the repeat core is NOT
    a CRISPR DR — it carries an inverted palindrome that likely forms the
    ncRNA secondary structure.

    Args:
        sequence: Input DNA sequence to scan
        repeat_core: Known repeat core to search for (optional; triggers targeted scan)
        min_copies: Minimum repeat copies to call an array (default 3)
        max_mismatches: Maximum mismatches per copy
        spacer_range: (min, max) spacer length between copies
        unit_size: Expected unit size (spacer + repeat core)

    Returns:
        Dictionary with array detection results
    """
    seq = sequence.upper()
    results = {
        "sequence_length": len(seq),
        "arrays_found": [],
        "known_core_hits": [],
        "de_novo_repeats": [],
        "summary": "",
    }

    # --- A: Targeted search for known ART repeat cores ---
    for locus_name, core in ART_REPEAT_CORES.items():
        if core is None:
            continue
        core_u = core.upper()
        rc_core = reverse_complement(core_u)

        for strand, search_seq, strand_label in [
            ("+", seq, "sense"),
            ("-", seq, "antisense"),
        ]:
            positions = []
            # Allow max_mismatches mismatches in sliding window
            for i in range(len(search_seq) - len(core_u) + 1):
                window = search_seq[i:i + len(core_u)]
                mm = sum(1 for a, b in zip(window, core_u) if a != b)
                if mm <= max_mismatches:
                    positions.append((i, mm, window))

            if len(positions) >= min_copies:
                spacers = []
                for j in range(1, len(positions)):
                    gap = positions[j][0] - positions[j-1][0] - len(core_u)
                    if spacer_range[0] <= gap <= spacer_range[1]:
                        spacers.append(gap)

                if len(spacers) >= min_copies - 1:
                    results["known_core_hits"].append({
                        "known_system": locus_name,
                        "core_sequence": core,
                        "strand": strand_label,
                        "n_copies_found": len(positions),
                        "positions": [p[0] for p in positions],
                        "mismatches": [p[1] for p in positions],
                        "spacer_lengths": spacers,
                        "mean_spacer_nt": round(sum(spacers)/max(1,len(spacers)), 1),
                        "conclusion": f"STRONG: Sequence contains {len(positions)} copies of {locus_name} ART repeat core",
                    })

    # --- B: De novo repeat detection (sliding window k-mer approach) ---
    for k in [14, 16, 17, 20]:
        kmer_positions: Dict[str, List[int]] = {}
        for i in range(len(seq) - k + 1):
            kmer = seq[i:i+k]
            if kmer not in kmer_positions:
                kmer_positions[kmer] = []
            kmer_positions[kmer].append(i)

        for kmer, positions in kmer_positions.items():
            if len(positions) < min_copies:
                continue
            # Check spacing consistency (should be ~unit_size apart)
            spacers = [positions[j] - positions[j-1] for j in range(1, len(positions))]
            valid_spacers = [s for s in spacers if spacer_range[0] <= s <= spacer_range[1]]

            if len(valid_spacers) < min_copies - 1:
                continue

            # Check for inverted palindrome in k-mer (ART repeat hallmark)
            rc_kmer = reverse_complement(kmer)
            palindrome_score = sum(1 for a, b in zip(kmer[:k//2], rc_kmer[:k//2]) if a == b) / (k//2)

            if palindrome_score >= 0.5:  # At least 50% palindromic
                mean_spacing = sum(valid_spacers) / len(valid_spacers)
                results["de_novo_repeats"].append({
                    "kmer": kmer,
                    "kmer_length": k,
                    "n_copies": len(positions),
                    "positions": positions[:10],  # First 10
                    "spacer_lengths": valid_spacers[:10],
                    "mean_spacer_nt": round(mean_spacing, 1),
                    "palindrome_score": round(palindrome_score, 3),
                    "is_crispr_like": len(positions) >= 4 and palindrome_score >= 0.6,
                    "art_array_candidate": len(positions) >= 3 and 80 <= mean_spacing <= 400,
                })

    # --- C: Build overall assessment ---
    total_arrays = len(results["known_core_hits"]) + len(results["de_novo_repeats"])
    results["arrays_found"] = results["known_core_hits"] + [r for r in results["de_novo_repeats"] if r.get("art_array_candidate")]

    if results["known_core_hits"]:
        systems = [h["known_system"] for h in results["known_core_hits"]]
        results["summary"] = (
            f"CONFIRMED ART ARRAY: Matched {len(results['known_core_hits'])} known ART repeat core(s): {', '.join(systems)}"
        )
    elif any(r.get("art_array_candidate") for r in results["de_novo_repeats"]):
        best = max(results["de_novo_repeats"], key=lambda r: r.get("n_copies", 0))
        results["summary"] = (
            f"CANDIDATE ART ARRAY: {best['n_copies']} copies of {best['kmer_length']}-nt repeat "
            f"(palindrome score {best['palindrome_score']:.2f}, mean spacer {best['mean_spacer_nt']} nt) — "
            f"Warrants further characterization as potential ART locus."
        )
    else:
        results["summary"] = "No ART-like repeat arrays detected in this sequence."

    return results


# ============================================================================
# 3. ART RNA SECONDARY STRUCTURE PREDICTOR (Mfold-style approximation)
# ============================================================================

NN_DG_RNA: Dict[str, float] = {
    # Nearest-neighbour free energy (kcal/mol) for RNA duplexes at 37°C
    # Turner 2004 parameters (simplified)
    "AA": -0.9,  "AC": -2.1,  "AG": -2.1,  "AU": -1.1,
    "CA": -1.7,  "CC": -3.3,  "CG": -3.4,  "CU": -1.5,
    "GA": -1.8,  "GC": -3.4,  "GG": -3.3,  "GU": -2.1,
    "UA": -1.1,  "UC": -2.1,  "UG": -2.1,  "UU": -0.9,
}


def predict_art_repeat_rna_structure(repeat_unit_dna: str) -> Dict:
    """
    Predicts whether a given ART repeat unit (DNA) will form a stable RNA secondary
    structure (stem-loop / hairpin) when transcribed.

    ART arrays are transcribed into discrete ncRNAs that maintain repeat boundaries.
    The repeat core contains an inverted palindrome that forms the stem of a hairpin.
    This is structurally analogous to the CRISPR repeat stem-loop.

    Args:
        repeat_unit_dna: One complete ART array unit (spacer + repeat core) in DNA

    Returns:
        Predicted RNA structure metrics
    """
    rna = repeat_unit_dna.upper().replace("T", "U")
    n = len(rna)

    # Find the most stable stem-loop by scanning for palindromic sub-sequences
    best_stem = {"dg": 0.0, "stem_seq": "", "stem_start": 0, "stem_len": 0, "loop_size": 0}

    for stem_len in range(4, min(20, n//2)):
        for start in range(n - 2*stem_len - 3):
            for loop_size in range(3, 8):
                end = start + stem_len + loop_size + stem_len
                if end > n:
                    continue
                stem5 = rna[start:start + stem_len]
                stem3_rc = reverse_complement(rna[end - stem_len:end]).replace("T", "U")

                # Count base pairs in stem
                pairs = sum(1 for a, b in zip(stem5, stem3_rc) if (
                    (a == "G" and b == "C") or (a == "C" and b == "G") or
                    (a == "A" and b == "U") or (a == "U" and b == "A") or
                    (a == "G" and b == "U") or (a == "U" and b == "G")
                ))
                if pairs < stem_len * 0.6:
                    continue

                # Calculate NN free energy for the stem
                dg = 0.0
                for i in range(len(stem5) - 1):
                    nn_key = stem5[i:i+2]
                    dg += NN_DG_RNA.get(nn_key, -1.5)

                # Loop entropy penalty (~+4.0 kcal/mol for most loops, Jacobson-Stockmayer)
                loop_penalty = 4.0 + 1.75 * math.log(loop_size / 3.0) if loop_size > 3 else 4.0

                total_dg = dg - loop_penalty

                if total_dg < best_stem["dg"]:
                    best_stem = {
                        "dg": round(total_dg, 2),
                        "stem_seq": stem5,
                        "stem_start": start,
                        "stem_len": stem_len,
                        "loop_size": loop_size,
                        "base_pairs": pairs,
                    }

    # Classify structural stability
    dg = best_stem["dg"]
    if dg <= -6.0:
        stability = "STABLE hairpin (likely functional ncRNA structure)"
    elif dg <= -3.0:
        stability = "MODERATE hairpin (may form under physiological conditions)"
    elif dg <= 0.0:
        stability = "WEAK hairpin (transient; may require protein stabilization)"
    else:
        stability = "UNSTRUCTURED (no stable hairpin detected)"

    return {
        "rna_length_nt": n,
        "predicted_hairpin_dg_kcal_mol": dg,
        "stem_sequence": best_stem.get("stem_seq", ""),
        "stem_length_bp": best_stem.get("stem_len", 0),
        "loop_size_nt": best_stem.get("loop_size", 0),
        "base_pairs_in_stem": best_stem.get("base_pairs", 0),
        "stability_classification": stability,
        "art_ncRNA_candidate": dg <= -3.0,
        "structural_note": (
            "ART repeat cores contain inverted palindromes that form hairpin stems "
            "in the processed ncRNAs. This hairpin may serve as the structural scaffold "
            "for RT-ncRNA complex formation (analogous to retron msr/msd RNA structure)."
        ),
    }


# ============================================================================
# 4. ART SYSTEM ANALYZER — classify a genomic locus as ART
# ============================================================================

def analyze_genomic_locus_for_art(
    upstream_sequence: str,
    rt_protein_sequence: Optional[str] = None,
    downstream_gene_annotation: Optional[str] = None,
    genome_source: Optional[str] = None,
) -> Dict:
    """
    Analyzes a genomic locus to determine if it contains an ART system.

    Scoring criteria based on Yoon et al. 2026 hallmarks:
      1. Repeat array upstream of RT (most diagnostic feature)
      2. RT with long N-terminal domain (>100 aa before polymerase)
      3. Dedicated partner gene downstream
      4. Jumbo phage or large prophage context (typical ART hosts)
      5. RT phylogenetically related to retrons

    Args:
        upstream_sequence: DNA sequence upstream of the RT gene
        rt_protein_sequence: RT protein sequence (optional)
        downstream_gene_annotation: Annotation of gene downstream of RT (optional)
        genome_source: Source organism/phage description (optional)

    Returns:
        ART classification report
    """
    score = 0
    evidence = []
    flags = []

    # --- Check 1: Repeat array in upstream sequence ---
    array_scan = scan_for_art_repeat_arrays(upstream_sequence)
    if array_scan["known_core_hits"]:
        score += 40
        evidence.append(f"CONFIRMED ART repeat array (matches known system: {[h['known_system'] for h in array_scan['known_core_hits']]})")
        flags.append("KNOWN_ART_REPEAT")
    elif array_scan["de_novo_repeats"] and any(r.get("art_array_candidate") for r in array_scan["de_novo_repeats"]):
        score += 25
        best = max(array_scan["de_novo_repeats"], key=lambda r: r.get("n_copies", 0))
        evidence.append(f"Novel repeat array detected ({best['n_copies']} copies, {best['mean_spacer_nt']} nt spacing)")
        flags.append("NOVEL_REPEAT_ARRAY")

    # --- Check 2: RT protein features ---
    if rt_protein_sequence:
        aa_seq = rt_protein_sequence.upper()
        aa_len = len(aa_seq)

        # Check for YxDD catalytic motif
        yxdd_match = re.search(r"Y.DD", aa_seq)
        if yxdd_match:
            score += 10
            evidence.append(f"RT catalytic motif YxDD found at position {yxdd_match.start()}")

        # Estimate N-terminal domain length (assume polymerase starts around YXDD region)
        if yxdd_match:
            ntd_len = yxdd_match.start()
            if ntd_len > 100:
                score += 15
                evidence.append(f"Long N-terminal domain: {ntd_len} aa (ART hallmark: >100 aa NTD)")
                flags.append("LONG_NTD")
            elif ntd_len > 50:
                score += 5
                evidence.append(f"Moderately long NTD: {ntd_len} aa (typical other RTs: <50 aa)")

    # --- Check 3: Downstream partner ---
    if downstream_gene_annotation:
        ann = downstream_gene_annotation.lower()
        if any(kw in ann for kw in ["gnat", "acetyltransfer", "gcn5"]):
            score += 15
            evidence.append("Downstream partner: GNAT acetyltransferase-like (ART Type I hallmark)")
            flags.append("TYPE_I_PARTNER")
        elif any(kw in ann for kw in ["hypothetical", "unknown", "uncharacterized", "duf"]):
            score += 8
            evidence.append("Downstream partner: hypothetical protein (consistent with ART Type II/III)")
            flags.append("UNKNOWN_PARTNER")
        elif any(kw in ann for kw in ["helicase", "capsid", "tail", "lysin"]):
            score += 0
            evidence.append("Downstream gene: phage structural/lytic gene (not typical ART partner)")

    # --- Check 4: Jumbo phage context ---
    if genome_source:
        src = genome_source.lower()
        if any(kw in src for kw in ["jumbo", "phage", "bacteriophage", "viral", "prophage"]):
            score += 10
            evidence.append("Genomic context: bacteriophage / jumbo phage (primary ART host)")
        if any(kw in src for kw in ["staphylococcus", "staph", "listeria", "envir"]):
            score += 5
            evidence.append("Host clade: Staphylococcus/Listeria/environmental (known ART phage hosts)")

    # --- Classification ---
    if score >= 60:
        classification = "STRONG ART CANDIDATE"
        confidence = "HIGH"
        recommendation = (
            "Recommend full biochemical characterization: express RT + partner in E. coli, "
            "perform small-RNA sequencing of array, and test RT reverse transcriptase activity."
        )
    elif score >= 35:
        classification = "MODERATE ART CANDIDATE"
        confidence = "MODERATE"
        recommendation = (
            "Requires additional evidence. Perform BLAST/HMM search of RT against ART family profiles. "
            "Check for repeat array expression by RT-qPCR or RNA-seq."
        )
    elif score >= 15:
        classification = "WEAK ART CANDIDATE"
        confidence = "LOW"
        recommendation = (
            "Low evidence. May be a related retron or DGR system rather than true ART. "
            "Compare phylogenetically to ART reference tree from Yoon et al. 2026."
        )
    else:
        classification = "NOT ART"
        confidence = "N/A"
        recommendation = "Insufficient evidence for ART classification."

    return {
        "classification": classification,
        "confidence": confidence,
        "total_score": score,
        "evidence": evidence,
        "flags": flags,
        "array_scan_results": array_scan,
        "recommendation": recommendation,
        "partner_type": next((f.replace("_PARTNER", "") for f in flags if "_PARTNER" in f), "UNKNOWN"),
        "art_paper_reference": "Yoon et al. (2026) Autonomous AI agents discover reverse transcriptases with tandem repeat arrays. Anthropic.",
        "research_status": "NOVEL SYSTEM — function not yet fully characterized. Currently under investigation by Anthropic Life Sciences.",
    }


# ============================================================================
# 5. ART THERAPEUTIC POTENTIAL EVALUATOR
# ============================================================================

def evaluate_art_therapeutic_potential(
    target_gene: str,
    edit_type: str = "insertion",
    delivery_system: str = "lentiviral",
    cancer_context: Optional[str] = None,
) -> Dict:
    """
    Evaluates the potential of ART (Array-Associated RT) as a novel genome-editing
    or gene-regulation therapeutic tool, based on the Yoon et al. 2026 findings.

    ART vs. existing tools:
      - CRISPR-Cas9: cuts dsDNA → requires DSB repair (HDR or NHEJ)
      - Prime Editing: nicks ssDNA → pegRNA encodes the RT template (no DSB)
      - Retrons: RT copies msd RNA → provides HDR template (no cuts needed)
      - ART (HYPOTHETICAL): RT directed by ncRNA bank → may write multiple sequences
                             without DSBs; partner may enzymatically modify product

    IMPORTANT: ART's function is NOT YET DETERMINED. All therapeutic applications
    below are SPECULATIVE based on structural analogies to retrons and DGRs.

    Args:
        target_gene: Target gene for editing
        edit_type: Type of edit ('insertion', 'deletion', 'substitution', 'methylation')
        delivery_system: Delivery mechanism
        cancer_context: Cancer type if oncology application

    Returns:
        Therapeutic potential assessment
    """
    advantages = []
    limitations = []
    research_readiness = "TRL 1"  # Technology Readiness Level 1 = basic principles observed

    # Core ART advantages (if function confirmed)
    advantages.append("NO DOUBLE-STRAND BREAK REQUIRED (hypothetical, based on retron analogy)")
    advantages.append("ARRAY-ENCODED PROGRAMMABILITY: multiple distinct ncRNAs from one array element")
    advantages.append("PHAGE-DERIVED: evolved for high activity in bacterial cells, may adapt well to mammalian context")

    if "GNAT" in delivery_system.upper() or edit_type == "methylation" or edit_type == "acetylation":
        advantages.append("TYPE I PARTNER (GNAT fold): may natively acetylate nucleotides/histones — potential epigenome editing tool")
    
    limitations.append("FUNCTION UNKNOWN: ART mechanism has not been demonstrated in vitro or in mammalian cells")
    limitations.append("REQUIRES EXTENSIVE BIOCHEMICAL CHARACTERIZATION before any therapeutic application")
    limitations.append("NO VALIDATED HUMAN ORTHOLOG: system found only in bacteriophages (prokaryotic origin)")
    limitations.append("PARTNER PROTEIN DIVERSITY: three unrelated partner types suggest function may not be single/unified")
    limitations.append("IMMUNOGENICITY: phage-derived proteins (RT, partner) will trigger immune response in human patients")

    # Cancer-specific assessment
    onco_relevance = None
    if cancer_context:
        cc = cancer_context.lower()
        if any(kw in cc for kw in ["lymphoma", "leukemia", "staph", "staphylococcus", "immunotherapy"]):
            onco_relevance = (
                f"ART is found in Staphylococcus jumbo phages. Staphylococcal phage therapies "
                f"are being explored for MRSA infections that complicate cancer immunotherapy. "
                f"ART-containing phages may be relevant to the tumor microenvironment via "
                f"microbiome-immune interactions."
            )
        else:
            onco_relevance = (
                f"Indirect relevance to {cancer_context}: if ART RT can be engineered as a "
                f"programmable RNA-templated DNA writer, it may provide an alternative to "
                f"prime editing for correcting oncogenic mutations (e.g., KRAS G12D, TP53 R248W) "
                f"without double-strand breaks, potentially reducing off-target mutagenesis."
            )

    # Timeline and next steps
    next_steps = [
        "1. Express ART RT + Type II partner in E. coli; confirm RT activity in vitro",
        "2. Map precise ncRNA boundaries from ART array by smRNA-seq + SHAPE-MaP",
        "3. Identify RT template RNA (equivalent to retron msd ncRNA) by CLIP-seq",
        "4. Determine if RT uses array ncRNA as template → produces ssDNA product",
        "5. Characterize partner protein function (acetyltransferase, effector, defense)",
        "6. If Type I GNAT activity confirmed: test epigenome editing in mammalian cell lines",
        "7. If programmable: engineer custom repeat arrays for target-specific editing",
    ]

    return {
        "target_gene": target_gene,
        "edit_type": edit_type,
        "delivery_system": delivery_system,
        "cancer_context": cancer_context,
        "advantages": advantages,
        "limitations": limitations,
        "oncology_relevance": onco_relevance,
        "technology_readiness_level": research_readiness,
        "trl_description": "TRL 1: Basic principles observed and reported (Yoon et al. 2026)",
        "estimated_years_to_therapeutic_application": "10-15+ years (fundamental mechanism unknown)",
        "next_experimental_steps": next_steps,
        "comparison_to_prime_editing": {
            "prime_editing": "Proven in human cells; pegRNA-directed RT (derived from M-MLV RT) + nickase",
            "art_potential": "Speculative; could offer multi-guide programmability from single array element",
            "key_difference": "ART partner protein function is completely unknown — may or may not provide editing activity",
        },
        "paper_citation": (
            "Yoon PH, Athukoralage JS, Ameisen E, Kauderer-Abrams E, Perry NT, Durrant MG. (2026). "
            "Autonomous AI agents discover reverse transcriptases with tandem repeat arrays. "
            "Anthropic. DOI: pending."
        ),
        "research_status_disclaimer": (
            "ART is a NEWLY DISCOVERED system (September 2026). Its molecular mechanism, "
            "biological function, and therapeutic utility have NOT been established. All "
            "therapeutic potential assessments are SPECULATIVE research hypotheses for "
            "exploration only. No clinical application is currently possible."
        ),
    }


# ============================================================================
# 6. ART VS. CRISPR COMPARISON TABLE
# ============================================================================

ART_VS_CRISPR_COMPARISON = {
    "discovery_year": {"CRISPR": 1987, "ART": 2026},
    "mechanism": {
        "CRISPR": "RNA-guided DNA cleavage by Cas nuclease",
        "ART": "UNKNOWN — hypothetically RT-based RNA-to-DNA writing, directed by repeat array ncRNAs",
    },
    "guide_molecule": {
        "CRISPR": "crRNA (from CRISPR array spacers)",
        "ART": "ncRNA from repeat array (function not confirmed; hypothetically guides RT)",
    },
    "guide_bank": {
        "CRISPR": "CRISPR array encodes spacers (immunological memory)",
        "ART": "ART array encodes repeat units (function unknown; possibly analogous)",
    },
    "cuts_dna": {"CRISPR": True, "ART": "Unknown"},
    "partner_protein": {
        "CRISPR": "Cas nuclease (Cas9, Cas12a, etc.)",
        "ART": "3 types: GNAT acetyltransferase (Type I), all-helical (Type II), small helical (Type III)",
    },
    "host": {
        "CRISPR": "Bacteria and Archaea (prokaryotes)",
        "ART": "Bacteriophages (primarily jumbo phages: Staphylococcus SA1, Listeria, environmental)",
    },
    "programmable": {
        "CRISPR": "YES — spacers changed to retarget",
        "ART": "HYPOTHETICALLY — repeat units may direct to distinct targets; unconfirmed",
    },
    "therapeutic_use": {
        "CRISPR": "FDA-approved (Casgevy for sickle cell disease, 2023)",
        "ART": "None — function unknown; 10-15+ years from any application",
    },
    "dna_breaks": {
        "CRISPR": "YES (Cas9/Cas12a create DSBs; nickases create SSBs)",
        "ART": "Unknown — if RT-only, may operate without breaks (like retrons)",
    },
}
