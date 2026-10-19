# Production Readiness Upgrade Plan
**Genomic Research Copilot — Real Researcher-Grade Implementation**
**Date:** 2026-09-23

---

## What "Production Ready" Means Here

You said: *"no fake test reports, no templates, real for researchers, no security problem, research/testing only use."*

That means:
1. Every algorithm must use **real science** — no hash() fake scores, no hardcoded numbers
2. All external data (genes, variants, papers) must come from **real live databases**
3. Test suite must run and **actually pass** with real data
4. The app must start cleanly with a **proper `.env` config**
5. Dependencies pinned in `requirements.txt` and a proper `README`

---

## The 8 Things That Need Fixing (in order)

### Area 1 — Azimuth On-Target Scoring (FAKE → REAL)

**Current:** `score_azimuth_on_target()` in `azimuth_cfd.py` uses a hand-crafted heuristic with a fixed 0.62 intercept, a few GC rules, and poly-T penalties. The docstring literally says:
> *"NOTE: This is a fast fallback heuristic. For production, integrate the true XGBoost ONNX model."*

**What we replace it with:**
- Implement the **full Doench Rule Set 2 (Azimuth 2.0) feature vector** — all 24 nucleotide position features, all 16 dinucleotide features at each position, GC content features, and thermodynamic features that match the original Azimuth paper exactly.
- The formula is fully published in Doench et al. 2016 Supplementary, so no ML library needed — it's a linear model with ~1,000 coefficients that are published.
- We encode the full 30-nt context (4nt upstream + 20nt guide + 3nt PAM + 3nt downstream) exactly like the published Azimuth input.

**Files changed:** `backend/modules/azimuth_cfd.py`

---

### Area 2 — Allele-Specific Efficiency (FAKE → REAL)

**Current:** `allele_specific_designer.py` lines 196 and 252 use:
```python
mutant_eff = 0.75 + (hash(guide_seq) % 20) / 100  # FAKE
mutant_eff = 0.70 + (hash(guide_seq) % 15) / 100  # FAKE
```
`hash()` returns different values on every Python run (Python 3.3+ hash randomization). These are not scientifically valid scores.

**What we replace them with:**
- Replace with the **real Azimuth on-target scoring** from Area 1 (call `score_azimuth_on_target()` with the real guide sequence)
- For Strategy 1 (Mutation-Created PAM): wildtype_eff stays at 0.02 (no PAM = biochemically ~0), mutant_eff = `score_azimuth_on_target(guide_seq)` — real score
- For Strategy 2 (Seed Mismatch): mutant_eff = `score_azimuth_on_target(mutant_guide)`, wildtype_eff = `score_azimuth_on_target(wildtype_guide) * (1 - seed_penalty)` — both from real scoring

**Files changed:** `backend/modules/allele_specific_designer.py`

---

### Area 3 — Prime Editing pegRNA (MOCKED → REAL)

**Current:** `crispr_designer.py` lines 235-238:
```python
# In a real tool, we'd extract from genomic context. We'll use a mocked sequence matching the nick site.
pbs_seq = reverse_complement(ref_guide[-16:-3])  # mocked
# RT template must contain the intended edit. We mock a 1nt insertion for demonstration.
rt_seq = reverse_complement(ref_guide[-3:] + "A" + "NNNNNNNNNN")  # mocked
```
The RT template contains literal `NNNNNNNNNN` — this cannot be used by a researcher.

**What we replace it with:**
- PBS (primer binding site) = reverse complement of the **3' end of the nicked strand**, length 10–16 nt, derived from the actual reference sequence at the nick point
- RT template = the desired edit sequence + homology arm, derived from the actual genomic context
- Add a `prime_editing_config` input parameter so the researcher can specify the intended edit (SNV, insertion, deletion)
- Calculate **DeepPrime-like efficiency** using the published pegRNA thermodynamic rules (PBS melting temperature, RT template GC content, RTT length optimality at 10-25 nt)

**Files changed:** `backend/modules/crispr_designer.py`

---

### Area 4 — Off-Target Job Store (IN-MEMORY → PERSISTENT)

**Current:** `crispr_designer.py` line 391-392:
```python
# In production, this would be Redis/Celery or a DB table.
OFF_TARGET_JOBS = {}  # plain Python dict, lost on restart
```

**What we replace it with:**
- Store off-target scan jobs in **SQLite via SQLAlchemy** (same DB already in use)
- Add a new table `OffTargetScanModel` to `models.py`
- Use FastAPI `BackgroundTasks` properly (already used elsewhere in `main.py`)
- Job status queryable via `GET /api/offtarget-scan/{job_id}`

**Files changed:** `backend/core/models.py`, `backend/modules/crispr_designer.py`, `backend/main.py`

---

### Area 5 — Real Test Suite (TEMPLATE → ACTUALLY RUNNING)

**Current state:** 7 test files exist. We need to verify they actually RUN and PASS with the live system. Additionally some tests need to be made integration tests (calling the real Ensembl API) rather than pure unit tests.

**What we build:**
- A `conftest.py` with proper pytest fixtures (test DB session, mock API calls where needed)
- Integration tests that call Ensembl API and assert real gene data comes back for CCR5, HBB
- Unit tests for all 8 backend modules with >80% coverage
- A single `pytest` command that runs everything and shows pass/fail

**Files changed/created:**
- `backend/tests/conftest.py` (NEW)
- `backend/tests/test_integration_ensembl.py` (NEW)
- `backend/tests/test_integration_apis.py` (NEW)
- All 7 existing test files verified and any failing tests fixed

---

### Area 6 — Configuration & Environment (HARDCODED → .env)

**Current state:** No `.env` file, no `python-dotenv` usage, API timeouts hardcoded, no configuration management.

**What we build:**
- `.env` file with all configurable parameters
- `backend/core/config.py` updated to load from `.env`
- `.env.example` checked into git (never the real `.env`)

```ini
# .env.example
APP_NAME=Genomic Research Copilot
DATA_DIR=./data
DATABASE_URL=sqlite:///./genom.db
ENSEMBL_TIMEOUT=30
NCBI_TIMEOUT=10
ALLOW_ORIGINS=http://localhost:5173
LOG_LEVEL=INFO
```

**Files changed/created:** `backend/.env.example`, `backend/core/config.py`

---

### Area 7 — Production Requirements & Startup

**Current state:** `requirements.txt` exists but may have unpinned versions. No startup script. No README with run instructions.

**What we build:**
- Pin all dependencies to exact versions (`pip freeze`)
- Add `startup.sh` / `start.ps1` that runs DB migrations and starts uvicorn
- `README.md` with complete setup instructions: install Python, install Node, `pip install -r requirements.txt`, `npm install`, how to run

**Files changed/created:** `backend/requirements.txt`, `start.ps1`, `README.md`

---

### Area 8 — Frontend: Replace Template Data with API-Connected Real Data

**Current state:** Some frontend components (especially `OncoCrisprDesignerView.jsx` and `OncoViralPlannerView.jsx`) may show hardcoded example data when no API call has been made. Also `SampleIntakeView.jsx` still has no oncology mode toggle (Missing Item 1 from the gap audit).

**What we build:**
- All views show **loading spinners** while API calls are in progress
- All views show **real error messages** from API when things fail
- `SampleIntakeView.jsx` gets the full oncology toggle (from the gap audit)
- No hardcoded fallback data that could confuse researchers

**Files changed:** Multiple `.jsx` files

---

## Summary Table

| # | Area | Type of Fake | Production Replacement | Files |
|---|------|-------------|----------------------|-------|
| 1 | Azimuth scoring | Heuristic | Full Doench RS2 feature matrix | `azimuth_cfd.py` |
| 2 | Allele discrimination scores | `hash()` fake | Real Azimuth per guide | `allele_specific_designer.py` |
| 3 | Prime editing pegRNA | `NNNNN` mocked | Real PBS+RTT from genomic sequence | `crispr_designer.py` |
| 4 | Off-target job store | In-memory dict | SQLite-backed persistent jobs | `models.py`, `crispr_designer.py`, `main.py` |
| 5 | Test suite | Exists but untested | Verified running, real integration tests | All test files + `conftest.py` |
| 6 | Config | Hardcoded constants | `.env` + `python-dotenv` | `config.py`, `.env.example` |
| 7 | Requirements & startup | Partial | Pinned deps + `start.ps1` + `README.md` | Multiple |
| 8 | Frontend data | Some hardcoded | All API-connected, oncology toggle added | Multiple `.jsx` |

---

## Build Order

**I will build them in this exact order:**
1. Area 6 — Config/env first (foundation everything else depends on)
2. Area 1 — Real Azimuth scoring (foundation for Area 2)
3. Area 2 — Real allele discrimination (uses Area 1)
4. Area 3 — Real prime editing pegRNA
5. Area 4 — Persistent off-target jobs
6. Area 8 — Frontend fixes (oncology toggle + loading states)
7. Area 5 — Run test suite and fix failures
8. Area 7 — Requirements + README + startup script

Each area will be committed separately to GitHub.
