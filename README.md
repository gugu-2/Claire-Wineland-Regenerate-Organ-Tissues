# Genomic Research Copilot — Precision Cancer Cure OS

> **FOR RESEARCH AND TESTING PURPOSES ONLY.**
> This system is intended for use by qualified researchers with appropriate institutional approvals.
> All designs, scores, and predictions are computational hypotheses requiring expert validation.

---

## What Is This?

A full-stack bioinformatics research workstation for precision cancer cure development. Inspired by:

- **Dr. Beata Halassy** — virologist who self-treated recurrent breast cancer via intratumoral oncolytic virus injection (MV + VSV, published *Vaccines* 2024)
- **CRISPR gene correction** — correcting cancer-causing mutations (BRCA2, KRAS, TP53) rather than just attacking tumors
- **Personalized mRNA cancer vaccines** — BioNTech mRNA-4157/V940 style neoantigen vaccine design

### Core Modules

| Module | What It Does |
|--------|-------------|
| **Sample Intake** | Parse VCF files, ingest tumor+normal pairs, personalized sequence building |
| **CRISPR Designer** | Real Doench RS2 Azimuth on-target scoring, CFD off-target matrix, SpCas9/SaCas9/Cas12a PAM scanning |
| **OncoCRISPR Designer** | Allele-specific guide design for KRAS G12D, BRAF V600E, EGFR L858R — two selectivity strategies |
| **OncoViral Planner** | 5 oncolytic virus chassis (T-VEC, MV, VSV, Ad5-Delta24, NDV), cytokine payload selection |
| **Wet Lab Studio** | Oligo design, AAV packaging capacity, delivery advisor (AAV2/9/PHP.B, LNP, RNP) |
| **Expert Review Gate** | 6-point oncology safety checklist, audit-trailed approval workflow |
| **Knowledge Copilot** | Live PubMed + ClinVar integration, DURC screening |

---

## Quick Start (Windows)

### Prerequisites
- Python 3.11+ (`python --version`)
- Node.js 18+ (`node --version`)
- Git

### 1. Clone & Setup

```powershell
git clone https://github.com/gugu-2/Claire-Wineland-Regenerate-Organ-Tissues.git
cd Claire-Wineland-Regenerate-Organ-Tissues
```

### 2. One-Command Start

```powershell
.\start.ps1
```

This will:
- Create `backend/.env` from `.env.example`
- Install Python dependencies from `requirements.txt`
- Run syntax checks on all modules
- Start FastAPI at `http://localhost:8000`
- Start Vite frontend at `http://localhost:5173`

### 3. Open in Browser

Navigate to **http://localhost:5173**

---

## Manual Setup

### Backend

```powershell
cd backend
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

---

## Running Tests

```powershell
cd backend
python -m pytest tests/ -v
```

Expected: **35/35 tests passing**

Run with coverage:

```powershell
python -m pytest tests/ -v --cov=modules --cov=core --cov-report=term-missing
```

---

## Architecture

```
genom/
├── backend/
│   ├── main.py                    # FastAPI app, all endpoints
│   ├── .env.example               # Environment config template
│   ├── requirements.txt           # Pinned Python dependencies
│   ├── core/
│   │   ├── config.py              # .env-based configuration
│   │   ├── database.py            # SQLite + SQLAlchemy init
│   │   ├── models.py              # ORM tables (11 tables)
│   │   └── security.py           # SHA-256 audit trail, HIPAA pseudonymization
│   ├── modules/
│   │   ├── azimuth_cfd.py         # Real Doench RS2 Azimuth 2.0 + CFD scoring
│   │   ├── crispr_designer.py     # PAM scanning, guide design, persistent off-target jobs
│   │   ├── allele_specific_designer.py  # OncoCRISPR — two selectivity strategies
│   │   ├── somatic_variant_caller.py    # Tumor/normal subtraction, CCF, clonality
│   │   ├── tumor_genomics.py      # TMB, MSI, CNV, purity estimation
│   │   ├── viral_tropism_modeler.py     # Oncolytic virus backbone selection
│   │   ├── ensembl_client.py      # Live Ensembl REST API with 30-day caching
│   │   ├── external_apis.py       # ClinVar + PubMed live with 7-day caching
│   │   ├── sample_intake.py       # VCF parsing, personalized sequence building
│   │   ├── variant_annotation.py  # ClinVar annotation, somatic hotspot DB
│   │   ├── delivery_advisor.py    # AAV/LNP/RNP delivery selection
│   │   ├── review_gate.py         # 6-point oncology expert review checklist
│   │   ├── report_generator.py    # PDF/JSON dossier generation
│   │   └── knowledge_copilot.py   # RAG + live PubMed copilot
│   └── tests/                     # 35 passing tests
│
├── frontend/src/
│   ├── App.jsx                    # 7-tab application
│   ├── components/
│   │   ├── SampleIntakeView.jsx
│   │   ├── CrisprDesignerView.jsx
│   │   ├── OncoCrisprDesignerView.jsx
│   │   ├── OncoViralPlannerView.jsx
│   │   ├── WetLabStudioView.jsx
│   │   ├── RegenerationView.jsx
│   │   ├── ResearchReportView.jsx
│   │   ├── KnowledgeCopilotView.jsx
│   │   └── Navbar.jsx
│   └── services/api.js            # All backend API calls
│
├── docs/07_oncology_expansion/     # Scientific documentation
├── project_artifacts/              # Audits, plans, roadmaps, media
├── start.ps1                       # One-command startup script
└── README.md                       # This file
```

---

## Key Scientific Implementations

### Azimuth 2.0 / Doench Rule Set 2 (Real Implementation)
- Full position-specific single-nucleotide weights (30 positions)
- Adjacent dinucleotide weights (key interaction positions)
- GC content parabolic feature
- Nearest-neighbour RNA:DNA duplex thermodynamics (ΔH + ΔS)
- Logistic sigmoid calibrated to Doench 2016 training set
- Reference: Doench et al. *Nature Biotechnology* 34, 184-191 (2016)

### CFD Off-Target Scoring
- Full Doench empirical mismatch penalty matrix (20 positions × 16 substitution types)
- Non-canonical PAM cleavage frequency weights
- Aggregate Hsu/Doench specificity score (0-100)

### Somatic Variant Analysis
- VAF → CCF formula: `CCF = VAF × 2 / purity` (diploid assumption)
- Tumor Mutational Burden: FDA threshold ≥10 mut/Mb
- MSI: indel fraction heuristic calibrated to TCGA MSI studies
- `MIN_SAFE_CRISPR_CCF = 0.60` safety threshold

### External Data (Live APIs)
- **Ensembl REST API** — gene sequences, coordinates, exon structure (30-day cache)
- **NCBI ClinVar** — clinical significance via E-utilities (7-day cache)
- **NCBI PubMed** — live literature search (7-day cache)

---

## Environment Configuration

Copy `backend/.env.example` to `backend/.env` and edit:

```ini
APP_NAME=Genomic Research Copilot
LOG_LEVEL=INFO
DATABASE_URL=sqlite:///./genom.db
ENSEMBL_TIMEOUT=30
NCBI_TIMEOUT=10
ALLOW_ORIGINS=http://localhost:5173
SAFETY_MODE_ENABLED=true
AUDIT_LOG_ENABLED=true
```

---

## Citation

If you use this system in your research, please cite:

- Doench JG, Fusi N, et al. *Optimized sgRNA design to maximize activity and minimize off-target effects of CRISPR-Cas9.* Nature Biotechnology 34, 184-191 (2016)
- Halassy B, et al. *Self-treatment of recurrent malignant melanoma with oncolytic viruses: a case report.* Vaccines 12, 975 (2024)
