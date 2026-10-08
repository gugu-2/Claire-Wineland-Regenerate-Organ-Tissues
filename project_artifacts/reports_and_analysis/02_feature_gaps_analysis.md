# Feature Gaps Analysis
### What Is Missing, Incomplete, or Silently Broken

---

## Overview

This document lists every feature that is either **absent**, **partially wired**, or **silently non-functional** — where the UI shows a button or field but nothing meaningful happens on the backend.

---

## 🔴 Critical Gaps (Nothing Works Without These)

### 1. Real Off-Target Genome Search

**Gap:** The CFD off-target score shown in the CRISPR table is calculated against 3 synthetically generated mismatches, not the real human genome.

**What a user expects:** Enter a guide sequence → system searches hg38 for every site with ≤3 mismatches → CFD score is computed on those real genomic sites.

**Required:** Cas-OFFinder (C++ binary, cross-platform) or Benchling/CRISPOR external API. Neither is present.

**UI impact:** The "Off-Target Risk Level" badge (LOW / MEDIUM / HIGH) has no scientific validity for any gene other than the two hardcoded ones.

---

### 2. Real Sequence Database (FASTA)

**Gap:** The "reference sequence" shown for any gene is a short excerpt stored in `data/reference_genes.json` — a JSON file with manually pasted ~800-bp sequences. No real genome assembly is ever accessed.

**What a user expects:** For a gene like CCR5 or BRCA1, the system fetches the actual hg38 genomic sequence (including UTRs, introns, flanking regions) from NCBI/Ensembl.

**Required:** Biopython + NCBI Entrez sequence fetch, or a local FASTA index (samtools faidx). Currently absent.

**UI impact:** Guides discovered on custom genes might point to positions that don't exist in the real genome.

---

### 3. Custom Gene Support

**Gap:** Only CCR5 and HBB work end-to-end. Any other gene (BRCA1, PTEN, VEGF, etc.) gets a PAM scan on the fake short sequence, broken collision detection, and a generic Copilot response.

**What a user expects:** Type in any HGNC gene symbol → system fetches sequence, scans guides, annotates variants.

**Required:** Integration with Ensembl REST API for sequence fetch + coordinate conversion.

---

## 🟡 Important Gaps (Major UX/Functionality Holes)

### 4. VCF Upload Doesn't Drive Anything After Parse

**Gap:** The VCF upload in SampleIntakeView sends `POST /api/samples/upload-vcf` and gets back parsed variants. But those parsed variants are **never stored in any session state** in `App.jsx` — the `handleVcfUpload` function isn't wired to update `annotatedVariants` or any state that the downstream tabs read.

**File to fix:** [`App.jsx`](file:///c:/Users/majip/Downloads/genom/frontend/src/App.jsx)

**UI impact:** User uploads a VCF file, gets a success message, then navigates to CRISPR Designer and their variants are gone.

---

### 5. Nuclease Switcher Has No Effect on Scoring Display

**Gap:** The nuclease selector in CrisprDesignerView sends `pam_type` to the backend. The backend does switch the PAM regex (SpCas9/SaCas9/Cas12a) correctly. But **the result columns in the table always say "Azimuth Score"** even though Azimuth is specifically trained on SpCas9 NGG data. For SaCas9 or Cas12a, the score is being mis-labeled and potentially incorrectly computed.

**Required:** The scoring label and confidence model should change per nuclease type. SaCas9 doesn't have a public equivalent of Azimuth — the UI should note this.

---

### 6. Export / Download Buttons Are Non-Functional

**Gap:** Several views show "Export CSV", "Download PDF", "Export Synthesis Order" buttons that either have no onClick handler or call a frontend-only function that does nothing with real data.

Known non-functional exports:
- Oligo order CSV download in WetLabStudioView
- Report PDF download in ResearchReportView
- Cohort matrix CSV in WetLabStudioView (Cohort tab)

**Required:** Add backend endpoints or frontend `Blob` download logic for each.

---

### 7. Expert Review Gate Is Not Enforced

**Gap:** ExpertReviewModal saves a review decision to the backend. The review is displayed as a badge in CrisprDesignerView. However, **nothing prevents the user from proceeding to WetLab or generating a report without any review** — the "Proceed to Wet-Lab →" button in App.jsx fires regardless of `expertReviews` state.

**What should happen:** If `expertReviews[topGuide.guide_id]` is `"PENDING_REVIEW"` or `"EXPERT_REJECTED"`, the Proceed button should be disabled with a tooltip explaining why.

---

### 8. Knowledge Copilot Chat History Is Lost on Refresh

**Gap:** The chat messages in KnowledgeCopilotView are stored only in React `useState`. On page reload, all conversation history is gone.

**Required:** Either persist to SQLite via a `/api/copilot/history` endpoint, or use `localStorage`.

---

### 9. Locus Track Viewer Is Static After First Load

**Gap:** The `LocusTrackViewer` component renders exon blocks from the gene data and variant pins from `annotatedVariants`. But:
- Zoom interaction is present but only affects the ruler, not the track positions
- Guide tracks are shown only when `candidateGuides` is passed, but if the user changes the nuclease and reruns, the viewer doesn't update

---

### 10. Regeneration Protocol Evaluation Returns Template Scores

**Gap:** `POST /api/regeneration/evaluate` calls `evaluate_custom_cocktail()` in `regeneration.py`. This function checks a risk matrix for each factor (MYC → high risk, OCT4 → medium, etc.) and aggregates a score. This logic is domain-correct, but the score is not calibrated to any published tumorigenic risk dataset.

**Not a critical gap** — this type of risk scoring is inherently qualitative in the literature — but it should be labeled "Expert Consensus Estimate" not "Computational Risk Score."

---

## 🟢 Minor / Nice-to-Have Gaps

### 11. No User Authentication Layer

Any local or network-accessible request can read/write any sample. For a research tool, even a simple API key mechanism would prevent accidental cross-researcher data mixing.

### 12. No Multi-Gene Locus Support

The app handles one gene per session. Paired CRISPR strategies (e.g., CCR5 knock-out + CXCR4 knock-in in the same cell) require a multi-locus workflow. There is no UI or data model for this.

### 13. No Phased Genotype Support

VCF parsing extracts zygosity (`homozygous` / `heterozygous`) but does not handle phased genotypes (`0|1` vs `1|0`). For haplotype-aware CRISPR design (different guide efficiency on each chromosome copy), phasing information is important.

### 14. No IGV / UCSC Genome Browser Link-out

The LocusTrackViewer is a custom implementation. For researchers, a direct link to IGV Web or UCSC for each locus/variant would be highly valuable and very low-effort to add.

### 15. Audit Log Has No Export or Filtering

The audit trail shows up to 50 most recent events. There is no date filter, no user filter, and no way to download the log. For regulatory purposes, a full export is important.

---

## Feature Gap Summary Table

| # | Feature | Status | Priority |
|---|---------|--------|----------|
| 1 | Real off-target genome search | 🔴 Missing | Critical |
| 2 | Real genomic FASTA database | 🔴 Missing | Critical |
| 3 | Custom gene support | 🔴 Missing | Critical |
| 4 | VCF upload wired to downstream state | 🟡 Broken wiring | High |
| 5 | Nuclease-specific scoring labels | 🟡 Misleading | High |
| 6 | Export/Download buttons | 🟡 Non-functional | High |
| 7 | Expert review enforcement | 🟡 Not enforced | High |
| 8 | Copilot chat history persistence | 🟡 Ephemeral | Medium |
| 9 | Locus track dynamic update | 🟡 Partial | Medium |
| 10 | Regeneration score calibration label | 🟢 Labeling | Low |
| 11 | Authentication | 🟢 Missing | Low |
| 12 | Multi-gene locus | 🟢 Missing | Low |
| 13 | Phased genotypes | 🟢 Missing | Low |
| 14 | UCSC/IGV link-out | 🟢 Missing | Low |
| 15 | Audit log export | 🟢 Missing | Low |
