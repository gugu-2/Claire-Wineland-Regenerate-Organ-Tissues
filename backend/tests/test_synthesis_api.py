import pytest
from modules.synthesis_validator import validate_oligo_sequence
from modules.synthesis_api_client import (
    calculate_synthesis_quote,
    submit_synthesis_order,
    PRICING_MODELS
)

def test_validate_oligo_clean():
    clean_oligo = "ATCGATCGATCGATCGATCG"
    val = validate_oligo_sequence(clean_oligo, vendor="IDT", product_type="oligo")
    assert val["valid"] is True
    assert val["status"] == "PASSED"
    assert val["biosecurity_cleared"] is True
    assert val["length_nt"] == 20

def test_validate_oligo_invalid_characters():
    bad_oligo = "ATCGATCGXYZ123"
    val = validate_oligo_sequence(bad_oligo)
    assert val["valid"] is False
    assert val["status"] == "INVALID_CHARACTERS"
    assert val["biosecurity_cleared"] is False

def test_validate_oligo_biosecurity_interception():
    # Ricin toxin motif
    hazardous_seq = "ATCGATCG" + "TACCGTGGACACACAG" + "GCTAGCTA"
    val = validate_oligo_sequence(hazardous_seq)
    assert val["valid"] is False
    assert val["status"] == "BIOSECURITY_FLAGGED"
    assert val["biosecurity_cleared"] is False
    assert len(val["alerts"]) > 0

def test_calculate_synthesis_quote():
    sequences = [
        {"name": "sgRNA_01_top", "sequence": "CACCGCATGCTAGTAGTCGTAGTC", "scale": "25nmol", "purification": "Standard Desalting"},
        {"name": "sgRNA_01_bottom", "sequence": "AAACGACTACGACTACTAGCATGC", "scale": "25nmol", "purification": "Standard Desalting"}
    ]
    res = calculate_synthesis_quote(sequences)
    assert res["status"] == "success"
    assert res["total_sequences_quoted"] == 2
    assert "IDT" in res["quotes"]
    assert "Twist" in res["quotes"]
    assert "GenScript" in res["quotes"]
    assert res["quotes"]["IDT"]["total_price_usd"] > 0.0

def test_submit_synthesis_order_simulation():
    sequences = [
        {"name": "ART_Unit_01", "sequence": "CATGTGTCTCGCATGTCAGGTAGCTAGTCAG", "scale": "25nmol", "purification": "Standard Desalting"}
    ]
    shipping = {
        "institution": "Stanford University School of Medicine",
        "recipient": "Dr. Research Investigator",
        "street": "291 Campus Drive",
        "city": "Stanford",
        "state": "CA",
        "zip": "94305"
    }
    order_res = submit_synthesis_order(
        vendor="IDT",
        sequences=sequences,
        shipping_address=shipping,
        user_id="RESEARCHER_TEST"
    )
    assert order_res["status"] == "success"
    order = order_res["order"]
    assert order["vendor"] == "IDT"
    assert "SUBMITTED" in order["status"]
    assert "IDT_ORD_" in order["order_id"]
    assert order["tracking_number"].startswith("1Z")

def test_canonical_select_agent_motifs():
    from modules.synthesis_validator import validate_synthesis_request
    # Test Ricin canonical CDS motif
    ricin_seq = "ACGT" + "ATGAAACCGGG" + "TGCA"
    req_res = validate_synthesis_request({"sequence": ricin_seq, "vendor": "IDT"})
    assert req_res["is_approved"] is False
    assert req_res["vendor_rejection_code"] == "VENDOR_REJECT_DURC_SELECT_AGENT"

def test_synthesis_order_status_progression():
    from modules.synthesis_api_client import get_synthesis_order_status
    status_info = get_synthesis_order_status("IDT_ORD_TEST1234")
    assert status_info["order_id"] == "IDT_ORD_TEST1234"
    assert "status" in status_info
    assert "lifecycle_stage" in status_info
