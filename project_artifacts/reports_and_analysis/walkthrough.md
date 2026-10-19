# Genomic Research Copilot v3.0 — Oncology Expansion Walkthrough

**Implementation completed:** 2026-09-20  
**Build status:** ✅ Frontend builds clean (Vite, 0 errors) | ✅ All 8 backend files parse cleanly

---

## What Was Built — All 4 Phases

### Phase 1 — Somatic Cancer Foundation ✅

| File | Status | Description |
|------|--------|-------------|
| `backend/modules/somatic_variant_caller.py` | ✅ Created | Tumor-normal VCF subtraction engine, VAF/CCF calculation, SOMATIC_HOTSPOT_DB (10 cancer drivers), clonality classification (TRUNCAL/SUBCLONAL/RARE) |
| `backend/modules/tumor_genomics.py` | ✅ Created | TMB (FDA threshold ≥10 mut/Mb), MSI status (MSI-H/MSS), CNV landscape, tumor purity estimation, immunotherapy eligibility |
| `backend/core/models.py` | ✅ Extended | Added `TumorSampleModel` (tumor metadata, TMB, MSI, purity) + `SomaticMutationModel` (somatic variants with CRISPR safety flags) |
| `backend/modules/variant_annotation.py` | ✅ Extended | Added `SOMATIC_HOTSPOT_DB` (8 cancer drivers with OncoKB tiers + CRISPR strategies) + `annotate_somatic_variant()` + `annotate_somatic_variants()` |
| `backend/modules/review_gate.py` | ✅ Extended | 6-point oncology checklist (added tumor-normal, clonal fraction, CNV impact checks) + auto-downgrade safety guard |
| `backend/main.py` | ✅ Extended | `POST /api/oncology/tumor-normal-ingest` + `GET /api/oncology/tumor-mutational-burden/{id}` |

### Phase 2 — OncoCRISPR Allele-Specific Designer ✅

| File | Status | Description |
|------|--------|-------------|
| `backend/modules/allele_specific_designer.py` | ✅ Created | Two strategies: MUTATION_CREATED_PAM (near-perfect selectivity) + SEED_MISMATCH_ENGINEERING. Enforces ≥10× discrimination ratio safety threshold |
| `backend/main.py` | ✅ Extended | `POST /api/crispr/allele-specific-design` |
| `frontend/src/components/OncoCrisprDesignerView.jsx` | ✅ Created | Driver mutation presets (KRAS G12D, BRAF V600E, EGFR L858R), custom sequence input, discrimination ratio visualization |

### Phase 3 — OncoViral Therapy Planner ✅

| File | Status | Description |
|------|--------|-------------|
| `backend/modules/viral_tropism_modeler.py` | ✅ Created | 5 oncolytic virus backbones (HSV-1/T-VEC, MV, VSV, Ad5-Delta24, NDV), cytokine payload catalog, tumor-specific promoter catalog, recommendation engine + full engineering blueprint |
| `backend/main.py` | ✅ Extended | `POST /api/oncolytic/recommend-chassis` + `POST /api/oncolytic/design-blueprint` + `GET /api/oncolytic/viral-database` |
| `frontend/src/components/OncoViralPlannerView.jsx` | ✅ Created | 3-tab interface: chassis recommendation, engineering blueprint (Golden Gate assembly + IBC checklist), virus database browser |

### Phase 4 — App Integration ✅

| File | Status | Description |
|------|--------|-------------|
| `frontend/src/services/api.js` | ✅ Extended | 6 new API methods for all oncology endpoints |
| `frontend/src/App.jsx` | ✅ Extended | New tabs: `onco-crispr` + `onco-viral` wired to new views |
| `frontend/src/components/Navbar.jsx` | ✅ Extended | Two new nav tabs with rose/amber ONCO badge theming |

---

## Key Science Behind the Implementation

### Somatic Variant Calling
- Tumor-normal **set difference** on VCF keys (`chr:pos:ref>alt`) removes germline variants
- **CCF = VAF × 2 / tumor_purity** (diploid assumption)
- **TRUNCAL** (CCF ≥ 60%) = safe CRISPR target; **SUBCLONAL** = research only

### CRISPR Allele-Specificity
1. **Mutation-Created PAM** — somatic SNV creates NGG where wildtype has none → wildtype gets ~2% cleavage, mutant ~80%. ~40× ratio. Best strategy.
2. **Seed Mismatch Engineering** — SNV at positions 14–20 from PAM-proximal end causes 72–96% thermodynamic penalty against wildtype. Achieves 10–20× ratio.

### Oncolytic Virus Design (Dr. Beata Halassy-inspired)
- **MV (Measles Virus, Edmonston strain)** — exploits CD46 overexpression on cancer cells; Dr. Halassy used this for breast cancer (published 2024)
- **VSV (Indiana strain)** — selective for IFN-deficient cancer cells; Dr. Halassy combined with MV
- **HSV-1 / T-VEC family** — FDA approved 2015 (Imlygic/Talimogene) for melanoma
- All require **BSL-2** containment; all blueprints include **IBC pre-approval checklists**

---

## Verification Results

```
Backend Python syntax:
  OK  backend/main.py
  OK  backend/core/models.py
  OK  backend/modules/somatic_variant_caller.py
  OK  backend/modules/tumor_genomics.py
  OK  backend/modules/variant_annotation.py
  OK  backend/modules/review_gate.py
  OK  backend/modules/allele_specific_designer.py
  OK  backend/modules/viral_tropism_modeler.py

All 8 backend files parse cleanly.

Frontend build (Vite):
  ✓ 1600 modules transformed.
  dist/assets/index-n8OV8q2C.js   324.25 kB │ gzip: 86.72 kB
  ✓ built in 3.06s (0 errors, 0 warnings)
```

---

## How to Run

```powershell
# Backend (from c:\Users\majip\Downloads\genom\backend)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (from c:\Users\majip\Downloads\genom\frontend)
npm install
npm run dev
```

Then open http://localhost:5173 — you'll see 7 tabs in the navbar including the two new **ONCO** tabs.

---

## New API Endpoints Summary

| Method | Route | Phase |
|--------|-------|-------|
| POST | `/api/oncology/tumor-normal-ingest` | 1 |
| GET | `/api/oncology/tumor-mutational-burden/{id}` | 1 |
| POST | `/api/crispr/allele-specific-design` | 2 |
| POST | `/api/oncolytic/recommend-chassis` | 3 |
| POST | `/api/oncolytic/design-blueprint` | 3 |
| GET | `/api/oncolytic/viral-database` | 3 |
