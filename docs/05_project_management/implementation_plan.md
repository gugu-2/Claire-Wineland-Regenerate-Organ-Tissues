# Implementation Plan: Comprehensive System Fixes

We have a large backlog of critical UX, scientific, and architectural improvements to make based on the analysis documents. To ensure stability and logical progression, I propose tackling these issues in **three distinct phases**.

## Overall Strategy

*   **Phase 1: Workflow Resiliency & Generalization (Proposed below)** — Fix the broken state wiring so the app actually works end-to-end, add loading/empty states for UX, and replace the hardcoded CCR5/HBB constraints with live Ensembl fetching so *any* gene works.
*   **Phase 2: Scientific Accuracy** — Integrate the Cas-OFFinder engine for real off-target scoring, and build the FAISS/SentenceTransformer vector store to make the AI Copilot genuinely intelligent.
*   **Phase 3: Architecture & Persistence** — Implement SQLite `patient_sessions` to save work, add background task queues for slow jobs, and add PDF report downloads.

---

# Phase 1 Implementation Details

This plan covers the immediate execution for Phase 1. 

## User Review Required

> [!IMPORTANT]
> Please review the proposed Phase 1 changes below.
> Click **Proceed** if you approve starting with this phase, or reply if you'd prefer to prioritize Phase 2 (Scientific Accuracy) or Phase 3 (Architecture) first.

## Proposed Changes

### 1. Frontend UX Polish & Wiring (Addressing Sprint C)

#### [MODIFY] [App.jsx](file:///c:/Users/majip/Downloads/genom/frontend/src/App.jsx)
- Wire `handleVcfUpload` to update the global `annotatedVariants` state. Currently, VCF upload succeeds but the data is dropped before reaching the CRISPR designer.
- Ensure that the state correctly triggers a re-run of `processSample`.

#### [MODIFY] View Components
We will add proper loading spinners (when waiting for the API) and empty state illustrations/text (when no data is present) to:
- `SampleIntakeView.jsx`
- `CrisprDesignerView.jsx`
- `WetLabStudioView.jsx`
- `RegenerationView.jsx`
- `KnowledgeCopilotView.jsx`
- `ResearchReportView.jsx`

---

### 2. General Gene Support (Addressing Sprint B)

#### [NEW] [ensembl_client.py](file:///c:/Users/majip/Downloads/genom/backend/modules/ensembl_client.py)
- Create a new module to interface with the Ensembl REST API.
- Fetch genomic coordinates, full sequence, and exon boundaries for any provided HGNC gene symbol (e.g., BRCA1, TP53).
- Implement local SQLite caching to avoid repeated slow API calls.

#### [MODIFY] [main.py](file:///c:/Users/majip/Downloads/genom/backend/main.py)
- Update `/api/samples/personalize` and add new routes if necessary to support live gene fetching via `ensembl_client.py` instead of relying on the local static `reference_genes.json`.

#### [MODIFY] [crispr_designer.py](file:///c:/Users/majip/Downloads/genom/backend/modules/crispr_designer.py)
- Remove hardcoded `coding_start` logic (`46372544 if target_gene == "CCR5"...`).
- Use the actual coordinate data fetched from Ensembl to calculate relative sequence offsets correctly for any gene.

#### [MODIFY] [sample_intake.py](file:///c:/Users/majip/Downloads/genom/backend/modules/sample_intake.py)
- Update `build_personalized_sequence` to gracefully handle genes fetched from Ensembl, removing its strict dependency on `reference_genes.json`.

## Verification Plan

### Automated Tests
- Run `pytest backend/tests/` to ensure no existing endpoint contracts are broken.

### Manual Verification
1. Open the UI, select a custom gene like `BRCA1`. Verify the reference sequence successfully loads from Ensembl.
2. Upload a VCF and verify the data properly flows into the CRISPR Designer tab.
3. Refresh the page on any empty tab and verify that a user-friendly empty state screen is shown.
4. Verify that loading spinners appear while the backend is fetching Ensembl sequences or designing guides.
