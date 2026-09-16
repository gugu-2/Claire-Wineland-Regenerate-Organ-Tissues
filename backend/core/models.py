import json
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    Text,
    DateTime,
    ForeignKey
)
from sqlalchemy.orm import relationship
from core.database import Base

class SampleModel(Base):
    __tablename__ = "samples"

    sample_id = Column(String(64), primary_key=True, index=True)
    donor_id = Column(String(64), nullable=True)
    sample_type = Column(String(128), nullable=True)
    target_gene = Column(String(32), index=True)
    description = Column(Text, nullable=True)
    clinical_status = Column(String(128), nullable=True)
    consent_status = Column(String(128), nullable=True)
    alignment_reference = Column(String(32), default="GRCh38")
    sequencing_depth = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    variants = relationship("VariantModel", back_populates="sample", cascade="all, delete-orphan")

class VariantModel(Base):
    __tablename__ = "variants"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sample_id = Column(String(64), ForeignKey("samples.sample_id"), index=True)
    chromosome = Column(String(16))
    position = Column(Integer, index=True)
    ref = Column(String(128))
    alt = Column(String(128))
    variant_type = Column(String(32))
    rsid = Column(String(64), nullable=True, index=True)
    zygosity = Column(String(32), default="heterozygous")
    clinical_significance = Column(String(256), nullable=True)
    gnomad_af = Column(Float, nullable=True)

    sample = relationship("SampleModel", back_populates="variants")


# ── ONCOLOGY PHASE 1: New Tables ─────────────────────────────────────────────

class TumorSampleModel(Base):
    """
    Stores oncology-specific metadata for a tumor biopsy sample.
    Linked to a matched normal SampleModel by patient_sample_id.
    Created in Phase 1 (Somatic Cancer Foundation).
    """
    __tablename__ = "tumor_samples"

    tumor_sample_id   = Column(String(64), primary_key=True, index=True)
    patient_sample_id = Column(String(64), nullable=True, index=True)  # matched normal
    cancer_type       = Column(String(128), nullable=True)   # "NSCLC", "Breast Cancer"
    cancer_stage      = Column(String(32),  nullable=True)   # "Stage IIIB"
    biopsy_site       = Column(String(128), nullable=True)   # "Primary Tumor", "Liver Met"
    tumor_purity      = Column(Float, nullable=True)         # 0.0 – 1.0
    tmb_score         = Column(Float, nullable=True)         # mutations / megabase
    tmb_classification = Column(String(32), nullable=True)  # "TMB-High", "TMB-Low"
    msi_status        = Column(String(16),  nullable=True)   # "MSI-H", "MSS", "MSI-L"
    immunotherapy_eligible = Column(Boolean, default=False)
    viral_therapy_candidate = Column(Boolean, default=False)
    # CRITICAL SAFETY FLAG: distinguishes tumor from germline
    sample_type_flag  = Column(String(32),  default="TUMOR",  nullable=False)
    created_at        = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    somatic_mutations = relationship(
        "SomaticMutationModel", back_populates="tumor_sample",
        cascade="all, delete-orphan"
    )


class SomaticMutationModel(Base):
    """
    Stores individual somatic mutations identified by tumor-normal subtraction.
    Each record is a cancer-specific variant absent from the matched normal VCF.
    Created in Phase 1 (Somatic Cancer Foundation).
    """
    __tablename__ = "somatic_mutations"

    id                      = Column(Integer, primary_key=True, autoincrement=True)
    tumor_sample_id         = Column(String(64), ForeignKey("tumor_samples.tumor_sample_id"), index=True)
    chromosome              = Column(String(16))
    position                = Column(Integer, index=True)
    ref                     = Column(String(256))
    alt                     = Column(String(256))
    gene                    = Column(String(64), nullable=True, index=True)
    amino_acid_change       = Column(String(64), nullable=True)   # "G12D", "R175H"
    variant_allele_frequency = Column(Float, nullable=True)       # 0.0 – 1.0
    cancer_cell_fraction    = Column(Float, nullable=True)        # 0.0 – 1.0 (CCF)
    clonal_classification   = Column(String(32), nullable=True)  # TRUNCAL / SUBCLONAL / RARE
    cosmic_id               = Column(String(64), nullable=True)
    cosmic_count            = Column(Integer, nullable=True)       # # of tumors in COSMIC
    oncokb_tier             = Column(String(8), nullable=True)    # "1", "2A", "2B", "3A"
    is_oncogenic            = Column(Boolean, default=False)
    is_safe_crispr_target   = Column(Boolean, default=False)       # CCF >= 60% threshold
    known_fda_therapy       = Column(Text, nullable=True)
    crispr_strategy         = Column(Text, nullable=True)

    tumor_sample = relationship("TumorSampleModel", back_populates="somatic_mutations")


class ExpertReviewModel(Base):
    __tablename__ = "expert_reviews"

    candidate_id = Column(String(128), primary_key=True, index=True)
    sample_id = Column(String(64), index=True)
    target_gene = Column(String(32), index=True)
    reviewer_name = Column(String(128))
    reviewer_credentials = Column(String(256))
    irb_number = Column(String(64))
    decision = Column(String(64))  # EXPERT_APPROVED, APPROVED_WITH_CAVEATS, EXPERT_REJECTED
    rationale = Column(Text)
    checklist_offtarget = Column(Boolean, default=True)
    checklist_personal_snps = Column(Boolean, default=True)
    checklist_wetlab = Column(Boolean, default=True)
    reviewed_at = Column(String(64))

class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String(64), index=True)
    action = Column(String(128), index=True)
    user_id = Column(String(128))
    sample_id = Column(String(64), nullable=True, index=True)
    status = Column(String(64))
    details_json = Column(Text)
    integrity_hash = Column(String(128), unique=True, index=True)

class ApiCacheModel(Base):
    __tablename__ = "api_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    endpoint = Column(String(64), index=True)      # "clinvar", "pubmed", "ensembl"
    query_key = Column(String(256), index=True)     # rsid, search query, or coords
    response_json = Column(Text)
    cached_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, index=True)

class PatientSessionModel(Base):
    __tablename__ = "patient_sessions"

    session_id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(128), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_accessed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Store complete React application state as a JSON blob for easy re-hydration
    state_json = Column(Text, nullable=True)

class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sample_id = Column(String(64), index=True)
    role = Column(String(32)) # "user" or "assistant"
    content = Column(Text)
    citations_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
