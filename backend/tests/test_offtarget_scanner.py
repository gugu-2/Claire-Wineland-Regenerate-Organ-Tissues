import pytest
import asyncio
from modules.offtarget_scanner import (
    GenomeAnnotator,
    OffTargetScanner,
    start_offtarget_scan_job,
    execute_offtarget_scan_async,
    TUMOR_SUPPRESSORS
)
from core.database import SessionLocal
from core.models import OffTargetScanModel

def test_genome_annotator_tumor_suppressors():
    # Test TP53 exon coordinate
    annot = GenomeAnnotator.annotate("chr17", 7674220)
    assert annot["is_tumor_suppressor"] is True
    assert annot["gene_name"] == "TP53"
    assert annot["feature_type"] == "Exon"
    assert annot["risk_override"] == "CRITICAL_BLOCK"

    # Test BRCA1 exon coordinate
    annot_brca = GenomeAnnotator.annotate("chr17", 43071000)
    assert annot_brca["is_tumor_suppressor"] is True
    assert annot_brca["gene_name"] == "BRCA1"

    # Test Intergenic coordinate
    annot_intergenic = GenomeAnnotator.annotate("chr1", 500000)
    assert annot_intergenic["is_tumor_suppressor"] is False
    assert annot_intergenic["feature_type"] == "Intergenic"

def test_offtarget_candidate_generation():
    guide = "GATAGTCATCTTGGGGCTGG"
    hits = OffTargetScanner.generate_candidate_hits(guide_seq=guide, pam_type="NGG")
    assert len(hits) >= 10
    
    # Hit 0 is on-target
    assert hits[-1]["mismatch_count"] == 0 or any(h["mismatch_count"] == 0 for h in hits)
    
    # All hits have required fields
    for h in hits:
        assert "chromosome" in h
        assert "position" in h
        assert "cfd_score" in h
        assert "risk_level" in h
        assert "gene_name" in h

@pytest.mark.asyncio
async def test_async_scan_job_lifecycle():
    guide = "GATAGTCATCTTGGGGCTGG"
    job_id = start_offtarget_scan_job(guide_seq=guide, pam_type="NGG")
    assert job_id.startswith("scan_")

    await execute_offtarget_scan_async(job_id=job_id, guide_seq=guide)

    db = SessionLocal()
    job = db.query(OffTargetScanModel).filter(OffTargetScanModel.job_id == job_id).first()
    db.close()

    assert job is not None
    assert job.status == "COMPLETED"
    assert job.progress_pct == 100
    assert job.results_json is not None
