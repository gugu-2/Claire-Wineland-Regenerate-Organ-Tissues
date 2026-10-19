# Architecture Improvement Plan
### Backend, Database, and Infrastructure

---

## Current Architecture Overview

```
[React Frontend : 5173]  ←→  [FastAPI : 8000]  ←→  [SQLite : genom.db]
                                    │
                               [Python Modules]
                               ├── azimuth_cfd.py        (pure math, fast)
                               ├── crispr_designer.py    (CPU-bound scan)
                               ├── external_apis.py      (I/O bound, NCBI)
                               ├── knowledge_copilot.py  (will become slow with embeddings)
                               └── ...
```

**Problems with current architecture:**
1. Everything runs synchronously on the same thread
2. A BLAST/Cas-OFFinder genome scan would freeze all other requests for 30-120 seconds
3. SQLite is single-writer — fine for local use, breaks under concurrent users
4. No background job system — long tasks block HTTP responses
5. No API versioning
6. CORS is `allow_origins=["*"]` — fine for dev, needs tightening for production

---

## Improvement 1 — Async Task Queue for Long-Running Jobs

**Problem:** When Cas-OFFinder is added, it will take 30–120 seconds to scan the genome. An HTTP endpoint cannot hold a connection that long before timing out.

**Solution: Celery + Redis task queue (or simpler: Background Tasks with FastAPI)**

### Option A — FastAPI BackgroundTasks (simple, good enough for single user)

```python
from fastapi import BackgroundTasks

@app.post("/api/crispr/offtarget-scan")
def start_offtarget_scan(req: OffTargetRequest, background_tasks: BackgroundTasks):
    job_id = uuid4().hex
    background_tasks.add_task(run_cas_offinder, req, job_id)
    return {"job_id": job_id, "status": "QUEUED"}

@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str):
    return db_get_job(job_id)  # returns QUEUED / RUNNING / COMPLETE / FAILED
```

Frontend polls `GET /api/jobs/{job_id}` every 2 seconds until complete.

**Effort:** Low — 1 day to add

### Option B — Celery + Redis (for multi-user lab use)

Full async task queue. Requires Redis server but supports multiple workers, retry logic, task history. Recommended if more than 2-3 simultaneous users.

---

## Improvement 2 — Database Schema Improvements

### Current Schema (4 tables)

```
samples          — static benchmark list only
variants         — not actually used by current routes
expert_reviews   — SQLite, working
audit_logs       — SHA-256 chained, working
api_cache        — 7-day TTL cache, working
```

### Proposed Schema Additions

```sql
-- Patient sessions (replaces in-memory state)
CREATE TABLE patient_sessions (
    id TEXT PRIMARY KEY,
    sample_id TEXT,
    gene_symbol TEXT,
    vcf_content TEXT,
    personalized_sequence TEXT,
    candidate_guides_json TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

-- Job tracking for background tasks
CREATE TABLE background_jobs (
    job_id TEXT PRIMARY KEY,
    job_type TEXT,          -- 'offtarget_scan', 'report_generate', etc.
    session_id TEXT,
    status TEXT,            -- QUEUED / RUNNING / COMPLETE / FAILED
    result_json TEXT,
    created_at DATETIME,
    completed_at DATETIME
);

-- Persistent copilot chat history
CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    role TEXT,              -- 'user' / 'assistant'
    content TEXT,
    citations_json TEXT,
    created_at DATETIME
);

-- Embedding store for RAG (if using SQLite-VSS or external FAISS)
CREATE TABLE document_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id TEXT UNIQUE,
    doc_type TEXT,          -- 'literature', 'trial', 'protocol'
    content TEXT,
    embedding BLOB,         -- numpy float32 array serialized
    metadata_json TEXT
);
```

### Recommended Database Tech Path

| Scale | Database | When |
|-------|----------|------|
| 1-5 users local | SQLite (current) | Now — fine |
| 5-50 users lab | PostgreSQL | When adding multi-user |
| 50+ users cloud | PostgreSQL + pgvector | For RAG embeddings |

---

## Improvement 3 — API Versioning

**Current:** All routes at `/api/*` with no version prefix.

**Recommended:** Move to `/api/v1/*`. This allows adding breaking changes at `/api/v2/*` without disrupting existing clients.

```python
from fastapi import APIRouter
v1 = APIRouter(prefix="/api/v1")
v1.include_router(crispr_router)
app.include_router(v1)
```

**Effort:** Very low — 30 minutes of router refactoring

---

## Improvement 4 — Authentication Layer

**Current:** Zero authentication. Any HTTP client can call any endpoint.

**Recommended progression:**

### Phase 1 — API Key (1 day)
Simple header-based API key stored in `.env`:
```python
from fastapi.security.api_key import APIKeyHeader
API_KEY_HEADER = APIKeyHeader(name="X-API-Key")
```
Frontend sends key in every request header.

### Phase 2 — JWT Sessions (1 week)
For multi-researcher environments:
- `POST /auth/login` → returns JWT
- Routes use `Depends(verify_jwt)`
- Per-user audit trail separation

### Phase 3 — Institutional SSO (future)
For hospital/university deployments: SAML/OIDC integration.

---

## Improvement 5 — Configuration Management

**Current:** A few constants in `core/config.py`.

**Recommended:** Use `python-dotenv` with a `.env` file:

```env
# .env (git-ignored)
NCBI_API_KEY=...          # increases E-utilities rate limit from 3/s to 10/s
GEMINI_API_KEY=...        # for real LLM copilot
SAFETY_MODE=true
DATA_DIR=./backend/data
DB_PATH=./backend/genom.db
MAX_CANDIDATES=10
LOG_LEVEL=INFO
```

**Why NCBI_API_KEY matters:** Without it, NCBI E-utilities rate-limits to 3 requests/second. Adding a free key allows 10/s — important when processing cohorts.

---

## Improvement 6 — Service Separation (Future)

For a production multi-user environment, consider splitting into microservices:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  API Gateway    │────>│  Core API Service │────>│  Genomics Jobs  │
│  (nginx/Caddy)  │     │  (FastAPI, auth)  │     │  (Cas-OFFinder, │
└─────────────────┘     └──────────────────┘     │   BLAST, VEP)   │
                                 │                └─────────────────┘
                        ┌────────┴────────┐
                        │   PostgreSQL    │
                        │  + pgvector     │
                        └─────────────────┘
                                 │
                        ┌────────┴────────┐
                        │  AI Copilot     │
                        │  Service        │
                        │  (Embeddings +  │
                        │   Gemini API)   │
                        └─────────────────┘
```

**This is for reference only.** The current monolith is perfectly appropriate for a research lab use-case (1-10 concurrent users).

---

## Immediate Priority Fixes (No Architecture Change Needed)

| Fix | File | Effort |
|-----|------|--------|
| Add NCBI_API_KEY to .env and use in external_apis.py | `external_apis.py` | 30 min |
| Add BackgroundTasks job tracking for slow endpoints | `main.py` | 1 day |
| Add `patient_sessions` table to persist state | `core/models.py` | 1 day |
| Add API versioning prefix `/api/v1/` | `main.py` | 30 min |
| Tighten CORS to `allow_origins=["http://localhost:5173"]` | `main.py` | 5 min |
