# Scientific Accuracy Audit
### What Is Real vs. Simulated in the Current Codebase

---

## TL;DR Summary

| Module | Real? | Verdict |
|--------|-------|---------|
| Azimuth / CFD on-target scoring | ✅ Real algorithm | Doench 2016 equations, position-weighted matrix |
| PAM regex scanning (SpCas9/SaCas9/Cas12a) | ✅ Real | Correct PAM patterns, forward+reverse strand |
| Off-target CFD scoring | ⚠️ Semi-real | Algorithm is correct; inputs are FAKE (only 3 synthetic mismatches, never BLAST) |
| Personalized sequence reconstitution | ✅ Real | Correct coordinate math for CCR5/HBB |
| ClinVar lookup | ✅ Real | Live NCBI E-utilities + 7-day SQLite cache |
| PubMed citations | ✅ Real | Live NCBI E-utilities for article metadata |
| Knowledge Copilot answers | 🔴 Fake | Hard-coded if/elif chains on keyword detection |
| Variant annotation (gnomAD AF) | ⚠️ Partial | Real for rs333/rs334/rs113010081; else `0.001` placeholder |
| Regeneration protocols | ⚠️ Template | Scientifically accurate factor lists, not live protocol DB |
| Delivery advisor | ✅ Reasonable | Tissue-vector lookup table based on published data |
| AAV packaging calculator | ✅ Real | Correct 4.7 kb cargo limit math |
| Report generator | ⚠️ Template | Structured output, no real statistical computations |

---

## 🔴 Issue 1 — Off-Target Scoring Is Simulated, Not Real

**File:** [`crispr_designer.py`](file:///c:/Users/majip/Downloads/genom/backend/modules/crispr_designer.py#L211-L218)

**What currently happens:**
```python
simulated_off_targets = [
    (ref_guide[:2] + ("A" if ref_guide[2] != "A" else "T") + ref_guide[3:], "TGG"),   # fake pos 3 mismatch
    (ref_guide[:6] + ("G" if ref_guide[6] != "G" else "C") + ref_guide[7:], "TGG"),   # fake pos 7 mismatch
    (ref_guide[:17] + ("C" if ...) + ref_guide[18:], "NAG"),                            # fake pos 18 mismatch
]
```

The CFD matrix math itself (from `azimuth_cfd.py`) correctly implements Doench et al. 2016 — **but it's evaluating three artificial mismatch variants that were made up on the fly, not real off-target sites in the human genome.**

**What real tools do:**
- CRISPOR, CHOPCHOP, and Cas-OFFinder align the 20-nt guide against the entire human genome (hg38) with ≤3 mismatches, then report every real genomic site.
- The CFD score is then computed for each of those real genomic off-target sites.

**Impact:** The reported `off_target_cfd_score` and `off_target_risk_level` are scientifically meaningless for any guide that isn't CCR5_01/HBB_01 (which have hand-coded answers).

**Fix required:** Integrate Cas-OFFinder binary or CRISPOR API call. This is a critical gap.

---

## 🔴 Issue 2 — Knowledge Copilot Is Hard-Coded Keyword Switching

**File:** [`knowledge_copilot.py`](file:///c:/Users/majip/Downloads/genom/backend/modules/knowledge_copilot.py#L90-L133)

**What currently happens:**
```python
if "berlin" in q_lower or "ccr5" in q_lower:
    synthesis = "...hard-coded 500-word essay about CCR5..."
elif "yamanaka" in q_lower or "stem" in q_lower:
    synthesis = "...hard-coded 500-word essay about iPSC risks..."
elif "casgevy" in q_lower or "sickle" in q_lower:
    synthesis = "...hard-coded essay about Casgevy..."
else:
    synthesis = "The platform searched the literature..."
```

There is no actual AI reasoning, no vector similarity search, no embedding model. The knowledge graph JSON is searched with basic substring matching (scores +2 for gene match, +3 for keyword). The "RAG" label is misleading — it is a keyword routing system with three pre-written essays.

**What is real:**
- PubMed live citations ARE fetched and appended (good)
- Knowledge graph JSON contains real literature entries
- DURC screening IS real (keyword blocklist)

**Impact:** Any query outside CCR5, HBB/Casgevy, or stem cell oncogenesis gets the generic fallback response regardless of content.

**Fix required:** Integrate a real embedding model (e.g. `sentence-transformers/all-MiniLM-L6-v2` local, or OpenAI/Gemini API embeddings) with FAISS or ChromaDB for semantic retrieval against the knowledge graph entries.

---

## ⚠️ Issue 3 — curated Candidates Only Work for CCR5 and HBB

**File:** [`crispr_designer.py`](file:///c:/Users/majip/Downloads/genom/backend/modules/crispr_designer.py#L63-L140)

The curated benchmark `guide_pool` only contains pre-built entries for:
- `CCR5` + `SpCas9_NGG` → 4 guides
- `HBB` + `SpCas9_NGG` → 3 guides

For any other gene (BRCA1, PTEN, TP53, etc.), only the dynamic PAM-regex scan runs. That scan is real (correct regex, correct strand logic), **but the personalized collision detection (lines 242–306) only works for CCR5/HBB too** because the `coding_start` coordinate is hardcoded:
```python
coding_start = 46372544 if target_gene == "CCR5" else (5226983 if target_gene == "HBB" else 0)
```

For any other gene, `coding_start = 0`, which makes collision detection degenerate to offset arithmetic from position 0 — likely wrong.

---

## ⚠️ Issue 4 — gnomAD Allele Frequencies Are Mostly Placeholder

**File:** [`variant_annotation.py`](file:///c:/Users/majip/Downloads/genom/backend/modules/variant_annotation.py#L93)

For variants that are NOT in the 3-entry curated DB and NOT in live ClinVar, `gnomad_af_global` is hardcoded as `0.001`. This covers virtually all novel or non-landmark variants. A real system queries the gnomAD GraphQL API.

---

## ⚠️ Issue 5 — Report Generator Has No Real Statistics

**File:** [`report_generator.py`](file:///c:/Users/majip/Downloads/genom/backend/modules/report_generator.py)

The HTML report is well-formatted and includes all the right sections (methods, results, references, audit trail). However:
- "Statistical confidence" values are derived from the Azimuth scores, not independent statistical models
- No survival analysis, no Kaplan-Meier curves, no chi-squared tests for cohort data
- No CONSORT-style patient flow diagram

This is appropriate for a research assistant v1 but should be flagged for future expansion.

---

## ✅ What Is Genuinely Scientifically Sound

1. **Azimuth 2.0 / Rule Set 2** (`azimuth_cfd.py`): The full Doench 2016 algorithm — GC parabolic penalty, poly-T penalty, position-weighted nucleotide contributions — is correctly implemented and matches published results for benchmark guides.

2. **CFD mismatch matrix** (`azimuth_cfd.py`): All 80 position-dependent mismatch weights from Doench 2016 are loaded correctly. PAM weighting (NGG=1.0, NAG=0.26, etc.) is correct.

3. **PAM scanning** (`crispr_designer.py`): The three nuclease PAM regexes (SpCas9 NGG, SaCas9 NNGRRT, Cas12a TTTV) are biologically accurate. 5' vs 3' PAM orientation is handled correctly.

4. **Personalized sequence reconstitution** (`sample_intake.py`): The coordinate mapping (genomic pos − coding_genomic_start = sequence offset) is correct. CCR5 Δ32 deletion and HBB p.Glu6Val substitution are faithfully introduced.

5. **Base editing window evaluation** (`azimuth_cfd.py`): CBE window (positions 4–8 from PAM) and ABE window (positions 4–7) are correctly annotated per published base editor specifications.

6. **AAV packaging limit calculator** (`delivery_advisor.py`): The 4.7 kb cargo ceiling for single-stranded AAV is correct industry standard.

7. **ClinVar live API**: Uses standard NCBI E-utilities `esearch` + `esummary`, correct field extraction from the germline_classification node.

---

## Priority Fix List

| Priority | Fix | Effort |
|----------|-----|--------|
| 🔴 Critical | Off-target: Integrate Cas-OFFinder binary or CRISPOR API | High |
| 🔴 Critical | Knowledge Copilot: Replace keyword switching with real embedding/RAG | High |
| 🟡 Important | gnomAD AF: Add gnomAD GraphQL API client | Medium |
| 🟡 Important | Collision detection: Generalize to all genes (not just CCR5/HBB) | Medium |
| 🟢 Nice-to-have | Report: Add real statistical confidence intervals | Low |
