import pytest
from modules.art_construct_designer import (
    fragment_gene,
    approximate_hairpin_delta_g,
    design_art_array,
    ART_SYSTEM_PRESETS,
    THERAPEUTIC_GENE_PRESETS,
    CELL_TYPE_EFFICIENCY_BASELINES
)

def test_art_presets_availability():
    assert "TYPE_I_LISTERIA" in ART_SYSTEM_PRESETS
    assert "TYPE_II_STAPH" in ART_SYSTEM_PRESETS
    assert "TYPE_III_ENV" in ART_SYSTEM_PRESETS
    assert len(THERAPEUTIC_GENE_PRESETS) >= 3
    assert "DMD_EXON45_55" in THERAPEUTIC_GENE_PRESETS
    assert len(CELL_TYPE_EFFICIENCY_BASELINES) >= 5

def test_fragment_gene_chunking():
    # 600 bp synthetic sequence
    sample_seq = "ATG" * 200
    fragments = fragment_gene(sample_seq, target_unit_size=200, overlap_bp=15)
    assert len(fragments) >= 3
    assert fragments[0]["unit_number"] == 1
    assert fragments[0]["length_bp"] <= 200
    assert "gc_content" in fragments[0]

def test_hairpin_free_energy_calculation():
    # Palindromic repeat core
    repeat = "CATGTGTCTCGCATGT"
    delta_g = approximate_hairpin_delta_g(repeat)
    assert delta_g < 0.0 # Must be thermodynamically stable (negative ΔG)

def test_design_art_array_assembly():
    preset = THERAPEUTIC_GENE_PRESETS["HBB_CORRECTED"]
    res = design_art_array(
        cDNA_sequence=preset["cDNA_sample"][:800],
        gene_name="HBB",
        art_system_type="TYPE_I_LISTERIA",
        target_unit_size=200,
        target_cell_type="Primary CD34+ HSPCs"
    )
    assert res["status"] == "success"
    assert res["gene_name"] == "HBB"
    assert res["total_units"] >= 4
    assert res["predicted_insertion_efficiency"] > 5.0
    assert "fasta_export" in res
    assert ">ART_HBB_" in res["fasta_export"]
    assert len(res["idt_plate_orders"]) == res["total_units"]
    assert "A01" in res["idt_plate_orders"][0]["well"]
    assert "plate_layout_csv" in res
    assert "Well,Oligo_Name,Sequence" in res["plate_layout_csv"]

def test_generate_plate_layout_csv():
    from modules.art_construct_designer import generate_plate_layout_csv
    mock_rows = [
        {"well": "A01", "oligo_name": "Test_Unit_01", "sequence": "ACGT", "length_nt": 4, "scale": "25nmol", "purification": "Standard Desalting"}
    ]
    csv_str = generate_plate_layout_csv(mock_rows)
    assert "A01,Test_Unit_01,ACGT,4,25nmol,Standard Desalting" in csv_str
