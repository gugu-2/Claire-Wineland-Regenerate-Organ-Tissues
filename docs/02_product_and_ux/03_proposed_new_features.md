# Proposed New Features
### What to Add and Why

---

> This document is a feature proposal list. Nothing here is built yet. 
> After reviewing, tell me which features to implement first.

---

## 🧬 Module 1 — CRISPR Designer Upgrades

### Feature 1.1 — Real Off-Target Search via Cas-OFFinder

**What it does:**
Run the 20-nt guide sequence against the full hg38 genome, finding every site with ≤3 mismatches + ≤1 RNA bulge and ≤1 DNA bulge. Compute CFD score for each real site. Display a sortable off-target table with chromosome, position, gene overlap, conservation score.

**How to build:**
- Download `cas-offinder` binary (Apache 2.0 license, C++) — works on Windows/Linux
- Add Python wrapper in `backend/modules/offtarget_engine.py`
- New endpoint: `POST /api/crispr/offtarget-scan`
- New UI tab in CrisprDesignerView: "Off-Target Genome Scan" with sortable table and Manhattan plot

**Value:** This is the single most scientifically important missing feature. A CRISPR guide cannot be responsibly recommended without this.

**Effort:** Medium — 2-3 days for backend + UI

---

### Feature 1.2 — Prime Editing Support (PegRNA Designer)

**What it does:**
Prime editing (PE2/PE3) can install any substitution, insertion, or deletion without a double-strand break and without a donor template. It is increasingly the preferred modality for point mutation correction (e.g. HBB p.Glu6Val → Glu).

**Components:**
- PegRNA = spacer + scaffold + RT template + primer binding site (PBS)
- PBS length: optimized 10–13 nt
- RT template: encodes the desired edit + homology arm
- Nick guide (PE3): nicks the non-edited strand ~40–90 nt downstream

**How to build:**
- Add `backend/modules/prime_editor.py`: takes target mutation, reference sequence → designs PegRNA and nick guide
- New "Prime Editing" tab in WetLabStudioView
- New endpoint: `POST /api/crispr/prime-edit`

**Value:** Completes the editing modality palette (NHEJ knock-out → base editing → prime editing → HDR). Especially important for the HBB Glu6Val correction scenario.

**Effort:** Medium-High — 3-4 days

---

### Feature 1.3 — Base Editor Outcome Predictor

**What it does:**
When CBE or ABE editing window analysis identifies editable bases, predict:
- All C→T (CBE) or A→G (ABE) conversions within the editing window
- Which conversions are silent vs. missense vs. nonsense
- Bystander editing risk at adjacent C/A bases

**How to build:**
- Extend `azimuth_cfd.py` with a codon table lookup
- For each editable position: compute `codon[pos] → changed codon → amino acid change`
- Surface as "Base Edit Outcome" panel in CRISPR designer sidebar

**Value:** Tells the researcher whether a base edit will create the desired amino acid change or silently mutate a nearby codon — critical for CBE/ABE-based disease correction.

**Effort:** Low-Medium — 1-2 days

---

### Feature 1.4 — CRISPOR / CRISPRscan Score Comparison

**What it does:**
Fetch guide scores from two external web services to compare with our Azimuth implementation:
- CRISPOR (Haeussler et al.) — returns MIT, CFD, and Doench scores via REST API
- CRISPRscan (Moreno-Mateos) — optimized for zebrafish/human

**How to build:**
- Add `backend/modules/external_scoring.py` with CRISPOR REST endpoint call
- Add a "Score Comparison" column in the candidate table
- Show delta between our Azimuth score and CRISPOR's score — flag guides where they disagree by >15%

**Value:** Validation/trust-building. Shows researchers our scores are consistent with the field standard.

**Effort:** Low — 1 day

---

## 🧬 Module 2 — Sequence & Genomics Upgrades

### Feature 2.1 — Ensembl Gene Fetch (Any Gene Symbol)

**What it does:**
User types any HGNC gene symbol (BRCA1, VEGFA, TP53…) → system calls Ensembl REST API to:
- Fetch genomic coordinates (chromosome, start, end, strand)
- Download the reference CDS + flanking sequence (1 kb upstream + downstream)
- Extract exon boundaries for LocusTrackViewer

**How to build:**
- Add `backend/modules/ensembl_client.py`
- New endpoint: `GET /api/genes/fetch?symbol=BRCA1`
- Cache results in `api_cache` table with 30-day TTL (sequence doesn't change)
- Feed into `build_personalized_sequence()` and `scan_candidate_guides()`

**Value:** Breaks the CCR5/HBB-only limitation. Turns the tool from a demo into a general-purpose CRISPR designer.

**Effort:** Medium — 2 days

---

### Feature 2.2 — Structural Variant Support

**What it does:**
Current VCF parsing handles only SNVs, small indels. Add support for:
- Large deletions (>50 bp) in VCF SVTYPE=DEL format
- Copy number variations (CNV)
- Translocations (SVTYPE=TRA) — note if guide target spans a breakpoint

**How to build:**
- Extend `parse_vcf_content()` in `sample_intake.py`
- Add SV-specific collision detection: if SV overlaps guide locus, flag as "STRUCTURAL_REARRANGEMENT_AT_TARGET"

**Effort:** Low-Medium — 1-2 days

---

### Feature 2.3 — Haplotype-Phased Guide Design

**What it does:**
For heterozygous variants, design guides specifically for:
- Haplotype 1 (reference allele copy): optimized guide for ref sequence
- Haplotype 2 (alt allele copy): optimized guide for alt sequence
- Identify guides that preferentially cut the mutant allele (allele-specific editing)

**How to build:**
- Parse VCF `GT` field as phased (`0|1` vs `1|1`)
- Build two personalized sequences (hap1 + hap2)
- Score guides against both haplotypes, compute allele specificity ratio
- Tag guides as "Allele-Specific" where efficiency ratio > 3x

**Value:** Enables precision allele-specific editing — critical for dominant negative mutations where you want to cut only the disease allele.

**Effort:** Medium — 2-3 days

---

## 🤖 Module 3 — Knowledge Copilot Upgrade

### Feature 3.1 — Real Embedding-Based RAG

**What it does:**
Replace the keyword-switching if/elif chain with a real retrieval-augmented generation pipeline:
1. At startup: embed all knowledge graph entries + PubMed abstracts with a local sentence transformer model
2. At query time: embed the user question, retrieve top-K most similar documents
3. Feed retrieved documents as context to a generative LLM (Gemini API / local Ollama)
4. Return grounded answer with citation list

**How to build:**
- Install `sentence-transformers` (all-MiniLM-L6-v2, 80 MB) + `faiss-cpu`
- `backend/modules/embeddings.py`: build index from knowledge_graph.json on startup
- Replace `query_knowledge_copilot()` synthesis generation with LLM call
- Backend can use Google Gemini Flash API (already available in this environment)

**Value:** Makes the copilot actually intelligent — can answer any biomedical question about CRISPR, not just three pre-baked scenarios.

**Effort:** Medium — 2-3 days

---

### Feature 3.2 — Persistent Chat Sessions

**What it does:**
- Save conversation history per sample to the SQLite database
- New table: `chat_sessions` (session_id, sample_id, role, content, timestamp)
- New endpoints: `GET /api/copilot/history/{sample_id}`, `DELETE /api/copilot/history/{session_id}`
- Frontend: load history on mount, persist across page refreshes

**Effort:** Low — 1 day

---

## 📊 Module 4 — Data Visualization Upgrades

### Feature 4.1 — Off-Target Manhattan Plot

**What it does:**
After a genome-wide off-target scan, display results as a Manhattan-style plot:
- X axis: chromosomal position (chr1-22, X, Y)
- Y axis: -log10(CFD score)
- Color: gene desert (safe) vs. coding exon (red alert)
- Interactive: click a point to zoom into that off-target locus

**Technology:** Recharts (already in project) or D3.js SVG

**Effort:** Medium — 2 days

---

### Feature 4.2 — Guide RNA Secondary Structure Viewer

**What it does:**
Show the predicted sgRNA secondary structure (scaffold + spacer folding) and flag:
- Internal loops that compete with DNA binding
- Hairpins in the spacer region that reduce efficiency
- Poly-T stretches that cause premature RNA Pol III termination

**Technology:** RNAfold (ViennaRNA) called as subprocess, or dot-bracket notation rendered as SVG

**Effort:** Medium — 2 days

---

## 🗂️ Module 5 — Data Management & Reporting

### Feature 5.1 — PDF Report Download

**What it does:**
The HTML report from `report_generator.py` is already well-formatted. Add:
- Backend: `POST /api/report/pdf` using `weasyprint` or `pdfkit`
- Frontend: "Download PDF" button with real file download trigger

**Effort:** Low — 0.5 days

---

### Feature 5.2 — Patient Registry Multi-Sample Comparison

**What it does:**
- Store multiple processed samples in the SQLite `samples` table
- New view: "Registry" dashboard — table of all samples, each with status badges (VCF uploaded / CRISPR designed / Reviewed / Reported)
- Click any row to reload that sample's full session state
- Comparison view: two patients side-by-side on the same gene

**Effort:** High — 4-5 days

---

## Priority Order Recommendation

| Priority | Feature | Reason |
|----------|---------|--------|
| 1 | Off-target genome search (1.1) | Scientifically mandatory |
| 2 | Ensembl gene fetch (2.1) | Breaks CCR5/HBB-only constraint |
| 3 | Real embedding RAG (3.1) | Makes copilot genuinely useful |
| 4 | Prime editing designer (1.2) | Completes editing toolkit |
| 5 | Base editor outcome predictor (1.3) | Low effort, high value |
| 6 | VCF state wiring fix (Bug #4) | Quick win, already mostly there |
| 7 | PDF report download (5.1) | Very low effort |
| 8 | CRISPOR score comparison (1.4) | Trust/validation |
| 9 | Haplotype-phased design (2.3) | Advanced, high scientific value |
| 10 | Patient registry (5.2) | Longer-term |
