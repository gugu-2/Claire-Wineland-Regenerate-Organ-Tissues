import pytest
from modules.structure_fetcher import (
    fetch_pdb_structure,
    get_structure_annotations,
    list_supported_structures,
    STRUCTURE_METADATA
)

def test_list_supported_structures():
    structures = list_supported_structures()
    assert len(structures) >= 4
    pdb_ids = [s["pdb_id"] for s in structures]
    assert "4ZT0" in pdb_ids
    assert "6O0Y" in pdb_ids
    assert "6MCB" in pdb_ids
    assert "7T2E" in pdb_ids

def test_get_structure_annotations_4zt0():
    annotations = get_structure_annotations("4ZT0", guide_seq="GATAGTCATCTTGGGGCTGG", mutation_label="G12D", mutation_pos=12)
    assert annotations["pdb_id"] == "4ZT0"
    assert len(annotations["catalytic_residues"]) >= 2
    # Check HNH and RuvC residues
    res_names = [r["residue_name"] for r in annotations["catalytic_residues"]]
    assert "HIS" in res_names
    assert "ASP" in res_names
    
    # Check PAM residues
    assert len(annotations["pam_residues"]) >= 2
    assert annotations["pam_residues"][0]["residue_name"] == "ARG"
    
    # Check mutation annotation
    assert annotations["mutation_annotation"] is not None
    assert annotations["mutation_annotation"]["label"] == "G12D"
    assert annotations["mutation_annotation"]["chain"] == "C"

def test_fetch_pdb_structure_cache_fallback():
    # Test fetch function (with caching or fallback)
    data = fetch_pdb_structure("4ZT0")
    assert data["pdb_id"] == "4ZT0"
    assert len(data["cif_data"]) > 0
    assert "metadata" in data
    assert data["metadata"]["organism"] == "Streptococcus pyogenes"
