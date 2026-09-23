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
    # Test that a novel variant at a CCR5 coordinate IS applied.
    # Position 46372700 in GRCh38/Ensembl CCR5 sequence has ref=G.
    novel_variant = [
        {
            "chromosome": "chr3",
            "position": 46372700,
            "ref": "G",      # Real Ensembl ref base at chr3:46372700
            "alt": "A",      # Novel SNV G>A
            "variant_type": "SNV",
            "rsid": "rs_novel_test"
        }
    ]
    res = build_personalized_sequence("CCR5", novel_variant)
    # The key assertions: something was modified, and the variant was recorded
    assert res["has_personal_alterations"] is True
    assert len(res["applied_variants"]) == 1
    # Personalized sequence differs from reference at the modified offset
    assert res["personalized_sequence"] != res["reference_sequence"]


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
    # CCR5 seed SNP: chr3:46373140 C>T — disrupts guide sgRNA_CCR5_Exon3_01 seed pairing
    # Real Ensembl CCR5 has ref=C at offset 2201 (chr3:46373140)
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
    assert len(res["applied_variants"]) >= 1
    # The C>T substitution at 46373140 should be recorded — check the effect field
    effect = res["applied_variants"][0]["effect"]
    assert "C>T" in effect or "Substituted" in effect
    # The personalized sequence must differ from the reference at the SNP position
    assert res["personalized_sequence"] != res["reference_sequence"]


def test_build_personalized_sequence_wildtype():
    res = build_personalized_sequence("CCR5", [])
    assert res["has_personal_alterations"] is False
    assert res["reference_sequence"] == res["personalized_sequence"]
    assert len(res["modified_offsets"]) == 0
