# 🎨 Product & UX Deep Audit Report
**Agent:** Senior Product Manager & UX Architect  
**Codebase:** `C:\Users\majip\Downloads\genom`  
**Date:** 2026-09-13

---

## 1. Executive Summary

The Genomic Research Copilot presents a powerful suite of computational biology tools. However, the current implementation suffers from **significant UX friction, prop-drilling state management, and hardcoded placeholder logic** that will hamper scientific workflows in a real-world clinical or research setting.

> [!CAUTION]
> The most critical architectural flaw is the lack of centralized state management. `App.jsx` is a monolithic state holder, threading 20+ props down the tree. Any non-trivial addition will collapse under its own weight.

---

## 2. Global Architecture Flaw: State Management

### [`App.jsx`](file:///c:/Users/majip/Downloads/genom/frontend/src/App.jsx)
- **Prop Drilling (Lines 367–426):** All state lives in `App.jsx` and is passed 2–3 levels deep to every view (`selectedSample`, `candidateGuides`, `expertReviews`, `isProcessing`, etc.). This creates an unmaintainable tangle where changing one piece of state forces re-renders across the entire app.
- **Fix:** Introduce a global state solution. Either **React Context** or a zero-boilerplate library like **Zustand**. Create a `useGenomStore` hook with slices for `patient`, `guides`, `reviews`, `processing`.
- **Blocking Background Operations (Lines 231–256):** The Cas-OFFinder background poll mutates `candidateGuides` in-place. If a researcher has already selected a guide and is reading its data card, the mutation will silently overwrite the displayed data. No notification is given.
- **Fix:** Show a non-blocking toast: *"Off-target scan complete. Click to refresh."* and let the user decide when to pull new data.

---

## 3. Component-Level Faults

### A. `SampleIntakeView.jsx`

| # | Fault | Location | Fix |
|---|-------|----------|-----|
| 1 | No visual feedback when a benchmark sample auto-triggers `processSample()` | Lines 121–164 | Add a spinner/badge overlay on the selected sample row |
| 2 | VCF textarea accepts any text with zero client-side format validation | Lines 221–227 | Run a lightweight VCF 4.2 regex check before calling the API |
| 3 | Large VCF pastes will freeze the browser's main thread | Lines 215–240 | Parse the text in a **Web Worker** to avoid UI jank |

---

### B. `CrisprDesignerView.jsx`

| # | Fault | Location | Fix |
|---|-------|----------|-----|
| 1 | **Destructive Loading State:** Entire component unmounts on `isProcessing`, destroying the user's scroll position and open guide card | Lines 71–81 | Use skeleton loaders or a translucent overlay; do not unmount the table |
| 2 | Sorting via toggle buttons above the table instead of clickable `<th>` headers — non-standard for scientific tables | Lines 210–225 | Sort by clicking column headers; show ▲/▼ carets |
| 3 | No "Export Guides to CSV" from this view — users must switch to another tab | Missing | Add a download CSV button in the guide table header bar |
| 4 | When the guide is marked `STRUCTURAL_REARRANGEMENT_AT_TARGET`, there is no unique visual callout in the table row — it shows the same styling as a normal `HIGH_RISK` | `pam_status` rendering | Add a red border/pulse animation to the entire row for SV-hit guides |

> [!WARNING]
> The destructive full-component unmount on loading is a serious UX regression. Users lose all context (scroll position, open accordions, selected guide) every time they click "Re-scan." This needs to be fixed before any user testing.

---

### C. `WetLabStudioView.jsx`

| # | Fault | Location | Fix |
|---|-------|----------|-----|
| 1 | **1-Click Order button fires a raw `alert()`** — completely breaks the UI theme | Line 650 | Replace with a proper `<Modal>` showing order summary, oligo names, and a "Confirm Order" button |
| 2 | Switching delivery parameters (Tissue/Vector) has no loading state — old data persists until the API responds | Lines 65–80 | Add `isFetchingDelivery` state; fade the card to 40% opacity during fetch |
| 3 | Hardcoded fallback oligo `'GATAGTCATCTTGGGGCTGG'` — if `preselectedGuide` is null, the studio silently defaults to a dummy clinical sequence | Lines ~25–40 | Show an empty/blocked state if no guide is passed; do not silently inject a fake guide |

> [!CAUTION]
> The hardcoded fallback sequence is a patient safety issue. If a researcher accidentally clicks "Export Synthesizer CSV" before selecting a real guide, they may order the wrong oligos.

---

### D. `RegenerationView.jsx`

| # | Fault | Location | Fix |
|---|-------|----------|-----|
| 1 | `customEvaluation` state is local — the toxicity/oncogene risk scores computed here never reach the Research Report | Lines 237–274 | Lift `customEvaluation` to `App.jsx` (or Zustand) and wire it to `ResearchReportView` |
| 2 | Reprogramming factor presets (OSK, OSKM, BAM) are hardcoded in JSX instead of being sourced from the backend protocols | Lines 237–274 | Fetch from `/api/regeneration/protocols` and render dynamically |

---

### E. `KnowledgeCopilotView.jsx`

| # | Fault | Location | Fix |
|---|-------|----------|-----|
| 1 | **Architecture Flaw:** Co-Pilot is a full-screen isolated tab. Scientists need to ask questions *while* looking at guides, not switch away from them | Tab placement in `App.jsx` | Refactor into a **persistent collapsible right sidebar drawer** accessible from any tab |
| 2 | Preset query buttons include `"Explain the CCR5-Δ32 mechanism"` regardless of the patient's current target gene | Lines 32–38 | Dynamically generate presets from `selectedSample.target_gene` |

---

### F. `ExpertReviewModal.jsx`

| # | Fault | Location | Fix |
|---|-------|----------|-----|
| 1 | **Broken Validation:** The new Toxicity Check and GCP checkboxes use native HTML `required` — this causes ugly browser popup tooltips that break the dark-mode UI | Lines 198–212 | Convert to controlled `useState` booleans and validate inside `handleSubmit` with custom error messages |
| 2 | Reviewer name field defaults to a hardcoded dummy: `'Dr. Sarah Jenkins, MD PhD'` — real users must overwrite this every time | Line 16 | Default to empty string `''` and add `required` validation |

---

### G. `LocusTrackViewer.jsx`

| # | Fault | Location | Fix |
|---|-------|----------|-----|
| 1 | Zoom only works via small +/- buttons — no scroll-to-zoom | Zoom buttons | Add `onWheel` event handler for scroll-to-zoom; add drag-to-pan |
| 2 | ECL2 domain annotation is hardcoded for CCR5 only | Lines 123–130 | Fetch protein domains from Ensembl or InterPro REST API for the current target gene |
| 3 | No way to drag/slide a guide window across the locus to preview real-time Azimuth/CFD recalculation | Missing | Add draggable guide highlight overlay with live score panel |

---

### H. `ResearchReportView.jsx`

| # | Fault | Location | Fix |
|---|-------|----------|-----|
| 1 | `window.print()` strips dark backgrounds — the exported PDF is unreadable in dark mode | PDF export logic | Use `html2pdf.js` or a dedicated `/api/report/pdf` backend endpoint |
| 2 | Regeneration protocol scores (`customEvaluation`) are missing from the report because state is siloed in `RegenerationView` | Missing data | Fix the state lifting described in §3.D above |
| 3 | Report is generated automatically with no customization — users cannot deselect specific guide candidates or add annotations | No edit mode | Add a "Configure Report" step: select which guides to include, add notes, set the clinical context label |

---

## 4. `api.js` — API Client Faults

| # | Fault | Fix |
|---|-------|-----|
| 1 | No global error handling — every call uses `.catch(console.error)` silently | Create an `apiClient` interceptor that shows a toast notification on failure |
| 2 | No request cancellation — if the user switches samples rapidly, multiple concurrent `personalizeSequence` calls race each other | Use `AbortController` and cancel stale in-flight requests |
| 3 | Base URL is hardcoded to `http://127.0.0.1:8000` — breaks in any containerized or deployed environment | Read from `import.meta.env.VITE_API_BASE_URL` with a localhost fallback |

---

## 5. Proposed Pro Product Features

### 🤖 1. Global AI Co-Pilot Sidebar
Move the Knowledge Co-Pilot into a persistent, resizable right-hand sidebar accessible from any tab. Let researchers highlight a guide sequence and click **"Ask Copilot about this guide"** to auto-inject context into the chat.

### 🧬 2. Interactive Drag-and-Drop Locus Optimizer
Allow researchers to drag a 20nt window across the locus viewer and watch the Azimuth and CFD scores recalculate in real-time as the window slides. Makes guide optimization a visual, intuitive process instead of requiring a full re-scan.

### 🏢 3. ELN / LIMS Push Integration
Add **"Export to Benchling"** and **"Export to eLabJournal"** buttons using their OAuth APIs. Creates a new CRISPR guide registry entity and protocol entry in the researcher's lab notebook with one click.

### 🗺️ 4. Interactive Cohort Heatmap
Replace the tabular "Patient Cohort Matrix" with an interactive heatmap. Rows = candidate guides, Columns = patients. Cells show CFD efficiency with a red→green color scale. This instantly reveals "universal" guides vs. population-variable ones.

### 🏥 5. Automated Clinical Trial Matching Widget
In the Research Report, add a "Matching Trials" panel that auto-queries ClinicalTrials.gov with the patient's target gene + disease indication and renders recruiting Phase I/II trials with NCT IDs, primary endpoints, and eligibility criteria.

### 🧫 6. Interactive Plasmid Map Viewer
In the Wet-Lab Studio, embed an SVG circular plasmid map (using `seqviz`) showing where the Golden Gate oligos ligate into the backbone (PX459, etc.). Renders the guide, promoter, and scaffold positions visually.

---

## 6. Priority Fix Matrix

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 🔴 Critical | Fix hardcoded fallback oligo sequence | Low | Patient Safety |
| 🔴 Critical | Migrate state to Zustand/Context | High | Architectural |
| 🟠 High | Fix destructive loading state in CrisprDesigner | Medium | Core UX |
| 🟠 High | Fix broken checkbox validation in Review Modal | Low | Compliance |
| 🟠 High | Lift RegenerationView state to App | Low | Data integrity |
| 🟡 Medium | Sortable table headers in CRISPR table | Low | Usability |
| 🟡 Medium | Replace `alert()` with order modal | Low | Professionalism |
| 🟡 Medium | Add AbortController to api.js | Low | Performance |
| 🟢 Feature | Global Copilot Sidebar | High | Delight |
| 🟢 Feature | Cohort Heatmap | High | Research Value |
