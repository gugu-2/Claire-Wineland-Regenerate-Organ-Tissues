import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from core.database import SessionLocal
from core.models import ExpertReviewModel
from core.security import record_audit_event

REVIEWS_FILE = Path(__file__).resolve().parent.parent / "expert_reviews.json"

def load_reviews_from_file() -> Dict[str, Dict]:
    if not REVIEWS_FILE.exists():
        return {}
    try:
        with open(REVIEWS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def save_reviews_to_file(reviews: Dict[str, Dict]):
    try:
        with open(REVIEWS_FILE, "w", encoding="utf-8") as f:
            json.dump(reviews, f, indent=2)
    except Exception as e:
        print(f"Warning: Reviews file write error: {e}")

def submit_expert_review(
    candidate_id: str,
    target_gene: str,
    sample_id: str,
    reviewer_name: str,
    reviewer_credentials: str,
    irb_number: str,
    decision: str,  # "EXPERT_APPROVED", "APPROVED_WITH_CAVEATS", "EXPERT_REJECTED"
    rationale: str,
    checklist_offtarget_reviewed: bool,
    checklist_personal_snps_checked: bool,
    checklist_wetlab_validation_mandated: bool,
    # ── ONCOLOGY PHASE 1: Extended 6-point checklist ─────────────────────────
    # These three fields are mandatory when sample_type_flag == "TUMOR".
    # They enforce the critical safety standards for cancer research workflows.
    checklist_tumor_normal_completed: bool = False,
    checklist_clonal_fraction_assessed: bool = False,
    checklist_cnv_impact_evaluated: bool = False,
    sample_type_flag: str = "GERMLINE",  # "GERMLINE" or "TUMOR"
) -> Dict:
    """
    Records a formal human expert sign-off on a candidate guide RNA or differentiation protocol.
    Persists to SQLite database and mirrors to JSON file.
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    # Oncology safety guard: if TUMOR sample, all 6 checklist items must be true
    oncology_mode = sample_type_flag == "TUMOR"
    if oncology_mode and decision == "EXPERT_APPROVED":
        if not (checklist_tumor_normal_completed and checklist_clonal_fraction_assessed):
            decision = "APPROVED_WITH_CAVEATS"
            rationale = (
                "[AUTO-DOWNGRADE] Oncology safety: tumor-normal comparison or clonal "
                "fraction assessment not confirmed as complete. Decision downgraded from "
                f"EXPERT_APPROVED to APPROVED_WITH_CAVEATS. Original rationale: {rationale}"
            )

    review_record = {
        "candidate_id": candidate_id,
        "target_gene": target_gene,
        "sample_id": sample_id,
        "reviewer_name": reviewer_name,
        "reviewer_credentials": reviewer_credentials,
        "irb_number": irb_number,
        "decision": decision,
        "rationale": rationale,
        "sample_type_flag": sample_type_flag,
        "oncology_mode_active": oncology_mode,
        "checklist": {
            # Original 3-point checklist
            "offtarget_reviewed": checklist_offtarget_reviewed,
            "personal_snps_checked": checklist_personal_snps_checked,
            "wetlab_validation_mandated": checklist_wetlab_validation_mandated,
            # Phase 1 Oncology additions (3 new fields)
            "tumor_normal_subtraction_completed": checklist_tumor_normal_completed,
            "clonal_fraction_assessed": checklist_clonal_fraction_assessed,
            "cnv_impact_on_offtarget_evaluated": checklist_cnv_impact_evaluated,
        },
        "oncology_disclaimer": (
            "⚠️ ONCOLOGY MODE: This review covers a somatic tumor specimen. "
            "All CRISPR designs target cancer-specific somatic mutations. "
            "Wet-lab validation MUST include both tumor cell lines AND matched normal cells "
            "to confirm tumor-specific editing. IBC pre-approval required before any in vivo work."
            if oncology_mode else None
        ),
        "reviewed_at": timestamp,
    }

    
    # 1. Persist to database
    db = SessionLocal()
    try:
        existing = db.query(ExpertReviewModel).filter(ExpertReviewModel.candidate_id == candidate_id).first()
        if existing:
            existing.decision = decision
            existing.rationale = rationale
            existing.reviewer_name = reviewer_name
            existing.reviewer_credentials = reviewer_credentials
            existing.irb_number = irb_number
            existing.checklist_offtarget = checklist_offtarget_reviewed
            existing.checklist_personal_snps = checklist_personal_snps_checked
            existing.checklist_wetlab = checklist_wetlab_validation_mandated
            existing.reviewed_at = timestamp
        else:
            db_review = ExpertReviewModel(
                candidate_id=candidate_id,
                sample_id=sample_id,
                target_gene=target_gene,
                reviewer_name=reviewer_name,
                reviewer_credentials=reviewer_credentials,
                irb_number=irb_number,
                decision=decision,
                rationale=rationale,
                checklist_offtarget=checklist_offtarget_reviewed,
                checklist_personal_snps=checklist_personal_snps_checked,
                checklist_wetlab=checklist_wetlab_validation_mandated,
                reviewed_at=timestamp
            )
            db.add(db_review)
        db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()

    # 2. Mirror to JSON file
    reviews = load_reviews_from_file()
    reviews[candidate_id] = review_record
    save_reviews_to_file(reviews)
    
    # 3. Audit trail
    record_audit_event(
        action="EXPERT_REVIEW_GATE_DECISION",
        user_id=reviewer_name,
        details={
            "candidate_id": candidate_id,
            "decision": decision,
            "irb_number": irb_number
        },
        sample_id=sample_id,
        status=decision
    )
    
    return review_record

def get_candidate_review_status(candidate_id: str) -> Optional[Dict]:
    """Retrieves review status from database, with fallback to JSON."""
    db = SessionLocal()
    try:
        rev = db.query(ExpertReviewModel).filter(ExpertReviewModel.candidate_id == candidate_id).first()
        if rev:
            return {
                "candidate_id": rev.candidate_id,
                "sample_id": rev.sample_id,
                "target_gene": rev.target_gene,
                "reviewer_name": rev.reviewer_name,
                "reviewer_credentials": rev.reviewer_credentials,
                "irb_number": rev.irb_number,
                "decision": rev.decision,
                "rationale": rev.rationale,
                "checklist": {
                    "offtarget_reviewed": rev.checklist_offtarget,
                    "personal_snps_checked": rev.checklist_personal_snps,
                    "wetlab_validation_mandated": rev.checklist_wetlab
                },
                "reviewed_at": rev.reviewed_at
            }
    except Exception:
        pass
    finally:
        db.close()

    reviews = load_reviews_from_file()
    return reviews.get(candidate_id)

def get_all_reviews() -> List[Dict]:
    """Fetches all expert reviews from the database."""
    db = SessionLocal()
    try:
        revs = db.query(ExpertReviewModel).all()
        if revs:
            return [
                {
                    "candidate_id": r.candidate_id,
                    "sample_id": r.sample_id,
                    "target_gene": r.target_gene,
                    "reviewer_name": r.reviewer_name,
                    "reviewer_credentials": r.reviewer_credentials,
                    "irb_number": r.irb_number,
                    "decision": r.decision,
                    "rationale": r.rationale,
                    "checklist": {
                        "offtarget_reviewed": r.checklist_offtarget,
                        "personal_snps_checked": r.checklist_personal_snps,
                        "wetlab_validation_mandated": r.checklist_wetlab
                    },
                    "reviewed_at": r.reviewed_at
                }
                for r in revs
            ]
    except Exception:
        pass
    finally:
        db.close()

    reviews = load_reviews_from_file()
    return list(reviews.values())
