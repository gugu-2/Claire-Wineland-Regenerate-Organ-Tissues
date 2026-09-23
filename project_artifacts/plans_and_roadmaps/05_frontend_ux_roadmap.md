# Frontend UX Roadmap
### UI Issues, Missing Screens, and UX Improvements

---

## Current State Summary

The frontend has **6 main views** connected in a linear workflow:

```
[1] Sample Intake → [2] CRISPR Designer → [3] Wet-Lab Studio → [4] Regeneration → [5] Knowledge Copilot → [6] Research Report
```

Each view has a "Proceed to Next →" button. The navigation is wired in `App.jsx`. Overall the dark clinical aesthetic is solid and consistent. The issues are mostly about **missing states** (loading, empty, error) and **data persistence across navigation**.

---

## 🔴 Issue 1 — VCF Upload State Is Lost on Tab Switch

**Current behavior:** User uploads VCF in Module 1 → switches to CRISPR Designer → their uploaded variants are gone. The CRISPR designer runs on fallback data.

**Root cause:** VCF upload result is stored in `SampleIntakeView` local state, not lifted into `App.jsx`. The `handleVcfUpload` function does exist in App.jsx but the parsed VCF variants aren't fed back into `personalSequenceData` or `annotatedVariants`.

**Fix:** After `POST /api/samples/upload-vcf` succeeds in SampleIntakeView, call a parent `onVcfUploaded(variants)` callback that updates App.jsx state, then auto-triggers `processSample()` with the new variants.

**Priority: High** — This is a critical UX/data flow bug.

---

## 🔴 Issue 2 — All Tabs Show Empty Content on Fresh Load

**Current behavior:** When the app first loads (before any sample is selected), clicking Module 2–6 shows an empty or broken table/placeholder.

**What should happen:** Every tab should have a proper **empty state** screen — a centered illustration or icon, an explanatory message, and a CTA button pointing to the correct action.

### Empty States Needed

| Tab | Empty State Message | CTA |
|-----|---------------------|-----|
| CRISPR Designer | "No guides designed yet. Start by selecting a sample and target gene." | "Go to Sample Intake" |
| Wet-Lab Studio | "Design CRISPR guides first to generate synthesis orders." | "Go to CRISPR Designer" |
| Regeneration | "Select a differentiation protocol to begin risk evaluation." | _(show protocol selector directly)_ |
| Knowledge Copilot | "Ask any CRISPR or gene therapy question." | _(show input pre-filled with example)_ |
| Research Report | "Complete a CRISPR design session to generate a report." | "Go to Sample Intake" |

---

## 🟡 Issue 3 — No Loading Spinners on API Calls

**Current behavior:** When the user clicks "Design Guides" or "Submit" buttons, the UI freezes or shows nothing for 1-3 seconds until the API responds. There is no visual feedback.

**What should happen:** Every API call should show:
1. Button becomes disabled with a spinner
2. A skeleton loader in the results area (gray animated placeholder cards)
3. On error: red alert banner with the error message and a retry button

**Components needing loading states:**
- SampleIntakeView: "Process Sample" button
- CrisprDesignerView: "Design Guides" / "Re-scan Locus" buttons
- WetLabStudioView: all 4 tab action buttons
- KnowledgeCopilotView: "Send" button (has partial spinner, but it disappears too fast)

---

## 🟡 Issue 4 — Expert Review Modal Has UX Friction

**Current behavior:** The ExpertReviewModal appears when clicking "Review" in the guide table. It's a long form with 3 checkboxes, free text fields for credentials and IRB number. The form closes on submit but gives no persistent success feedback in the table.

**Improvements:**
- After submission, show a green "✓ Reviewed by [Name]" tag inline in the table row
- Add autosave of partial form state to localStorage so the reviewer doesn't lose their draft on accidental close
- Show a summary "3/6 guides reviewed" progress indicator in the tab header badge

---

## 🟡 Issue 5 — Locus Track Viewer Needs Interactivity Improvements

**Current behavior:** The LocusTrackViewer renders exon blocks, variant pins, and guide tracks as SVG. The ruler shows positions. Zoom slider is present.

**Missing interactions:**
- **Zoom doesn't move the track content** — only the ruler label spacing changes
- **No pan/scroll** — on long genes the viewer clips content instead of scrolling
- **No tooltip on hover** — hovering over a variant pin should show rsid, allele, clinical significance
- **No guide sequence popup** — clicking a guide track should show the 20-nt sequence, CFD score, PAM

**Recommended tech approach:** Convert the SVG-based renderer to use a lightweight canvas library (Konva.js) or proper D3 zoom behavior with `d3-zoom`.

---

## 🟡 Issue 6 — Data Tables Have No Sort/Filter

**Current behavior:** All tables (CRISPR candidate table, cohort matrix, audit log) are static renders. 

**What to add:**
- Column header click → sort ascending/descending
- Search filter box above each table
- Per-row action menu (three dots) for context actions
- Pagination for audit log (currently shows max 50, truncates)

**Technology:** TanStack Table (React Table v8) — already widely compatible with Tailwind

---

## 🟡 Issue 7 — Navbar Tab Badges Are Static

**Current behavior:** The navigation tabs in the Navbar show the module name only.

**What to add:**
- Badge on CRISPR tab: shows count of designed guides (e.g., "CRISPR Designer (6)")
- Badge on Review: shows count of pending reviews with red dot if any are unreviewed
- Badge on Report: green checkmark when report is generated

---

## 🟢 Issue 8 — Guided Wizard Mode for New Users

**The problem:** New users don't know where to start. The linear tab flow isn't obvious unless you've read documentation.

**Proposed: Onboarding Wizard**
- On first launch, show a modal wizard with 4 steps:
  1. "Choose a sample patient or upload your VCF"
  2. "Pick a target gene (CCR5 for HIV, HBB for Sickle Cell…)"
  3. "Run guide design and review results"
  4. "Explore the wet-lab studio"
- "Skip Tutorial" button always visible
- Progress shown as dots at bottom of modal
- Auto-play demo using benchmark data so user sees real results instantly

**Effort:** Medium — 2-3 days

---

## 🟢 Issue 9 — Mobile Responsiveness

**Current behavior:** The layout is desktop-only. On mobile (< 768px), the sidebar nav collapses awkwardly and tables overflow horizontally.

**Fix:** Add Tailwind responsive classes (`sm:`, `md:`, `lg:`) to critical layout containers. The dark clinical aesthetic should translate well to tablet.

**Priority:** Low unless a mobile/tablet research use-case is explicitly needed.

---

## 🟢 Issue 10 — Accessibility (a11y)

**Current behavior:** All interactive elements use correct HTML semantics (buttons, not divs). Icons from Lucide-React include aria-labels. Color contrast is generally good.

**Gaps:**
- No keyboard navigation between tabs (only mouse/touch)
- Screen reader doesn't announce API results after loading (needs `aria-live="polite"` on result containers)
- Color-only status indicators (risk level colors) need accompanying text labels

---

## UX Priority Order

| Priority | Fix | Effort |
|----------|-----|--------|
| 🔴 1 | VCF upload state persistence (wiring bug) | 2 hours |
| 🔴 2 | Empty states for all 6 tabs | 1 day |
| 🟡 3 | Loading spinners + skeleton loaders | 1 day |
| 🟡 4 | Expert review UX improvements | 0.5 days |
| 🟡 5 | Locus Track Viewer interactivity | 2-3 days |
| 🟡 6 | Sortable/filterable tables | 1-2 days |
| 🟡 7 | Navbar dynamic badges | 0.5 days |
| 🟢 8 | Guided onboarding wizard | 2-3 days |
| 🟢 9 | Mobile responsiveness | 1-2 days |
| 🟢 10 | Accessibility improvements | 1 day |
