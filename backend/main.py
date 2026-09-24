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
from modules.aart_modeler import (
    scan_for_art_repeat_arrays,
    predict_art_repeat_rna_structure,
    analyze_genomic_locus_for_art,
    evaluate_art_therapeutic_potential,
    ART_VS_CRISPR_COMPARISON,
    ART_PARTNER_TYPES,
    ART_RT_FEATURES,
)

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
    # Phase 1: Oncology extended checklist
    checklist_tumor_normal_completed: Optional[bool] = False
    checklist_clonal_fraction_assessed: Optional[bool] = False
    checklist_cnv_impact_evaluated: Optional[bool] = False
    sample_type_flag: Optional[str] = "GERMLINE"

class ReportGenerateRequest(BaseModel):
    sample_info: Dict[str, Any]
    personal_sequence_data: Dict[str, Any]
    candidate_guides: List[Dict[str, Any]]
    expert_review: Optional[Dict[str, Any]] = None
    regeneration_data: Optional[Dict[str, Any]] = None
    citations: Optional[List[Dict[str, Any]]] = None

# ── ONCOLOGY PHASE 1: Request Models ─────────────────────────────────────────

class TumorNormalIngestRequest(BaseModel):
    """
    Request model for tumor-normal paired VCF ingestion.
    Both VCFs are required — the normal VCF is used to subtract germline variants,
    leaving only cancer-specific somatic mutations for CRISPR design.
    """
    patient_id: str
    cancer_type: str                          # e.g. "NSCLC", "Breast Cancer", "GBM"
    cancer_stage: Optional[str] = "Unknown"  # e.g. "Stage IIIB"
    biopsy_site: Optional[str] = "Primary Tumor"
    tumor_vcf_content: str                   # Raw VCF text from biopsy sequencing
    normal_vcf_content: str                  # Raw VCF text from matched blood sample
    tumor_purity: Optional[float] = 0.80    # Estimated fraction of cells that are cancer
    sequencing_panel_mb: Optional[float] = 30.0  # Panel size for TMB calculation

# ── End Phase 1 Pydantic models ───────────────────────────────────────────────

# ── ONCOLOGY PHASE 2: Request Models ─────────────────────────────────────────

class AlleleSpecificDesignRequest(BaseModel):
    """Phase 2: Allele-specific OncoCRISPR guide design."""
    tumor_sample_id: str
    target_mutation_name: str          # e.g. "KRAS G12D"
    target_gene: str                   # e.g. "KRAS"
    tumor_sequence: str                # 200+ bp window around mutation
    wildtype_sequence: str             # Matched normal sequence same window
    pam_type: Optional[str] = "SpCas9_NGG"
    max_guides: Optional[int] = 5

# ── ONCOLOGY PHASE 3: Request Models ─────────────────────────────────────────

class ViralChassisRequest(BaseModel):
    """Phase 3: Oncolytic virus chassis recommendation."""
    cancer_type: str
    tmb_classification: Optional[str] = "TMB-Low"
    msi_status: Optional[str] = "MSS"
    immune_status: Optional[str] = "Immunocompetent"
    biopsy_site: Optional[str] = "Primary Tumor"

class ViralBlueprintRequest(BaseModel):
    """Phase 3: Full oncolytic virus engineering blueprint."""
    virus_id: str                      # e.g. "HSV1_T-VEC_family"
    cancer_type: str
    cytokine_payload: Optional[str] = "GM-CSF"
    promoter: Optional[str] = "TERT_promoter"

# ── End Phase 2/3 Pydantic models ─────────────────────────────────────────────

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


# =============================================================================
# ONCOLOGY PHASE 1 ENDPOINTS
# =============================================================================

@app.post("/api/oncology/tumor-normal-ingest")
def ingest_tumor_normal_pair(req: TumorNormalIngestRequest, background_tasks: BackgroundTasks):
    """
    ONCOLOGY PHASE 1 - Tumor-Normal Paired VCF Ingestion

    Accepts a paired tumor biopsy VCF + matched normal (blood) VCF.
    Performs:
    1. Tumor-normal subtraction (isolates somatic-only mutations)
    2. VAF calculation and clonal fraction (CCF) estimation
    3. COSMIC / OncoKB hotspot annotation
    4. TMB, MSI status, and CNV landscape calculation
    5. Immunotherapy and oncolytic virus candidacy assessment

    Returns a complete somatic cancer profile ready for OncoCRISPR design.

    SAFETY: Only TRUNCAL mutations (CCF >= 60%) are flagged as safe CRISPR targets.
    """
    from modules.somatic_variant_caller import call_somatic_variants, enrich_with_hotspot_annotations
    from modules.tumor_genomics import generate_tumor_genomics_summary
    from modules.variant_annotation import annotate_somatic_variants

    # DURC screen
    durc_flagged, durc_reason = screen_durc_risk(req.tumor_vcf_content)
    if durc_flagged:
        raise HTTPException(status_code=403, detail=durc_reason)

    tumor_sample_id = f"{req.patient_id}_TUMOR_{req.cancer_type.replace(' ', '_').upper()}"

    # Step 1: Somatic variant calling (tumor-normal subtraction)
    somatic_variants, somatic_summary = call_somatic_variants(
        tumor_vcf_content=req.tumor_vcf_content,
        normal_vcf_content=req.normal_vcf_content,
        tumor_purity=req.tumor_purity or 0.80,
    )

    # Step 2: Enrich with hotspot annotations
    somatic_variants = enrich_with_hotspot_annotations(somatic_variants)

    # Step 3: Deep somatic annotation (COSMIC/OncoKB from curated DB)
    annotated_variants = annotate_somatic_variants(somatic_variants)

    # Step 4: Tumor genomic biomarkers (TMB, MSI, CNV, purity)
    genomics_summary = generate_tumor_genomics_summary(
        somatic_variants=somatic_variants,
        cancer_type=req.cancer_type,
        sequencing_panel_mb=req.sequencing_panel_mb or 30.0,
    )

    # Step 5: Persist TumorSample to database
    db = None
    try:
        from core.database import SessionLocal as _SL
        from core.models import TumorSampleModel
        db = _SL()
        tumor_rec = TumorSampleModel(
            tumor_sample_id=tumor_sample_id,
            patient_sample_id=req.patient_id,
            cancer_type=req.cancer_type,
            cancer_stage=req.cancer_stage,
            biopsy_site=req.biopsy_site,
            tumor_purity=genomics_summary["tumor_purity_estimate"]["estimated_purity"],
            tmb_score=genomics_summary["tumor_mutational_burden"]["tmb_score"],
            tmb_classification=genomics_summary["tumor_mutational_burden"]["tmb_classification"],
            msi_status=genomics_summary["microsatellite_instability"]["msi_status"],
            immunotherapy_eligible=genomics_summary["immunotherapy_eligible"],
            viral_therapy_candidate=genomics_summary["oncolytic_virus_candidate"],
            sample_type_flag="TUMOR",
        )
        db.merge(tumor_rec)
        db.commit()
    except Exception:
        if db:
            db.rollback()
    finally:
        if db:
            db.close()

    # Step 6: Audit log
    background_tasks.add_task(
        record_audit_event,
        action="ONCOLOGY_TUMOR_NORMAL_INGEST",
        user_id=req.patient_id,
        details={
            "cancer_type": req.cancer_type,
            "total_somatic_variants": somatic_summary["total_somatic_variants"],
            "safe_crispr_targets": somatic_summary["safe_crispr_targets"],
            "tmb_score": genomics_summary["tumor_mutational_burden"]["tmb_score"],
            "msi_status": genomics_summary["microsatellite_instability"]["msi_status"],
        },
        sample_id=tumor_sample_id,
        status="SUCCESS",
    )

    return {
        "tumor_sample_id": tumor_sample_id,
        "patient_id": req.patient_id,
        "cancer_type": req.cancer_type,
        "somatic_call_summary": somatic_summary,
        "tumor_genomics_summary": genomics_summary,
        "somatic_variants": annotated_variants,
        "oncology_mode_active": True,
        "disclaimer": (
            "ONCOLOGY RESEARCH MODE ACTIVE. Somatic variants identified by tumor-normal subtraction. "
            "Only TRUNCAL mutations (CCF >= 60%) are flagged as safe CRISPR targets. "
            "All designs require independent experimental validation in tumor cell lines AND "
            "matched normal cells before any in vivo use. IBC pre-approval mandatory."
        ),
    }


@app.get("/api/oncology/tumor-mutational-burden/{tumor_sample_id}")
def get_tumor_mutational_burden(tumor_sample_id: str):
    """
    ONCOLOGY PHASE 1 - Retrieve TMB and MSI status for a stored tumor sample.
    Returns FDA biomarker thresholds and immunotherapy eligibility flags.
    """
    from core.models import TumorSampleModel
    from core.database import SessionLocal as _SL
    db = _SL()
    try:
        rec = db.query(TumorSampleModel).filter(
            TumorSampleModel.tumor_sample_id == tumor_sample_id
        ).first()
        if not rec:
            raise HTTPException(status_code=404, detail=f"Tumor sample '{tumor_sample_id}' not found.")
        return {
            "tumor_sample_id": rec.tumor_sample_id,
            "cancer_type": rec.cancer_type,
            "tmb_score": rec.tmb_score,
            "tmb_classification": rec.tmb_classification,
            "fda_tmb_threshold": 10.0,
            "pembrolizumab_eligible": (rec.tmb_score or 0) >= 10.0,
            "msi_status": rec.msi_status,
            "immunotherapy_eligible": rec.immunotherapy_eligible,
            "oncolytic_virus_candidate": rec.viral_therapy_candidate,
            "tumor_purity": rec.tumor_purity,
            "sample_type_flag": rec.sample_type_flag,
        }
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════════
# ONCOLOGY PHASE 2 ENDPOINTS — OncoCRISPR Allele-Specific Design
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/crispr/allele-specific-design")
def design_allele_specific_guides(req: AlleleSpecificDesignRequest):
    """
    ONCOLOGY PHASE 2 — Allele-Specific CRISPR Guide Design

    Designs CRISPR guides that selectively cleave the cancer mutation allele
    (e.g., KRAS G12D) while leaving the healthy wildtype allele intact.

    Two strategies evaluated:
      1. MUTATION_CREATED_PAM  — somatic SNV creates a new NGG PAM (near-perfect selectivity)
      2. SEED_MISMATCH_ENGINEERING — SNV at seed position 14-20 reduces wildtype cleavage

    Only guides with discrimination_ratio >= 10x are returned.
    """
    from modules.allele_specific_designer import design_allele_specific_guides as _design
    result = _design(
        tumor_sequence=req.tumor_sequence,
        wildtype_sequence=req.wildtype_sequence,
        target_mutation_name=req.target_mutation_name,
        target_gene=req.target_gene,
        max_guides=req.max_guides or 5,
    )
    record_audit_event(
        action="ONCOLOGY_ALLELE_SPECIFIC_DESIGN",
        user_id="researcher",
        details={
            "target_gene": req.target_gene,
            "target_mutation": req.target_mutation_name,
            "guides_found": result.get("total_guides_found", 0),
            "guides_passing": result.get("guides_passing_safety_threshold", 0),
        },
        sample_id=req.tumor_sample_id,
        status="SUCCESS",
    )
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# ONCOLOGY PHASE 3 ENDPOINTS — OncoViral Therapy Planner
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/oncolytic/recommend-chassis")
def recommend_viral_chassis(req: ViralChassisRequest):
    """
    ONCOLOGY PHASE 3 — Oncolytic Virus Chassis Recommendation

    Recommends the top 3 oncolytic virus backbones for a patient's cancer profile.
    Ranking factors: cancer-type match, clinical evidence quality (FDA precedent),
    TMB/MSI immunological context, patient immune status, and BSL safety level.

    Includes the MV + VSV combination strategy inspired by Dr. Beata Halassy's
    self-treatment of breast cancer (published peer-reviewed case, 2024).
    """
    from modules.viral_tropism_modeler import recommend_viral_chassis as _recommend
    result = _recommend(
        cancer_type=req.cancer_type,
        tmb_classification=req.tmb_classification or "TMB-Low",
        msi_status=req.msi_status or "MSS",
        immune_status=req.immune_status or "Immunocompetent",
        biopsy_site=req.biopsy_site or "Primary Tumor",
    )
    record_audit_event(
        action="ONCOLYTIC_CHASSIS_RECOMMENDATION",
        user_id="researcher",
        details={
            "cancer_type": req.cancer_type,
            "first_choice": result.get("first_choice", {}).get("short_name"),
        },
        sample_id=None,
        status="SUCCESS",
    )
    return result


@app.post("/api/oncolytic/design-blueprint")
def design_viral_blueprint(req: ViralBlueprintRequest):
    """
    ONCOLOGY PHASE 3 — Oncolytic Virus Engineering Blueprint

    Returns a complete viral therapy engineering specification:
    - Required genomic deletions from backbone
    - Cytokine payload design (GM-CSF, IL-12, IFN-beta, NIS)
    - Tumor-specific promoter (TERT, Survivin, CEA, HER2)
    - Golden Gate assembly strategy
    - IBC pre-approval checklist
    - Delivery protocol (dosing, schedule, monitoring)

    BSL-2 containment requirements enforced for all viral therapy designs.
    """
    from modules.viral_tropism_modeler import design_viral_blueprint as _blueprint
    result = _blueprint(
        virus_id=req.virus_id,
        cancer_type=req.cancer_type,
        cytokine_payload=req.cytokine_payload or "GM-CSF",
        promoter=req.promoter or "TERT_promoter",
    )
    record_audit_event(
        action="ONCOLYTIC_BLUEPRINT_DESIGN",
        user_id="researcher",
        details={"virus_id": req.virus_id, "cancer_type": req.cancer_type},
        sample_id=None,
        status="SUCCESS",
    )
    return result


@app.get("/api/oncolytic/viral-database")
def get_viral_database():
    """
    ONCOLOGY PHASE 3 — Complete Oncolytic Virus Reference Database

    Returns all available virus backbones with metadata:
    HSV-1/T-VEC, Measles Virus (MV), VSV, Adenovirus Ad5-Delta24, Newcastle Disease Virus (NDV).
    Includes cytokine payload catalog and tumor-specific promoter catalog.
    """
    from modules.viral_tropism_modeler import (
        ONCOLYTIC_VIRUS_BACKBONES,
        CYTOKINE_PAYLOADS,
        TUMOR_SPECIFIC_PROMOTERS,
    )
    return {
        "viral_backbones": list(ONCOLYTIC_VIRUS_BACKBONES.values()),
        "cytokine_payloads": list(CYTOKINE_PAYLOADS.values()),
        "tumor_specific_promoters": list(TUMOR_SPECIFIC_PROMOTERS.values()),
        "total_backbones": len(ONCOLYTIC_VIRUS_BACKBONES),
    }



# ============================================================================
# AART (Array-Associated Reverse Transcriptase) Endpoints — Yoon et al. 2026
# ============================================================================

class ARTArrayScanRequest(BaseModel):
    sequence: str
    min_copies: Optional[int] = 3
    max_mismatches: Optional[int] = 2
    unit_size: Optional[int] = 200

class ARTLocusRequest(BaseModel):
    upstream_sequence: str
    rt_protein_sequence: Optional[str] = None
    downstream_gene_annotation: Optional[str] = None
    genome_source: Optional[str] = None

class ARTTherapeuticRequest(BaseModel):
    target_gene: str
    edit_type: Optional[str] = "insertion"
    delivery_system: Optional[str] = "lentiviral"
    cancer_context: Optional[str] = None

class ARTRNAStructureRequest(BaseModel):
    repeat_unit_dna: str


@app.post("/aart/scan-array")
def api_art_scan_array(req: ARTArrayScanRequest):
    """
    Scans a DNA sequence for ART-like tandem repeat arrays.

    ART arrays (discovered by Claude AI agents, Yoon et al. 2026) consist of
    ~200-nt units with a conserved ~16-17 nt repeat core containing an inverted
    palindrome. The array is transcribed into discrete abundant short ncRNAs
    during phage infection (up to 8% of all phage transcripts).
    """
    if len(req.sequence) < 50:
        raise HTTPException(400, "Sequence too short — ART arrays require at least 50 nt")
    if len(req.sequence) > 500_000:
        raise HTTPException(400, "Sequence too large (max 500 kb per scan)")
    return scan_for_art_repeat_arrays(
        sequence=req.sequence,
        min_copies=req.min_copies,
        max_mismatches=req.max_mismatches,
        unit_size=req.unit_size,
    )


@app.post("/aart/predict-rna-structure")
def api_art_rna_structure(req: ARTRNAStructureRequest):
    """
    Predicts whether a given ART repeat unit will form a stable RNA hairpin
    when transcribed. ART repeat cores contain inverted palindromes that form
    stem-loop structures in the processed ncRNAs (analogous to CRISPR repeat
    stem-loops and retron msr ncRNA hairpins).
    """
    if len(req.repeat_unit_dna) < 20:
        raise HTTPException(400, "Repeat unit too short (min 20 nt)")
    if len(req.repeat_unit_dna) > 500:
        raise HTTPException(400, "Repeat unit too long (max 500 nt)")
    return predict_art_repeat_rna_structure(req.repeat_unit_dna)


@app.post("/aart/analyze-locus")
def api_art_analyze_locus(req: ARTLocusRequest):
    """
    Analyzes a genomic locus to determine if it contains an ART system.

    ART hallmarks (Yoon et al. 2026):
      1. Tandem repeat array upstream of RT (most diagnostic)
      2. RT with unusually long N-terminal domain (>100 aa before YxDD motif)
      3. Dedicated partner gene downstream (GNAT Type I, helical Type II/III)
      4. Jumbo bacteriophage genomic context
    """
    if not req.upstream_sequence:
        raise HTTPException(400, "upstream_sequence is required")
    return analyze_genomic_locus_for_art(
        upstream_sequence=req.upstream_sequence,
        rt_protein_sequence=req.rt_protein_sequence,
        downstream_gene_annotation=req.downstream_gene_annotation,
        genome_source=req.genome_source,
    )


@app.post("/aart/therapeutic-potential")
def api_art_therapeutic_potential(req: ARTTherapeuticRequest):
    """
    Evaluates the speculative therapeutic potential of ART as a genome-editing tool.

    IMPORTANT: ART's function is completely unknown as of September 2026.
    All therapeutic potential assessments are RESEARCH HYPOTHESES only.
    Technology Readiness Level: TRL 1 (basic principles observed).
    """
    return evaluate_art_therapeutic_potential(
        target_gene=req.target_gene,
        edit_type=req.edit_type,
        delivery_system=req.delivery_system,
        cancer_context=req.cancer_context,
    )


@app.get("/aart/reference")
def api_art_reference():
    """
    Returns the complete ART (Array-Associated Reverse Transcriptase) knowledge base
    from Yoon et al. 2026: partner types, RT features, and CRISPR comparison.
    """
    return {
        "system_name": "Array-Associated Reverse Transcriptases (ART)",
        "discovery": {
            "paper": "Yoon PH et al. (2026) Autonomous AI agents discover reverse transcriptases with tandem repeat arrays",
            "authors": ["Peter H. Yoon", "Januka S. Athukoralage", "Emmanuel Ameisen", "Eric Kauderer-Abrams", "Nicholas T. Perry", "Matthew G. Durrant"],
            "institution": "Anthropic Life Sciences Research Group",
            "discovery_method": "Autonomous genome mining by Claude AI agents over 21.5 hours, 949 agent sessions, 215.6M tokens",
            "preprint_url": "https://www-cdn.anthropic.com/22573675ada52a8ca8a97a1a4b4326b2f208a071.pdf",
            "blog_post": "https://www.anthropic.com/news/claude-discovers-novel-enzyme-system",
            "date": "September 23, 2026",
        },
        "system_components": {
            "1_repeat_array": {
                "description": "Tandem ncDNA repeat array upstream of RT",
                "unit_size_nt": "~200",
                "repeat_core_length_nt": "16-17",
                "repeat_core_feature": "Inverted palindrome (forms RNA hairpin when transcribed)",
                "n_copies_typical": "5-14+",
                "expression": "Highly expressed during phage infection (up to 8% of phage transcripts at 15 min)",
                "processed_products": "Discrete short ncRNAs with reproducible boundaries",
            },
            "2_rt_enzyme": {
                "description": "Reverse transcriptase with unusually long N-terminal domain",
                "ntd_length_aa": "~180 (vs. <50 in most other RTs)",
                "catalytic_motif": "YxDD (retained in all 93 characterized members)",
                "phylogeny": "Sister clade to retrons",
                "structural_homologs": ["Retron Ec86 (PDB: 7V9X)", "DGR BPP-1 (PDB: 8UBE)"],
                "ntd_fold": "Unknown — no match in Foldseek structural database",
                "ntd_variability": "Highest divergence region of the family",
            },
            "3_partner_protein": {
                "description": "Dedicated partner gene directly downstream of RT",
                "types": ART_PARTNER_TYPES,
            },
        },
        "rt_features": ART_RT_FEATURES,
        "vs_crispr": ART_VS_CRISPR_COMPARISON,
        "current_status": (
            "OPEN QUESTION: The molecular function of ART is not yet known. "
            "Experiments are underway to determine: (1) whether the RT uses array ncRNAs as templates, "
            "(2) what the partner protein does biochemically, and (3) what biological process ART controls "
            "in jumbo phage infection."
        ),
        "therapeutic_outlook": (
            "TRL 1 (basic principles observed). If confirmed as a programmable RNA-directed DNA writer, "
            "ART could complement prime editing and retron-based tools. Type I partner GNAT fold may "
            "enable epigenome editing. 10-15+ year horizon for any therapeutic application."
        ),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
