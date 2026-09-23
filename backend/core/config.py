"""
config.py — Centralised application configuration loaded from .env
All configurable parameters live here. Nothing should be hardcoded elsewhere.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file if it exists (silently ok if missing — env vars are used directly)
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_FILE, override=False)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", str(BASE_DIR / "data")))

APP_NAME = os.getenv("APP_NAME", "Genomic Research Copilot")
APP_VERSION = os.getenv("APP_VERSION", "3.0.0-research")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/genom.db")

# External API timeouts (seconds)
ENSEMBL_TIMEOUT = float(os.getenv("ENSEMBL_TIMEOUT", "30"))
NCBI_TIMEOUT = float(os.getenv("NCBI_TIMEOUT", "10"))
REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "8"))

# CORS
ALLOW_ORIGINS = [o.strip() for o in os.getenv(
    "ALLOW_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")]

# Safety & Compliance Flags
SAFETY_MODE_ENABLED = os.getenv("SAFETY_MODE_ENABLED", "true").lower() == "true"
DURC_SCREENING_ENABLED = os.getenv("DURC_SCREENING_ENABLED", "true").lower() == "true"
AUDIT_LOG_ENABLED = os.getenv("AUDIT_LOG_ENABLED", "true").lower() == "true"
HUMAN_IN_THE_LOOP_REQUIRED = os.getenv("HUMAN_IN_THE_LOOP_REQUIRED", "true").lower() == "true"

# Cache TTLs (days)
CLINVAR_CACHE_TTL_DAYS = int(os.getenv("CLINVAR_CACHE_TTL_DAYS", "7"))
ENSEMBL_CACHE_TTL_DAYS = int(os.getenv("ENSEMBL_CACHE_TTL_DAYS", "30"))
PUBMED_CACHE_TTL_DAYS = int(os.getenv("PUBMED_CACHE_TTL_DAYS", "7"))

DISCLAIMER_TEXT = (
    "FOR RESEARCH PURPOSES ONLY — NOT FOR CLINICAL OR DIAGNOSTIC USE. "
    "All computational designs, efficiency estimates, and off-target risk scores are "
    "research hypotheses requiring expert peer review and rigorous wet-lab validation."
)
