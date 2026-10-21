import pytest
from modules.neoantigen_predictor import (
    normalize_hla_allele,
    get_supported_hla_alleles,
    generate_peptide_library,
    predict_single_peptide_affinity,
    predict_proteasomal_cleavage,
    predict_tap_transport,
    run_multi_allele_neoantigen_prediction,
    design_vaccine_cassette,
    run_neoantigen_prediction
)

def test_normalize_hla_allele():
    assert normalize_hla_allele("A*02:01") == "HLA-A*02:01"
    assert normalize_hla_allele("HLA-A*02:01") == "HLA-A*02:01"
    assert normalize_hla_allele("b*07:02") == "HLA-B*07:02"
    assert normalize_hla_allele("C*07:01") == "HLA-C*07:01"

def test_get_supported_hla_alleles():
    alleles = get_supported_hla_alleles()
    assert len(alleles) >= 30
    loci = {a["locus"] for a in alleles}
    assert "A" in loci
    assert "B" in loci
    assert "C" in loci

def test_generate_peptide_library():
    context = "TEYKLVVVGADGVGKSALTIQ" # KRAS G12D at index 10 (D)
    peptides = generate_peptide_library(context, mutation_pos=10, lengths=(8, 9, 10, 11))
    assert len(peptides) > 0
    # Every generated peptide must span the mutated residue 'D'
    for p in peptides:
        assert "D" in p["mutant_peptide"]
        assert len(p["mutant_peptide"]) in (8, 9, 10, 11)
        assert p["mut_residue"] == "D"

def test_predict_single_peptide_affinity():
    # Canonical HLA-A*02:01 peptide with P2=L and C-term=V (should bind strongly)
    res_a02 = predict_single_peptide_affinity("KLVVGADGV", "HLA-A*02:01")
    assert res_a02["hla_allele"] == "HLA-A*02:01"
    assert res_a02["affinity_ic50_nm"] < 500.0
    assert res_a02["binding_level"] in ["Strong Binder (SB)", "Weak Binder (WB)"]

    # Peptide with disfavored anchors for A*02:01
    res_bad = predict_single_peptide_affinity("KDVVGADGP", "HLA-A*02:01")
    assert res_bad["affinity_ic50_nm"] > res_a02["affinity_ic50_nm"]

    # B*07:02 test (prefers P at P2)
    res_b07 = predict_single_peptide_affinity("APRGVAFSV", "HLA-B*07:02")
    assert res_b07["hla_allele"] == "HLA-B*07:02"
    assert res_b07["affinity_ic50_nm"] < 1000.0

def test_cleavage_and_tap():
    pep_hydrophobic = "KLVVGADGV"
    pep_proline = "KLVVGADGP"
    
    clv1 = predict_proteasomal_cleavage(pep_hydrophobic)
    clv2 = predict_proteasomal_cleavage(pep_proline)
    assert clv1 > clv2
    assert 0.0 < clv1 <= 1.0

    tap1 = predict_tap_transport(pep_hydrophobic)
    assert 0.0 < tap1 <= 1.0

def test_run_multi_allele_neoantigen_prediction():
    somatic_mutations = [
        {"gene": "KRAS", "mutation": "G12D"}
    ]
    hla_alleles = ["HLA-A*02:01", "HLA-B*07:02", "HLA-C*07:01"]
    result = run_multi_allele_neoantigen_prediction(somatic_mutations, hla_alleles)
    
    assert result["status"] == "success"
    assert len(result["patient_hla_alleles"]) == 3
    assert len(result["top_neoantigens"]) > 0
    top = result["top_neoantigens"][0]
    assert "mutant_peptide" in top
    assert "ic50_nm" in top
    assert "composite_score" in top
    assert "agretopicity_fold_change" in top
    assert "vaccine_priority" in top
    assert len(result["vaccine_candidates"]) <= 5

def test_vaccine_cassette_designer():
    peptides = [
        {"mutant_peptide": "VVVGADGVG"},
        {"mutant_peptide": "GADGVGKSAL"},
        {"mutant_peptide": "LVVGADGVGK"}
    ]
    cassette = design_vaccine_cassette(peptides, patient_id="PT_TCGA_TEST", linker_type="AAY")
    assert cassette["status"] == "success"
    assert cassette["total_epitopes"] == 3
    assert cassette["linker_used"] == "AAY"
    assert "AAY" in cassette["protein_construct"]
    assert "mrna_transcript" in cassette
    assert cassette["mrna_transcript"]["coding_region"].startswith("GCC") or len(cassette["mrna_transcript"]["coding_region"]) > 30
    assert "fasta_export" in cassette
    assert ">PT_TCGA_TEST" in cassette["fasta_export"]

def test_backward_compatible_runner():
    variants = [
        {"gene": "KRAS", "ref": "G", "alt": "D", "chromosome": "chr12", "position": 25245350}
    ]
    res = run_neoantigen_prediction(variants)
    assert len(res) > 0
    assert "neoepitope" in res[0]
    assert "affinity_ic50_nm" in res[0]["neoepitope"]
