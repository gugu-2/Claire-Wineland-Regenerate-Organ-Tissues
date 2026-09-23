# Genomic Research Copilot: Product Features Overview

This document outlines the complete feature set of the Genomic Research Copilot platform. The platform is designed as an end-to-end preclinical workspace for scientists, genetic engineers, and clinicians to discover, design, and validate CRISPR-based genomic therapies and stem cell regeneration protocols.

## Core Modules & Features

### 1. Sample & Locus Intake Module
- **Patient Cohort Management**: Load and manage genetic samples for specific patients, including primary sequence variations.
- **Custom VCF Parsing**: Upload patient-specific Variant Call Format (VCF) files to ingest custom genomic data.
- **Dynamic Sequence Personalization**: Reconstruct patient-specific target loci (e.g., CCR5, HBB) by automatically applying their unique SNPs, insertions, and deletions to the reference genome (GRCh38).
- **Variant Pathogenicity Annotation**: Cross-references patient variants against databases (like ClinVar/gnomAD algorithms) to assess mutation severity.

### 2. Personalized CRISPR Designer
- **Cas-Nuclease Selection**: Support for various Cas enzymes including SpCas9 (NGG PAM), SaCas9, Cas12a, and Base Editors (CBE/ABE).
- **Dual-Guide / Prime Editing Generation**: Advanced design of paired nickase guides or Prime Editing pegRNAs for complex structural rearrangements.
- **On-Target Efficiency Scoring**: Uses an Azimuth-inspired algorithm tailored to the patient's personalized sequence to predict cleavage efficiency.
- **Off-Target Specificity Scoring (CFD)**: Calculates Cutting Frequency Determination (CFD) scores to predict off-target binding risks across the genome.
- **Interactive Locus Viewer**: Visualize the target gene, exons, and guide bindings in an interactive genomic track format.

### 3. Wet-Lab & Delivery Studio
- **Golden Gate Oligo Synthesizer**: Automatically generates 5' and 3' overhangs (e.g., BbsI, BsmBI) required to clone guides into standard plasmid backbones (e.g., PX459).
- **One-Click Reagent Ordering**: Generates formatted CSVs and interfaces for direct ordering of oligos from Synthego or IDT.
- **Vector & Delivery Recommendation**: Recommends optimal delivery modalities (AAV, RNP, Lipid Nanoparticles) based on the target tissue (e.g., hematopoietic stem cells, neurons).

### 4. Stem Cell & Regeneration Modality
- **Cellular Reprogramming Cocktails**: Assesses factors (OSKM, BAM) needed to transdifferentiate cells or generate induced Pluripotent Stem Cells (iPSCs).
- **Interactive Oncogenic Risk Screener**: Analyzes the tumorigenic risk of reprogramming factors (e.g., c-MYC, LIN28) and delivery methods (e.g., retrovirus vs. non-integrating Sendai virus).
- **Differentiation Timelines**: Provides stage-wise timelines and mandatory quality control (QC) biomarkers for target lineages (e.g., dopaminergic neurons, cardiomyocytes).

### 5. AI Research Co-Pilot (Literature Graph RAG)
- **Grounded Literature Retrieval**: An integrated AI assistant that queries the biomedical knowledge graph (PubMed, Nature, NEJM) rather than relying on hallucinated model weights.
- **Context-Aware Assistance**: The Copilot exists as a persistent sidebar, allowing researchers to ask questions about specific candidate guides, off-target risks, or disease mechanisms.
- **Clinical Trial Matching**: Automatically surfaces recruiting clinical trials (NCT IDs) related to the target gene and disease indication.

### 6. Research Dossier & Audit Trail
- **Human Expert Review Gate**: A mandatory checkpoint where a lead geneticist signs off on the off-target profile and toxicity risks before wet-lab progression.
- **Immutable Cryptographic Audit Trail**: Every action (from sequence upload to review sign-off) is logged with a SHA-256 integrity hash to ensure regulatory compliance and Good Clinical Practice (GCP).
- **PDF & JSON Dossier Export**: Compiles the patient's customized genome, guide efficiency scores, oncogene risk evaluations, and expert sign-offs into a formal, printable report.
