# Genomic Research Copilot — Analysis Index
### Master Document: What to Read and What to Decide

---

> This is your starting point. Six analysis documents cover every aspect of the current codebase.
> Read each one, then tell me which areas to implement first.

---

## Document Index

| # | Document | What It Covers |
|---|----------|---------------|
| 1 | [01 — Scientific Accuracy Audit](file:///C:/Users/majip/.gemini/antigravity/brain/e505eb43-024e-44d5-b624-97243e5f631a/01_scientific_accuracy_audit.md) | What is real vs. simulated in each module. Where the science would not pass peer review. |
| 2 | [02 — Feature Gaps Analysis](file:///C:/Users/majip/.gemini/antigravity/brain/e505eb43-024e-44d5-b624-97243e5f631a/02_feature_gaps_analysis.md) | 15 specific gaps: broken wiring, missing screens, non-functional buttons, silent failures. |
| 3 | [03 — Proposed New Features](file:///C:/Users/majip/.gemini/antigravity/brain/e505eb43-024e-44d5-b624-97243e5f631a/03_proposed_new_features.md) | 12 new features with build plans: off-target search, prime editing, RAG copilot, more. |
| 4 | [04 — Architecture Improvement Plan](file:///C:/Users/majip/.gemini/antigravity/brain/e505eb43-024e-44d5-b624-97243e5f631a/04_architecture_improvement_plan.md) | Backend async task queue, API versioning, authentication, deployment tiers. |
| 5 | [05 — Frontend UX Roadmap](file:///C:/Users/majip/.gemini/antigravity/brain/e505eb43-024e-44d5-b624-97243e5f631a/05_frontend_ux_roadmap.md) | 10 UX issues: loading states, empty screens, locus viewer, sortable tables, wizard mode. |
| 6 | [06 — Database & Data Model Plan](file:///C:/Users/majip/.gemini/antigravity/brain/e505eb43-024e-44d5-b624-97243e5f631a/06_database_and_data_model_plan.md) | Session persistence, background jobs, chat history, vector store, migration strategy. |

---

## Current System Health Summary

```
Backend (FastAPI)  ████████░░  80%  — All routes work; off-target scoring is fake
Frontend (React)   ██████░░░░  60%  — Navigation wired; VCF state lost, no empty states
Science accuracy   ██████░░░░  60%  — Azimuth/CFD real; Knowledge Copilot is keyword matching
Data persistence   ████░░░░░░  40%  — Session state is in-memory only
Gene coverage      ██░░░░░░░░  20%  — Only CCR5 and HBB fully work end-to-end
```

---

## The 3 Most Important Problems to Fix

### 🔴 Problem A — Off-Target Scoring Is Not Real
**Why it matters:** The off-target risk level shown in the CRISPR table has no genomic basis. Every guide currently gets scored against 3 made-up sequences instead of the actual human genome. This is the single biggest scientific gap.
**Doc:** See [01 — Scientific Accuracy Audit](file:///C:/Users/majip/.gemini/antigravity/brain/e505eb43-024e-44d5-b624-97243e5f631a/01_scientific_accuracy_audit.md) and [03 — Feature 1.1](file:///C:/Users/majip/.gemini/antigravity/brain/e505eb43-024e-44d5-b624-97243e5f631a/03_proposed_new_features.md)

### 🔴 Problem B — App Only Works for CCR5 and HBB
**Why it matters:** Any other gene shows meaningless results. The NCBI/Ensembl gene fetch would make this a real general-purpose tool.
**Doc:** See [02 — Gap #3](file:///C:/Users/majip/.gemini/antigravity/brain/e505eb43-024e-44d5-b624-97243e5f631a/02_feature_gaps_analysis.md) and [03 — Feature 2.1](file:///C:/Users/majip/.gemini/antigravity/brain/e505eb43-024e-44d5-b624-97243e5f631a/03_proposed_new_features.md)

### 🔴 Problem C — Knowledge Copilot Is Not AI
**Why it matters:** The copilot responds with hard-coded essays selected by keyword. Any question outside CCR5/HBB/stem cells returns a generic fallback. Real embedding-based RAG would make it genuinely useful for any research question.
**Doc:** See [01 — Issue 2](file:///C:/Users/majip/.gemini/antigravity/brain/e505eb43-024e-44d5-b624-97243e5f631a/01_scientific_accuracy_audit.md) and [03 — Feature 3.1](file:///C:/Users/majip/.gemini/antigravity/brain/e505eb43-024e-44d5-b624-97243e5f631a/03_proposed_new_features.md)

---

## Quick-Win Fixes (< 1 Day Each)

These don't require reading all the documents — they're small bugs that should be fixed regardless:

| Fix | Location | Time |
|-----|----------|------|
| VCF upload result isn't persisted to downstream state | `App.jsx` + `SampleIntakeView.jsx` | 2 hours |
| Empty state screens for all 6 tabs | Each view component | 3 hours |
| Loading spinners on all API calls | Each view component | 2 hours |
| PDF report download button | `ResearchReportView.jsx` + `main.py` | 2 hours |
| Tighten CORS origin | `main.py` line 49 | 5 minutes |

---

## Decision Matrix — What to Build Next

Review the documents and pick which sprint to approve:

### Sprint Option A — Scientific Depth
Fix the two biggest scientific gaps:
- Real off-target genome scan (Cas-OFFinder integration)
- Real embedding-based RAG knowledge copilot (sentence-transformers + FAISS + Gemini)

**Outcome:** Tool becomes scientifically credible. Off-target table has real data. Copilot can answer any question.
**Effort:** ~1 week

---

### Sprint Option B — General-Purpose Gene Support
Break the CCR5/HBB-only limitation:
- Ensembl REST API integration for any gene
- Generalize collision detection to any gene's coordinate space
- Support real full-length genomic sequences (not short JSON excerpts)

**Outcome:** User can type in any HGNC gene symbol and get real guide design.
**Effort:** 3-4 days

---

### Sprint Option C — UX Polish and Quick Wins
Fix all the UI/UX issues and broken wiring:
- VCF upload state persistence
- Empty states for all tabs
- Loading spinners
- PDF download
- Sortable tables
- Expert review enforcement

**Outcome:** App feels solid and professional. All existing features work reliably.
**Effort:** 3-4 days

---

### Sprint Option D — New Editing Modalities
Add prime editing and base editor outcome predictor:
- PegRNA designer for precision point mutation correction
- Base editor outcome predictor (CBE/ABE codon table analysis)
- CRISPOR score comparison

**Outcome:** Editing toolkit is complete. Researchers can evaluate knock-out, base edit, and prime edit options side by side.
**Effort:** 3-4 days

---

> **Your call:** Tell me which sprint (A, B, C, D) to build — or any combination. I'll create the implementation plan and start coding.
