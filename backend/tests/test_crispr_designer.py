import pytest
from modules.azimuth_cfd import (
    calculate_gc_content,
    score_azimuth_on_target,
    calculate_cfd_score,
    aggregate_cfd_specificity,
    evaluate_base_editing_window,
    get_pam_weight
)
from modules.crispr_designer import scan_candidate_guides
from modules.sample_intake import load_reference_genes, build_personalized_sequence

def test_gc_content():
    assert calculate_gc_content("GGCC") == 100.0
    assert calculate_gc_content("AATT") == 0.0
    assert calculate_gc_content("GCAT") == 50.0

def test_azimuth_scoring_features():
    # Canonical favorable guide: starts with G, ends with G, balanced GC
    score_good, ci_good, breakdown_good = score_azimuth_on_target("GACCGTGATCGATCGATCCG")
    assert 0.60 <= score_good <= 0.98
    assert ci_good[0] <= score_good <= ci_good[1]
    assert breakdown_good["mono_nucleotide_preference"] > 0

    # Guide with poly-T terminator (TTTT): U6 transcription halts
    score_poly_t, _, breakdown_bad = score_azimuth_on_target("GACGTTTTAAGCTAGCTAAG")
    assert score_poly_t < score_good
    assert breakdown_bad["poly_t_penalty"] <= -0.35

    # Guide with G-quadruplex (GGGG)
    _, _, breakdown_g4 = score_azimuth_on_target("GACGGGGATCGATCGATCCG")
    assert breakdown_g4["g4_penalty"] == -0.15

def test_doench_cfd_empirical_matrix():
    guide = "GATAGTCATCTTGGGGCTGG"

    # 1. Exact match must be 1.0
    assert calculate_cfd_score(guide, guide, "TGG") == 1.0

    # 2. Distal mismatch (position 1, PAM-distal 5' end): high tolerance
    ot_distal = "A" + guide[1:]
    cfd_distal = calculate_cfd_score(guide, ot_distal, "TGG")
    assert 0.40 <= cfd_distal <= 0.90

    # 3. Seed mismatch (position 20, adjacent to PAM): severe cleavage drop
    ot_seed = guide[:19] + ("A" if guide[19] != "A" else "C")
    cfd_seed = calculate_cfd_score(guide, ot_seed, "TGG")
    assert cfd_seed < 0.05
    assert cfd_distal > cfd_seed * 10  # Distal is order of magnitude more tolerated than seed

    # 4. Non-canonical PAM penalties
    assert get_pam_weight("TGG") == 1.0
    assert get_pam_weight("TAG") == 0.259
    assert get_pam_weight("TGA") == 0.069
    assert get_pam_weight("TCG") == 0.005

    # 5. Specificity aggregation
    spec_clean, tier_clean = aggregate_cfd_specificity([])
    assert spec_clean > 95.0
    assert tier_clean == "LOW_RISK"

def test_base_editing_window_evaluation():
    # Guide with target Cytidine at position 7 (window 4-8)
    guide_cbe = "GATAGTCATCTTGGGGCTGG"
    cbe_res = evaluate_base_editing_window(guide_cbe, modality="CBE")
    assert cbe_res["modality"] == "CBE"
    assert cbe_res["target_count_in_window"] >= 1
    assert 7 in cbe_res["target_positions_in_guide"]

    # ABE evaluation on sickle-repair guide
    guide_abe = "CCTGACTCCTGAGGAGAAGT"
    abe_res = evaluate_base_editing_window(guide_abe, modality="ABE")
    assert abe_res["modality"] == "ABE"
    assert abe_res["target_base"] == "A"

def test_multi_nuclease_scanning():
    ref_genes = load_reference_genes()
    ref_seq = ref_genes["CCR5"]["reference_sequence"]

    # SpCas9 (NGG)
    sp_guides = scan_candidate_guides("CCR5", ref_seq, ref_seq, [], pam_type="SpCas9_NGG")
    assert len(sp_guides) > 0
    assert all("GG" in g["pam_sequence"] for g in sp_guides[:4])

    # SaCas9 (NNGRRT)
    sa_guides = scan_candidate_guides("CCR5", ref_seq, ref_seq, [], pam_type="SaCas9_NNGRRT")
    assert len(sa_guides) > 0
    assert len(sa_guides[0]["patient_guide_20nt"]) == 21

    # Cas12a (TTTV)
    cas12_guides = scan_candidate_guides("CCR5", ref_seq, ref_seq, [], pam_type="Cas12a_TTTV")
    assert len(cas12_guides) > 0
    assert cas12_guides[0]["pam_sequence"].startswith("TTT")

def test_scan_candidate_guides_personal_snp_impact():
    ref_genes = load_reference_genes()
    ref_seq = ref_genes["CCR5"]["reference_sequence"]
    
    # Patient with seed SNP (chr3:46373140 C>T)
    variants = [{
        "chromosome": "chr3",
        "position": 46373140,
        "ref": "C",
        "alt": "T",
        "variant_type": "SNV",
        "rsid": "rs113010081"
    }]
    pers_data = build_personalized_sequence("CCR5", variants)
    
    candidates = scan_candidate_guides(
        target_gene="CCR5",
        reference_sequence=ref_seq,
        personalized_sequence=pers_data["personalized_sequence"],
        personal_variants=pers_data["applied_variants"]
    )
    
    assert len(candidates) > 0
    guide1 = next(c for c in candidates if c["guide_id"] == "sgRNA_CCR5_Exon3_01")
    assert guide1["is_personalized_different"] is True
    assert guide1["pam_status"] == "SEED_MUTATION_DETECTED"
    assert guide1["on_target_efficiency_patient"] < guide1["on_target_efficiency_reference"]
    assert guide1["off_target_risk_level"] == "HIGH_RISK"
