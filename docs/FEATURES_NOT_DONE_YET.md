# FEATURES_NOT_DONE_YET.MD — Incomplete Features, Scientific Limitations & Future Roadmap

> **Genomic Research Copilot / Precision Oncology OS**  
> Complete and transparent audit of all features, biological models, wet-lab integrations, and UI components that are **not done yet**, currently operate via heuristics/proxies, or remain on the future development horizon.

---

## 1. Executive Summary & Audit Philosophy

While the platform has completed its core functional architecture (personal VCF sequence reconstitution, Azimuth/CFD scoring, Golden Gate oligo generation, stem cell hazard evaluation, allele-specific OncoCRISPR, oncolytic viral planning, phage ART array scanning, and the real-time Moran process simulation playground), **true clinical medicine demands total honesty about scientific limitations**.

This document outlines every feature that remains **incomplete**, **partially implemented**, or **in need of deep-scale integration** before this software can be deployed in live clinical trials or hospital tumor boards.

```
+---------------------------------------------------------------------------------------------------------+
|                                    STATUS OF SYSTEM CAPABILITIES                                        |
+---------------------------------------------------------------------------------------------------------+
| [✔ COMPLETED]       Personal VCF Ingestion, Personalized PAM/Seed Scanning, CFD Off-Target Matrix      |
| [✔ COMPLETED]       Golden Gate Cloning Primers, AAV Packaging Checker, Stem Cell Teratoma Risk         |
| [✔ COMPLETED]       Allele-Specific KRAS/BRAF Guides, 8-Axis Tumor Radar, Oncolytic Viral Blueprints     |
| [✔ COMPLETED]       WebSocket Moran Process Simulator, Binding Animator, 21 CFR Part 11 Audit Trail    |
| [✔ SPRINT 1 DONE]   True Atomistic WebGL 3D Molecule Viewer (Mol* coordinate rendering & PDB 4ZT0)      |
| [✔ SPRINT 2 DONE]   Multi-Omics RNA-seq Expression Matrix Ingestion & Tissue Filtering (TCGA / GTEx)    |
| [✔ SPRINT 3 DONE]   Single-Cell RNA-seq (scRNA-seq) Cell Clustering, Cancer Stemness & 10x Visium Grid  |
| [✔ SPRINT 3 DONE]   CAR-T Tumor Surface Antigen Identification Engine & 2nd-Gen Construct Blueprint     |
| [✔ SPRINT 4 DONE]   In-Silico Phage ART Forward DNA Writing Construct Designer (DMD, CFTR, HBB)         |
| [✔ SPRINT 4 DONE]   Automated Commercial Synthesis B2B API Checkout (IDT / Twist / GenScript Direct)    |
| [✔ SPRINT 5 DONE]   Live ClinicalTrials.gov Matching, 18 NCI Center Centroids & Haversine Locator        |
| [✔ SPRINT 5 DONE]   Multi-User Live WebSocket Collaboration Hub, Real-Time Notepad & 21 CFR Sign-Off     |
| [✔ SPRINT 5 DONE]   Mobile & Tablet Responsive Layouts, Fixed Bottom Nav & Mobile Drawer Adaptation      |
| [✔ SPRINT 6 DONE]   PK/PD Intratumoral Virus Diffusion 5-Variable Reaction-Diffusion ODE/PDE Solver     |
| [✔ SPRINT 6 DONE]   Bacterial Retron msDNA Editor & DGR Targeted Hypermutagenesis Synthesizer (A -> N)  |
+---------------------------------------------------------------------------------------------------------+
| [⏳ NOT DONE YET]   Genome-Wide 3.2B Base-Pair Alignments (BWA-MEM / Cas-OFFinder full-genome index)   |
| [⏳ NOT DONE YET]   Standalone NetMHCpan-4.1 / MHCflurry Binary Execution (all 150+ HLA alleles)        |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. In-Depth Breakdown of Features Not Done Yet

### Category A: High-Impact Biological & Computational Features

#### 1. True Atomistic WebGL 3D Molecular Viewer (`Mol*` / `3Dmol.js`)
* **Current Status:** In `frontend/src/components/playground/MolecularViewer.jsx`, the 3D viewer uses a rotating 2.5D CSS/SVG abstract illustration of the Cas9 complex and DNA strands.
* **What is Not Done Yet:**
  - Embedding a true WebGL molecular graphics engine (such as [Mol*](https://molstar.org/) or [3Dmol.js](https://3dmol.csb.pitt.edu/)).
  - Direct fetching and parsing of `.pdb` and `.cif` coordinate files from RCSB PDB (e.g., PDB ID: `4ZT0` for SpCas9 bound to sgRNA and target DNA).
  - Atomistic visual modes: Ribbon backbone, van der Waals space-filling spheres, and electrostatic surface potential maps.
  - Interactive highlighting of the catalytic cut sites (RuvC Asp10 and HNH His840) and distance measurement (in Ångströms) between the active site and the patient's mutated base.
* **Why it matters:** An oncologist or protein engineer needs to see physical steric clashes and structural distortions caused by non-canonical PAMs.

---

#### 2. Genome-Wide 3.2-Billion Base-Pair Real Alignment Index (BWA / Cas-OFFinder)
* **Current Status:** `azimuth_cfd.py` implements the exact cutting frequency determination matrix for mismatches and checks known high-frequency homologous loci.
* **What is Not Done Yet:**
  - Indexing the complete 3.2-billion base-pair human genome (GRCh38) using local BWA-MEM or Cas-OFFinder algorithms.
  - Allowing users to scan all 23 pairs of chromosomes for unannotated 1-to-4 mismatch sites across non-coding heterochromatin in real time.
* **Why it matters:** In an actual hospital setting, whole-genome sequencing requires verifying that a guide has 0 genome-wide mismatches in all known tumor suppressor exons across all chromosomes.

---

#### 3. Standalone Neural Network NetMHCpan-4.1 / MHCflurry Binary Execution
* **Current Status:** `neoantigen_predictor.py` uses a NetMHCpan-style statistical position weight matrix (PWM) proxy specifically for the most common human allele (`HLA-A*02:01`).
* **What is Not Done Yet:**
  - Local installation and execution of the official standalone NetMHCpan-4.1 neural network binaries.
  - Support for all 150+ human leukocyte antigen variants (HLA-A, HLA-B, HLA-C, and MHC Class II HLA-DR/DP/DQ).
  - Integration of proteasomal cleavage predictions (NetChop) and Transporter associated with Antigen Processing (TAP) efficiency scoring.
* **Why it matters:** Real patients have diverse HLA haplogroups; a cancer vaccine cannot be formulated for non-HLA-A*02:01 patients without multi-allele coverage.

---

#### 4. In-Silico Phage ART Direct DNA Writing Construct Designer
* **Current Status:** `aart_modeler.py` detects natural phage repeat arrays, benchmarks the technology against CRISPR, and calculates secondary RNA stem-loop stability.
* **What is Not Done Yet:**
  - A forward de-novo construct designer where a user pastes a desired 5,000 bp therapeutic gene (e.g., full-length dystrophin or cystic fibrosis CFTR) and the software automatically fragments it into spacer subunits across a synthetic repeat array.
  - Modeling reverse transcriptase processivity and termination signals.
* **Why it matters:** Allows researchers to transition from analyzing natural giant phages to engineering synthetic DNA-writing constructs.

---

### Category B: Multi-Omics & Experimental Data Ingestion

#### 5. Multi-Omics RNA-seq Expression Matrix Upload & Expression Filtering
* **Current Status:** The platform operates predominantly on DNA sequencing data (germline and somatic SNPs, indels, and mutations).
* **What is Not Done Yet:**
  - An upload interface for RNA-seq gene expression count matrices (TPM, RPKM, or DESeq2 normalized counts).
  - An automated filter that cross-references candidate CRISPR guides with RNA expression levels.
  - Automatic de-prioritization of guides targeting genes with zero transcript expression in the target tissue.
* **Why it matters:** If a mutated gene has 0 mRNA copies expressed in the tumor, targeting it with gene editing or viral therapy is a wasted clinical effort.

---

#### 6. Single-Cell RNA-seq (scRNA-seq) & Spatial Transcriptomics
* **Current Status:** Tumor purity and cancer cell fractions (CCF) are inferred from bulk sequencing variant allele frequencies (VAF).
* **What is Not Done Yet:**
  - Ingestion of 10x Genomics single-cell sequencing files (`.h5` matrices, CellRanger outputs).
  - 2D UMAP / t-SNE interactive clustering visualizer showing distinct sub-clonal clusters.
  - Spatial transcriptomics overlay (10x Visium / Nanostring CosMx) allowing researchers to view immune cell exclusion bands directly on histological biopsy slides.
* **Why it matters:** Bulk sequencing masks rare, drug-resistant cell populations (e.g., 0.1% of cancer stem cells) that cause patient relapse.

---

#### 7. CAR-T Tumor Surface Antigen Prioritization Engine
* **Current Status:** Proposed in `docs/ROADMAP.md` (Phase 3.2).
* **What is Not Done Yet:**
  - Automated scanning of tumor profiles for overexpressed cell-surface receptors (HER2, CD19, BCMA, GD2, EGFRvIII).
  - Filtering against normal human tissue expression (GTEx database) to ensure the target is completely absent in healthy vital organs (preventing fatal "on-target, off-tumor" cross-reactivity).
  - Generating scFv antibody binding domain sequences for chimeric antigen receptor (CAR) T-cell engineering.
* **Why it matters:** CAR-T therapy is a primary pillar of modern oncology; integrating it provides an alternative when tumors lack druggable point mutations.

---

### Category C: Wet-Lab & Clinical Enterprise Integrations

#### 8. Automated B2B Wet-Lab Ordering API (IDT / Twist / GenScript Direct Checkout)
* **Current Status:** `WetLabStudioView.jsx` formats the exact cloning oligos and exports a downloadable CSV file.
* **What is Not Done Yet:**
  - Live OAuth2 REST integration with commercial synthesis vendors (Integrated DNA Technologies / IDT, Twist Bioscience, GenScript).
  - Direct in-app shopping cart and checkout where a lab manager can click "Order Plate" and have physical oligonucleotides synthesized and shipped automatically.
* **Why it matters:** Streamlines the research workflow from days of manual data re-entry into a single automated step.

---

#### 9. Live ClinicalTrials.gov API v2 Patient Location Matching
* **Current Status:** [✔ COMPLETED IN SPRINT 5 - Feature Spec 09]. `clinical_trials_matcher.py` provides multi-criteria precision oncology matching (0.0 to 1.0), 18 NCI Cancer Center ZIP geocodes, Haversine spherical distance calculation, 8 benchmark landmark trials, and RFC 4180 CSV export. Frontend view `ClinicalTrialsMatcher.jsx` is integrated in Tab 11.

---

#### 10. Pharmacokinetic / Pharmacodynamic (PK/PD) Intratumoral Virus Diffusion Solver
* **Current Status:** [✔ COMPLETED IN SPRINT 6 - Feature Spec 06]. `pkpd_viral_diffusion.py` implements a 5-variable spatiotemporal reaction-diffusion numerical solver ($U, I, V, A, K$) across 15 concentric spherical tumor shells with desmoplasia matrix barrier impedance, direct I.T. core bolus vs. transvascular I.V. extravasation modeling, bystander killing radius calculation, and RFC 4180 CSV export. Interactive visual dashboard integrated in `OncoViralPlannerView.jsx` (Tab 4).

---

### Category D: UI & Interactive Visualizer Enhancements

#### 11. Bacterial Retron & Diversity-Generating Retroelement (DGR) Modalities
* **Current Status:** [✔ COMPLETED IN SPRINT 6 - Feature Spec 12]. `retroelement_synthesizer.py` implements: (1) Retron msDNA Editor Designer (Eco1, Ec86, Ec48, Mx162) with 2'-5' branched guanosine linkage assembly, secondary hairpin $\Delta G$ thermodynamic prediction, and BsaI Golden Gate cloning primers; (2) DGR Targeted Hypermutagenesis Engine (Bordetella BPP-1, TdDGR, VcDGR) with selective adenine mutagenesis ($A \to N$ at $>50\%$ error rate, non-A fidelity $>99.9\%$), theoretical diversity calculation ($4^{N_A}$ variants), and degenerate IUPAC synthesis oligo export; (3) 7-Modality Precision Genome Engineering Comparison Matrix. Integrated in `ArtResearchView.jsx` (Tab 3) with direct 1-click B2B foundry ordering via `SynthesisOrderModal.jsx`.

#### 12. Multi-User Live Collaborative Workspace (Google Docs-Style Co-Editing)
* **Current Status:** [✔ COMPLETED IN SPRINT 5 - Feature Spec 10]. `collaboration_manager.py` implements an in-memory `CollaborationHub` with Starlette WebSockets (`/ws/collaboration/{session_id}`), live presence tracking, peer cursor position broadcasts, synchronized shared memo pad, threaded clinical notes, and 21 CFR Part 11 compliant consensus sign-offs with SQLite audit tables. Frontend `CollaborationSidebar.jsx` and `useCollaborationWS.js` provide seamless real-time co-review.

---

#### 13. Mobile & Tablet Responsive Layouts
* **Current Status:** [✔ COMPLETED IN SPRINT 5 - Feature Spec 11]. Responsive navigation with horizontal scroll and CLINICAL badge, fixed bottom navigation bar (`MobileBottomNav.jsx`) for viewport `<lg:`, responsive slide-out collaboration drawer with mobile viewport width bounding, and bottom padding on `<main>` preventing floating element occlusion.

---

## 3. Prioritized Implementation Roadmap

To build out these remaining features in the most impactful sequence, the following phases are scheduled:

```
+-------------------------------------------------------------------------------------------------------+
| SPRINT 1 (Next Milestone): True 3D Atomistic WebGL Molecule Viewer (Mol*)                              |
| - Replace SVG cartoon in MolecularViewer.jsx with real Mol* / 3Dmol.js canvas                         |
| - Render true PDB coordinates (PDB: 4ZT0) with ribbon/backbone, catalytic sites, and hydrogen bonds  |
+-------------------------------------------------------------------------------------------------------+
| SPRINT 2: Standalone Multi-Allele Neoantigen & CAR-T Suite                                            |
| - Expand neoantigen prediction to all major HLA-A, HLA-B, HLA-C alleles                               |
| - Add CAR-T surface target scanner cross-referenced with GTEx normal tissue filters                   |
+-------------------------------------------------------------------------------------------------------+
| SPRINT 3: Multi-Omics RNA-seq Matrix Upload & Expression Filtering                                    |
| - Add RNA-seq CSV intake tab in Module 1                                                              |
| - Filter candidate CRISPR guides by actual target transcript abundance (TPM > 1.0)                    |
+-------------------------------------------------------------------------------------------------------+
| SPRINT 4: ClinicalTrials.gov API v2 Live Sync & B2B Synthesis API                                     |
| - Connect live trial search with patient ZIP code matching                                            |
| - Direct commercial IDT oligo order payload generator                                                 |
+-------------------------------------------------------------------------------------------------------+
```

---

## 4. Final Assessment: What the Platform Can and Cannot Claim Today

| Claim | Status | Verification |
|---|---|---|
| *"Calculates personalized cleavage based on real patient SNPs"* | **100% OPERATIONAL** | Verified in `sample_intake.py` and `crispr_designer.py` |
| *"Generates Golden Gate cloning oligos with correct overhangs"* | **100% OPERATIONAL** | Verified in `oligo_synthesizer.py` |
| *"Evaluates teratoma and c-MYC oncogenic risk for stem cells"* | **100% OPERATIONAL** | Verified in `regeneration.py` |
| *"Generates unforgeable, SHA-256 chained 21 CFR Part 11 audit trails"* | **100% OPERATIONAL** | Verified in `security.py` and `audit_trail.jsonl` |
| *"Simulates cancer clone evolution under drug pressure in real-time"* | **100% OPERATIONAL** | Verified in `clone_simulator.py` via WebSockets |
| *"Renders atomistic 3D crystal structures with electron density"* | **NOT DONE YET** | Currently abstract 2.5D visualizer; requires Mol* WebGL |
| *"Performs whole-genome BWA alignment across 3.2 billion bases"* | **NOT DONE YET** | Currently CFD matrix + candidate search; requires 5GB index |
| *"Ingests and clusters single-cell RNA-seq datasets"* | **NOT DONE YET** | Bulk VAF proxy currently used; scRNA-seq planned for Phase 4 |
