import pytest
from modules.oligo_synthesizer import generate_cloning_oligos, calculate_oligo_tm
from modules.delivery_advisor import calculate_aav_packaging, evaluate_delivery_strategy
from modules.dual_guide_designer import design_dual_guide_pairs, calculate_excision_efficiency
from modules.cohort_analyzer import generate_cohort_comparison_matrix

def test_cloning_oligo_generation_bbsi():
    guide = "ATAGTCATCTTGGGGCTGGT"  # Starts with A, not G
    res = generate_cloning_oligos(guide, plasmid_type="PX459_BbsI", guide_id="sgRNA_Test")
    
    assert res["guide_id"] == "sgRNA_Test"
    assert res["cloning_enzyme"] == "BbsI (BpiI)"
    assert res["prepended_leading_g"] is True
    
    # Top oligo should start with CACC + G
    assert res["top_oligo"]["sequence"].startswith("CACCG")
    assert res["bottom_oligo"]["sequence"].startswith("AAAC")
    assert res["top_oligo"]["tm_celsius"] > 50.0

    # Alt-R synthetic sgRNA check (20nt protospacer + 80nt tracrRNA scaffold = 100nt)
    alt_r = res["synthetic_modified_sgRNA"]
    assert alt_r["total_length_nt"] == 100
    assert alt_r["chemically_modified_notation"].startswith("mA*")

    # CSV export check
    assert "sgRNA_Test_Top" in res["idt_order_csv"]
    assert "sgRNA_Test_Bottom" in res["idt_order_csv"]

def test_cloning_oligo_with_leading_g():
    guide_with_g = "GATAGTCATCTTGGGGCTGG"  # Starts with G
    res = generate_cloning_oligos(guide_with_g, plasmid_type="PX459_BbsI")
    assert res["prepended_leading_g"] is False
    assert res["top_oligo"]["sequence"] == "CACCGATAGTCATCTTGGGGCTGG"

def test_aav_packaging_overflow_spcas9():
    # SpCas9 with EFS promoter: total payload > 4,700 bp
    eval_sp = calculate_aav_packaging(nuclease_type="SpCas9", promoter_type="EFS")
    assert eval_sp["is_overflow"] is True
    assert eval_sp["verdict"] == "AAV_CAPSID_OVERFLOW_FATAL"
    assert eval_sp["total_cargo_bp"] > 4700
    assert eval_sp["margin_bp"] < 0

def test_aav_packaging_fits_sacas9():
    # SaCas9 with EFS promoter: fits well within 4,700 bp
    eval_sa = calculate_aav_packaging(nuclease_type="SaCas9", promoter_type="EFS")
    assert eval_sa["is_overflow"] is False
    assert eval_sa["verdict"] == "OPTIMAL_AAV_PACKAGING"
    assert eval_sa["total_cargo_bp"] < 4700
    assert eval_sa["margin_bp"] > 300

def test_tissue_delivery_evaluation():
    # HSPCs should recommend non-viral RNP electroporation (Casgevy precedent)
    hspc = evaluate_delivery_strategy("HSPCs")
    assert "RNP Electroporation" in hspc["recommended_modality"]
    assert hspc["vector_class"] == "Non-Viral RNP"

    # CNS should recommend AAV9
    cns = evaluate_delivery_strategy("CNS_NEURONS")
    assert "AAV9" in cns["recommended_modality"]
    assert cns["vector_class"] == "Adeno-Associated Virus (AAV9)"

def test_dual_guide_excision_designer():
    mock_candidates = [
        {
            "guide_id": "sgRNA_CCR5_Upstream",
            "start_offset": 570,
            "strand": "-",
            "patient_guide_20nt": "TTTCCATACAGTCAGTATCA",
            "pam_sequence": "AGG",
            "on_target_efficiency_patient": 0.85
        },
        {
            "guide_id": "sgRNA_CCR5_Downstream",
            "start_offset": 615,
            "strand": "+",
            "patient_guide_20nt": "GATAGTCATCTTGGGGCTGG",
            "pam_sequence": "TGG",
            "on_target_efficiency_patient": 0.82
        }
    ]

    pairs = design_dual_guide_pairs(
        target_gene="CCR5",
        target_domain="Extracellular Loop 2",
        candidates=mock_candidates,
        min_excision_bp=10,
        max_excision_bp=200
    )

    assert len(pairs) == 1
    p = pairs[0]
    assert p["upstream_guide"]["guide_id"] == "sgRNA_CCR5_Upstream"
    assert p["downstream_guide"]["guide_id"] == "sgRNA_CCR5_Downstream"
    assert p["pam_orientation"] == "PAM_OUT"  # Optimal orientation
    assert p["predicted_excision_efficiency"] > 0.70

def test_cohort_comparison_matrix():
    matrix = generate_cohort_comparison_matrix(target_gene="CCR5")
    assert matrix["target_gene"] == "CCR5"
    assert matrix["total_cohort_samples"] >= 2
    assert len(matrix["guide_comparison_rows"]) > 0

    # Find sgRNA_CCR5_Exon3_01
    guide1_row = next(r for r in matrix["guide_comparison_rows"] if r["guide_id"] == "sgRNA_CCR5_Exon3_01")
    assert "PATIENT_001_WT" in guide1_row["patient_scores"]
    assert guide1_row["patient_scores"]["PATIENT_001_WT"]["pam_status"] == "PAM_INTACT"
