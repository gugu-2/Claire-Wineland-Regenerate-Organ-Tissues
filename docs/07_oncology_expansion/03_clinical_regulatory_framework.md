# Clinical & Regulatory Framework Report
## Expanding the Genomic Research Copilot into Oncology Research

**Report Type:** Clinical Regulatory & Compliance Analysis  
**Authored by:** Clinical Regulatory Framework Analysis (System)  
**Date:** September 2026  
**Scope:** Assessing the current platform's safety architecture and defining requirements for oncology research support

---

## SECTION 1: Current Platform Safety Architecture Assessment

After reading `security.py` and `review_gate.py`, the platform has a surprisingly strong compliance foundation for a preclinical research tool.

### What Works Well Today

**SHA-256 Cryptographic Audit Trail** (`security.py`, line 65–67):
The platform already implements cryptographic integrity hashing on every audit event — a standard practice in regulated environments. Every action (VCF upload, guide design, review sign-off) produces a tamper-evident hash, meaning any retrospective alteration of the log would be detectable. This is directly aligned with FDA 21 CFR Part 11 (Electronic Records) requirements.

**GDPR/HIPAA Pseudonymization** (`security.py`, line 49–50):
User IDs and sample IDs are hashed before being written to the immutable audit trail. This means the log itself cannot contain personally identifiable information (PII) or protected health information (PHI), which is critical for compliance with both HIPAA (USA) and GDPR (Europe).

**DURC Shield** (`security.py`, line 16–32):
The Dual-Use Research of Concern (DURC) screening system maintains a blocklist of prohibited terms (e.g., "weaponize," "bioweapon," "pathogenicity enhancement"). Any query containing these terms is automatically blocked and flagged for Institutional Biosafety Committee (IBC) review. This is a meaningful compliance safeguard.

**Expert Review Gate** (`review_gate.py`, line 28–117):
The mandatory human sign-off system records the reviewer's credentials, IRB protocol number, decision, rationale, and a 3-point safety checklist (off-target reviewed, personal SNPs checked, wet-lab validation mandated). This is excellent practice for a research-grade tool.

**Thread-Safe Dual-Persistence** (`security.py`, line 90–94):
The audit trail is written to both a SQLite database and an append-only JSONL flat file, protected by a threading lock. This redundancy is important for regulatory defensibility.

### Critical Gaps for Oncology Use Cases

Despite these strengths, significant gaps exist if the platform were to support cancer therapy research:

1. **No Tumor vs. Germline Sample Distinction**: The current pipeline treats all VCF files identically. In oncology, somatic tumor mutations (appearing only in cancer cells) must be rigorously distinguished from germline mutations (present in all cells). Misclassification can lead to incorrect therapy targets.

2. **No Tumor Mutational Burden (TMB) Calculation**: The platform doesn't measure the total number of mutations in a tumor sample — a key biomarker for immunotherapy eligibility (FDA-approved cutoff: TMB ≥ 10 mutations/megabase).

3. **No Variant Tier Classification for Oncology**: The current variant annotation doesn't assign AMP/ASCO/CAP Tier I–IV clinical significance levels required for tumor genomic reporting (per 2017 joint oncology genomics standards).

4. **No Conflict of Interest Logging**: For oncology trials, the reviewer's institutional affiliations and potential conflicts of interest must be documented alongside sign-offs. The current `review_gate.py` only captures credentials and IRB number.

5. **No Cancer-Specific DURC Patterns**: The DURC blocklist focuses on bioweapon terminology. For oncology, additional screening for accidental enhancement of oncogenic pathways would be appropriate.

---

## SECTION 2: Regulatory Requirements for Oncology Research Tools

### FDA IND Submission Requirements

When a computational tool's output directly informs the design of an Investigational New Drug (IND) application, the FDA applies scrutiny to the software as a **Software as a Medical Device (SaMD)** component under 21 CFR Part 820 (Quality System Regulation) and FDA's Digital Health guidance.

Key requirements:
- **Documented Algorithm Validation**: Every scoring algorithm (e.g., Azimuth-style on-target efficiency) must be validated against wet-lab experimental data. The platform currently documents its algorithms as "heuristic approximations" — this is honest but would need independent validation studies to be cited in an IND.
- **Design Controls**: A formal Software Development Life Cycle (SDLC) documentation trail is required, including requirement specifications, design specs, and test records (currently partially covered by the test suite in `backend/tests/`).
- **Predicate Device Strategy**: If seeking 510(k) clearance or De Novo classification, the platform would need to identify predicate devices (e.g., Foundation Medicine's FoundationOne CDx for tumor profiling, or Illumina's MiSeq Reporter for variant analysis).
- **Performance Testing**: Clinical validation studies comparing the platform's guide recommendations against laboratory outcomes would be needed for any FDA pathway.

### IRB Requirements for Oncology Research

Any institution using this platform to inform decisions about cancer patient samples must:
- Submit an IRB protocol specifically covering computational analysis of tumor specimens.
- Document that all samples were collected under informed consent that explicitly covers genomic sequencing and computational analysis.
- Cancer patient consent forms must specifically describe how results will be used, stored, and shared — generic research consent is insufficient.
- Institutional review must be re-conducted if the analysis expands from germline editing design to somatic tumor targeting.

### HIPAA for Tumor Genomic Data

Tumor genomic data is Protected Health Information (PHI) under HIPAA. Key requirements:
- **Data at Rest Encryption**: The current SQLite database is stored unencrypted. For production oncology use, AES-256 encryption at rest is required.
- **Data in Transit**: All API calls between frontend and backend must use TLS 1.2+.
- **Business Associate Agreements (BAA)**: Any third-party service integrated (e.g., PubMed, ClinicalTrials.gov) must have BAAs if PHI is transmitted.
- **Minimum Necessary Standard**: The platform correctly redacts raw sequences from audit logs (`security.py`, line 53) — this aligns with the minimum necessary standard.
- **Right of Access**: Patients have the right to access their genomic analysis results. The platform's JSON dossier export supports this, but a patient-facing access portal would be required.

### GCP Documentation Standards

The Expert Review Gate already captures the essential GCP documentation elements:
- ✅ Reviewer identity and credentials
- ✅ IRB/ethics protocol number
- ✅ Decision and scientific rationale
- ✅ Timestamp and integrity hash
- ❌ Missing: Sponsor/CRO signature block
- ❌ Missing: Protocol version reference
- ❌ Missing: Multi-reviewer consensus mechanism (oncology decisions typically require 2+ expert sign-offs for Phase I/II trials)

---

## SECTION 3: Patient Safety Considerations for Virotherapy Research

Computational tools designed to support oncolytic virus-based therapy design require additional validation layers because:

### Immunological Complexity

Unlike CRISPR guide design where the primary safety concern is genomic off-targets, oncolytic virotherapy involves complex immunological dynamics:
- The patient's immune status significantly affects viral tropism and replication
- Severely immunocompromised patients (e.g., post-chemotherapy) may experience uncontrolled viral spread
- Cytokine release syndromes can occur unpredictably

### Required Platform Safety Additions for Virotherapy Research

1. **Immunocompromise Screening Checkbox**: Any virotherapy design workflow must require the reviewer to confirm patient immune status has been assessed.
2. **Contraindication Database**: The platform must include a database of absolute contraindications (e.g., patients on high-dose steroids, active viral infections, severely depleted CD4 counts).
3. **Predicted Cytokine Response Warning**: Any output recommending a viral therapy approach should carry a mandatory warning that cytokine release monitoring is required during administration.
4. **Research vs. Clinical Support Distinction**: The platform must display a persistent, unambiguous disclaimer that viral therapy blueprints are for **research planning only** and must undergo BSL-2/BSL-3 biosafety validation before any in vivo testing.

### Distinguishing Research Use from Clinical Decision Support

This is the most legally significant distinction. The platform must never be positioned as providing clinical decisions. Specific language required:
> *"Computational outputs from this platform represent research hypotheses only. They are not clinical recommendations, medical diagnoses, or treatment prescriptions. All designs require independent validation by qualified biosafety and clinical teams under approved regulatory protocols before any patient use."*

---

## SECTION 4: CRISPR Safety in Cancer Research Workflows

### Somatic vs. Germline: The Critical Distinction

The current pipeline was designed for germline-focused research (e.g., inherited CCR5 mutations for HIV resistance, HBB mutations for sickle cell disease). In cancer, the primary targets are **somatic mutations** — mutations that occurred in tumor cells but are absent from normal cells.

This distinction matters because:
- A CRISPR guide designed against a somatic tumor mutation must NOT edit normal cells (which lack that mutation) — but if the patient's normal cells happen to have a similar sequence, off-target editing becomes catastrophically dangerous
- Germline off-target analysis (current capability) is insufficient — **tumor-specific off-target analysis** requires knowing the tumor genome separately from the normal genome
- The platform currently takes a single VCF and a target gene — for oncology it needs a **tumor-normal pair**: one VCF from tumor biopsy, one from matched normal blood sample

### Enhanced Off-Target Analysis Requirements

Cancer genomes are uniquely challenging for off-target analysis:
- **Aneuploidy**: Many cancer cells have extra copies of chromosomes. A guide that cuts at one location in a normal diploid cell may have 3–6 cut sites in an aneuploid tumor cell — the current CFD scoring doesn't account for copy number.
- **Structural Rearrangements**: Cancer genomes frequently have translocations that create entirely new genomic sequences and new potential off-target sites.
- **Tumor Heterogeneity**: A single tumor may contain multiple genetically distinct subclones. A CRISPR guide effective against the dominant clone may spare subclones that drive recurrence.

### Enhanced Expert Review Gate for Oncology

The current 3-point checklist (off-target reviewed, personal SNPs checked, wet-lab mandated) is insufficient for cancer research. An oncology-specific checklist should add:
- ☐ Tumor-normal pair analysis completed (somatic mutations confirmed)
- ☐ Tumor heterogeneity and clonal structure assessed
- ☐ Copy number variation impact on off-target risk evaluated
- ☐ Patient immune status and tumor microenvironment reviewed
- ☐ Animal model or organoid pre-validation plan documented
- ☐ Institutional Biosafety Committee (IBC) pre-approval confirmed

---

## SECTION 5: Recommended Compliance Additions — Priority List

The following 8 compliance features should be added before the platform supports oncology research workflows:

| Priority | Feature | Regulatory Driver | Complexity |
|----------|---------|-------------------|------------|
| 🔴 Critical | Tumor vs. Germline sample type toggle with mandatory declaration | FDA SaMD, HIPAA | Low |
| 🔴 Critical | Database encryption at rest (AES-256) | HIPAA Physical Safeguards | Medium |
| 🔴 Critical | Oncology-specific Expert Review checklist (6-point) | GCP, FDA IND | Low |
| 🟠 High | Multi-reviewer consensus requirement (2 sign-offs for oncology decisions) | GCP, ICH E6 | Medium |
| 🟠 High | Tumor Mutational Burden (TMB) calculation and FDA biomarker threshold alert | FDA Companion Diagnostic guidance | High |
| 🟠 High | AMP/ASCO/CAP variant tier classification in annotation output | CAP oncology reporting standards | Medium |
| 🟡 Medium | Patient consent version tracking in audit log | HIPAA, ICH E6 | Low |
| 🟡 Medium | Enhanced DURC screening patterns for oncology misuse scenarios | NIH DURC Policy | Low |

### Updated Disclaimer Language Recommendation

Replace the current footer disclaimer with:
> *"⚠️ PRECLINICAL RESEARCH INSTRUMENT — NOT FOR CLINICAL USE. This platform produces computational research outputs only. All candidate designs require independent experimental validation, Institutional Biosafety Committee (IBC) review, IRB approval, and where applicable, FDA Investigational New Drug (IND) authorization before any in vivo application. Oncology use cases additionally require tumor-normal genomic pair analysis and a qualified clinical oncologist review. See full compliance documentation in the Research Dossier."*

---

## Conclusion

The Genomic Research Copilot has an exceptionally strong compliance foundation for a preclinical research tool. The SHA-256 audit trail, HIPAA pseudonymization, DURC screening, and Expert Review Gate are sophisticated features that many commercial platforms lack. However, expanding into oncology research requires addressing the tumor-vs-germline distinction, enhanced reviewer consensus, database encryption, and cancer-specific safety checklists. These additions are well within reach and would position the platform as one of the most rigorous oncology research design tools available.
