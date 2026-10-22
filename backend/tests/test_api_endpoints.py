import pytest
from fastapi.testclient import TestClient
from main import app
from core.database import init_db

init_db()

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


# ── Sprint 3 API Tests (Spec 05 & Spec 06) ────────────────────────────────────

def test_api_cart_targets():
    payload = {
        "cancer_type": "Pancreatic Ductal Adenocarcinoma (PDAC)",
        "sample_id": "API_TEST_TUMOR"
    }
    response = client.post("/api/oncology/cart-targets", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total_antigens_evaluated"] >= 15
    assert len(data["candidates"]) > 0

def test_api_cart_blueprint():
    response = client.get("/api/oncology/cart-targets/MSLN/blueprint?patient_id=PT_TEST_01")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["antigen"] == "MSLN"
    assert "car_architecture" in data
    assert len(data["full_car_polypeptide"]) > 300

def test_api_scrna_benchmark_load():
    payload = {
        "sample_id": "PT_SCRNA_BENCHMARK",
        "benchmark_key": "PDAC_SUBCLONES"
    }
    response = client.post("/api/scrna/load-benchmark", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total_cells"] == 1200
    assert len(data["clusters_summary"]) >= 4
    assert len(data["cell_points"]) > 0

def test_api_scrna_spatial_visium():
    response = client.get("/api/scrna/spatial-visium?spots_x=12&spots_y=8")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total_spots"] == 96

def test_api_cart_antigens_all():
    response = client.get("/api/oncology/cart-antigens")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["antigens"]) >= 15

def test_api_cart_blueprint_404():
    response = client.get("/api/oncology/cart-targets/NONEXISTENT_ANTIGEN/blueprint")
    assert response.status_code == 404

def test_api_scrna_upload():
    # Build minimal single-cell CSV
    csv_content = "cell_id,KRAS,TP53,CD44,SOX2,ALDH1A1\n" + "\n".join([
        f"CELL_{i},{i%5},{i%3},{i%4},{i%2},{i%6}" for i in range(20)
    ])
    payload = {
        "dataset_name": "API_UPLOAD_TEST",
        "sample_id": "PT_UPLOAD_001",
        "matrix_csv": csv_content,
        "n_clusters": 3
    }
    response = client.post("/api/scrna/upload", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total_cells"] == 20
    assert len(data["cell_points"]) == 20

# ── Sprint 4 API Tests (Spec 07 & Spec 08) ────────────────────────────────────

def test_api_art_design_construct():
    payload = {
        "cDNA_sequence": "ATGCAGAGGTCGCCTCTGGAAAAGGCCAGCGTTGTCTCCAAACTTTTTTTCAGCTGGACCAGACCAATTTTGAGG" * 5,
        "gene_name": "CFTR_TEST",
        "art_system_type": "TYPE_I_LISTERIA",
        "target_unit_size": 200,
        "target_cell_type": "Primary CD34+ HSPCs"
    }
    response = client.post("/api/art/design-construct", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["gene_name"] == "CFTR_TEST"
    assert data["total_units"] >= 2
    assert "fasta_export" in data

def test_api_art_presets():
    response = client.get("/api/art/presets")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "art_systems" in data
    assert "therapeutic_genes" in data

def test_api_synthesis_quote():
    payload = {
        "sequences": [
            {"name": "sgRNA_01", "sequence": "CACCGCATGCTAGTAGTCGTAGTC", "scale": "25nmol", "purification": "Standard Desalting"}
        ]
    }
    response = client.post("/api/synthesis/quote", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "IDT" in data["quotes"]

def test_api_synthesis_order_and_history():
    payload = {
        "vendor": "IDT",
        "sequences": [
            {"name": "sgRNA_01", "sequence": "CACCGCATGCTAGTAGTCGTAGTC", "scale": "25nmol", "purification": "Standard Desalting"}
        ],
        "shipping_address": {
            "institution": "Stanford University",
            "street": "291 Campus Dr",
            "city": "Stanford",
            "state": "CA",
            "zip": "94305"
        }
    }
    response = client.post("/api/synthesis/order", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    order_id = data["order"]["order_id"]

    # Query history
    hist_resp = client.get("/api/synthesis/orders")
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()
    assert hist_data["status"] == "success"
    assert hist_data["total_orders"] >= 1

    # Query status
    status_resp = client.get(f"/api/synthesis/orders/{order_id}/status")
    assert status_resp.status_code == 200
    stat_data = status_resp.json()
    assert "SUBMITTED" in stat_data["lifecycle_status"]

def test_api_clinical_trials_search():
    payload = {
        "gene": "KRAS",
        "mutation": "G12D",
        "cancer_type": "Pancreatic Cancer",
        "patient_zip": "10001",
        "radius_miles": 150.0
    }
    resp = client.post("/api/clinical-trials/search", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["total_found"] >= 1
    assert len(data["trials"]) >= 1

def test_api_clinical_trials_curated_and_detail():
    resp = client.get("/api/clinical-trials/curated")
    assert resp.status_code == 200
    assert resp.json()["total_curated"] >= 5

    detail_resp = client.get("/api/clinical-trials/NCT04956640")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["trial"]["acronym"] == "KRYSTAL-1"

def test_api_collaboration_session_flow():
    sess_payload = {
        "session_id": "API_TEST_SESSION_01",
        "session_name": "Pancreatic Tumor Board",
        "host_user_id": "Dr. Oncologist",
        "target_gene": "KRAS"
    }
    create_resp = client.post("/api/collaboration/sessions", json=sess_payload)
    assert create_resp.status_code == 200
    assert create_resp.json()["session"]["session_id"] == "API_TEST_SESSION_01"

    # Post a note
    note_payload = {
        "author_id": "USER_ONCO_01",
        "author_name": "Dr. Sarah Chen",
        "content": "Recommended trial NCT04956640 for patient given KRAS G12D profile.",
        "author_role": "Oncologist"
    }
    note_resp = client.post("/api/collaboration/sessions/API_TEST_SESSION_01/notes", json=note_payload)
    assert note_resp.status_code == 200
    assert note_resp.json()["note"]["author_name"] == "Dr. Sarah Chen"

    # Get notes
    notes_resp = client.get("/api/collaboration/sessions/API_TEST_SESSION_01/notes")
    assert notes_resp.status_code == 200
    assert len(notes_resp.json()["notes"]) >= 1

    # Post a signoff
    signoff_payload = {
        "candidate_guide_id": "GUIDE_KRAS_G12D_TOP",
        "signoff_decision": "APPROVED",
        "reviewer_name": "Dr. Sarah Chen",
        "reviewer_role": "Lead Oncologist",
        "rationale_notes": "All safety benchmarks verified."
    }
    signoff_resp = client.post("/api/collaboration/sessions/API_TEST_SESSION_01/signoff", json=signoff_payload)
    assert signoff_resp.status_code == 200
    assert signoff_resp.json()["signoff"]["signoff_decision"] == "APPROVED"


