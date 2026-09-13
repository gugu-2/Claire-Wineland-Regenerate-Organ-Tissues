import pytest
from modules.sample_intake import (
    parse_vcf_content,
    build_personalized_sequence,
    load_reference_genes,
    map_genomic_pos_to_offset
)

def test_vcf_parsing():
    raw_vcf = """##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE
chr3\t46373140\trs113010081\tC\tT\t.\tPASS\t.\tGT\t1/1
chr3\t46373148\trs333\tGAGTCATCTTGGGGCTGGTCCTGCCGCTGCTT\t-\t.\tPASS\t.\tGT\t0/1
"""
    variants = parse_vcf_content(raw_vcf)
    assert len(variants) == 2
    assert variants[0]["chromosome"] == "chr3"
    assert variants[0]["position"] == 46373140
    assert variants[0]["alt"] == "T"
    assert variants[0]["zygosity"] == "homozygous"

    assert variants[1]["variant_type"] == "deletion"
    assert variants[1]["rsid"] == "rs333"
    assert variants[1]["zygosity"] == "heterozygous"

def test_map_genomic_pos_to_offset():
    ref_genes = load_reference_genes()
    ccr5_info = ref_genes["CCR5"]
    
    # Check coordinate 46373140 maps accurately to offset 596
    offset_596 = map_genomic_pos_to_offset(ccr5_info, 46373140)
    assert offset_596 == 596

    # Direct relative index inside sequence
    offset_direct = map_genomic_pos_to_offset(ccr5_info, 120)
    assert offset_direct == 120

def test_build_personalized_sequence_arbitrary_novel_snv():
    # Test arbitrary novel coordinate without any hardcoded strings
    novel_variant = [
        {
            "chromosome": "chr3",
            "position": 46372700,
            "ref": "A",
            "alt": "G",
            "variant_type": "SNV",
            "rsid": "rs_novel_test"
        }
    ]
    res = build_personalized_sequence("CCR5", novel_variant)
    assert res["has_personal_alterations"] is True
    assert 156 in res["modified_offsets"]
    assert len(res["applied_variants"]) == 1
    assert "Substituted A>G" in res["applied_variants"][0]["effect"]

def test_build_personalized_sequence_arbitrary_insertion():
    ins_variant = [
        {
            "chromosome": "chr3",
            "position": 46372600,
            "ref": "-",
            "alt": "TTT",
            "variant_type": "insertion"
        }
    ]
    res = build_personalized_sequence("CCR5", ins_variant)
    assert res["has_personal_alterations"] is True
    assert res["personalized_length_bp"] == res["reference_length_bp"] + 3

def test_build_personalized_sequence_ccr5_snp():
    variants = [
        {
            "chromosome": "chr3",
            "position": 46373140,
            "ref": "C",
            "alt": "T",
            "variant_type": "SNV",
            "rsid": "rs113010081"
        }
    ]
    res = build_personalized_sequence("CCR5", variants)
    assert res["gene_symbol"] == "CCR5"
    assert res["has_personal_alterations"] is True
    assert "GATAGTTATCTTGGGGCTGGTCC" in res["personalized_sequence"]
    assert len(res["applied_variants"]) >= 1

def test_build_personalized_sequence_wildtype():
    res = build_personalized_sequence("CCR5", [])
    assert res["has_personal_alterations"] is False
    assert res["reference_sequence"] == res["personalized_sequence"]
    assert len(res["modified_offsets"]) == 0
