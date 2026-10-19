# Genomic Research Copilot: Medical & Biological Framework

This document details the underlying scientific principles, biological assumptions, and clinical guardrails implemented within the platform.

## 1. Sequence Personalization: The Biological Imperative
Most standard CRISPR design tools rely exclusively on reference genomes (e.g., GRCh38). This is a critical clinical blindspot. 

**The Genomic Copilot Approach**: 
- The platform takes a patient's Variant Call Format (VCF) file and dynamically reconstitutes their specific locus.
- **Why this matters**: If a patient has a single nucleotide polymorphism (SNP) in the PAM sequence (e.g., NGG becomes NGT), standard guides will fail to cut. Conversely, if a patient has a SNP that creates a *new* off-target site elsewhere in their genome, standard tools won't predict the off-target cleavage.

## 2. CRISPR & Nuclease Mechanics
The `crispr_designer.py` engine supports precise geometric rules for various enzymes:
- **SpCas9**: 20nt spacer + 3' NGG PAM.
- **SaCas9**: 21nt spacer + 3' NNGRRT PAM (ideal for AAV packaging).
- **Cas12a (Cpf1)**: 20-24nt spacer + **5' TTTV PAM**. The algorithm correctly inverts the search logic to account for the upstream PAM orientation.
- **Base Editors (CBE / ABE)**: Calculates editing windows (typically positions 4-8). Includes motif preference penalties (e.g., APOBEC1 prefers TC motifs).
- **Prime Editors (PE)**: Automatically computes the Primer Binding Site (PBS) and Reverse Transcriptase (RT) template components of the pegRNA to mediate complex insertions/deletions.

## 3. Scoring Heuristics
- **On-Target (Azimuth-style)**: Evaluates position-specific nucleotide preferences (e.g., favoring G at position 20, penalizing U-rich sequences that terminate Pol III transcription).
- **Off-Target (CFD - Cutting Frequency Determination)**: 
  - Accurately penalizes transversions (purine ↔ pyrimidine) heavier than transitions (purine ↔ purine).
  - Heavily penalizes mismatches in the "seed region" (PAM-proximal 10-12nt) compared to the distal region.

## 4. Cellular Reprogramming & Tumorigenic Risk
In the **Regeneration Module**, the platform models the transdifferentiation of somatic cells into target lineages (e.g., cardiomyocytes, dopaminergic neurons).
- **Oncogene Reactivation**: Flags the use of highly tumorigenic factors like **c-MYC** or **LIN28**.
- **Delivery Modality Safety**: 
  - *High Risk*: Integrative Retroviruses (risk of insertional mutagenesis).
  - *Low Risk*: Non-integrating RNA (Sendai virus) or synthetic mRNA.
- **Quality Control**: Defines temporal biomarkers (e.g., PAX6, FOXA2) and mandatory functional assays (e.g., electrophysiology) for safe clinical progression.

## 5. Clinical Safety & Medical Ethics
- **GCP Compliance Gate**: The Expert Review Modal forces clinicians to explicitly check for toxicity risks (e.g., pre-existing anti-Cas9 adaptive immunity) and confirm that computational results will be validated via GUIDE-seq or CIRCLE-seq before in-vivo administration.
- **Literature Grounding**: The AI Copilot refuses to hallucinate medical advice; it fetches verified PMIDs and clinical trial NCT IDs, preserving clinical rigor.
