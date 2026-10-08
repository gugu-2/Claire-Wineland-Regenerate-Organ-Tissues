# ARCHITECTURE.md — Full System Architecture

> **Genomic Research Copilot — Precision Cancer Research OS**
> Version 2.4 | October 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Full Stack Diagram](#2-full-stack-diagram)
3. [Backend Architecture](#3-backend-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Data Flow Maps](#5-data-flow-maps)
6. [Module Dependency Graph](#6-module-dependency-graph)
7. [Database Schema](#7-database-schema)
8. [API Contract](#8-api-contract)
9. [External Integrations](#9-external-integrations)
10. [Where the System Ends Today](#10-where-the-system-ends-today)

---

## 1. System Overview

The platform is a **monolithic-but-modular** research application. It is intentionally NOT microservices — a single researcher running it on their laptop needs everything to just work, instantly.

```
┌────────────────────────────────────────────────────────────────────┐
│                      RESEARCHER'S BROWSER                          │
│                    React 18 + Vite + Tailwind                      │
│      8 tabs, 11 component views, live API calls, no refresh        │
└──────────────────────────┬─────────────────────────────────────────┘
                           │ HTTP (localhost:5173 → localhost:8000)
                           │ JSON REST via /api/* and /aart/*
┌──────────────────────────▼─────────────────────────────────────────┐
│                    FASTAPI BACKEND (main.py)                        │
│               ~860 lines | 38 endpoints | Python 3.13              │
│    Pydantic request/response models | CORS | background tasks       │
└──────┬────────────┬────────────┬─────────────┬──────────┬──────────┘
       │            │            │              │          │
   ┌───▼───┐   ┌────▼───┐  ┌────▼────┐  ┌─────▼───┐ ┌───▼──────┐
   │ CRISPR│   │ONCOLOGY│  │  VIRAL  │  │   ART   │ │KNOWLEDGE │
   │ENGINE │   │ ENGINE │  │ PLANNER │  │ RESEARCH│ │ COPILOT  │
   └───┬───┘   └────┬───┘  └────┬────┘  └─────┬───┘ └───┬──────┘
       │            │            │              │          │
   ┌───▼────────────▼────────────▼──────────────▼──────────▼──────┐
   │                    SQLITE DATABASE (research.db)               │
   │              12 tables | SQLAlchemy | persistent jobs          │
   └────────────────────────────────────────────────────────────────┘
                           │
              ┌────────────▼─────────────┐
              │     EXTERNAL APIS        │
              │  Ensembl REST (30d cache)│
              │  NCBI ClinVar (7d cache) │
              │  NCBI PubMed (7d cache)  │
              └──────────────────────────┘
```

---

## 2. Full Stack Diagram

### Layer 1: Presentation (Frontend)

```
frontend/
├── src/
│   ├── App.jsx                    ← Root: 8-tab state machine
│   ├── services/api.js            ← All 40+ API call wrappers (one source of truth)
│   └── components/
│       ├── Navbar.jsx             ← Tab navigation + connection status badge
│       ├── SampleIntakeView.jsx   ← Tab 1: VCF upload, sample picker
│       ├── CrisprDesignerView.jsx ← Tab 2: Guide design, scoring, PE, base editing
│       ├── WetLabStudioView.jsx   ← Tab 3: Oligos, AAV, delivery, dual-guide
│       ├── RegenerationView.jsx   ← Tab 4: Reprogramming protocols
│       ├── ResearchReportView.jsx ← Tab 5: Full dossier + audit log
│       ├── OncoCrisprDesignerView.jsx ← Tab 6: Allele-specific cancer CRISPR
│       ├── OncoViralPlannerView.jsx   ← Tab 7: Oncolytic virus design
│       ├── ArtResearchView.jsx    ← Tab 8: ART enzyme system (Yoon 2026)
│       ├── KnowledgeCopilotView.jsx   ← Sliding panel: literature chat
│       ├── ExpertReviewModal.jsx  ← Modal: 6-point oncology checklist
│       └── LocusTrackViewer.jsx   ← Embedded: genomic locus visualization
```

**State management:** Pure React `useState` + `useEffect`. No Redux. Each tab owns its own state. `selectedSample` is the only truly global state, passed down as props from `App.jsx`.

**API layer:** `frontend/src/services/api.js` is a single object with ~40 async methods. Every API call goes through here. No fetch() calls in component files directly.

---

### Layer 2: API Gateway (FastAPI)

```
backend/main.py (859 lines)
├── Startup: init_db() — creates all 12 tables if they don't exist
├── CORS: allows localhost:5173
├── Pydantic Models (request/response validation)
│   ├── VcfUploadRequest, PersonalizeRequest
│   ├── CrisprDesignRequest, AllelicDesignRequest
│   ├── TumorIngestRequest, OncolyticBlueprintRequest
│   └── ART* request models (4 types)
└── Endpoint Groups:
    ├── /api/samples/*          ← Sample management
    ├── /api/variants/*         ← Variant annotation
    ├── /api/crispr/*           ← Guide design + off-target jobs
    ├── /api/oncology/*         ← Tumor analysis + allele-specific
    ├── /api/oncolytic/*        ← Viral therapy design
    ├── /api/regeneration/*     ← Stem cell protocols
    ├── /api/copilot/*          ← Knowledge chat
    ├── /api/review/*           ← Expert review workflow
    ├── /api/report/*           ← Report generation
    ├── /api/audit/*            ← SHA-256 audit trail
    └── /aart/*                 ← ART enzyme endpoints
```

---

### Layer 3: Business Logic (Modules)

19 Python modules in `backend/modules/`:

| Module | Lines | Category | Scientific Basis |
|--------|-------|----------|-----------------|
| `azimuth_cfd.py` | 389 | CRISPR scoring | Doench 2016 (Azimuth 2.0 / Rule Set 2) |
| `crispr_designer.py` | 530 | CRISPR design | SpCas9/SaCas9/Cas12a PAM models |
| `allele_specific_designer.py` | 298 | Oncology CRISPR | Allele selectivity theory |
| `aart_modeler.py` | 581 | Novel enzyme | Yoon et al. Anthropic 2026 |
| `somatic_variant_caller.py` | 389 | Oncology | VAF→CCF formula, germline subtraction |
| `tumor_genomics.py` | 400 | Oncology | FDA TMB/MSI thresholds |
| `viral_tropism_modeler.py` | 462 | Viral therapy | T-VEC/MV/VSV/Ad5/NDV chassis |
| `sample_intake.py` | 236 | Data ingestion | VCF parsing, coordinate mapping |
| `ensembl_client.py` | 79 | External API | Ensembl REST v2 |
| `external_apis.py` | 188 | External API | NCBI E-utilities |
| `variant_annotation.py` | 312 | Annotation | ClinVar + hotspot DB |
| `knowledge_copilot.py` | 165 | Knowledge | TF-IDF RAG + PubMed |
| `delivery_advisor.py` | 141 | Delivery | AAV serotype/LNP models |
| `oligo_synthesizer.py` | 114 | Wet lab | BbsI/BsmBI cloning oligos |
| `dual_guide_designer.py` | 108 | CRISPR | Paired excision design |
| `regeneration.py` | 101 | Stem cells | Yamanaka/BAM protocols |
| `report_generator.py` | 181 | Reporting | JSON + HTML dossier |
| `review_gate.py` | 201 | Governance | 6-point oncology checklist |
| `cohort_analyzer.py` | 79 | Analytics | Multi-sample comparison |

---

### Layer 4: Data (SQLite)

```
backend/research.db (auto-created at startup)
├── samples               ← Core sample metadata
├── variants              ← Genomic variants per sample
├── tumor_samples         ← Tumor/normal pairs
├── somatic_mutations     ← Confirmed somatic calls
├── expert_reviews        ← Review records
├── audit_logs            ← SHA-256 integrity chain
├── api_cache             ← Persistent HTTP cache
├── patient_sessions      ← Session tracking
├── chat_messages         ← Copilot chat history
├── offtarget_scans       ← Background job store
├── viral_blueprints      ← Oncolytic therapy designs
└── neoantigen_predictions ← Peptide predictions
```

---

## 3. Backend Architecture

### 3.1 Request Lifecycle

```
Browser Request
    │
    ▼
FastAPI main.py
    │ Pydantic validation
    ▼
Module function call
    │ Business logic
    ├── External API? → check api_cache table first
    │                    → if miss: HTTP request → store in cache
    │
    ├── Database needed? → SQLAlchemy session → SQLite
    │
    └── Scoring needed? → azimuth_cfd.py (pure Python, no external deps)
    │
    ▼
JSON response → Pydantic model serialization → Browser
    │
    ▼
Audit log: record_audit_event() → SHA-256 hash → audit_logs table
```

### 3.2 Background Job Pattern (Off-target Scanning)

```
POST /api/crispr/off-target-scan
    │
    ├── Creates job_id (UUID)
    ├── Inserts OffTargetScanModel (status=PENDING) into SQLite
    ├── Launches BackgroundTasks task → run_cas_offinder_background()
    └── Returns { job_id } immediately

Background task:
    ├── Updates status=RUNNING
    ├── Runs scanning logic (simulated for now)
    └── Updates status=COMPLETED, stores results

GET /api/crispr/off-target-scan/{job_id}
    └── Returns current job status + results from SQLite
```

This pattern is **production-ready** — jobs survive server restarts because they live in SQLite.

### 3.3 Caching Architecture

```
External API call pattern:
    ├── get_cached_response(endpoint, query_key)
    │       └── Checks api_cache table for non-expired entry
    │           └── Returns cached data if TTL not exceeded
    │
    └── If cache miss:
        ├── Make HTTP request to external service
        ├── set_cached_response(endpoint, query_key, data, ttl_days)
        └── Return fresh data

Cache TTLs:
    Ensembl gene data:     30 days (genomic coordinates rarely change)
    ClinVar annotation:     7 days (clinical data updated regularly)
    PubMed literature:      7 days (new papers published weekly)
```

---

## 4. Frontend Architecture

### 4.1 Tab State Machine

`App.jsx` manages a single `activeTab` string. Each tab is rendered with a conditional block:

```jsx
{activeTab === 'sample' && <SampleIntakeView ... />}
{activeTab === 'crispr' && <CrisprDesignerView ... />}
...
{activeTab === 'art-research' && <ArtResearchView />}
```

**Tabs and their IDs:**

| ID | Component | Purpose |
|----|-----------|---------|
| `sample` | `SampleIntakeView` | Load patient data |
| `crispr` | `CrisprDesignerView` | Design guides |
| `wetlab` | `WetLabStudioView` | Wet lab tools |
| `regeneration` | `RegenerationView` | Stem cell work |
| `report` | `ResearchReportView` | Export/audit |
| `onco-crispr` | `OncoCrisprDesignerView` | Cancer CRISPR |
| `onco-viral` | `OncoViralPlannerView` | Oncolytic viruses |
| `art-research` | `ArtResearchView` | ART enzyme (NEW) |

### 4.2 Data Flow: Global State

Only two pieces of state cross component boundaries:

1. `selectedSample` — the active research sample (passed from App → all tabs)
2. `activeTab` — which tab is shown (managed in App, passed to Navbar)

Everything else is local state inside each component. This keeps things simple and debuggable.

### 4.3 API Service Layer

`frontend/src/services/api.js` exports a single `api` object:

```javascript
api.getStatus()                    // Backend health
api.uploadVcf(payload)             // Sample intake
api.designCrispr(payload)          // CRISPR guide design
api.artScanArray(sequence)         // ART array detection
...  // 40+ methods total
```

All methods:
- Return JSON directly (no wrapper)
- Do not throw — caller handles `.error` fields
- Use `fetch()` with `Content-Type: application/json`
- Hit `/api/*` (proxied by Vite in dev to localhost:8000)

---

## 5. Data Flow Maps

### 5.1 Patient → CRISPR Design

```
User uploads VCF file (or picks benchmark sample)
    │
    ▼
SampleIntakeView → api.uploadVcf()
    │
    ▼
backend: parse_vcf_content() → list of variants
    │
    ▼
api.personalizeSequence(gene, variants)
    │
    ▼
backend: build_personalized_sequence()
    ├── fetch_gene_data_ensembl(gene) [from Ensembl REST, cached 30d]
    ├── map genomic variants to sequence offsets
    └── apply substitutions/indels to reference → personalized_sequence
    │
    ▼
CrisprDesignerView ← selectedSample (with personalized_sequence)
    │
    ▼
api.designCrispr(target_gene, reference_seq, personalized_seq, variants, pam_type)
    │
    ▼
backend: scan_candidate_guides()
    ├── Check curated guide bank (CCR5, HBB, BRCA2, KRAS pre-validated)
    ├── Scan reference_seq with PAM regex → additional guide candidates
    ├── For each guide: score_azimuth_on_target() → efficiency + CI
    ├── Compute CFD specificity (3 simulated off-targets)
    ├── evaluate_base_editing_window() → CBE/ABE
    └── Design pegRNA: PBS + RTT from nick-site
    │
    ▼
Frontend: Guide table (sorted by efficiency)
    ├── Locus track viewer (position visualization)
    ├── Off-target scan button → background job
    └── Expert review request → ExpertReviewModal
```

### 5.2 Tumor → Oncolytic Therapy

```
User uploads tumor VCF + normal VCF
    │
    ▼
backend: parse_vcf_to_variant_dict() [both files]
    │
    ▼
subtract_germline(tumor, normal) → somatic variants only
    │
    ▼
call_somatic_variants() → CCF estimation, clonality, hotspot lookup
    │
    ▼
generate_tumor_genomics_summary()
    ├── calculate_tmb() → FDA immunotherapy threshold
    ├── detect_msi_status() → MLH1/MSH2/MSH6/PMS2 heuristic
    ├── summarize_cnv_landscape() → oncogene amp, TSG deletion
    └── calculate_tumor_purity_estimate() → VAF mode heuristic
    │
    ▼
OncoViralPlannerView ← tumor profile
    │
    ▼
api.recommendViralChassis(tumor_type, tmb, msi, cnv)
    │
    ▼
recommend_viral_chassis()
    ├── Score each chassis against tumor receptor expression
    ├── Apply TMB bonus (high TMB → T cell inflamed → MV/NDV better)
    ├── Apply MSI flag (MSI-H → better immune activation)
    └── Rank: HSV-1, MV, VSV, Ad5, NDV
    │
    ▼
design_viral_blueprint() → Golden Gate assembly plan + payload selection
```

---

## 6. Module Dependency Graph

```
main.py
├── core.config
├── core.security
├── core.database
└── modules:
    ├── sample_intake
    │   └── ensembl_client
    ├── variant_annotation
    │   └── external_apis
    ├── crispr_designer
    │   ├── azimuth_cfd          ← pure, no deps
    │   └── ensembl_client
    ├── allele_specific_designer
    │   └── azimuth_cfd
    ├── dual_guide_designer
    │   └── azimuth_cfd
    ├── somatic_variant_caller   ← pure, no deps
    ├── tumor_genomics           ← pure, no deps
    ├── viral_tropism_modeler    ← pure, no deps
    ├── delivery_advisor         ← pure, no deps
    ├── oligo_synthesizer        ← pure, no deps
    ├── cohort_analyzer
    │   └── tumor_genomics
    ├── regeneration             ← pure, no deps
    ├── knowledge_copilot
    │   └── external_apis
    ├── review_gate              ← pure, no deps
    ├── report_generator         ← pure, no deps
    └── aart_modeler             ← pure, no deps
```

**Key insight:** Most modules have no cross-dependencies. This makes them independently testable and replaceable.

---

## 7. Database Schema

```sql
CREATE TABLE samples (
    id INTEGER PRIMARY KEY,
    sample_id TEXT UNIQUE NOT NULL,
    donor_id TEXT,
    sample_type TEXT,
    target_gene TEXT,
    description TEXT,
    vcf_content TEXT,
    personalized_sequence TEXT,
    reference_sequence TEXT,
    variants TEXT,          -- JSON serialized
    consent_status TEXT,
    alignment_reference TEXT DEFAULT 'GRCh38',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY,
    event_id TEXT UNIQUE NOT NULL,
    action TEXT NOT NULL,
    user_hash TEXT,         -- HIPAA pseudonymized
    sample_hash TEXT,       -- HIPAA pseudonymized
    details TEXT,           -- JSON
    sha256_hash TEXT,       -- SHA-256 of entire record
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE offtarget_scans (
    id INTEGER PRIMARY KEY,
    job_id TEXT UNIQUE NOT NULL,
    status TEXT,            -- PENDING | RUNNING | COMPLETED | FAILED
    progress INTEGER DEFAULT 0,
    candidate_count INTEGER,
    results TEXT,           -- JSON
    error_message TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

-- [+ 9 more tables: variants, tumor_samples, somatic_mutations,
--   expert_reviews, api_cache, patient_sessions, chat_messages,
--   viral_blueprints, neoantigen_predictions]
```

---

## 8. API Contract

All endpoints follow a consistent pattern:

**Request:** JSON body with Pydantic-validated fields  
**Response:** JSON with data + optional `error` field  
**Errors:** HTTP 400 (validation), 404 (not found), 500 (internal)

**Full endpoint list:**

```
GET  /api/status                           Health check + system info
GET  /api/samples                          List all samples
GET  /api/genes                            List reference genes
POST /api/samples/upload-vcf               Parse and store VCF
POST /api/samples/personalize             Build personalized sequence
POST /api/variants/annotate               ClinVar + hotspot annotation
POST /api/crispr/design                    Design sgRNA guides
POST /api/crispr/off-target-scan           Launch off-target job
GET  /api/crispr/off-target-scan/{id}      Poll job status
POST /api/crispr/oligo-order               Generate cloning oligos
POST /api/crispr/allele-specific-design    OncoCRISPR allele design
POST /api/crispr/dual-guide                Dual guide excision
POST /api/delivery/recommend               AAV/LNP delivery strategy
POST /api/regeneration/evaluate            Cocktail risk scoring
GET  /api/regeneration/protocols           All stem cell protocols
POST /api/copilot/chat                     Knowledge copilot query
GET  /api/copilot/history/{sample_id}      Conversation history
GET  /api/knowledge-graph                  Full knowledge graph
POST /api/oncology/tumor-normal-ingest     Upload tumor+normal VCFs
GET  /api/oncology/tumor-mutational-burden/{id}  TMB calculation
POST /api/oncolytic/recommend-chassis      Virus chassis scoring
POST /api/oncolytic/design-blueprint       Full viral blueprint
GET  /api/oncolytic/viral-database         All chassis data
POST /api/review/submit                    Submit expert review
GET  /api/review/{candidate_id}            Get review status
GET  /api/reviews                          All reviews
POST /api/report/generate                  Generate research dossier
POST /api/sessions                         Create session
GET  /api/sessions/{id}                    Get session
GET  /api/literature/search                PubMed search
GET  /api/cohort/comparison                Multi-sample matrix
GET  /api/audit/logs                       Audit trail
GET  /aart/reference                       ART knowledge base
POST /aart/scan-array                      ART repeat detection
POST /aart/predict-rna-structure           ART RNA hairpin
POST /aart/analyze-locus                   ART locus classification
POST /aart/therapeutic-potential           ART therapeutic eval
```

---

## 9. External Integrations

| Service | Endpoint | What We Use It For | Cache TTL | Fallback |
|---------|----------|-------------------|-----------|---------|
| Ensembl REST v2 | `rest.ensembl.org` | Gene sequences, coordinates, exon structure | 30 days | Static gene bank (CCR5, HBB, BRCA2, KRAS) |
| NCBI E-utilities | `eutils.ncbi.nlm.nih.gov` | ClinVar variant significance | 7 days | Known pathogenicity table |
| NCBI PubMed | `eutils.ncbi.nlm.nih.gov` | Literature retrieval | 7 days | Local knowledge graph |

All external calls are wrapped in `try/except` with graceful degradation.

---

## 10. Where the System Ends Today

The platform is real and functional, but there are intentional limits:

| Capability | Current State | What's Needed Next |
|-----------|--------------|-------------------|
| Off-target scanning | Simulated 3 variants | Real genome-wide scan via Cas-OFFinder / CRISPOR |
| Knowledge copilot synthesis | Rule-based RAG | LLM integration (Gemini/GPT-4) for natural language synthesis |
| MSI detection | Heuristic (indel rate) | MANTIS / MSIsensor statistical model |
| Tumor purity | VAF mode heuristic | PURPLE / FACETS copy-number aware purity |
| Neoantigen prediction | Table stored, no computation | NetMHCpan / pVACseq integration |
| 3D molecular visualization | Not yet built | **PLAYGROUND** — next major milestone |
| Real-time simulation | Not yet built | **PLAYGROUND** — next major milestone |

See `PROBLEMS_AND_FIXES.md` for specific issues and `ROADMAP.md` for what to build next.

---

*Architecture document — Genomic Research Copilot v2.4 — October 2026*
