import pytest
from unittest.mock import patch, MagicMock
from modules.external_apis import (
    get_cached_response,
    set_cached_response,
    query_clinvar_live,
    query_pubmed_live
)
from modules.variant_annotation import annotate_variant
from modules.knowledge_copilot import query_knowledge_copilot

def test_cache_set_and_get():
    test_data = {"test_status": "ok", "value": 42}
    set_cached_response("test_service", "query_123", test_data, ttl_days=1)
    retrieved = get_cached_response("test_service", "query_123")
    assert retrieved is not None
    assert retrieved["value"] == 42
    assert retrieved["test_status"] == "ok"

def test_query_clinvar_live_cache_hit():
    mock_clinvar = {
        "clinvar_id": "VCV00012345",
        "gene": "CCR5",
        "clinical_significance": "Pathogenic (Live ClinVar ★★★)",
        "condition": "Test Condition",
        "source": "NCBI ClinVar (Live E-utilities)",
        "query_key": "rs999999"
    }
    set_cached_response("clinvar", "rs999999", mock_clinvar, ttl_days=7)
    
    # Query should return cached without network hit
    res = query_clinvar_live(rsid="rs999999")
    assert res is not None
    assert res["clinvar_id"] == "VCV00012345"
    assert "Pathogenic" in res["clinical_significance"]

def test_annotate_variant_with_cached_clinvar():
    mock_clinvar = {
        "clinvar_id": "VCV00099999",
        "gene": "HBB",
        "clinical_significance": "Pathogenic",
        "condition": "Severe Beta Thalassemia",
        "source": "NCBI ClinVar Live",
        "query_key": "rs888888"
    }
    set_cached_response("clinvar", "rs888888", mock_clinvar, ttl_days=7)
    
    anno = annotate_variant({
        "chromosome": "chr11",
        "position": 5227100,
        "ref": "G",
        "alt": "A",
        "variant_type": "SNV",
        "rsid": "rs888888"
    })
    assert anno["pathogenicity_level"] == "PATHOGENIC"
    assert anno["clinvar_id"] == "VCV00099999"
    assert anno["condition"] == "Severe Beta Thalassemia"

def test_query_pubmed_live_cached():
    mock_articles = [
        {
            "pmid": "31234567",
            "title": "CRISPR-Cas9 Gene Editing in Hematopoietic Stem Cells",
            "authors": "Smith et al.",
            "journal": "Nature Medicine",
            "year": 2023,
            "doi": "10.1038/s41591-023-0001",
            "evidence_level": "Peer-Reviewed Literature (Live PubMed)",
            "summary": "Clinical trial results of autologous gene editing."
        }
    ]
    cache_key = "crispr gene editing_4"
    set_cached_response("pubmed", cache_key, {"articles": mock_articles}, ttl_days=7)

    articles = query_pubmed_live("crispr gene editing", max_results=4)
    assert len(articles) == 1
    assert articles[0]["pmid"] == "31234567"
    assert articles[0]["journal"] == "Nature Medicine"

def test_knowledge_copilot_includes_live_pubmed():
    res = query_knowledge_copilot("casgevy sickle cell")
    assert res["status"] == "GROUNDED_SYNTHESIS_COMPLETE"
    assert len(res["citations"]) > 0
