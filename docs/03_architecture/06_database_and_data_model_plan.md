# Database and Data Model Plan
### Current Schema, Gaps, and Proposed Improvements

---

## Current Database: `backend/genom.db` (SQLite)

### Existing Tables

#### `samples`
Not a database table — benchmark samples are loaded from `data/benchmark_samples.json` at runtime. There is no persistent sample storage; session state lives only in React component state.

#### `variants`
Defined in `core/models.py` but **not used by any current route**. `POST /api/variants/annotate` runs in-memory annotation without database persistence.

#### `expert_reviews`
✅ Working. Stores expert review decisions keyed by `candidate_id`. Fields: `candidate_id`, `target_gene`, `sample_id`, `reviewer_name`, `reviewer_credentials`, `irb_number`, `decision`, `rationale`, plus 3 boolean checklist fields, `created_at`.

#### `audit_logs`
✅ Working. SHA-256 chained entries. Fields: `id`, `timestamp`, `action`, `user_id`, `sample_id`, `details_json`, `prev_hash`, `entry_hash`. Good implementation.

#### `api_cache`
✅ Working. Stores NCBI ClinVar and PubMed responses. Fields: `endpoint`, `query_key`, `response_json`, `cached_at`, `expires_at`. 7-day TTL with auto-invalidation.

---

## Gap 1 — Session State Is Not Persisted

**Problem:** The entire application session (which sample is selected, which variants were uploaded, what guides were designed) lives in React component state. If the user refreshes the browser, everything is lost. There is no way to resume a previous session.

**Proposed Table: `patient_sessions`**

```sql
CREATE TABLE patient_sessions (
    id              TEXT PRIMARY KEY,           -- UUID
    created_at      DATETIME NOT NULL,
    updated_at      DATETIME NOT NULL,
    sample_id       TEXT,                       -- "Custom-Upload" or benchmark ID
    gene_symbol     TEXT,                       -- "CCR5", "HBB", etc.
    vcf_content     TEXT,                       -- raw uploaded VCF text
    parsed_variants TEXT,                       -- JSON array
    personalized_seq TEXT,                      -- reconstituted sequence
    candidate_guides TEXT,                      -- JSON array of scored guides
    selected_guide_id TEXT,                     -- guide transferred to wet-lab
    regen_factors   TEXT,                       -- JSON array of selected factors
    report_generated BOOLEAN DEFAULT FALSE,
    status          TEXT DEFAULT 'ACTIVE'       -- ACTIVE / COMPLETED / ARCHIVED
);
```

**How sessions would work:**
- On first API call, backend generates a session ID
- Frontend stores session ID in `localStorage`
- On reload, frontend sends session ID → backend loads state
- New endpoint: `GET /api/session/{session_id}` and `PUT /api/session/{session_id}`

---

## Gap 2 — Background Job Status Not Tracked

**Problem:** When Cas-OFFinder is added (off-target genome scan), jobs will take 30-120 seconds. The current synchronous API pattern cannot support this.

**Proposed Table: `background_jobs`**

```sql
CREATE TABLE background_jobs (
    job_id          TEXT PRIMARY KEY,           -- UUID
    job_type        TEXT NOT NULL,              -- 'offtarget_scan', 'ensembl_fetch', 'report_pdf'
    session_id      TEXT,                       -- FK to patient_sessions
    status          TEXT DEFAULT 'QUEUED',      -- QUEUED / RUNNING / COMPLETE / FAILED
    progress_pct    INTEGER DEFAULT 0,          -- 0-100
    submitted_at    DATETIME,
    started_at      DATETIME,
    completed_at    DATETIME,
    result_json     TEXT,                       -- final result payload
    error_message   TEXT                        -- if FAILED
);
```

---

## Gap 3 — Chat History Not Persisted

**Problem:** Knowledge Copilot chat messages are lost on page refresh.

**Proposed Table: `chat_messages`**

```sql
CREATE TABLE chat_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT NOT NULL,
    role            TEXT NOT NULL,              -- 'user' / 'assistant'
    content         TEXT NOT NULL,
    citations_json  TEXT,                       -- JSON array of citations
    created_at      DATETIME NOT NULL
);

CREATE INDEX idx_chat_session ON chat_messages(session_id, created_at);
```

---

## Gap 4 — No Vector Store for RAG Embeddings

**Problem:** When real embedding-based RAG is added (Feature 3.1 in the features roadmap), we need a place to store document embeddings.

### Option A — SQLite with `sqlite-vss` extension

- Adds vector similarity search to SQLite
- No external server required
- Supports up to ~100K vectors efficiently
- Install: `pip install sqlite-vss`

```sql
CREATE VIRTUAL TABLE document_embeddings USING vss0(
    embedding(384)     -- dimensions for all-MiniLM-L6-v2
);
```

### Option B — FAISS in-memory index (saved to .faiss file)

- Pure Python, no SQL
- Faster for pure similarity search
- Index file stored next to `genom.db`
- Load at startup, save after updates

**Recommendation:** Start with FAISS (simpler), migrate to pgvector when moving to PostgreSQL.

---

## Gap 5 — `reference_genes.json` Is a Bottleneck

**Problem:** Currently all reference gene data lives in a JSON file with manually curated short sequences (< 1000 bp per gene). This cannot support:
- Scanning full gene loci (CCR5 is ~7,000 bp including introns)
- Custom/novel genes
- Intronic guide designs
- Promoter-targeting guides

**Proposed: Gene Sequence Cache Table**

```sql
CREATE TABLE gene_sequence_cache (
    gene_symbol     TEXT NOT NULL,
    assembly        TEXT NOT NULL DEFAULT 'hg38',   -- genome assembly
    chromosome      TEXT NOT NULL,
    start_pos       INTEGER NOT NULL,
    end_pos         INTEGER NOT NULL,
    strand          TEXT,                            -- '+' or '-'
    sequence        TEXT NOT NULL,                   -- full genomic sequence
    exons_json      TEXT,                            -- exon boundary array
    fetched_at      DATETIME NOT NULL,
    source          TEXT DEFAULT 'Ensembl REST API',
    PRIMARY KEY (gene_symbol, assembly)
);
```

On first request for a gene, fetch from Ensembl → cache here. Subsequent requests served from cache (no API call needed).

---

## Data Model Current → Target State

```
Current:
  expert_reviews ✅ (keep as-is)
  audit_logs ✅ (keep as-is)  
  api_cache ✅ (keep as-is)
  variants ⚠️ (defined but unused → use or remove)

Add (Phase 1 - local use):
  patient_sessions  (session persistence)
  chat_messages     (copilot history)
  background_jobs   (async task tracking)
  gene_sequence_cache (Ensembl cache)

Add (Phase 2 - multi-user):
  users             (authentication)
  research_projects (group samples by project)
  
Add (Phase 3 - production):
  Migrate to PostgreSQL
  Add pgvector for embeddings
  Add S3/blob storage for large sequence files
```

---

## Migration Strategy (SQLite → PostgreSQL, when ready)

1. Export current SQLite data: `sqlite3 genom.db .dump > backup.sql`
2. Use `alembic` for migrations (already compatible with SQLAlchemy 2.0)
3. Update `DATABASE_URL` in `.env`
4. For vector columns: install `pgvector` extension, convert BLOB → VECTOR type

**Timeline:** This migration is not needed until 5+ concurrent users.

---

## Data Retention and GDPR Considerations

If this tool is ever used with real patient data (as opposed to synthetic benchmark data):

- VCF files contain uniquely identifying genomic information — they are "personal data" under GDPR and HIPAA
- `patient_sessions.vcf_content` should be encrypted at rest (SQLCipher for SQLite, or application-level AES-256)
- Retention period should be defined and enforced (e.g., auto-delete after 90 days)
- Audit logs must be tamper-evident (already implemented with SHA-256 chaining — good)
- Right to erasure: add `DELETE /api/session/{id}` endpoint that purges all associated data

**Current status:** The tool uses only synthetic benchmark data. GDPR compliance is not immediately needed but should be designed for.
