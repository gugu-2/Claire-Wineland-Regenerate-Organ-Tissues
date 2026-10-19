# Precision Cancer Cure OS — Execution Tasks

## Phase 1: Somatic Cancer Foundation
- [/] Create `backend/modules/somatic_variant_caller.py`
- [ ] Create `backend/modules/tumor_genomics.py`
- [ ] Update `backend/core/models.py` — TumorSampleModel + SomaticMutationModel
- [ ] Update `backend/modules/variant_annotation.py` — COSMIC/OncoKB somatic hotspot DB
- [ ] Update `backend/modules/review_gate.py` — 6-point oncology checklist
- [ ] Update `backend/main.py` — Phase 1 endpoints
- [ ] Update `frontend/src/components/SampleIntakeView.jsx` — oncology toggle

## Phase 2: OncoCRISPR Designer
- [ ] Create `backend/modules/allele_specific_designer.py`
- [ ] Update `backend/modules/crispr_designer.py` — design_mode + CNV off-target
- [ ] Update `backend/modules/azimuth_cfd.py` — tumor penalties
- [ ] Update `backend/main.py` — Phase 2 endpoints
- [ ] Create `frontend/src/components/OncoCrisprDesignerView.jsx`
- [ ] Update `frontend/src/App.jsx` — OncoCRISPR tab

## Phase 3: OncoViral Therapy Planner
- [ ] Create `backend/modules/viral_tropism_modeler.py`
- [ ] Update `backend/modules/delivery_advisor.py` — oncolytic profiles
- [ ] Update `backend/main.py` — Phase 3 endpoints
- [ ] Create `frontend/src/components/OncoViralPlannerView.jsx`
- [ ] Update `frontend/src/App.jsx` — Viral Therapy tab

## Phase 4: Advanced Cancer AI
- [ ] Create `backend/modules/neoantigen_predictor.py`
- [ ] Create `frontend/src/components/NeoantigenView.jsx`
- [ ] Update `frontend/src/services/api.js` — all new oncology endpoints
- [ ] Build + verify
