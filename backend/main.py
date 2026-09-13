import json
import uuid
import asyncio
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any

from core.config import APP_NAME, APP_VERSION, DISCLAIMER_TEXT, SAFETY_MODE_ENABLED
from core.security import record_audit_event, get_recent_audit_logs, screen_durc_risk
from modules.sample_intake import (
    load_benchmark_samples,
    load_reference_genes,
    parse_vcf_content,
    build_personalized_sequence
)
from modules.variant_annotation import annotate_sample_variants
from modules.crispr_designer import scan_candidate_guides, run_cas_offinder_background
from modules.regeneration import (
    load_regeneration_protocols,
    evaluate_custom_cocktail
)
from modules.knowledge_copilot import query_knowledge_copilot, load_knowledge_graph
from modules.review_gate import (
    submit_expert_review,
    get_candidate_review_status,
    get_all_reviews
)
from modules.report_generator import generate_research_report, generate_html_report

from core.database import init_db
from modules.external_apis import query_pubmed_live
from modules.oligo_synthesizer import generate_cloning_oligos
from modules.delivery_advisor import evaluate_delivery_strategy
from modules.dual_guide_designer import design_dual_guide_pairs
from modules.cohort_analyzer import generate_cohort_comparison_matrix

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="Computational research assistant for CRISPR design, gene therapy, and stem-cell regeneration"
)

@app.on_event("startup")
def on_startup():
    init_db()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Request Models ----------------- #
class VcfUploadRequest(BaseModel):
    sample_id: str
    vcf_content: str
    donor_id: Optional[str] = "Donor-Custom"
    sample_type: Optional[str] = "Clinical Sample"
    target_gene: Optional[str] = "CCR5"

class PersonalizeRequest(BaseModel):
    gene_symbol: str
    variants: List[Dict[str, Any]]

class AnnotateRequest(BaseModel):
    variants: List[Dict[str, Any]]

class CrisprDesignRequest(BaseModel):
    target_gene: str
    reference_sequence: str
    personalized_sequence: str
    personal_variants: List[Dict[str, Any]]
    pam_type: Optional[str] = "SpCas9_NGG"

class OligoOrderRequest(BaseModel):
    guide_seq: str
    plasmid_type: Optional[str] = "PX459_BbsI"
    guide_id: Optional[str] = "sgRNA_01"

class DeliveryRecommendRequest(BaseModel):
    target_tissue: str
    nuclease_type: Optional[str] = "SpCas9"
    promoter_type: Optional[str] = "EFS"

class DualGuideRequest(BaseModel):
    target_gene: str
    target_domain: str
    candidates: List[Dict[str, Any]]
    min_excision_bp: Optional[int] = 25
    max_excision_bp: Optional[int] = 600

class RegenerationEvaluateRequest(BaseModel):
    target_lineage: str
    selected_factors: List[str]
    delivery_modality: str

class CopilotChatRequest(BaseModel):
    query: str
    sample_id: Optional[str] = None

class ExpertReviewRequest(BaseModel):
    candidate_id: str
    target_gene: str
    sample_id: str
    reviewer_name: str
    reviewer_credentials: str
    irb_number: str
    decision: str  # "EXPERT_APPROVED", "APPROVED_WITH_CAVEATS", "EXPERT_REJECTED"
    rationale: str
    checklist_offtarget_reviewed: bool
    checklist_personal_snps_checked: bool
    checklist_wetlab_validation_mandated: bool

class ReportGenerateRequest(BaseModel):
    sample_info: Dict[str, Any]
    personal_sequence_data: Dict[str, Any]
    candidate_guides: List[Dict[str, Any]]
    expert_review: Optional[Dict[str, Any]] = None
    regeneration_data: Optional[Dict[str, Any]] = None
    citations: Optional[List[Dict[str, Any]]] = None

# ----------------- Endpoints ----------------- #

@app.get("/api/status")
def get_system_status():
    return {
        "app_name": APP_NAME,
        "version": APP_VERSION,
        "safety_mode": SAFETY_MODE_ENABLED,
        "regulatory_disclaimer": DISCLAIMER_TEXT,
        "audit_active": True,
        "durc_filter": "Active"
    }

@app.get("/api/samples")
def get_samples():
    """Returns curated benchmark patient samples."""
    return load_benchmark_samples()

@app.get("/api/genes")
def get_genes():
    """Returns catalog of reference genomic target loci."""
    return load_reference_genes()

@app.post("/api/samples/upload-vcf")
def upload_vcf(req: VcfUploadRequest):
    """Parses raw VCF text into normalized variants."""
    variants = parse_vcf_content(req.vcf_content)
    record_audit_event(
        action="VCF_UPLOAD_PARSED",
        user_id="researcher_session",
        details={"variant_count": len(variants), "gene": req.target_gene},
        sample_id=req.sample_id
    )
    return {
        "sample_id": req.sample_id,
        "donor_id": req.donor_id,
        "sample_type": req.sample_type,
        "target_gene": req.target_gene,
        "parsed_variant_count": len(variants),
        "variants": variants
    }

@app.post("/api/samples/personalize")
def personalize_sequence(req: PersonalizeRequest):
    """Reconstitutes the patient's individual genomic sequence."""
    try:
        res = build_personalized_sequence(req.gene_symbol, req.variants)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/variants/annotate")
def annotate_variants(req: AnnotateRequest):
    """Annotates variants with ClinVar, dbSNP, and gnomAD data."""
    return annotate_sample_variants(req.variants)

@app.post("/api/crispr/design")
async def design_crispr(req: CrisprDesignRequest):
    """Performs personalized guide RNA design, PAM checks, and scoring."""
    candidates = await asyncio.to_thread(
        scan_candidate_guides,
        target_gene=req.target_gene,
        reference_sequence=req.reference_sequence,
        personalized_sequence=req.personalized_sequence,
        personal_variants=req.personal_variants,
        pam_type=req.pam_type or "SpCas9_NGG"
    )
    # Merge existing expert review status if available
    for c in candidates:
        rev = get_candidate_review_status(c["guide_id"])
        if rev:
            c["expert_review_status"] = rev["decision"]
            c["expert_review_record"] = rev

    return {
        "target_gene": req.target_gene,
        "total_candidates": len(candidates),
        "candidates": candidates,
        "regulatory_warning": DISCLAIMER_TEXT
    }

from fastapi import BackgroundTasks
import uuid

class CasOffinderRequest(BaseModel):
    candidates: List[Dict[str, Any]]
    genome_build: Optional[str] = "hg38"

@app.post("/api/crispr/off-target-scan")
def start_off_target_scan(req: CasOffinderRequest, background_tasks: BackgroundTasks):
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    background_tasks.add_task(run_cas_offinder_background, job_id, req.candidates, req.genome_build)
    
    record_audit_event(
        action="CAS_OFFINDER_QUEUED",
        user_id="researcher_session",
        details={"job_id": job_id, "candidates": len(req.candidates)},
        status="QUEUED"
    )
    return {"job_id": job_id, "status": "QUEUED", "message": "Genome-wide scan initiated."}

@app.get("/api/crispr/off-target-scan/{job_id}")
def get_off_target_scan_status(job_id: str):
    from modules.crispr_designer import OFF_TARGET_JOBS
    job = OFF_TARGET_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/api/regeneration/protocols")
def get_regeneration_protocols():
    """Returns stem cell differentiation protocols and markers."""
    return load_regeneration_protocols()

@app.post("/api/regeneration/evaluate")
def evaluate_regeneration(req: RegenerationEvaluateRequest):
    """Evaluates custom reprogramming cocktail for tumorigenic/oncogenic risks."""
    return evaluate_custom_cocktail(
        target_lineage=req.target_lineage,
        selected_factors=req.selected_factors,
        delivery_modality=req.delivery_modality
    )

@app.post("/api/copilot/chat")
def chat_copilot(req: CopilotChatRequest):
    """RAG-grounded literature and knowledge graph chat."""
    response = query_knowledge_copilot(req.query, req.sample_id)
    
    # Optionally save to DB if sample_id provided
    if req.sample_id:
        from core.database import get_db
        from core.models import ChatMessageModel
        import json
        db = next(get_db())
        try:
            # save user msg
            u_msg = ChatMessageModel(sample_id=req.sample_id, role="user", content=req.query)
            # save assistant msg
            a_msg = ChatMessageModel(
                sample_id=req.sample_id, 
                role="assistant", 
                content=response["synthesis"], 
                citations_json=json.dumps(response.get("citations", []))
            )
            db.add(u_msg)
            db.add(a_msg)
            db.commit()
        except Exception as e:
            print("Failed to save chat message", e)
        finally:
            db.close()
            
    return response

@app.get("/api/copilot/history/{sample_id}")
def get_chat_history(sample_id: str):
    from core.database import get_db
    from core.models import ChatMessageModel
    import json
    db = next(get_db())
    try:
        messages = db.query(ChatMessageModel).filter_by(sample_id=sample_id).order_by(ChatMessageModel.created_at.asc()).all()
        history = []
        for m in messages:
            history.append({
                "role": m.role,
                "content": m.content,
                "citations": json.loads(m.citations_json) if m.citations_json else []
            })
        return {"sample_id": sample_id, "history": history}
    finally:
        db.close()

@app.get("/api/knowledge-graph")
def get_kg():
    """Returns the knowledge graph structure."""
    return load_knowledge_graph()

@app.post("/api/review/submit")
def submit_review(req: ExpertReviewRequest):
    """Submit a formal human expert review gate decision."""
    res = submit_expert_review(
        candidate_id=req.candidate_id,
        target_gene=req.target_gene,
        sample_id=req.sample_id,
        reviewer_name=req.reviewer_name,
        reviewer_credentials=req.reviewer_credentials,
        irb_number=req.irb_number,
        decision=req.decision,
        rationale=req.rationale,
        checklist_offtarget_reviewed=req.checklist_offtarget_reviewed,
        checklist_personal_snps_checked=req.checklist_personal_snps_checked,
        checklist_wetlab_validation_mandated=req.checklist_wetlab_validation_mandated
    )
    return {"status": "REVIEW_RECORDED", "record": res}

@app.get("/api/review/{candidate_id}")
def get_review(candidate_id: str):
    res = get_candidate_review_status(candidate_id)
    if not res:
        return {"status": "PENDING_REVIEW"}
    return res

@app.get("/api/reviews")
def get_all_review_records():
    return get_all_reviews()

@app.post("/api/report/generate")
def create_report(req: ReportGenerateRequest):
    """Generates structured report object and HTML rendering."""
    report_data = generate_research_report(
        sample_info=req.sample_info,
        personal_sequence_data=req.personal_sequence_data,
        candidate_guides=req.candidate_guides,
        expert_review=req.expert_review,
        regeneration_data=req.regeneration_data,
        citations=req.citations
    )
    html_content = generate_html_report(report_data)
    return {
        "report_data": report_data,
        "html_content": html_content
    }

class SessionSaveRequest(BaseModel):
    session_id: str
    user_id: str
    state_json: str

@app.post("/api/sessions")
def save_session(req: SessionSaveRequest):
    """Saves the complete application state for a patient session."""
    from core.database import get_db
    from core.models import PatientSessionModel
    import json
    
    db = next(get_db())
    try:
        session = db.query(PatientSessionModel).filter_by(session_id=req.session_id).first()
        if not session:
            session = PatientSessionModel(
                session_id=req.session_id,
                user_id=req.user_id,
                state_json=req.state_json
            )
            db.add(session)
        else:
            session.state_json = req.state_json
        
        db.commit()
        
        record_audit_event(
            action="SESSION_SAVED",
            user_id=req.user_id,
            details={"session_id": req.session_id},
            sample_id=req.session_id
        )
        return {"status": "success", "session_id": req.session_id}
    finally:
        db.close()

@app.get("/api/sessions/{session_id}")
def load_session(session_id: str):
    """Loads the application state for a patient session."""
    from core.database import get_db
    from core.models import PatientSessionModel
    
    db = next(get_db())
    try:
        session = db.query(PatientSessionModel).filter_by(session_id=session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
            
        record_audit_event(
            action="SESSION_LOADED",
            user_id=session.user_id,
            details={"session_id": session_id},
            sample_id=session_id
        )
        return {
            "session_id": session.session_id,
            "user_id": session.user_id,
            "state_json": session.state_json,
            "last_accessed_at": session.last_accessed_at
        }
    finally:
        db.close()

@app.get("/api/literature/search")
def search_literature(query: str, max_results: int = 5):
    """Live NCBI PubMed literature search with 7-day database caching."""
    if not query or not query.strip():
        return {"query": "", "count": 0, "articles": []}
    articles = query_pubmed_live(term=query, max_results=max_results)
    return {"query": query, "count": len(articles), "articles": articles}

# ----------------- Sprint 3 Wet-Lab & Delivery Endpoints ----------------- #
@app.post("/api/crispr/oligo-order")
def create_oligo_order(req: OligoOrderRequest):
    """Generates cloning oligonucleotides and modified synthetic sgRNA sequences."""
    return generate_cloning_oligos(
        guide_seq_20nt=req.guide_seq,
        plasmid_type=req.plasmid_type or "PX459_BbsI",
        guide_id=req.guide_id or "sgRNA_01"
    )

@app.post("/api/delivery/recommend")
def recommend_delivery(req: DeliveryRecommendRequest):
    """Recommends viral / non-viral delivery modality and evaluates AAV packaging limits."""
    return evaluate_delivery_strategy(
        target_tissue=req.target_tissue,
        nuclease_type=req.nuclease_type or "SpCas9",
        promoter_type=req.promoter_type or "EFS"
    )

@app.post("/api/crispr/dual-guide")
def design_dual_guides(req: DualGuideRequest):
    """Designs paired dual-guide excision arrays for targeted genomic deletions."""
    return {
        "target_gene": req.target_gene,
        "target_domain": req.target_domain,
        "pairs": design_dual_guide_pairs(
            target_gene=req.target_gene,
            target_domain=req.target_domain,
            candidates=req.candidates,
            min_excision_bp=req.min_excision_bp or 25,
            max_excision_bp=req.max_excision_bp or 600
        )
    }

@app.get("/api/cohort/comparison")
def get_cohort_matrix(target_gene: str = "CCR5"):
    """Computes cross-patient comparative efficiency and collision matrix across cohort."""
    return generate_cohort_comparison_matrix(target_gene=target_gene)

@app.get("/api/audit/logs")
def get_audit_logs():
    """Returns recent cryptographically signed audit trail logs."""
    return get_recent_audit_logs(limit=50)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
