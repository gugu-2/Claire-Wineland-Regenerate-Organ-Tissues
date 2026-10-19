import pytest
from datetime import datetime, timezone, timedelta
from core.database import init_db, SessionLocal
from core.models import SampleModel, VariantModel, ExpertReviewModel, AuditLogModel, ApiCacheModel
from core.security import record_audit_event, get_recent_audit_logs
from modules.review_gate import submit_expert_review, get_candidate_review_status, get_all_reviews

def test_database_init_and_tables():
    init_db()
    db = SessionLocal()
    try:
        # Check query capability on all tables
        assert db.query(SampleModel).count() >= 0
        assert db.query(VariantModel).count() >= 0
        assert db.query(ExpertReviewModel).count() >= 0
        assert db.query(AuditLogModel).count() >= 0
        assert db.query(ApiCacheModel).count() >= 0
    finally:
        db.close()

def test_audit_log_database_persistence():
    event = record_audit_event(
        action="TEST_DB_AUDIT",
        user_id="researcher_test",
        details={"test_key": "val_123"},
        sample_id="SAMPLE_TEST_001",
        status="SUCCESS"
    )
    assert event["action"] == "TEST_DB_AUDIT"
    assert "integrity_hash" in event

    logs = get_recent_audit_logs(limit=10)
    assert len(logs) > 0
    latest = logs[-1]
    assert latest["action"] == "TEST_DB_AUDIT"
    assert latest["integrity_hash"] == event["integrity_hash"]

def test_expert_review_database_persistence():
    cand_id = "sgRNA_CCR5_DB_Persist_Test"
    review = submit_expert_review(
        candidate_id=cand_id,
        target_gene="CCR5",
        sample_id="PATIENT_001_WT",
        reviewer_name="Dr. Elena Rostova",
        reviewer_credentials="MD, DSc",
        irb_number="IRB-2026-TEST-77",
        decision="EXPERT_APPROVED",
        rationale="Verified no personal SNPs and off-target risk below threshold.",
        checklist_offtarget_reviewed=True,
        checklist_personal_snps_checked=True,
        checklist_wetlab_validation_mandated=True
    )
    assert review["candidate_id"] == cand_id
    assert review["decision"] == "EXPERT_APPROVED"

    # Fetch back
    fetched = get_candidate_review_status(cand_id)
    assert fetched is not None
    assert fetched["reviewer_name"] == "Dr. Elena Rostova"
    assert fetched["irb_number"] == "IRB-2026-TEST-77"
    assert fetched["checklist"]["offtarget_reviewed"] is True

    # Check in all reviews
    all_revs = get_all_reviews()
    assert any(r["candidate_id"] == cand_id for r in all_revs)

def test_api_cache_expiration():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        # Add expired item
        expired_record = ApiCacheModel(
            endpoint="test_expired",
            query_key="key_exp",
            response_json='{"data": "old"}',
            cached_at=now - timedelta(days=10),
            expires_at=now - timedelta(days=3)
        )
        db.add(expired_record)
        db.commit()

        # Query active records
        active = (
            db.query(ApiCacheModel)
            .filter(
                ApiCacheModel.endpoint == "test_expired",
                ApiCacheModel.query_key == "key_exp",
                ApiCacheModel.expires_at > now
            )
            .first()
        )
        assert active is None
    finally:
        db.close()
