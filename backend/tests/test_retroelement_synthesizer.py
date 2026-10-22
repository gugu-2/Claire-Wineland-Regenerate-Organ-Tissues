"""
test_retroelement_synthesizer.py — Unit & Integration tests for Bacterial Retron & DGR Synthesizer
Feature Spec 12 — Sprint 6
"""

import pytest
from modules.retroelement_synthesizer import (
    RETRON_CHASSIS_REGISTRY,
    DGR_CHASSIS_REGISTRY,
    CURATED_RETROELEMENT_PRESETS,
    design_retron_editor,
    design_dgr_mutagenesis_library,
    evaluate_editing_modalities,
    generate_retron_export_csv,
    generate_dgr_export_csv
)

def test_retron_chassis_registry():
    assert "Eco1" in RETRON_CHASSIS_REGISTRY
    assert "Ec86" in RETRON_CHASSIS_REGISTRY
    assert "Ec48" in RETRON_CHASSIS_REGISTRY
    assert "Mx162" in RETRON_CHASSIS_REGISTRY

    eco1 = RETRON_CHASSIS_REGISTRY["Eco1"]
    assert eco1["optimal_donor_len_nt"] == 72
    assert eco1["mammalian_hdr_fold_change"] == 3.8


def test_dgr_chassis_registry():
    assert "Bordetella_BPP1" in DGR_CHASSIS_REGISTRY
    assert "Treponema_TdDGR" in DGR_CHASSIS_REGISTRY

    bpp1 = DGR_CHASSIS_REGISTRY["Bordetella_BPP1"]
    assert bpp1["mutagenic_base"] == "Adenine (A -> N)"
    assert bpp1["error_rate_at_a"] > 0.50
    assert bpp1["non_a_fidelity"] > 0.999


def test_design_retron_editor_kras():
    result = design_retron_editor(
        target_gene="KRAS",
        target_mutation="c.35G>A (p.G12D)",
        retron_chassis="Eco1"
    )

    assert result["design_id"].startswith("RETRON_")
    assert result["modality"] == "RETRON_MSDNA_EDITOR"
    assert result["target_gene"] == "KRAS"
    assert result["hdr_efficiency_score"] > 0.70
    assert result["hairpin_delta_g_kcal_mol"] < -10.0
    assert result["absence_of_genotoxic_dsbs"] is True
    assert "BsaI" in result["golden_gate_assembly"]["enzyme"]
    assert result["golden_gate_assembly"]["overhang_5p"] == "AGGT"
    assert result["golden_gate_assembly"]["overhang_3p"] == "CGCT"
    assert ">RETRON_" in result["full_plasmid_insert_fasta"]


def test_design_dgr_library_her2():
    result = design_dgr_mutagenesis_library(
        target_protein_name="Trastuzumab scFv (anti-HER2)",
        loop_sequence="WGGDGFYAMDY",
        dgr_system="Bordetella_BPP1"
    )

    assert result["design_id"].startswith("DGR_")
    assert result["modality"] == "DGR_MUTAGENESIS_LIBRARY"
    assert result["loop_length_aa"] == 11
    assert result["mutable_adenine_count"] >= 3
    assert "variants" in result["theoretical_diversity_space"] or "^" in result["theoretical_diversity_space"]
    assert result["productive_in_frame_pct"] > 80.0
    assert "N" in result["degenerate_iupac_library"]
    assert len(result["synthesis_items"]) == 2


def test_evaluate_editing_modalities():
    comparison = evaluate_editing_modalities(
        target_gene="KRAS",
        target_mutation="G12D",
        desired_edit_type="POINT_MUTATION",
        target_length_bp=1
    )

    assert comparison["target_gene"] == "KRAS"
    assert len(comparison["modalities_ranked"]) == 7
    # Retron or Prime Editing or Base editing should rank top for single point mutation
    top_modality = comparison["modalities_ranked"][0]
    assert top_modality["ds_break_free"] is True
    assert top_modality["suitability_score"] >= 80


def test_export_csvs():
    retron_res = design_retron_editor(target_gene="TP53", target_mutation="R248W")
    csv_retron = generate_retron_export_csv(retron_res)
    assert "# Retron msDNA Editor Construct Export" in csv_retron
    assert "TP53" in csv_retron

    dgr_res = design_dgr_mutagenesis_library(target_protein_name="EGFRvIII_Binder", loop_sequence="ARDGYDDYGAFDY")
    csv_dgr = generate_dgr_export_csv(dgr_res)
    assert "# DGR Targeted Hypermutagenesis Library Export" in csv_dgr
    assert "EGFRvIII_Binder" in csv_dgr
