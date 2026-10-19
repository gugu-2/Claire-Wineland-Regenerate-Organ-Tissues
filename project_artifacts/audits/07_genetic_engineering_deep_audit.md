# 🧬 Genetic Engineering Deep Technical Audit
**Agent:** World-Class Genetic Engineering Expert & Bioinformatician  
**Codebase:** `C:\Users\majip\Downloads\genom`  
**Date:** 2026-09-13

---

## 1. Executive Summary

This platform has sound aspirations but currently contains **four critical mathematical bugs** and **four scientific fabrications** that make it unsuitable for actual research use without correction. The scoring models are fake ML, the off-target scan is entirely local and mislabeled as genome-wide, and the strand-orientation math will silently corrupt any reverse-strand gene (which is roughly 50% of all human genes).

> [!CAUTION]
> The platform currently mislabels local locus mismatch counts as "genome-wide off-target hits." This is a clinical danger. If a researcher trusts these numbers, they will be dramatically underestimating off-target risk.

---

## 2. Mathematical & Coordinate Geometry Bugs

### Bug 1.1 — Strand Orientation Mismatch & VCF Allele Corruption (CRITICAL)
**Files:** [`ensembl_client.py` L40](file:///c:/Users/majip/Downloads/genom/backend/modules/ensembl_client.py), [`sample_intake.py` L78–L100](file:///c:/Users/majip/Downloads/genom/backend/modules/sample_intake.py)

**The Flaw:**  
In `ensembl_client.py`, the gene strand is returned as a **string** (`"+"` or `"-"`). In `sample_intake.py`, the code checks `if strand == -1:`. Because the string `"-"` never equals the integer `-1`, this branch is **never taken** for any reverse-strand gene. Every reverse-strand gene falls through to forward-strand coordinate math (`offset = pos - coding_start`).

This means:
1. Offsets are calculated backwards on reverse-strand genes.
2. VCF alleles (always reported on the forward genomic strand per VCF spec) are inserted directly into a reverse-complemented sequence **without** reverse-complementing the alleles themselves — creating a biologically invalid chimeric sequence.

**Fix:**
```python
# modules/ensembl_client.py — Keep strand as integer
strand = gene_data.get("strand", 1)  # 1 or -1, NOT "+" or "-"

# modules/sample_intake.py — Correct strand handling
if strand == -1:
    # For reverse-strand genes, genomic end is the transcription start
    offset = gene_info["end"] - pos
    # VCF alleles must be reverse-complemented before insertion
    ref_allele = reverse_complement(ref_allele)
    alt_allele = reverse_complement(alt_allele)
else:
    offset = pos - coding_start
```

---

### Bug 1.2 — Genomic Coordinate Modulo Wraparound (HIGH)
**File:** [`sample_intake.py` L108–L109](file:///c:/Users/majip/Downloads/genom/backend/modules/sample_intake.py)

**The Flaw:**  
The fallback offset calculation uses the modulo operator:
```python
offset = (pos - start) % ref_len
```
If a patient has a variant outside the gene boundaries (e.g., in an enhancer), this wraps the position around the sequence array, injecting the mutation **in the middle of the coding sequence**. This is biologically absurd and will silently corrupt the personalized sequence with no warning.

**Fix:**
```python
# Strictly guard against out-of-bound positions
if start <= pos <= gene_info.get("end", 0):
    offset = (pos - start) % ref_len
    return offset
return None  # Do not guess or wrap; drop the variant safely
```

---

### Bug 1.3 — PAM/Seed Geometry Inverted for 5'-PAM Nucleases (HIGH)
**File:** [`crispr_designer.py` L319–L340](file:///c:/Users/majip/Downloads/genom/backend/modules/crispr_designer.py)

**The Flaw:**  
The collision detector assumes `offset_in_guide >= proto_len` identifies the PAM region. This only holds for **3'-PAM nucleases (SpCas9)**. For **5'-PAM nucleases (Cas12a/Cpf1)**, the PAM is at position 0–4, and the seed region is positions 5–13. When using Cas12a, a seed-region mutation is misclassified as a `DISTAL_MUTATION` and vice versa.

**Fix:**
```python
# PAM/Seed geometry is nuclease-orientation-dependent
if is_5prime_pam:
    is_pam = (offset_in_guide < pam_len)
    is_seed = (pam_len <= offset_in_guide < pam_len + 8)
else:
    # 3'-PAM (SpCas9, SaCas9)
    is_pam = (offset_in_guide >= proto_len)
    is_seed = (proto_len - 10 <= offset_in_guide < proto_len)
```

---

### Bug 1.4 — Transition/Transversion Assignment Inverted (HIGH)
**File:** [`azimuth_cfd.py` L72–L74](file:///c:/Users/majip/Downloads/genom/backend/modules/azimuth_cfd.py)

**The Flaw:**  
The CFD mismatch scoring reverses the definitions of transitions and transversions:
- The code labels **A↔G and C↔T** swaps as "transversions" and penalizes them heavily at `0.55`
- It labels **A↔C and G↔T** swaps as "transitions" and scores them more leniently at `0.80`

This is exactly backwards. A↔G and C↔T are **transitions** (same chemical class). Transitions are generally **better tolerated** by Cas9 than transversions and should have the higher score.

**Fix:**
```python
# Correct definition per Doench 2016 (Table S6)
is_transition = (r in ["A", "G"] and d in ["A", "G"]) or \
                (r in ["C", "T"] and d in ["C", "T"])
# Transitions are more tolerated → higher CFD score (less penalty)
penalty_factor = 0.80 if is_transition else 0.55
```

---

## 3. Scientific Inaccuracies & Fabricated Algorithms

### Bug 2.1 — Fake Azimuth 2.0 / Rule Set 2 (CRITICAL)
**File:** [`azimuth_cfd.py` L127–L156](file:///c:/Users/majip/Downloads/genom/backend/modules/azimuth_cfd.py)

**The Flaw:**  
The `score_azimuth_on_target` function docstring claims to implement "Azimuth 2.0 Rule Set 2." The actual code is a 5-rule heuristic:
- Simple mononucleotide preference lookup
- A hardcoded GC-content parabola
- A positional weighting decay

**Real Azimuth 2.0** is a gradient-boosted XGBoost/SVM ensemble model trained on >1,000 features including position-independent one-hot dinucleotides, specific thermodynamic parameters, and interaction terms from the Doench 2016 Nature Biotechnology paper. The fake implementation will produce systematically wrong efficiency rankings.

**Fix:** Either:
1. Install the official `azimuth` pip package: `pip install azimuth` and call `azimuth.model_comparison.predict()`
2. Or embed the pre-trained ONNX weights and run local inference:
```python
import onnxruntime as rt
session = rt.InferenceSession("azimuth_rs2_model.onnx")
score = session.run(None, {"input": encode_guide(guide_seq, pam)})[0]
```

---

### Bug 2.2 — Local Locus Scan Mislabeled as Genome-Wide Off-Target (CRITICAL)
**File:** [`crispr_designer.py` L381–L435](file:///c:/Users/majip/Downloads/genom/backend/modules/crispr_designer.py)

**The Flaw:**  
The `run_cas_offinder_background` function:
1. Downloads only the local Ensembl locus sequence (~1,000 bp)
2. Scans it with a naive Python sliding window
3. Reports the counts as `genome_wide_off_targets_0_mismatch`

A real genome-wide Cas-OFFinder scan searches **3.2 billion bases** of hg38. Restricting the scan to 1,000 bp provides a **~3,200,000× undersampling** of the search space. Any guide RNA that hits a different chromosome is completely invisible to this search.

**Fix — Option A (Real Cas-OFFinder binary):**
```python
import subprocess
result = subprocess.run(
    ["cas-offinder", "query.txt", "C", output_file],
    capture_output=True
)
```

**Fix — Option B (CRISPOR API call):**
```python
response = requests.post(
    "https://crispor.tefor.net/crispor.py",
    data={"seq": f"{guide}NGG", "org": "hg38", "pam": "NGG"}
)
```

---

### Bug 2.3 — Prime Editing pegRNA Architecture is Wrong (HIGH)
**File:** [`crispr_designer.py` L234–L244](file:///c:/Users/majip/Downloads/genom/backend/modules/crispr_designer.py)

**The Flaw:**  
The pegRNA primer binding site (PBS) is computed as:
```python
pbs_seq = reverse_complement(ref_guide[-13:])
```
The RT template is:
```python
rt_seq = reverse_complement(ref_guide[5:20])
```

This is architecturally wrong. The PBS must hybridize to the 3'-flap of the **nicked non-template strand**, not a fragment of the sgRNA. The RT template must contain the **desired sequence edit** flanked by homology — there is no edit in the current code at all. The efficiency estimate (`ref_score * 45%`) has no scientific basis.

**Correct pegRNA architecture:**
1. Identify the Cas9 nick site = 3 bp upstream of NGG PAM
2. Extract 13 nt from the nicked strand 3' of the nick = the PBS
3. Build the RT template = **user's intended edit** + 10–20 nt of downstream homology
4. Score with a real Deep PE model (DeepPE or PrimeDesign)

---

### Bug 2.4 — Base Editor Window Ignores 5' Motif Context (MEDIUM)
**File:** [`azimuth_cfd.py` L270–L290](file:///c:/Users/majip/Downloads/genom/backend/modules/azimuth_cfd.py)

**The Flaw:**  
The CBE activity evaluation only checks if a target C exists in positions 4–8 of the spacer. It completely ignores the **APOBEC1 5' motif preference**: APOBEC1 strongly prefers **TC context** (tCa, tCc, tCt) over GC, AC, or CC context. A guide with a target C in position 6 but in an AC or GC context will be predicted as `OPTIMAL_SINGLE_C_EDIT` when it is actually a poorly editing candidate.

**Fix:**
```python
# Check the -1 position (5' neighbor) for TC context
for pos in target_positions:
    # pos is 1-indexed in guide; 0-indexed = pos-1
    context = guide[pos-2] if pos >= 2 else "N"  # base 5' of target C
    is_favorable_context = (context == "T")
    ...
```

---

## 4. Architecture Flaws

### Flaw 3.1 — Thread-Unsafe Synchronous Audit File I/O
**File:** [`core/security.py` L87–L91](file:///c:/Users/majip/Downloads/genom/backend/core/security.py)

**The Flaw:**  
`record_audit_event` opens `audit_trail.jsonl` with a synchronous `open(..., "a")`. In a multithreaded Uvicorn environment (multiple workers), concurrent audit events will collide, producing locked files, `PermissionError` crashes, or **interleaved JSON lines** that corrupt the audit trail.

**Fix:** Use a thread-safe `logging.FileHandler` with a `threading.Lock`, or push audit events to an `asyncio.Queue`:
```python
import threading
_audit_lock = threading.Lock()

def record_audit_event(...):
    with _audit_lock:
        with open(AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
```

---

## 5. Proposed Advanced Pro Features

### 🔬 1. MMEJ / Indel Distribution Profiling (inDelphi)
Standard NHEJ repair creates heterogeneous indels. Integrating an MMEJ model (like inDelphi by Shen et al. 2018) allows prediction of exact frameshift frequencies, single-base insertion preferences, and the dominant indel species based on microhomology arms flanking the cut site. This prevents designing knockout guides that predominantly generate in-frame deletions.

```python
# Example integration
from indelphi import predict_indels
indel_dist = predict_indels(reference_sequence, cut_site_offset)
frameshift_frequency = indel_dist["frameshift_pct"]
```

### 🔬 2. Epigenomic Context Scoring (ENCODE ATAC-seq)
Cas9 kinetics drop by 5–100× in tightly packed heterochromatin. CRISPR guides must be ranked not just by their sequence features but by nucleosome occupancy and histone methylation status in the target cell type. Integrate ENCODE's ATAC-seq and H3K4me3 BigWig tracks for the target cell line (HSPCs, T-cells, erythroblasts) and penalize guides whose target sites are in closed chromatin.

### 🔬 3. True XGBoost Azimuth 2.0 + DeepCpf1
- Replace `score_azimuth_on_target` with a pre-trained XGBoost model.
- Add `DeepCpf1` for Cas12a/AsCpf1 guides (the current code applies the SpCas9-only Azimuth model to all nucleases, which is scientifically invalid).

### 🔬 4. Smith-Waterman Local Alignment for SV Handling
Replace the naive sliding-window mismatch counter with vectorized Smith-Waterman alignment to handle complex rearrangements, translocations, and inversions when mapping a guide to a structurally variant patient locus.

### 🔬 5. Structural Bystander Proteomics (AlphaFold Integration)
For base editing designs where bystander mutations are unavoidable, pipe the altered amino acid sequence to the AlphaFold API to predict whether the bystander missense change destabilizes the protein's 3D fold — catching functional toxicity before it reaches the wet lab.

---

## 6. Priority Fix Matrix

| Priority | Bug | File | Biological Risk |
|----------|-----|------|-----------------|
| 🔴 Critical | Strand orientation & VCF allele corruption | `sample_intake.py`, `ensembl_client.py` | Silently corrupts 50% of non-CCR5/HBB targets |
| 🔴 Critical | Genome-wide off-target mislabeling | `crispr_designer.py` | Underestimates off-target risk by 3.2M× |
| 🔴 Critical | Fake Azimuth ML | `azimuth_cfd.py` | All efficiency scores scientifically invalid |
| 🟠 High | Transition/transversion inversion | `azimuth_cfd.py` | Wrong CFD penalties; misordered guide rankings |
| 🟠 High | Coordinate modulo wraparound | `sample_intake.py` | Injects variants into wrong gene positions |
| 🟠 High | pegRNA architecture error | `crispr_designer.py` | pegRNA designs are non-functional |
| 🟠 High | PAM/Seed geometry (Cas12a) | `crispr_designer.py` | Wrong collision type for 5' PAM nucleases |
| 🟡 Medium | Base editor APOBEC1 motif | `azimuth_cfd.py` | CBE efficiency overestimated for GC/AC contexts |
| 🟡 Medium | Thread-unsafe audit logging | `core/security.py` | Audit trail corruption under concurrent load |
