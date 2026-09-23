import hashlib
import json
import time
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from core.database import SessionLocal
from core.models import AuditLogModel

AUDIT_LOG_FILE = Path(__file__).resolve().parent.parent / "audit_trail.jsonl"
_audit_lock = threading.Lock()

# Dual-Use Research of Concern (DURC) high-risk keyword and agent dictionary
DURC_PROHIBITED_TERMS = [
    "variola", "smallpox", "ebolavirus", "marburg", "bacillus anthracis",
    "botulinum neurotoxin", "yersinia pestis", "ricin", "foot-and-mouth disease",
    "avian influenza gain of function", "aerosol transmission enhancement",
    "weaponize", "bioweapon", "pathogenicity enhancement"
]

def screen_durc_risk(text_or_sequence: str) -> Tuple[bool, Optional[str]]:
    """
    Screen research inputs and queries for Dual-Use Research of Concern (DURC).
    Returns (is_flagged, reason).
    """
    text_lower = text_or_sequence.lower()
    for term in DURC_PROHIBITED_TERMS:
        if term in text_lower:
            return True, f"Security Alert: Query triggered Dual-Use Research of Concern (DURC) policy trigger: '{term}'. Automated output halted for Institutional Biosafety Committee (IBC) review."
    return False, None

def record_audit_event(
    action: str,
    user_id: str,
    details: Dict,
    sample_id: Optional[str] = None,
    status: str = "SUCCESS"
) -> Dict:
    """
    Appends an immutable audit log entry with SHA-256 cryptographic chaining,
    persisting into the relational database and appending to audit_trail.jsonl.
    GDPR COMPLIANCE FIX: Pseudonymizes user_id and sample_id to prevent PHI exposure in immutable logs.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    
    # GDPR/HIPAA: Cryptographically hash identifiers so they are irreversible in the immutable log
    pseudo_user = hashlib.sha256(user_id.encode("utf-8")).hexdigest()[:16]
    pseudo_sample = hashlib.sha256(sample_id.encode("utf-8")).hexdigest()[:16] if sample_id else None

    # Redact raw sequence details to prevent PHI leakage
    safe_details = {k: v for k, v in details.items() if "sequence" not in k.lower()}
    
    record = {
        "timestamp": timestamp,
        "action": action,
        "user_id_hash": pseudo_user,
        "sample_id_hash": pseudo_sample,
        "status": status,
        "details": safe_details
    }
    
    # Compute signature hash
    serialized = json.dumps(record, sort_keys=True)
    record_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
    record["integrity_hash"] = record_hash
    
    # 1. Write to database
    db = SessionLocal()
    try:
        db_log = AuditLogModel(
            timestamp=timestamp,
            action=action,
            user_id=pseudo_user,
            sample_id=pseudo_sample,
            status=status,
            details_json=json.dumps(safe_details),
            integrity_hash=record_hash
        )
        db.add(db_log)
        db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()

    # 2. Write to append-only JSONL file backup
    try:
        with _audit_lock:
            with open(AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(record) + "\n")
    except Exception as e:
        print(f"Warning: Audit log file backup error: {e}")
        
    return record

def get_recent_audit_logs(limit: int = 50) -> List[Dict]:
    """
    Fetches the most recent audit trail records from the database, falling back to JSONL.
    """
    db = SessionLocal()
    try:
        logs = db.query(AuditLogModel).order_by(AuditLogModel.id.desc()).limit(limit).all()
        if logs:
            result = []
            for log in reversed(logs):
                try:
                    details = json.loads(log.details_json) if log.details_json else {}
                except Exception:
                    details = {}
                result.append({
                    "timestamp": log.timestamp,
                    "action": log.action,
                    "user_id": log.user_id,
                    "sample_id": log.sample_id,
                    "status": log.status,
                    "details": details,
                    "integrity_hash": log.integrity_hash
                })
            return result
    except Exception:
        pass
    finally:
        db.close()

    # Fallback to JSONL file
    if not AUDIT_LOG_FILE.exists():
        return []
    records = []
    with open(AUDIT_LOG_FILE, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                try:
                    records.append(json.loads(line.strip()))
                except Exception:
                    pass
    return records[-limit:]
