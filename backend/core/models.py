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
