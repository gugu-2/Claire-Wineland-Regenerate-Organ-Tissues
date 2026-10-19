# WIREFRAMES.MD — Visual Screen Wireframes & UI Component Architecture

> **Genomic Research Copilot / Precision Oncology OS**  
> Complete visual wireframe specification. Every screen is diagrammed using structured box layouts with numbered component breakdowns, user interaction paths, and data flow mechanisms.

---

## Table of Contents
1. [Global Layout & Persistent Navigation](#0-global-layout--persistent-navigation)
2. [Screen 1: Sample & Locus Intake](#screen-1-sample--locus-intake)
3. [Screen 2: Personalized CRISPR Design Studio](#screen-2-personalized-crispr-design-studio)
4. [Screen 3: Wet-Lab & Delivery Studio](#screen-3-wet-lab--delivery-studio)
5. [Screen 4: Stem Cell & Regeneration Planner](#screen-4-stem-cell--regeneration-planner)
6. [Screen 5: Research Dossier & Audit Trail](#screen-5-research-dossier--audit-trail)
7. [Screen 6: OncoCRISPR Designer & Tumor Fingerprint](#screen-6-oncocrispr-designer--tumor-fingerprint)
8. [Screen 7: OncoViral Therapy Planner](#screen-7-oncoviral-therapy-planner)
9. [Screen 8: ART Research Studio (Yoon et al. 2026)](#screen-8-art-research-studio-yoon-et-al-2026)
10. [Screen 9: Real-Time Research Playground](#screen-9-real-time-research-playground)
11. [Overlay A: Human Expert Review Gate Modal](#overlay-a-human-expert-review-gate-modal)
12. [Overlay B: Scientific Knowledge Copilot Drawer](#overlay-b-scientific-knowledge-copilot-drawer)

---

## 0. Global Layout & Persistent Navigation

```
+-------------------------------------------------------------------------------------------------------------------------+
| [A1] TOP COMPLIANCE BAR:  ⚠ Research Environment | DURC Shield Active [●] | Audit Trail: ON | Safety Mode: ACTIVE       |
+-------------------------------------------------------------------------------------------------------------------------+
| [A2] LOGO & TITLE: 🧬 Genomic Research Copilot v3.0      | [A3] BACKEND BADGE: Live (8000) [●] | [A4] COPILOT BTN [Ask AI] |
+-------------------------------------------------------------------------------------------------------------------------+
| [A5] TAB NAVIGATION:                                                                                                    |
|  [1. Intake]  [2. CRISPR]  [3. Wet-Lab]  [4. Stem Cell]  [5. Dossier]  [6. OncoCRISPR]  [7. OncoViral]  [8. ART] [9. Live]  |
+-------------------------------------------------------------------------------------------------------------------------+
|                                                                                                                         |
|                                            [ACTIVE VIEWPORT CONTAINER]                                                  |
|                                                                                                                         |
+-------------------------------------------------------------------------------------------------------------------------+
| [A6] FOOTER: Regulatory Disclaimer | 21 CFR Part 11 Audit Trail Hash | Session ID: SES-2026-X89                         |
+-------------------------------------------------------------------------------------------------------------------------+
```

### Component Details
* **[A1] Top Compliance Bar:** Persistent alert banner at the top of every screen. Displays regulatory status, dual-use research of concern (DURC) filter status, and audit trail mode.
* **[A2] Logo & App Info:** Identifies application build version.
* **[A3] Live Backend Status Badge:** Pings `http://localhost:8000/api/status`. Displays a green badge when FastAPI + Ensembl REST are connected; displays an amber warning button `[Retry]` if disconnected.
* **[A4] Knowledge Copilot Button:** Toggles the persistent AI research chat drawer from the right side of any view without navigating away.
* **[A5] Horizontal Tab Bar:** Switches the main viewport between the 9 distinct research modules. The active tab is illuminated with a colored highlight bar.
* **[A6] Persistent Footer:** Summarizes institutional governance standards, pre-clinical IRB notices, and the active session ID.

---

## Screen 1: Sample & Locus Intake
**File:** `frontend/src/components/SampleIntakeView.jsx`  
**Route/Tab:** `1. Sample & Locus Intake`

```
+-------------------------------------------------------------------------------------------------------------------------+
| [B1] HERO BANNER: Module 1 — Patient-Specific Sequence Reconstitution                                                  |
|      "Compute guides directly against personal patient genomes instead of generic GRCh38 references"                   |
+-------------------------------------------------------------------------------------------------------------------------+
| [B2] SUB-TABS:  [● Benchmark Cohort Patients]  |  [Custom VCF File Upload]                                              |
+--------------------------------------------------------+----------------------------------------------------------------+
| LEFT PANEL: SAMPLE SELECTION                           | RIGHT PANEL: PERSONALIZED LOCUS RECONSTITUTION                 |
|                                                        |                                                                |
| [B3] COHORT SELECTOR:                                  | [B7] SAMPLE SUMMARY CARD:                                      |
|   (o) PATIENT_001_CCR5_WT   (Reference CD34+ HSPCs)    |      ID: PATIENT_002_CCR5_DELTA32 | Target: CCR5               |
|   (*) PATIENT_002_DELTA32   (Heterozygous rs333 del)   |      Tissue: PBMCs | Reference: GRCh38 | Status: IRB Approved  |
|   (o) PATIENT_003_SEED_SNP  (PAM-disrupting rs1800024) +----------------------------------------------------------------+
|   (o) PATIENT_004_HBB_E6V   (Sickle Cell Pathogenic)   | [B8] LOCUS TRACK VIEWER (SVG Graphic):                         |
|                                                        |      Genomic Window: chr3:46,373,000 - 46,374,000              |
| [B4] PRESET TEMPLATE BUTTONS:                          |      [Exon 1]=====[Intron]=====[Exon 2 (delta32: DEL)]======== |
|   [Load Delta32]  [Load Seed SNP]  [Load HBB Sickle]   |      Reference: ...GAGTCATGCTCTTCAGCTCTTCAGGTATCAG...          |
|                                                        |      Patient:   ...G-------------------------------...         |
| [B5] VCF TEXT / RAW INPUT BOX:                         |                                                                |
|   +--------------------------------------------------+ +----------------------------------------------------------------+
|   | ##fileformat=VCFv4.2                             | | [B9] ANNOTATED CLINVAR VARIANTS TABLE:                         |
|   | #CHROM  POS       ID     REF   ALT   FILTER ...  | | Variant   | Position   | Type | Zygosity | ClinVar / Effect    |
|   | chr3    46373452  rs333  GAGT  G     PASS   ...  | |-----------+------------+------+----------+---------------------|
|   +--------------------------------------------------+ | rs333     | 46,373,452 | DEL  | HET (0/1)| Confers HIV entry R |
|                                                        |                                                                |
| [B6] ACTION BUTTON:                                    | [B10] NEXT STAGE ACTION:                                       |
|   [ 🧬 Parse & Personalize Locus ]                     |   [ Proceed to Personalized CRISPR Design (Tab 2) ➔ ]          |
+--------------------------------------------------------+----------------------------------------------------------------+
```

### Component Details
* **[B1] Hero Header:** Informs the researcher of why personalized intake is scientifically required: generic reference genomes miss patient-specific SNPs in PAM sites.
* **[B2] Cohort vs Custom Toggle:** Switches between pre-loaded clinical reference cases and custom VCF ingestion.
* **[B3] Cohort Patient List:** Displays built-in validated benchmarks (CCR5 delta32, HBB Sickle Cell mutation, PAM-collision SNPs). Clicking any patient immediately selects them.
* **[B4] Quick-Load Templates:** Injects exact synthetic VCF strings for rapid research testing.
* **[B5] VCF Raw Input Area:** Allows pasting custom VCF v4.2 text files.
* **[B6] Parse & Personalize Button:** Sends the raw VCF and target gene symbol to backend `/api/sample/personalize-sequence`.
* **[B7] Sample Metadata Card:** Shows donor ID, tissue origin, target gene, and ethical compliance clearance.
* **[B8] Locus Track Viewer:** Visual genomic map rendering exons, introns, and patient mutation markers (deletions highlighted in red, SNPs in amber).
* **[B9] ClinVar Variant Annotations Table:** Lists every variant found, ClinVar accession, chromosomal coordinates, and pathogenic classification.
* **[B10] Proceed Button:** Transfers the reconstituted genomic sequence and variants directly into Tab 2.

---

## Screen 2: Personalized CRISPR Design Studio
**File:** `frontend/src/components/CrisprDesignerView.jsx`  
**Route/Tab:** `2. Personalized CRISPR Design`

```
+-------------------------------------------------------------------------------------------------------------------------+
| [C1] METRICS BAR: Target Gene: CCR5 | Nuclease: SpCas9 | Total Guides: 14 | Top Azimuth: 0.81 | Safe Guides (CFD>0.7): 9  |
+-------------------------------------------------------------------------------------------------------------------------+
| [C2] TOOLBAR CONTROLS:                                                                                                  |
|   Nuclease: [ SpCas9 (NGG) ▼ ] | Sort By: [ Efficiency (Azimuth) ▼ ] | Filter: [ All Guides | CBE | ABE ] | [🔄 Rescan] |
+--------------------------------------------------------+----------------------------------------------------------------+
| LEFT PANEL: CANDIDATE GUIDES TABLE                     | RIGHT PANEL: GUIDE DEEP-DIVE & SAFETY GATE                     |
|                                                        |                                                                |
| [C3] GUIDE LIST:                                       | [C5] SELECTED GUIDE DOSSIER:                                   |
| Guide ID  | Sequence (20nt)      | PAM | Azimuth | CFD |      ID: sgRNA_CCR5_04 | PAM: TGG | Strand: (-)                |
|-----------+----------------------+-----+---------+-----|      20nt Target: 5'- GATAGTCATCTTGGGGCTGG -3'                |
| sgRNA_01  | GATAGTCATCTTGGGGCTGG | TGG |  0.81   | 0.94|                                                                |
| sgRNA_02* | TTTTCCAGAAGAACTCTCTC | AGG |  0.78   | 0.65| [C6] DUAL EFFICIENCY COMPARISON:                               |
| sgRNA_03  | AGTGTCAAGTCCAATCTATG | TGG |  0.72   | 0.88|      Patient Sequence Cleavage:   [█████████████░░░] 81%       |
| sgRNA_04  | CTCTTCAGCTCTTCAGGTAT | CGG |  0.69   | 0.91|      Reference Genome Cleavage:   [████████████░░░░] 74%       |
|                                                        |      Difference: +7.0% due to favorable local GC shift         |
| (* Amber border indicates High Off-Target Risk)        |                                                                |
|                                                        | [C7] BASE EDITING WINDOW (CBE / ABE):                          |
| [C4] TABLE PAGINATION / SUMMARY:                       |      Editing Window (Pos 4-8): [T C T T G]                     |
|   Showing 4 of 14 Guides | 1 Guide Collides with SNP   |      Targetable Cytidines: 1 | Targetable Adenines: 0          |
|                                                        |                                                                |
|                                                        | [C8] OFF-TARGET CFD SAFETY MATRIX:                             |
|                                                        |      Genome-wide CFD Score: 0.94 (High Specificity)            |
|                                                        |      Predicted Off-Target Sites: 2 (Non-genic introns)         |
|                                                        |                                                                |
|                                                        | [C9] HUMAN EXPERT REVIEW GATE:                                 |
|                                                        |      Status: [ PENDING EXPERT REVIEW ]                         |
|                                                        |      [ 🛡 Request Expert Review Sign-Off ]                      |
|                                                        |                                                                |
|                                                        | [C10] FORWARD ACTIONS:                                         |
|                                                        |      [ Export to Wet-Lab Studio (Tab 3) ➔ ]                    |
+--------------------------------------------------------+----------------------------------------------------------------+
```

### Component Details
* **[C1] Design Metrics Bar:** Displays real-time summary statistics for the target locus.
* **[C2] Toolbar Controls:**
  * Nuclease dropdown: Selects between `SpCas9 (NGG)`, `SaCas9 (NNGRRT)`, and `Cas12a (TTTV)`.
  * Sort dropdown: Orders candidate guides by either on-target Azimuth score or CFD off-target score.
  * Modality buttons: Filters for Base Editors (CBE: C-to-T transitions; ABE: A-to-G transitions).
* **[C3] Candidate Guides Table:** Interactive table listing all calculated guides. Clicking any row selects the guide and updates the right panel. Rows with low safety scores are highlighted with warning indicators.
* **[C4] Summary Status:** Highlights whether any guide collides with a patient-specific germline/somatic SNP.
* **[C5] Selected Guide Dossier:** Displays nucleotide breakdown, orientation (sense/antisense), and PAM recognition locus.
* **[C6] Dual Cleavage Efficiency Gauge:** Compares cleavage score on the patient's personalized sequence versus the standard reference genome.
* **[C7] Base Editing Window:** Pinpoints nucleotides in positions 4 through 8 of the protospacer to evaluate deaminase feasibility.
* **[C8] CFD Safety Matrix:** Displays computed off-target scores and flags off-target risk sites.
* **[C9] Expert Review Gate Button:** Launches the modal (`ExpertReviewModal.jsx`) for clinical approval if off-target risk requires justification.
* **[C10] Transfer Button:** Passes the selected guide directly to Tab 3 for cloning and delivery calculations.

---

## Screen 3: Wet-Lab & Delivery Studio
**File:** `frontend/src/components/WetLabStudioView.jsx`  
**Route/Tab:** `3. Wet-Lab & Delivery Studio`

```
+-------------------------------------------------------------------------------------------------------------------------+
| [D1] WORKBENCH NAVIGATION TABS:                                                                                         |
|   [● 1. Oligo Synthesizer]  |  [2. Delivery Advisor]  |  [3. Dual-Guide Excision]  |  [4. Cohort Comparative Matrix]    |
+-------------------------------------------------------------------------------------------------------------------------+
| ACTIVE SUB-VIEW: 1. OLIGO SYNTHESIZER FOR GOLDEN GATE CLONING                                                          |
+--------------------------------------------------------+----------------------------------------------------------------+
| LEFT PANEL: CONFIGURATION                              | RIGHT PANEL: OLIGO SEQUENCES & CLONING PROTOCOL                |
|                                                        |                                                                |
| [D2] ACTIVE GUIDE SELECTION:                           | [D5] SYNTHESIS-READY OLIGO CARDS:                              |
|   Guide ID: sgRNA_CCR5_04                              |   +----------------------------------------------------------+ |
|   20nt: GATAGTCATCTTGGGGCTGG                           |   | TOP STRAND (Sense):                                      | |
|                                                        |   | 5'- CACC GATAGTCATCTTGGGGCTGG -3'            [Copy Oligo]| |
| [D3] PLASMID BACKBONE SELECTOR:                        |   | Length: 24 nt | Tm: 64.2°C | Overhang: CACC (BbsI)        | |
|   (*) pX459_BbsI       (SpCas9 + Puromycin Selection)  |   +----------------------------------------------------------+ |
|   (o) lentiCRISPRv2    (Lentiviral BsmBI Cloning)      |   | BOTTOM STRAND (Antisense):                               | |
|   (o) pX330_BbsI       (SpCas9 Standard Expression)    |   | 5'- AAAC CCAGCCCCAAGATGACTATC -3'            [Copy Oligo]| |
|   (o) pCas-Guide_BsmBI (Mammalian Neomycin)            |   | Length: 24 nt | Tm: 64.2°C | Overhang: AAAC (BbsI)        | |
|                                                        |   +----------------------------------------------------------+ |
| [D4] ACTION BUTTON:                                    |                                                                |
|   [ 🧪 Recalculate Annealing Mix ]                     | [D6] THERMOCYCLER PROTOCOL:                                    |
|                                                        |   1. 95°C for 5 min (Denaturation)                             |
|                                                        |   2. Ramp down to 25°C at 0.1°C/sec (Annealing)                |
|                                                        |   3. Ligation into digested plasmid with T4 DNA Ligase         |
|                                                        |                                                                |
|                                                        | [D7] BULK EXPORT:                                              |
|                                                        |   [ 📋 Copy CSV for IDT / Twist Bioscience Ordering ]          |
+--------------------------------------------------------+----------------------------------------------------------------+
```

```
+-------------------------------------------------------------------------------------------------------------------------+
| ACTIVE SUB-VIEW: 2. DELIVERY ADVISOR (When Tab 2 is clicked)                                                           |
+-------------------------------------------------------------------------------------------------------------------------+
| [D8] CLINICAL TARGET INPUTS:                                                                                            |
|   Target Tissue: [ CD34+ HSPCs (Bone Marrow) ▼ ] | Nuclease: [ SpCas9 (4.2kb) ▼ ] | Promoter: [ EFS (Short) ▼ ]         |
+-------------------------------------------------------------------------------------------------------------------------+
| [D9] DELIVERY VEHICLE FEASIBILITY CARDS:                                                                               |
|   +--------------------------+  +--------------------------+  +--------------------------+  +-------------------------+ |
|   | LENTIVIRUS (Integrative) |  | AAV-6 (Adeno-Associated) |  | LNP (mRNA/RNP Complex)   |  | ELECTROPORATION (RNP)   | |
|   | Status: RECOMMENDED [✔]  |  | Status: WARNING [⚠]      |  | Status: EXPERIMENTAL     |  | Status: GOLD STANDARD   | |
|   | Packaging Capacity: 8.5kb|  | Packaging Capacity: 4.7kb|  | Capacity: No limit       |  | Capacity: No limit      | |
|   | Cargo Size: 4.8 kb (PASS)|  | Cargo: 4.8 kb (OVERFLOW) |  | Transfection Eff: 78%    |  | Viability: 89%          | |
|   | Insertion Risk: Moderate |  | Immunogenicity: Low      |  | Tissue Tropism: Liver    |  | Preferred for ex-vivo   | |
|   +--------------------------+  +--------------------------+  +--------------------------+  +-------------------------+ |
+-------------------------------------------------------------------------------------------------------------------------+
```

### Component Details
* **[D1] Studio Sub-Tabs:** Toggles between Oligo Synthesizer, Delivery Advisor, Dual-Guide Excision Planner, and Cohort Comparison Matrix.
* **[D2] Active Guide Summary:** Confirms which guide from Tab 2 is being prepared for physical synthesis.
* **[D3] Plasmid Backbone Selector:** Selects standard laboratory plasmids. The system automatically selects the correct restriction enzyme overhangs (e.g., `CACC`/`AAAC` for BbsI; `CACCG`/`AAAC` for BsmBI).
* **[D4] Recalculate Button:** Refreshes annealing temperatures and overhang logic.
* **[D5] Synthesis-Ready Cards:** Renders forward and reverse single-stranded DNA oligos with one-click copy buttons ready for commercial synthesis order portals.
* **[D6] Thermocycler Protocol:** Step-by-step wet-lab annealing thermal profile.
* **[D7] Bulk Export Button:** Generates a formatted CSV file compatible with IDT (Integrated DNA Technologies) bulk plate orders.
* **[D8] Delivery Parameter Selectors:** Configures target tissue, nuclease protein size, and promoter length.
* **[D9] Feasibility Comparison Matrix:** Compares viral vs. non-viral delivery strategies against strict biophysical packaging limits (e.g., AAV 4.7kb cargo limit).

---

## Screen 4: Stem Cell & Regeneration Planner
**File:** `frontend/src/components/RegenerationView.jsx`  
**Route/Tab:** `4. Stem Cell & Regeneration`

```
+-------------------------------------------------------------------------------------------------------------------------+
| [E1] HERO HEADER: Module 7 — Stem Cell Lineage Specification & Oncogene Risk Screening                                 |
+-------------------------------------------------------------------------------------------------------------------------+
| [E2] TARGET ORGAN / LINEAGE SELECTOR:                                                                                   |
|   (*) Dopaminergic Neurons (Parkinson's)  |  (o) Ventricular Cardiomyocytes (Heart Failure)  |  (o) Hematopoietic Stem Cells|
+--------------------------------------------------------+----------------------------------------------------------------+
| LEFT PANEL: PROTOCOL & FACTOR SELECTION                | RIGHT PANEL: ONCOGENIC SAFETY & TIMELINE                       |
|                                                        |                                                                |
| [E3] REPROGRAMMING FACTOR CHECKBOXES:                  | [E6] TUMORIGENIC RISK SCORE GAUGE:                             |
|   Transcription Factors:                               |      Overall Risk: [ LOW RISK: 0.18 / 1.0 ]                    |
|   [X] OCT4 (POU5F1)     [X] SOX2                       |      Teratoma Probability: LOW                                 |
|   [X] KLF4              [ ] c-MYC  ⚠ (High Risk)       |      Oncogene Reactivation Risk: NONE DETECTED                 |
|   [ ] L-MYC (Safer)     [ ] LIN28                      |      Recommendation: Approved for pre-clinical modeling        |
|                                                        +----------------------------------------------------------------+
| [E4] DELIVERY MODALITY:                                | [E7] WADDINGTON DIFFERENTIATION TIMELINE:                      |
|   (o) Retroviral (High Genomic Insertion Risk)         |      Stage 1 (Days 0-5):   Neural Progenitor Induction         |
|   (o) Lentiviral (Moderate Risk)                       |         Markers: SOX1, PAX6 | QC: Noggin + SB431542            |
|   (*) Sendai Virus (Cytoplasmic RNA — Zero Integration)|      Stage 2 (Days 6-14):  Midbrain Dopaminergic Patterning    |
|   (o) Synthetic mRNA / Small Molecules                 |         Markers: FOXA2, LMX1A | QC: SHH + CHIR99021            |
|                                                        |      Stage 3 (Days 15-28): Mature Dopaminergic Neurons         |
| [E5] ACTION:                                           |         Markers: TH, NURR1, DAT | QC: Action Potentials        |
|   [ 🧪 Re-evaluate Reprogramming Safety ]              |                                                                |
|                                                        | [E8] NEXT STEP:                                                |
|                                                        |   [ Export Protocol to Research Dossier (Tab 5) ➔ ]            |
+--------------------------------------------------------+----------------------------------------------------------------+
```

### Component Details
* **[E1] Header Banner:** Outlines lineage reprogramming and safety controls against teratoma formation.
* **[E2] Lineage Selector:** Sets target tissue type (neurons, cardiomyocytes, or blood stem cells).
* **[E3] Factor Matrix:** Interactive factor toggles. Checking `c-MYC` immediately alerts the user to elevated oncogenic transformation risk.
* **[E4] Modality Radio Buttons:** Selects delivery method; non-integrative Sendai virus or mRNA is prioritized over integrative retroviruses.
* **[E5] Re-evaluate Button:** Invokes `/api/regeneration/evaluate` to simulate teratoma and tumorigenic hazard indexes.
* **[E6] Tumorigenic Risk Gauge:** Visual meter displaying risk score from 0.0 to 1.0.
* **[E7] Timeline Stepper:** Step-by-step differentiation timeline detailing culture day ranges, required molecular markers, and critical quality control checkpoints.
* **[E8] Export Button:** Transfers safety clearance data to Tab 5.

---

## Screen 5: Research Dossier & Audit Trail
**File:** `frontend/src/components/ResearchReportView.jsx`  
**Route/Tab:** `5. Research Dossier & Audit`

```
+-------------------------------------------------------------------------------------------------------------------------+
| [F1] ACTION BAR: [ 📄 Generate Complete Dossier ]  [ 🖨 Print / Save as PDF ]  [ 💾 Download JSON Data ]  [ Status: Ready ] |
+--------------------------------------------------------+----------------------------------------------------------------+
| LEFT PANEL: AUDIT TRAIL LOG FEED (21 CFR Part 11)      | RIGHT PANEL: PRINT-READY RESEARCH DOSSIER                      |
|                                                        |                                                                |
| [F2] IMMUTABLE EVENT STREAM:                           | [F4] FORMAL DOSSIER DOCUMENT (A4 Preview):                     |
| +----------------------------------------------------+ | +------------------------------------------------------------+ |
| | [2026-10-13 05:10:02] AUDIT_INITIALIZE             | | | GENOMIC RESEARCH CO-PILOT: PRE-CLINICAL DOSSIER          | |
| | User: Dr. Maji | Action: Ingested Patient 002      | | | Document Ref: GRC-2026-CCR5-DEL32-001                      | |
| | Hash: 8f9a2b... Verified ✔                         | | | Patient ID: PATIENT_002_CCR5_DELTA32                       | |
| |----------------------------------------------------| | | Primary Locus: CCR5 (chr3:46373452)                        | |
| | [2026-10-13 05:12:30] GUIDES_COMPUTED              | | +------------------------------------------------------------+ |
| | Alg: Azimuth 2.0 | Count: 14 | Top Score: 0.81     | | | 1. EXECUTIVE SUMMARY & TARGET VALIDATION                   | |
| | Hash: 3c1e94... Verified ✔                         | | | Heterozygous 32-bp deletion confirmed. Guide sgRNA_04 is   | |
| |----------------------------------------------------| | | cleared for target-specific knockout.                      | |
| | [2026-10-13 05:15:11] EXPERT_REVIEW_SIGNED         | | +------------------------------------------------------------+ |
| | Signer: Lead Geneticist | Decision: APPROVED       | | | 2. NOMINATED GUIDE RNA SPECIFICATIONS                      | |
| | IRB: IRB-2025-GT-4081 | Hash: 99a1f0... Verified ✔ | | | 20nt Sequence: GATAGTCATCTTGGGGCTGG | PAM: TGG             | |
| +----------------------------------------------------+ | | On-Target Efficiency: 81.0% | CFD Safety Score: 0.94        | |
|                                                        | +------------------------------------------------------------+ |
| [F3] AUDIT INTEGRITY BADGE:                            | | 3. REGULATORY COMPLIANCE & EXPERT SIGN-OFF                 | |
|   Cryptographic Verification: All hashes chained       | | Approved with Empirical Validation Caveats                   | |
|   Database Record: genom.db / audit_trail.jsonl        | | Reviewer: Lead Geneticist | IRB-2025-GT-4081                 | |
+--------------------------------------------------------+----------------------------------------------------------------+
```

### Component Details
* **[F1] Action Bar:** Triggers compilation of all session data into clinical-grade summaries, formatted PDF printing, or raw JSON data export.
* **[F2] Audit Trail Stream:** Read-only, timestamped list of every design step executed in the session.
* **[F3] Cryptographic Audit Badge:** Confirms SHA-256 event chaining ensuring reports cannot be forged.
* **[F4] Dossier Document Preview:** A clean, printable clinical dossier summarizing patient genetics, selected guide biophysics, synthesis primers, delivery vectors, and expert sign-off credentials.

---

## Screen 6: OncoCRISPR Designer & Tumor Fingerprint
**File:** `frontend/src/components/OncoCrisprDesignerView.jsx` + `frontend/src/components/playground/TumorFingerprint.jsx`  
**Route/Tab:** `6. OncoCRISPR Designer` (ONCO badge)

```
+-------------------------------------------------------------------------------------------------------------------------+
| [G1] ONCOLOGY TARGET PRESETS:  [ KRAS G12D (Pancreatic/CRC) ]  [ BRAF V600E (Melanoma) ]  [ EGFR L858R (NSCLC) ]         |
+--------------------------------------------------------+----------------------------------------------------------------+
| LEFT PANEL: SOMATIC PROFILE & TUMOR FINGERPRINT        | RIGHT PANEL: ALLELE-SPECIFIC CRISPR & NEOANTIGEN               |
|                                                        |                                                                |
| [G2] DRIVER GENE & MUTATION INPUTS:                    | [G6] ALLELE DISCRIMINATION RESULTS:                            |
|   Gene: [ KRAS    ] | Mutation: [ G12D             ]   |   +----------------------------------------------------------+ |
|   Tier: OncoKB 2A   | COSMIC Count: 41,247 Samples     |   | Guide: GTAGTTGGAGCTGGTGGCGT (PAM: AGG)                   | |
|                                                        |   | Mutant Allele Cleavage:    [████████████████░] 88%       | |
| [G3] TUMOR IDENTITY FINGERPRINT (8-Axis Polar Radar):  |   | Wildtype Allele Cleavage:  [█░░░░░░░░░░░░░░░░] 04%       | |
|                    TMB (High)                          |   | Discrimination Ratio:      22.0x (EXCELLENT [✔])         | |
|                        /\                              |   +----------------------------------------------------------+ |
|       CRISPR Eff.     /  \     MSI (MSS)               |                                                                |
|            \         /    \        /                   | [G7] NEOANTIGEN MHC-I PREDICTION ENGINE:                       |
|             \-------*------*------/                    |   Rank | Peptide 9-mer | HLA Allele | IC50 (nM) | Binding Rank |
|              |      |      |     |                     |   -----+---------------+------------+-----------+--------------|
|   Druggable -*------*------*-----*- Purity (68%)       |   1    | VVVGADGVG     | HLA-A*02:01|  42.5 nM  | SB (Strong)  |
|              |      |      |     |                     |   2    | KLVVVGADG     | HLA-A*02:01| 185.0 nM  | WB (Weak)    |
|             /-------*------*------\                    |                                                                |
|            /         \    /        \                   | [G8] VULNERABILITY SCORECARD:                                  |
|       ART Phage       \  /     Clonal CCF (92%)        |   Synthetic Lethal Partners: MTHFD2, SHMT2                     |
|                        \/                              |   Resistance Mechanisms: KRAS Amplification, MEK Mutation      |
|                   Immune Infiltration (Cold)           |                                                                |
|                                                        | [G9] FORWARD TO VIROTHERAPY:                                   |
| [G4] SEQUENCE COMPARISON:                              |   [ Send Tumor Profile to OncoViral Planner (Tab 7) ➔ ]        |
|   Tumor:    ...GTAGTTGGAGCT[G]GTGGCGTAGGC...           |                                                                |
|   Wildtype: ...GTAGTTGGAGCT[G]CTGGCGTAGGC...           |                                                                |
|                                                        |                                                                |
| [G5] ACTION: [ 🎯 Compute Allele-Specific Guides ]     |                                                                |
+--------------------------------------------------------+----------------------------------------------------------------+
```

### Component Details
* **[G1] Driver Mutation Preset Buttons:** Instantly loads sequence contexts for high-frequency oncogenic drivers (KRAS G12D, BRAF V600E, EGFR L858R).
* **[G2] Gene & Variant Inputs:** Custom mutation entry with OncoKB evidence tiers and COSMIC census counts.
* **[G3] Tumor Identity Fingerprint:** 8-axis polar radar chart mapping Tumor Mutational Burden (TMB), Microsatellite Instability (MSI), Purity, Dominant Clone Cancer Cell Fraction (CCF), Immune Infiltration, ART Phage Integration, Druggable Targets, and CRISPR Efficiency.
* **[G4] Sequence Context Comparison:** Visual comparison showing the exact single-nucleotide somatic mutation against the patient's wildtype allele.
* **[G5] Compute Guides Button:** Evaluates guides specifically designed to cleave the mutant allele while leaving the healthy wildtype allele completely intact.
* **[G6] Allele Discrimination Results:** Displays discrimination ratios; guides with high mutant cleavage (>80%) and low wildtype cutting (<5%) receive "EXCELLENT" status.
* **[G7] Neoantigen Prediction Engine:** Ranks mutant 9-mer peptides generated by the mutation against MHC class I (HLA-A*02:01) to identify vaccine/immunotherapy candidates.
* **[G8] Vulnerability Scorecard:** Lists synthetic lethal targets and expected resistance bypass genes.
* **[G9] Transfer Button:** Forwards tumor characteristics to the OncoViral planner in Tab 7.

---

## Screen 7: OncoViral Therapy Planner
**File:** `frontend/src/components/OncoViralPlannerView.jsx`  
**Route/Tab:** `7. OncoViral Therapy Planner` (ONCO badge)

```
+-------------------------------------------------------------------------------------------------------------------------+
| [H1] CLINICAL PROFILE INPUTS:                                                                                           |
|   Indication: [ Pancreatic PDAC ▼ ] | TMB: [ TMB-Low ] | MSI: [ MSS (Stable) ] | Immune: [ Immune Cold / Stroma-Dense ]|
+-------------------------------------------------------------------------------------------------------------------------+
| [H2] SUB-VIEWS:  [● Virus Recommendations]  |  [Payload Blueprint Builder]  |  [Viral Reference Database]              |
+--------------------------------------------------------+----------------------------------------------------------------+
| LEFT PANEL: BACKBONE SELECTION                         | RIGHT PANEL: BLUEPRINT & SAFETY SPECIFICATIONS                 |
|                                                        |                                                                |
| [H3] RECOMMENDED ONCOLYTIC BACKBONES:                  | [H5] PAYLOAD GENOME INTEGRATION SLOTS:                         |
|                                                        |      Engineered HSV-1 Backbone (152 kb genome)                 |
|   (*) HSV-1 (T-VEC Backbone)       Score: 94/100       |      [5' Inverted Repeat]                                      |
|       Tropism: High in PDAC | Insert Capacity: 30 kb   |      [Deleted: ICP34.5 (Neurovirulence factor)] ➔ [Slot 1: GM-CSF] |
|       Status: FDA Approved Backbone                    |      [Deleted: ICP47 (Immune evasion block)]   ➔ [Slot 2: IL-12]  |
|                                                        |      [Tumor Promoter: Survivin / BIRC5 (PDAC Specific)]        |
|   (o) Adenovirus (Ad5-Delta24)     Score: 81/100       |      [3' Inverted Repeat]                                      |
|       Tropism: Moderate | Insert Capacity: 5 kb        |                                                                |
|                                                        | [H6] IMMUNOLOGICAL RESPONSE PREDICTION:                        |
|   (o) VSV (Vesicular Stomatitis)   Score: 72/100       |      Tumor Microenvironment Shift: Cold ➔ Hot (Inflamed)       |
|       Tropism: Broad | Rapid Oncolysis | BSL-2         |      CD8+ T-Cell Infiltration: +340% predicted                 |
|                                                        |      PD-L1 Upregulation Expected (Synergistic w/ Pembrolizumab)|
| [H4] PAYLOAD & PROMOTER CONTROLS:                      |                                                                |
|   Cytokine Payload: [ GM-CSF (Dendritic Cell Act.) ▼ ] | [H7] BIOSAFETY LEVEL (BSL) VERIFICATION:                       |
|   Secondary Payload: [ IL-12 (Th1 / NK Activation) ▼ ] |      Biosafety Containment Level: BSL-2                        |
|   Tumor Promoter:    [ Survivin / BIRC5 Promoter ▼ ]   |      Pre-existing Seroprevalence: 62% in human adult population|
|                                                        |      Neutralizing Antibody Mitigation: Intratumoral delivery   |
+--------------------------------------------------------+----------------------------------------------------------------+
```

### Component Details
* **[H1] Clinical Profile Header:** Synchronized from Tab 6 or manually set to reflect tumor histology, TMB status, and immunological classification.
* **[H2] Planner Tabs:** Toggles between backbone recommendations, payload engineering, and virus database inspection.
* **[H3] Backbone Selector:** Ranked list of oncolytic viruses scored by tropism efficiency in the selected cancer type.
* **[H4] Payload & Promoter Controls:** Dropdowns to insert therapeutic genes (GM-CSF, IL-12, IFN-beta) and tumor-specific promoters (TERT, Survivin, CEA) to prevent replication in healthy tissues.
* **[H5] Payload Genome Integration Slots:** Interactive graphic depicting viral gene deletions (e.g., ICP34.5, ICP47) and inserted transgene slots.
* **[H6] Immunological Response Engine:** Predicts microenvironmental transformation, estimating T-cell infiltration and synergy with anti-PD-1 checkpoint inhibitors.
* **[H7] Biosafety Level Card:** Outlines physical biocontainment levels (BSL-1/BSL-2) and pre-existing human neutralizing antibody risks.

---

## Screen 8: ART Research Studio (Yoon et al. 2026)
**File:** `frontend/src/components/ArtResearchView.jsx`  
**Route/Tab:** `8. ART Research` (NEW badge)

```
+-------------------------------------------------------------------------------------------------------------------------+
| [I1] HERO BANNER: Array-Associated Reverse Transcriptases (AART) — Novel Biological Enzyme System                      |
|      "Computational exploration of programmable RNA-guided DNA writing based on Yoon et al. 2026 discovery"            |
+-------------------------------------------------------------------------------------------------------------------------+
| [I2] SUB-TABS:  [● Repeat Array Scanner]  |  [RNA Structure Modeling]  |  [Locus Architecture]  |  [Therapeutic Potential] |
+--------------------------------------------------------+----------------------------------------------------------------+
| LEFT PANEL: SEQUENCE INPUT & PARTNER SELECTION         | RIGHT PANEL: ARRAY ANALYSIS & COMPARATIVE MATRIX               |
|                                                        |                                                                |
| [I3] PRESET REPEAT ARRAYS:                             | [I6] REPEAT ARRAY SCAN RESULTS:                                |
|   [ MarsHill Jumbo Phage ]  [ L0050 Giant Phage ]      |      Status: TRUE DIRECT REPEAT ARRAY DETECTED [✔]             |
|   [ Negative Control (Random Sequence) ]               |      Array Architecture: 5 Tandem Repeats (Unit Size: 198 bp)  |
|                                                        |      Array Homology: 96.8% sequence identity                   |
| [I4] INPUT SEQUENCE (UPSTREAM ARRAY):                  |                                                                |
|   +--------------------------------------------------+ | [I7] COMPARISON: ART VS CRISPR / PRIME EDITING:                |
|   | AAGAACAATCTTTAGATTATCTATACTAAGAGAGTATTTATTCATGTG | | Feature            | CRISPR-Cas9 | Prime Editing | ART System|
|   | TATCGCATGTTAATTTAAAGGATTTATACATGTGTCTCGCATGTTGAA | |--------------------+-------------+---------------+-----------|
|   | TAATGTGAATTTAAAGGATTTATTCATGTGTCTCGCATGTCTATAATT | | Direct DNA Write   | No (Cut/HDR)| Yes (Reverse) | YES (RNA) |
|   +--------------------------------------------------+ | | DSB Requirement  | YES (DSB)   | No (Nick)     | NO DSB    |
|                                                        | | Target Specificity | Guide RNA   | pegRNA prime  | Repeat RNA|
| [I5] ACTION:                                           | | Partner Required   | None (RNP)  | M-MLV RT      | Type I-III|
|   [ 🔍 Scan for ART Repeat Arrays ]                    |                                                                |
|                                                        | [I8] RNA SECONDARY STRUCTURE PREVIEW:                          |
|                                                        |      Stem-Loop Hairpin Detected: -14.2 kcal/mol stability      |
+--------------------------------------------------------+----------------------------------------------------------------+
```

### Component Details
* **[I1] Header Banner:** Explains the biological context of the Yoon et al. 2026 discovery of phage-encoded reverse transcriptases.
* **[I2] Studio Tabs:** Navigates between Repeat Array Detection, RNA Secondary Folding, Multi-Gene Locus Architecture, and Therapeutic Potential.
* **[I3] Preset Buttons:** Loads verified giant bacteriophage repeat arrays (MarsHill Listeria phage, L0050 giant phage).
* **[I4] Input Area:** DNA sequence input field for de novo phage or bacterial contig analysis.
* **[I5] Scan Button:** Invokes `/api/aart/scan-array` to run mismatch-tolerant tandem repeat discovery.
* **[I6] Repeat Array Results:** Displays repeat unit sizes, copy counts, and consensus repeat motifs.
* **[I7] Comparative Table:** Side-by-side benchmark contrasting conventional CRISPR-Cas9 double-strand break (DSB) editing versus prime editing versus ART RNA-templated genome writing.
* **[I8] RNA Folding Preview:** Estimates structural free energy ($\Delta G$) for array transcripts.

---

## Screen 9: Real-Time Research Playground
**File:** `frontend/src/components/PlaygroundView.jsx` + sub-components in `frontend/src/components/playground/`  
**Route/Tab:** `9. Real-Time Playground` (LIVE [●] badge)

```
+-------------------------------------------------------------------------------------------------------------------------+
| [J1] HEADER: 🧬 Real-Time Research Playground  |  Connection: WebSocket Connected [●]  |  Protocol: ws://localhost:8000/ws   |
+-------------------------------------------------------------------------------------------------------------------------+
| [J2] PLAYGROUND MODES:   [● 1. Clone Evolution Simulator]  |  [2. 3D Molecular Viewer]  |  [3. Binding Animator]       |
+-------------------------------------------------------------------------------------------------------------------------+
| ACTIVE MODE: 1. CLONE EVOLUTION SIMULATOR                                                                               |
|                                                                                                                         |
| [J3] SIMULATION CONTROLS:                                                                                               |
|   Initial Clones: 3 | Therapy: KRAS Inhibitor at Cycle 5 | [ ▶ Start Therapy Simulation ] [ ⏸ Pause ] [ 🔄 Reset ]       |
+-------------------------------------------------------------------------------------------------------------------------+
| [J4] DYNAMIC MORAN PROCESS TIMELINE CHART (WebSocket Live Stream):                                                      |
|  Total Cells                                                                                                            |
|   1500 |                                              [▼ Therapy Initiated: Cycle 5]                            |
|        |    [███]                                                                                                       |
|   1000 |    [███] [███] [███] [███] [███]                                                                               |
|        |    [███] [███] [███] [███] [███]  [░░]                                             [███] [███]                 |
|    500 |    [███] [███] [███] [███] [███]  [░░]  [░░]  [▒▒]  [▒▒]  [▒▒]  [▒▒]  [███]  [███]  [███] [███]                 |
|        |    [███] [███] [███] [███] [███]  [░░]  [░░]  [▒▒]  [▒▒]  [▒▒]  [▒▒]  [███]  [███]  [███] [███]                 |
|      0 +-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+ t (Cycles)     |
|             t=0   t=2   t=4   t=5   t=6   t=8   t=10  t=12  t=14  t=16  t=18  t=20                                    |
|                                                                                                                         |
|  Legend: [■ Red: Clone A (KRAS G12D)]  [■ Blue: Clone B (TP53 null)]  [■ Yellow: Emerging Resistance Clone (Cycle 14)] |
+-------------------------------------------------------------------------------------------------------------------------+
| [J5] CLONE POPULATION CARDS:                                                                                            |
|   +-------------------------------+  +-------------------------------+  +---------------------------------------------+ |
|   | CLONE A (KRAS G12D)           |  | CLONE B (TP53 null)           |  | CLONE C (Resistant Subclone)                | |
|   | Cells: 1,000 ➔ 120 (Depleted) |  | Cells: 300 ➔ 450 (Stable)     |  | Cells: 0 ➔ 890 (EXPANDING [⚠])              | |
|   | Fitness: 1.2 ➔ 0.4 under drug |  | Fitness: 1.0 (Drug Tolerant)  |  | Acquired Mutation: RESISTANCE_CYC12         | |
|   +-------------------------------+  +-------------------------------+  +---------------------------------------------+ |
+-------------------------------------------------------------------------------------------------------------------------+
```

```
+-------------------------------------------------------------------------------------------------------------------------+
| ACTIVE MODE: 2. 3D MOLECULAR VIEWER (When Mode 2 is clicked)                                                            |
|                                                                                                                         |
| [J6] 3D CAS9-sgRNA-DNA COMPLEX INTERACTION CANVASES:                                                                    |
|                                                                                                                         |
|                       /-------------------------------------------\                                                     |
|                      /         . - ~ ~ ~ - .                       \                                                    |
|                     /      .-'   Cas9      '-.                      \                                                   |
|                    /     /      Protein        \                     \                                                  |
|                   |     |    (Blob Domain)      |                     |                                                 |
|                   |     |       [ 4ZT0 ]        |   [PAM NGG: Green]  |                                                 |
|                   |      \                     /                      |                                                 |
|                    \      '-.  (R-Loop)     .-'                      /                                                  |
|                     \         ' - ~ ~ ~ - '                         /                                                   |
|                      \   ===Target DNA Strand (Blue)===            /                                                    |
|                       \  ---sgRNA Guide Strand (Red)---           /                                                     |
|                        \                                         /                                                      |
|                         \---------------------------------------/                                                       |
|                                                                                                                         |
|   Camera Controls: [ Rotate X/Y ] [ Zoom In/Out ] [ Highlight Catalytic Sites (HNH / RuvC) ] [ Reset View ]              |
+-------------------------------------------------------------------------------------------------------------------------+
```

```
+-------------------------------------------------------------------------------------------------------------------------+
| ACTIVE MODE: 3. BINDING ANIMATOR (When Mode 3 is clicked)                                                               |
|                                                                                                                         |
| [J7] PROGRESS INDICATOR: Step 14 of 23 — Directional R-Loop Strand Invasion (Seed Region Complete)                     |
|                                                                                                                         |
| [J8] REAL-TIME HYDROGEN BONDING TRACK:                                                                                  |
|                                                                                                                         |
|   Target DNA 5'- G  A  T  A  G  T  C  A  T  C  T  T  G  G  G  G  C  T  G  G  [T  G  G] -3' (PAM Recognized)           |
|                  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |                                             |
|   sgRNA      3'- C  U  A  U  C  A  G  U  A  G  A  A  C  C  C  C  G  A  C  C  [    ] -5'                                |
|                  ▲                                                           ▲                                          |
|                  |-- Distal Non-Seed Region --| |-- Proximal Seed Region ----|                                          |
|                                                                                                                         |
|   Cas9 Cleavage Site: Between Nucleotide 17 and 18 [⚡ Double-Strand Break Formation Impending]                         |
+-------------------------------------------------------------------------------------------------------------------------+
```

### Component Details
* **[J1] Playground Header:** Displays live WebSocket connectivity status (`ws://localhost:8000/ws/playground`).
* **[J2] Mode Switcher:** Switches between Clone Evolution, 3D Molecular Viewer, and Base-Pairing Binding Animator.
* **[J3] Simulation Controls:** Triggers live Moran process computation, pausing, or resetting parameters.
* **[J4] Live Evolution Area Chart:** Stacked frequency chart updated every 300ms via WebSocket push messages. Visualizes how drug-sensitive clones collapse upon therapy delivery and resistant subclones emerge.
* **[J5] Clone Dynamics Cards:** Live metrics on individual subclone populations, fitness changes, and acquired mutations.
* **[J6] 3D Molecular Complex Viewer:** 3D structural canvas rendering Cas9, the target DNA duplex, and the sgRNA guide in spatial orientation with rotation controls.
* **[J7] Binding Animation Stepper:** Visualizes the sequential biophysical binding of the 20-nucleotide guide to the unzipped genomic locus.
* **[J8] Base Pairing Track:** High-resolution alignment rendering hydrogen bond pairings (`|`), discriminating the proximal seed region (positions 1-10) from the distal non-seed region (positions 11-20).

---

## Overlay A: Human Expert Review Gate Modal
**File:** `frontend/src/components/ExpertReviewModal.jsx`  
**Trigger:** Launched from Tab 2 (`CrisprDesignerView.jsx`) or Tab 6

```
+-------------------------------------------------------------------------------------------------------------------------+
| [K1] MODAL HEADER: 🛡 Clinical Expert Review & Off-Target Override Authorization                         [X Close]      |
+-------------------------------------------------------------------------------------------------------------------------+
| [K2] CANDIDATE SUMMARY:                                                                                                 |
|   Guide ID: sgRNA_CCR5_02 | Target Gene: CCR5 | Patient: PATIENT_002_CCR5_DELTA32 | Sequence: TTTTCCAGAAGAACTCTCTC (AGG) |
|   Computed Hazard: CFD Score = 0.65 (< 0.70 Threshold) — Automated Clearance Blocked                                    |
+-------------------------------------------------------------------------------------------------------------------------+
| [K3] REVIEWER CREDENTIALS & GOVERNANCE:                                                                                 |
|   Reviewer Full Name:     [ Dr. Pritam Maji, Ph.D.                                                           ]          |
|   Title / Institutional:  [ Lead Geneticist, Gene Editing & Cell Therapy Institute                           ]          |
|   IRB Protocol Clearance: [ IRB-2025-GT-4081                                                                 ]          |
+-------------------------------------------------------------------------------------------------------------------------+
| [K4] CLINICAL DECISION:                                                                                                 |
|   ( ) REJECT_CANDIDATE                                                                                                  |
|   ( ) APPROVED_FOR_UNRESTRICTED_RESEARCH                                                                                |
|   (*) APPROVED_WITH_CAVEATS (Mandatory wet-lab cleavage validation required)                                            |
+-------------------------------------------------------------------------------------------------------------------------+
| [K5] ETHICAL & REGULATORY CHECKLIST (All mandatory for approval):                                                       |
|   [X] I have inspected the off-target loci and confirmed no collision with known tumor suppressor exons.                 |
|   [X] I have verified the patient's germline SNP profile against the PAM and seed sequences.                           |
|   [X] Empirical wet-lab validation (GUIDE-seq / CIRCLE-seq) is mandated before in-vivo application.                    |
|   [X] In-vitro cellular toxicity screen completed and documented.                                                       |
|   [X] I certify compliance with GCP and institutional recombinant DNA committee standards.                             |
+-------------------------------------------------------------------------------------------------------------------------+
| [K6] SCIENTIFIC RATIONALE / CLINICAL JUSTIFICATION:                                                                     |
|   +-------------------------------------------------------------------------------------------------------------------+ |
|   | Candidate guide demonstrates acceptable on-target cleavage. Off-target matches fall exclusively into non-genic    | |
|   | heterochromatin with zero transcriptional activity. Cleavage approved subject to cellular verification.          | |
|   +-------------------------------------------------------------------------------------------------------------------+ |
+-------------------------------------------------------------------------------------------------------------------------+
| [K7] ACTIONS:                   [ Cancel / Reject ]                     [ 🛡 Sign & Cryptographically Commit Decision ] |
+-------------------------------------------------------------------------------------------------------------------------+
```

### Component Details
* **[K1] Modal Header:** Hard-stop modal overlay enforcing clinical governance.
* **[K2] Hazard Summary:** Displays the specific safety metric that triggered the gate (e.g., CFD score below safety threshold).
* **[K3] Credential Inputs:** Enforces entry of reviewer name, institutional title, and institutional review board (IRB) clearance number.
* **[K4] Decision Radio Buttons:** Sets formal disposition (`REJECT`, `APPROVED`, or `APPROVED_WITH_CAVEATS`).
* **[K5] Compliance Checklist:** Five mandatory checkboxes enforcing review of off-target risk, SNP collisions, and wet-lab validation requirements.
* **[K6] Rationale Box:** Mandatory text box requiring clinical justification for overriding software heuristics.
* **[K7] Sign & Commit Button:** Cryptographically records the review into `backend/expert_reviews.json` and appends an immutable record to the audit trail log.

---

## Overlay B: Scientific Knowledge Copilot Drawer
**File:** `frontend/src/components/KnowledgeCopilotView.jsx`  
**Trigger:** Launched via `[Ask AI]` button in persistent header from any screen

```
+---------------------------------------------------------------------------------+
| [L1] COPILOT HEADER: 🤖 Scientific Knowledge Co-Pilot                [X Close]  |
|      Grounded in PubMed, Nature, NEJM & Biomedical Knowledge Graph              |
+---------------------------------------------------------------------------------+
| [L2] ACTIVE CONTEXT BADGE:                                                      |
|      Current Focus: PATIENT_002_CCR5_DELTA32 | Target Gene: CCR5 | Tab: 2-CRISPR |
+---------------------------------------------------------------------------------+
| [L3] CHAT MESSAGE STREAM:                                                       |
|                                                                                 |
|  [AI Copilot - 05:12 PM]:                                                       |
|  Welcome. What research hypothesis or locus would you like to explore?          |
|                                                                                 |
|  [User - 05:14 PM]:                                                             |
|  Why does sgRNA_02 have a low CFD score compared to sgRNA_01?                    |
|                                                                                 |
|  [AI Copilot (Gemini Pro Synthesized) - 05:14 PM]:                              |
|  sgRNA_02 targets chr3:46373200 with sequence 5'-TTTTCCAGAAGAACTCTCTC-3'.       |
|  Biophysical analysis indicates:                                                |
|  1. A poly-T tract at positions 1-4 reduces SpCas9 transcriptional stability.   |
|  2. Genome-wide scanning identifies an off-target locus on Chromosome 11 with   |
|     only 1 mismatch in the non-seed region (CFD penalty = 0.35).                |
|                                                                                 |
|  Citations:                                                                     |
|  [PMID: 26780180] Doench et al. (Nature Biotech 2016) — CFD Scoring Model       |
|  [PMID: 24362877] Hsu et al. (Nature Biotech 2013) — Off-target rules           |
+---------------------------------------------------------------------------------+
| [L4] PRESET HYPOTHESIS CHIPS:                                                   |
|  [ "Explain CCR5-Δ32 mechanism" ]  [ "Why personalize guides?" ]  [ "c-MYC risk"]|
+---------------------------------------------------------------------------------+
| [L5] PROMPT INPUT & SEND CONTROLS:                                              |
|  +-------------------------------------------------------------------+ --------+|
|  | Ask a scientific question grounded in literature...               | | Send ➔||
|  +-------------------------------------------------------------------+ --------+|
+---------------------------------------------------------------------------------+
```

### Component Details
* **[L1] Drawer Header:** Slide-out panel accessible over any screen without disrupting workflow.
* **[L2] Active Context Awareness:** Displays the current patient, gene, and screen context automatically passed to the LLM prompt.
* **[L3] Chat Message Stream:** Displays conversation history. Assistant responses include citations with verified PubMed IDs (PMIDs).
* **[L4] Quick Prompt Chips:** One-click queries for common clinical questions.
* **[L5] Chat Input:** Sends natural language prompts to `/api/copilot/chat` powered by Google Gemini API integration and local PubMed RAG.

---

## 13. System Architecture & Inter-Screen Data Flow

```
                                [ SCREEN 1: SAMPLE INTAKE ]
                                             │
                         Reconstituted Personal Sequence + Variants
                                             ▼
                             [ SCREEN 2: CRISPR DESIGNER ]
                                             │
                        Nominated Guide RNA + Cleavage Predictions
                                             ▼
                             [ SCREEN 3: WET-LAB STUDIO ]
                                             │
                        Cloning Oligos + Delivery Specifications
                                             ▼
                             [ SCREEN 4: STEM CELL PLANNER ]
                                             │
                        Regenerative Protocols + Oncogene Screening
                                             ▼
                            [ SCREEN 5: RESEARCH DOSSIER ]
                                             │
                     Final 21 CFR Part 11 Audit Trail & Printed PDF
                                             │
  ┌──────────────────────────────────────────┴──────────────────────────────────────────┐
  │                                                                                     │
  ▼                                                                                     ▼
[ SCREEN 6: ONCOCRISPR ]                                                      [ SCREEN 8: ART RESEARCH ]
  │                                                                                     │
Somatic Variants + Tumor Fingerprint                                          Repeat Arrays + Secondary RNA
  │                                                                                     │
  ▼                                                                                     ▼
[ SCREEN 7: ONCOVIRAL PLANNER ]                                               [ SCREEN 9: REAL-TIME PLAYGROUND ]
  │                                                                                     │
Oncolytic Viral Backbone + Cytokines                                          Moran Cell Evolution + 3D Visualizer
```
