import pytest
from modules.regeneration import load_regeneration_protocols, evaluate_custom_cocktail

def test_load_regeneration_protocols():
    protocols = load_regeneration_protocols()
    assert len(protocols) >= 3
    lineages = [p["target_lineage"] for p in protocols]
    assert any("Dopaminergic" in l for l in lineages)
    assert any("Cardiomyocyte" in l for l in lineages)
    assert any("Beta Cells" in l for l in lineages)

def test_evaluate_tumorigenic_risk_yamanaka():
    # Yamanaka factors with retrovirus
    res = evaluate_custom_cocktail(
        target_lineage="iPSC",
        selected_factors=["OCT4", "SOX2", "KLF4", "c-MYC"],
        delivery_modality="Retroviral Integration"
    )
    assert res["tumorigenic_risk_score"] >= 0.70
    assert res["risk_tier"] == "CRITICAL_TUMORIGENIC_RISK"
    assert len(res["oncogene_flags"]) >= 1
    assert any("c-MYC" in f["factor"] for f in res["oncogene_flags"])

def test_evaluate_tumorigenic_risk_safe_protocol():
    # Non-integrative small molecules
    res = evaluate_custom_cocktail(
        target_lineage="Dopaminergic Neurons",
        selected_factors=["ASCL1", "NURR1", "LMX1A"],
        delivery_modality="Chemically Defined Small Molecules"
    )
    assert res["tumorigenic_risk_score"] < 0.25
    assert res["risk_tier"] == "LOW_TUMORIGENIC_RISK"
    assert len(res["oncogene_flags"]) == 0
