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
