# Genomic Research Copilot: Clinical User Guide & Disease Workflows

This guide explains how end-users (research scientists, clinical geneticists, and bioinformaticians) utilize the platform to design therapies for specific genetic diseases.

## 1. General Workflow Overview

Regardless of the disease, the general user journey follows a strict 5-step pipeline:
1. **Intake**: Load the patient's sequence and variants.
2. **Design**: Select the nuclease and generate personalized guides.
3. **Studio**: Export sequences for wet-lab synthesis (plasmids/oligos).
4. **Regeneration**: (If applicable) Model the cellular delivery and differentiation timeline.
5. **Dossier**: Export the final audited report for IRB/regulatory review.

---

## 2. Disease Use-Cases

### A. Sickle Cell Disease (HBB Gene)
*A monogenic disorder caused by a homozygous Glu6Val mutation in the HBB gene.*

**User Workflow:**
1. **Intake**: Select the `PATIENT_004_HBB_SICKLE_E6V` sample or upload a VCF containing the rs334 mutation on chromosome 11.
2. **Design**: 
   - The user can select **SpCas9_NGG** to attempt a standard knockout of the BCL11A erythroid enhancer (reactivating fetal hemoglobin, akin to Casgevy).
   - *Alternatively*, the user can select **ABE_Base_Editor** to attempt direct reversion of the sickle mutation without introducing double-strand DNA breaks.
3. **Copilot**: The user opens the AI Copilot Drawer and asks: *"How does targeting the BCL11A enhancer compare to direct HBB base editing?"* to pull recent clinical trial data.
4. **Studio**: The user exports the sgRNA sequence to send to IDT for GMP-grade synthesis.

### B. HIV Resistance Engineering (CCR5 Gene)
*Engineering T-cells or Hematopoietic Stem Cells (HSCs) to mimic the CCR5-delta32 mutation, conferring HIV resistance.*

**User Workflow:**
1. **Intake**: Select `PATIENT_001_CCR5_WT` (wildtype).
2. **Design**: Select **SpCas9_NGG**. The platform will generate guides targeting the early exons of CCR5 to induce a frameshift knockout via Non-Homologous End Joining (NHEJ).
3. **Review Gate**: The user reviews the CFD off-target scores. If a guide has a high risk of off-target cleavage near an oncogene, the Expert Reviewer rejects it and selects a safer candidate.
4. **Regeneration**: Not heavily required for T-cells, but the user selects *Lentiviral* or *Electroporation (RNP)* delivery in the Wet-Lab module.

### C. Parkinson's Disease (Cell Replacement Therapy)
*Creating patient-specific dopaminergic neurons for brain grafting.*

**User Workflow:**
1. **Regeneration**: The user skips CRISPR editing and goes directly to the **Stem Cell & Regeneration** tab.
2. **Protocol Selection**: Chooses the *Dopaminergic Neurons* protocol.
3. **Safety Screening**: The user toggles various reprogramming factors. 
   - If they select **c-MYC** (Classical OSKM) and **Retrovirus**, the Copilot triggers a severe **Tumorigenic Risk Alert** (High Risk of Teratoma).
   - The user adjusts the protocol to **ASCL1, NURR1, LMX1A** (BAM factors) using **Sendai Virus RNA**, dropping the risk to "Low" and generating a clinically viable timeline.
4. **Dossier**: The user exports the 28-day differentiation timeline and QC biomarker checklist to their lab notebook.

---

## 3. How to Resolve Flags & Warnings

- **"COLLISION" Warning in CRISPR Designer**: This means the patient has a personal SNP exactly where the guide RNA is supposed to bind. **Action**: The user must discard this guide and select an alternative, as the guide will fail in this specific patient.
- **"HIGH RISK" Off-Target**: The CFD score suggests the guide might cut elsewhere in the genome. **Action**: The user should mandate deep off-target assays (GUIDE-seq) in the Expert Review Modal, or switch to a high-fidelity Cas9 variant.
- **AI Copilot "Blocked"**: If the AI detects a query that violates biosecurity (e.g., weaponization of pathogens), the DURC (Dual-Use Research of Concern) shield blocks it. **Action**: Rephrase the query to focus strictly on therapeutic, preclinical research.
