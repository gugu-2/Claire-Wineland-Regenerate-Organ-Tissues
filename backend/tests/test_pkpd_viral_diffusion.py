"""
test_pkpd_viral_diffusion.py — Unit & Integration tests for PK/PD Intratumoral Viral Diffusion Solver
Feature Spec 06 — Sprint 6
"""

import pytest
from modules.pkpd_viral_diffusion import (
    PKPD_VIRUS_PROFILES,
    DESMOPLASIA_BENCHMARKS,
    CURATED_PKPD_PRESETS,
    simulate_pkpd_viral_diffusion,
    generate_pkpd_export_csv
)

def test_virus_profiles_registry():
    assert "HSV1_T-VEC_family" in PKPD_VIRUS_PROFILES
    assert "Measles_MV_Edmonston" in PKPD_VIRUS_PROFILES
    assert "VSV_Indiana" in PKPD_VIRUS_PROFILES
    assert "Adenovirus_Onyx015" in PKPD_VIRUS_PROFILES
    assert "Vaccinia_PexaVec" in PKPD_VIRUS_PROFILES

    # Check T-VEC properties
    tvec = PKPD_VIRUS_PROFILES["HSV1_T-VEC_family"]
    assert tvec["virion_diameter_nm"] == 180
    assert tvec["burst_size"] == 500
    assert tvec["recommended_route"] == "INTRATUMORAL_DIRECT"


def test_simulate_intratumoral_direct_tvec():
    result = simulate_pkpd_viral_diffusion(
        viral_chassis="HSV1_T-VEC_family",
        delivery_route="INTRATUMORAL_DIRECT",
        initial_dose_tcid50=1e8,
        tumor_radius_mm=12.0,
        desmoplasia_factor=0.30,
        serology_neutralization="LOW",
        simulation_hours=72
    )

    assert result["simulation_id"].startswith("PKPD_SIM_")
    assert result["viral_chassis"] == "HSV1_T-VEC_family"
    assert result["delivery_route"] == "INTRATUMORAL_DIRECT"
    assert result["tumor_cell_kill_pct"] > 0.0
    assert result["expected_volume_reduction_pct"] >= 0.0
    assert result["bystander_killing_radius_mm"] >= 0.0
    assert len(result["spatial_depth_profile"]) == 15
    assert len(result["timeline"]) >= 6  # 0h, 12h, 24h, 36h, 48h, 60h, 72h
    assert result["timeline"][0]["time_hours"] == 0
    assert result["timeline"][-1]["time_hours"] == 72.0


def test_simulate_high_desmoplasia_pdac():
    # Dense stroma should impede bystander radius compared to low stroma
    res_dense = simulate_pkpd_viral_diffusion(
        viral_chassis="VSV_Indiana",
        tumor_radius_mm=15.0,
        desmoplasia_factor=0.85,
        simulation_hours=72
    )
    res_soft = simulate_pkpd_viral_diffusion(
        viral_chassis="VSV_Indiana",
        tumor_radius_mm=15.0,
        desmoplasia_factor=0.20,
        simulation_hours=72
    )

    assert res_dense["desmoplasia_factor"] == 0.85
    assert "VERY_HIGH" in res_dense["desmoplasia_rating"]
    # Soft tissue allows deeper penetration and equal or greater cell kill
    assert res_soft["tumor_cell_kill_pct"] >= res_dense["tumor_cell_kill_pct"]


def test_simulate_systemic_iv_route():
    result = simulate_pkpd_viral_diffusion(
        viral_chassis="Vaccinia_PexaVec",
        delivery_route="INTRAVENOUS_SYSTEMIC",
        initial_dose_tcid50=5e8,
        tumor_radius_mm=15.0,
        desmoplasia_factor=0.40,
        simulation_hours=72
    )
    assert result["delivery_route"] == "INTRAVENOUS_SYSTEMIC"
    assert result["initial_total_cells"] > 0
    assert result["final_viable_cells"] <= result["initial_total_cells"]


def test_generate_pkpd_export_csv():
    result = simulate_pkpd_viral_diffusion(
        viral_chassis="Measles_MV_Edmonston",
        tumor_radius_mm=10.0,
        simulation_hours=48
    )
    csv_str = generate_pkpd_export_csv(result)
    assert "SECTION: Spatial Radial Penetration Profile" in csv_str
    assert "SECTION: 72h Timeline Dynamics" in csv_str
    assert "Shell_Index,Radius_mm" in csv_str
