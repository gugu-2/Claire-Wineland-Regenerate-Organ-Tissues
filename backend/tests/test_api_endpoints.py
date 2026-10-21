import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_api_structure_list():
    response = client.get("/api/structure/list")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 4
    pdb_ids = [item["pdb_id"] for item in data]
    assert "4ZT0" in pdb_ids
    assert "6O0Y" in pdb_ids

def test_api_structure_detail():
    response = client.get("/api/structure/4ZT0")
    assert response.status_code == 200
    data = response.json()
    assert data["pdb_id"] == "4ZT0"
    assert "cif_data" in data
    assert "metadata" in data
    assert data["metadata"]["organism"] == "Streptococcus pyogenes"

def test_api_structure_annotations():
    response = client.get("/api/structure/4ZT0/annotations?guide_seq=GATAGTCATCTTGGGGCTGG&mutation_label=G12D&mutation_pos=12")
    assert response.status_code == 200
    data = response.json()
    assert data["pdb_id"] == "4ZT0"
    assert len(data["catalytic_residues"]) >= 2
    assert len(data["pam_residues"]) >= 2
    assert data["mutation_annotation"]["label"] == "G12D"

def test_api_offtarget_scan_lifecycle():
    # Submit scan job
    payload = {
        "guide_seq": "GATAGTCATCTTGGGGCTGG",
        "pam_type": "NGG",
        "sample_id": "test_sample_01",
        "max_mismatches": 3
    }
    response = client.post("/api/crispr/offtarget-scan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    job_id = data["job_id"]
    assert data["status"] == "QUEUED"

    # Query status
    status_resp = client.get(f"/api/crispr/offtarget-scan/{job_id}")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["job_id"] == job_id
    assert status_data["status"] in ["QUEUED", "RUNNING", "COMPLETED"]

def test_api_offtarget_scan_invalid_guide():
    response = client.post("/api/crispr/offtarget-scan", json={"guide_seq": "SHORT"})
    assert response.status_code == 400

# ── Sprint 2 API Tests ────────────────────────────────────────────────────────

def test_api_neoantigen_alleles():
    response = client.get("/api/oncology/neoantigen-alleles")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["alleles"]) >= 30
    allele_names = [a["name"] for a in data["alleles"]]
    assert "HLA-A*02:01" in allele_names
    assert "HLA-B*07:02" in allele_names
    assert "HLA-C*07:01" in allele_names

def test_api_multi_allele_neoantigen_predict():
    payload = {
        "somatic_mutations": [
            {"gene": "KRAS", "mutation": "G12D"}
        ],
        "hla_alleles": ["HLA-A*02:01", "HLA-B*07:02", "HLA-C*07:01"],
        "sample_id": "API_TEST_TUMOR"
    }
    response = client.post("/api/oncology/neoantigen-predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["patient_hla_alleles"]) == 3
    assert len(data["top_neoantigens"]) > 0
    top = data["top_neoantigens"][0]
    assert "mutant_peptide" in top
    assert "ic50_nm" in top
    assert "composite_score" in top
    assert "cleavage_score" in top

def test_api_vaccine_design():
    payload = {
        "peptides": [
            {"mutant_peptide": "VVVGADGVG"},
            {"mutant_peptide": "GADGVGKSAL"}
        ],
        "patient_id": "PT_VACCINE_TEST",
        "linker_type": "AAY",
        "include_trafficking_signal": True
    }
    response = client.post("/api/oncology/vaccine-design", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["patient_id"] == "PT_VACCINE_TEST"
    assert data["linker_used"] == "AAY"
    assert "mrna_transcript" in data
    assert "fasta_export" in data

def test_api_rnaseq_upload_and_query():
    csv_text = "Gene,Counts\nKRAS,15000\nEGFR,12000\nCCR5,0\n"
    payload = {
        "sample_id": "API_RNA_SAMPLE_01",
        "csv_content": csv_text,
        "filename": "tumor_matrix.csv"
    }
    upload_resp = client.post("/api/sample/upload-rnaseq", json=payload)
    assert upload_resp.status_code == 200
    up_data = upload_resp.json()
    assert up_data["status"] == "success"
    assert up_data["total_genes"] == 3

    # Query KRAS
    kras_resp = client.get("/api/sample/API_RNA_SAMPLE_01/expression/KRAS")
    assert kras_resp.status_code == 200
    kras_data = kras_resp.json()
    assert kras_data["gene_name"] == "KRAS"
    assert kras_data["expressed"] is True

    # Query CCR5 (silent -> warning)
    ccr5_resp = client.get("/api/sample/API_RNA_SAMPLE_01/expression/CCR5")
    assert ccr5_resp.status_code == 200
    ccr5_data = ccr5_resp.json()
    assert ccr5_data["gene_name"] == "CCR5"
    assert ccr5_data["expressed"] is False
    assert ccr5_data["warning"] is not None

def test_api_rnaseq_benchmark_load():
    payload = {
        "sample_id": "API_BENCH_TEST",
        "benchmark_key": "TCGA-PDAC"
    }
    resp = client.post("/api/sample/load-benchmark-rnaseq", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["cancer_type"] == "Pancreatic Ductal Adenocarcinoma"

    # Query summary
    summary_resp = client.get("/api/sample/API_BENCH_TEST/expression-summary")
    assert summary_resp.status_code == 200
    sum_data = summary_resp.json()
    assert sum_data["status"] == "success"
    assert len(sum_data["top_expressed"]) > 0
