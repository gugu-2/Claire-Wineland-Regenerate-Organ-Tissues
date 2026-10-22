import pytest
from modules.cart_engine import (
    load_cart_database,
    check_normal_tissue_safety,
    identify_cart_candidates,
    get_cart_blueprint
)

def test_cart_database_loading():
    db = load_cart_database()
    assert len(db) >= 15
    assert "CD19" in db
    assert "HER2" in db
    assert "MSLN" in db
    assert "BCMA" in db
    assert len(db["CD19"]["scfv_sequence"]) > 100

def test_check_normal_tissue_safety():
    # Safe antigen: low expression in all vital organs
    safe_vital = {"heart": 0.1, "brain": 0.1, "liver": 0.2, "lung": 0.5, "kidney": 0.2}
    res_safe = check_normal_tissue_safety(safe_vital, normal_median_tpm=1.0)
    assert res_safe["safety_tier"] == "SAFE"

    # Caution antigen: moderate expression (5 - 20 TPM)
    caution_vital = {"heart": 8.2, "brain": 1.4, "liver": 6.1, "lung": 12.4, "kidney": 18.2}
    res_caution = check_normal_tissue_safety(caution_vital, normal_median_tpm=14.5)
    assert res_caution["safety_tier"] == "CAUTION"

    # Blocked antigen: vital organ TPM > 20
    blocked_vital = {"heart": 18.5, "brain": 24.1, "liver": 16.2, "lung": 31.4, "kidney": 22.8}
    res_blocked = check_normal_tissue_safety(blocked_vital, normal_median_tpm=26.2)
    assert res_blocked["safety_tier"] == "BLOCKED"
    assert res_blocked["vital_max_tpm"] > 20.0

def test_identify_cart_candidates():
    # Test for Pancreatic Cancer (PDAC)
    pdac_res = identify_cart_candidates("Pancreatic Ductal Adenocarcinoma (PDAC)")
    assert pdac_res["status"] == "success"
    assert pdac_res["total_antigens_evaluated"] >= 15
    assert pdac_res["safe_count"] > 0
    antigen_names = [c["antigen"] for c in pdac_res["candidates"]]
    assert "MSLN" in antigen_names

    # Check top candidate has positive therapeutic window
    top = pdac_res["candidates"][0]
    assert top["therapeutic_window_ratio"] > 1.0

def test_get_cart_blueprint():
    bp = get_cart_blueprint("MSLN", patient_id="PT_PDAC_001")
    assert bp["status"] == "success"
    assert bp["antigen"] == "MSLN"
    assert "car_architecture" in bp
    assert "domain_architecture" in bp
    assert bp["car_architecture"]["generation"].startswith("2nd Generation")
    assert "extracellular_scfv" in bp["car_architecture"]
    assert "scfv_antigen_binding_domain" in bp["domain_architecture"]
    assert len(bp["full_car_polypeptide"]) > 350
    assert bp["total_amino_acids"] == len(bp["full_car_polypeptide"])
    assert "fasta_export" in bp
    assert ">PT_PDAC_001" in bp["fasta_export"]
    assert len(bp["clinical_trials"]) > 0
    assert "nct_id" in bp["clinical_trials"][0]
    assert len(bp["clinical_trial_ncts"]) > 0

    # Test case-insensitive resolution for mixed-case targets
    bp_egfr = get_cart_blueprint("EGFRvIII")
    assert bp_egfr["status"] == "success"
    assert bp_egfr["antigen"] == "EGFRvIII"

    bp_cldn = get_cart_blueprint("claudin6")
    assert bp_cldn["status"] == "success"
    assert bp_cldn["antigen"] == "Claudin6"
