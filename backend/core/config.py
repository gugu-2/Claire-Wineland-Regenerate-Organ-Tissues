import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

APP_NAME = "Genomic Research Copilot"
APP_VERSION = "2.4.0-preclinical"

# Safety & Compliance Flags
SAFETY_MODE_ENABLED = True
DURC_SCREENING_ENABLED = True
AUDIT_LOG_ENABLED = True
HUMAN_IN_THE_LOOP_REQUIRED = True

DISCLAIMER_TEXT = (
    "FOR RESEARCH PURPOSES ONLY — NOT FOR CLINICAL OR DIAGNOSTIC USE. "
    "All computational designs, efficiency estimates, and off-target risk scores are research hypotheses "
    "requiring expert peer review and rigorous wet-lab/clinical validation under approved IRB protocols."
)
