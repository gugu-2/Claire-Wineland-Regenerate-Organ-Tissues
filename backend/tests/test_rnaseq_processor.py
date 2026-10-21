import pytest
import pandas as pd
from core.database import SessionLocal, init_db
from modules.rnaseq_processor import (
    detect_format,
    normalize_to_tpm,
    classify_expression,
    process_rnaseq_matrix,
    save_expression_to_db,
    query_gene_expression,
    load_curated_benchmark_profile,
    ENSEMBL_TO_HGNC
)

@pytest.fixture(scope="module")
def db():
    init_db()
    session = SessionLocal()
    yield session
    session.close()

def test_detect_format():
    df_counts = pd.DataFrame({
        "gene": ["KRAS", "TP53"],
        "raw_counts": [1500, 3200]
    })
    gene_col, val_col, fmt = detect_format(df_counts)
    assert gene_col == "gene"
    assert fmt == "raw_counts"

    df_tpm = pd.DataFrame({
        "gene_symbol": ["KRAS", "TP53"],
        "tpm": [124.5, 42.1]
    })
    _, _, fmt_tpm = detect_format(df_tpm)
    assert fmt_tpm == "tpm"

def test_normalize_to_tpm():
    df = pd.DataFrame({
        "gene": ["KRAS", "TP53"],
        "counts": [5400, 2500]
    })
    # KRAS is 5.4 kb, TP53 is 2.5 kb.
    # RPK for KRAS = 5400/5.4 = 1000
    # RPK for TP53 = 2500/2.5 = 1000
    # Sum RPK = 2000 => both should be 500,000 TPM
    norm = normalize_to_tpm(df, "gene", "counts")
    assert "tpm" in norm.columns
    assert round(norm["tpm"].iloc[0], -3) == 500000.0
    assert round(norm["tpm"].iloc[1], -3) == 500000.0

def test_classify_expression():
    assert classify_expression(120.0) == "High"
    assert classify_expression(25.0) == "Medium"
    assert classify_expression(4.5) == "Low"
    assert classify_expression(0.4) == "Silent"

def test_process_rnaseq_matrix_csv():
    csv_content = """Gene,Counts
KRAS,12500
TP53,6000
CCR5,0
EGFR,8500
"""
    result = process_rnaseq_matrix(csv_content, sample_id="TEST_SAMPLE_01", filename="test.csv")
    assert result["status"] == "success"
    assert result["total_genes"] == 4
    assert result["expressed_count"] == 3
    assert result["unexpressed_count"] == 1
    # CCR5 has 0 counts -> 0.0 TPM, Silent
    ccr5_rec = next(r for r in result["records"] if r["gene_name"] == "CCR5")
    assert ccr5_rec["tpm"] == 0.0
    assert ccr5_rec["classification"] == "Silent"

def test_ensembl_id_mapping():
    csv_content = """Ensembl_ID,TPM
ENSG00000133703,245.0
ENSG00000160867,0.2
"""
    result = process_rnaseq_matrix(csv_content, sample_id="TEST_ENSG_SAMPLE")
    assert result["status"] == "success"
    genes = {r["gene_name"] for r in result["records"]}
    assert "KRAS" in genes
    assert "CCR5" in genes

def test_db_persistence_and_query(db):
    sample_id = "PT_DB_TEST_SAMPLE"
    records = [
        {"id": f"{sample_id}_KRAS", "sample_id": sample_id, "gene_name": "KRAS", "tpm": 312.4, "raw_counts": 4500, "percentile_rank": 95.0, "classification": "High"},
        {"id": f"{sample_id}_CCR5", "sample_id": sample_id, "gene_name": "CCR5", "tpm": 0.4, "raw_counts": 5, "percentile_rank": 3.0, "classification": "Silent"}
    ]
    saved = save_expression_to_db(db, records)
    assert saved == 2

    # Query KRAS
    kras_res = query_gene_expression(db, sample_id, "KRAS")
    assert kras_res["gene_name"] == "KRAS"
    assert kras_res["tpm"] == 312.4
    assert kras_res["expressed"] is True
    assert kras_res["warning"] is None

    # Query CCR5 (silent gene -> warning triggered)
    ccr5_res = query_gene_expression(db, sample_id, "CCR5")
    assert ccr5_res["gene_name"] == "CCR5"
    assert ccr5_res["tpm"] == 0.4
    assert ccr5_res["expressed"] is False
    assert "very low expression" in ccr5_res["warning"]

def test_load_curated_benchmark_profile(db):
    sample_id = "PT_BENCHMARK_PDAC"
    res = load_curated_benchmark_profile(db, sample_id, "TCGA-PDAC")
    assert res["status"] == "success"
    assert res["sample_id"] == sample_id
    assert res["cancer_type"] == "Pancreatic Ductal Adenocarcinoma"
    assert res["genes_loaded_count"] >= 8

    # Verify query for KRAS in that benchmark
    kras_q = query_gene_expression(db, sample_id, "KRAS")
    assert kras_q["tpm"] > 200.0
    assert kras_q["classification"] == "High"
