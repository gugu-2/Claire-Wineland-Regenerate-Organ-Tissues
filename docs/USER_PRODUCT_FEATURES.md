# USER_PRODUCT_FEATURES.MD — What This Platform Does for Users

> **Genomic Research Copilot / Precision Oncology OS**  
> Complete User-Facing Capabilities Guide: Plain-English explanation of what this software does, the problems it solves, and how researchers, oncologists, and geneticists use it to design cures for fatal diseases and cancer.

---

## 1. Executive Vision: Why This Software Exists

### The Problem It Solves
For decades, medicine has treated cancer and genetic diseases with broad, one-size-fits-all treatments:
1. **Chemotherapy and radiation** poison both healthy cells and tumor cells indiscriminately, causing severe organ toxicity while tumors frequently mutate and become resistant.
2. **Traditional off-the-shelf gene editing** (standard CRISPR) designs genetic tools against an abstract "generic human reference genome" (GRCh38). But real patients have millions of unique, individual DNA variations (called Single Nucleotide Polymorphisms or SNPs). When a standard laboratory tool is used in a real patient, a tiny 1-letter personal variation can either **completely block the treatment from working** (by breaking the PAM recognition site) or cause **dangerous off-target cuts** in healthy organs, potentially triggering secondary cancers.
3. **Cancers are living, evolving ecosystems.** A tumor is not just one uniform mass; it contains multiple sub-clones. Even if a drug kills 90% of the tumor, the remaining 10% frequently evolves resistance mutations and rebounds with fatal aggression.

### What This Software Does
The **Genomic Research Copilot** is a **Precision Cancer Research Operating System and Genomic Cure Platform**. It transforms raw patient genetic data into individualized, actionable medical solutions:
- It builds a **digital twin of an individual patient's personal genome**.
- It designs **surgical gene therapies** that only cut disease mutations while leaving healthy cells 100% intact.
- It engineers **custom cancer-hunting viruses** that infect tumor cells and turn "cold" (invisible) tumors into "hot" (inflamed) targets for the immune system.
- It calculates **safe stem cell recipes** to regrow damaged organs without causing tumors.
- It provides a **real-time simulation playground** where researchers can watch tumor clones evolve, test treatments, and spot drug-resistance mutations *before* giving a therapy to a patient.

---

## 2. Complete User Feature Tour (What You Can Do)

```
+---------------------------------------------------------------------------------------------------------+
|                                    THE 9 USER-FACING CAPABILITIES                                       |
+---------------------------------------------------------------------------------------------------------+
| 1. Personal Genome Intake  ➔ Reconstruct patient-specific DNA and spot critical personal mutations     |
| 2. Precision CRISPR Studio ➔ Design personalized gene editing guides with zero off-target risk          |
| 3. Wet-Lab Physical Studio ➔ Get physical DNA ordering codes & delivery vehicles (AAV/Lentivirus/LNP)    |
| 4. Organ Regeneration      ➔ Grow healthy organs & stem cells with built-in tumor safety screening      |
| 5. Clinical Dossier Export ➔ Print hospital-ready, unforgeable pre-clinical reports for ethics boards   |
| 6. OncoCRISPR & Tumor Map  ➔ Map tumor identity (Radar Fingerprint) & cut cancer genes specifically     |
| 7. OncoViral Therapy       ➔ Build cancer-killing viruses with custom cytokine payloads (GM-CSF/IL-12)  |
| 8. Direct DNA Writing      ➔ Explore cutting-edge RNA-templated gene insertion without DNA breaks       |
| 9. Real-Time Playground    ➔ Watch live cancer evolution, test drug resistance & manipulate 3D molecules|
+---------------------------------------------------------------------------------------------------------+
```

---

### Feature 1: Patient-Specific DNA Intake & Personal Genome Discovery
**Where:** Tab 1 — *Sample & Locus Intake*

#### What the User Can Do:
- Upload real patient DNA sequencing files (standard VCF format from whole-genome or exome sequencing).
- Or choose from verified clinical benchmark cases (such as the HIV-protective CCR5-$\Delta$32 deletion, sickle cell anemia HBB mutations, or lethal oncogenic driver mutations).

#### What the Software Does for the User:
- **Builds a Personal Genome Twin:** Instead of assuming the patient matches a generic human textbook genome, the software reconstitutes the patient's exact chromosomal sequence letter by letter.
- **Identifies Target-Site Collisions:** It scans the target gene to see if the patient carries any natural variations (SNPs) where gene editing tools normally bind. If a patient has a mutation in the "PAM" binding site, the software flags it immediately, explaining why a standard generic drug would have failed.
- **Renders an Interactive Genomic Map:** Displays exons, introns, and patient mutations with ClinVar medical classifications (e.g., "Confers HIV Resistance", "Pathogenic Sickle Cell").

#### The Real-World Outcome:
The researcher immediately sees the true biological reality of the individual patient, eliminating guesswork before any expensive laboratory experiments begin.

---

### Feature 2: Personalized CRISPR Gene Editing Studio
**Where:** Tab 2 — *Personalized CRISPR Design*

#### What the User Can Do:
- Choose from multiple molecular editing scissors: standard **SpCas9**, compact **SaCas9** (ideal for packaging into small viral vectors), or staggered-cutting **Cas12a**.
- Filter for **Base Editors (CBE / ABE)** to chemically convert single faulty DNA letters (e.g., C-to-T or A-to-G) without cutting the DNA backbone.
- Search and sort candidate guides by cutting efficiency or safety rating.

#### What the Software Does for the User:
- **Dual Efficiency Comparison:** Side-by-side comparison showing how well the guide will cut the patient's personalized sequence versus the generic reference genome.
- **Genome-Wide Off-Target Safety Matrix (CFD Score):** Evaluates billions of base pairs across the entire human genome to see if the guide could accidentally bind or cut outside the target gene.
- **Identifies Base Editing Windows:** Highlights nucleotides located in positions 4 through 8 of the target sequence to determine if single-base rewriting is possible without dangerous double-strand DNA breaks.
- **Enforces Safety Review Gates:** If a guide has high potential to cut off-target, the software locks automated approval and requires a certified clinical expert to sign off with a medical rationale.

#### The Real-World Outcome:
The user selects a laser-focused, ultra-safe molecular guide that cuts only the disease locus with minimal risk of damaging healthy genes.

---

### Feature 3: Wet-Lab & Delivery Studio
**Where:** Tab 3 — *Wet-Lab & Delivery Studio*

#### What the User Can Do:
- Transition from computer design to the physical laboratory workbench.
- Select target delivery tissues (e.g., bone marrow blood stem cells, brain tissue, liver, heart muscle).
- Choose laboratory plasmid vectors (such as pX459 with puromycin selection or lentiCRISPRv2).

#### What the Software Does for the User:
- **Automated Oligo Synthesizer:** Instantly generates the exact forward and reverse single-stranded DNA sequences needed to order from commercial synthesis providers (like Integrated DNA Technologies / IDT or Twist Bioscience), complete with the exact sticky-end overhangs (`CACC` / `AAAC`) required for Golden Gate cloning.
- **One-Click Ordering Export:** Copies a pre-formatted CSV file ready to upload directly into commercial oligonucleotide ordering portals.
- **Delivery Vehicle Advisor:** Compares physical delivery vectors (Lentivirus, Adeno-Associated Virus AAV-6, Lipid Nanoparticles / LNP, and Electroporation) against strict biological laws:
  - Checks if the genetic cargo exceeds the strict 4.7 kilobase packaging limit of AAV.
  - Recommends the safest method for the target tissue (e.g., non-viral electroporation for blood stem cells; AAV for localized brain delivery).
- **Dual-Guide Excision Planner:** Automatically designs matched pairs of guides flanking a large defective gene segment to excise entire disease regions cleanly.

#### The Real-World Outcome:
The researcher walks into the wet lab with exact chemical recipes, primer sequences, thermocycler protocols, and vector delivery instructions ready to synthesize in test tubes.

---

### Feature 4: Stem Cell Organ & Tissue Regeneration Planner
**Where:** Tab 4 — *Stem Cell & Regeneration*

#### What the User Can Do:
- Plan how to regenerate organs and tissues damaged by disease or cancer therapies.
- Select target organ lineages (such as dopamine-producing brain neurons for Parkinson's disease, contractile heart muscle cells for heart failure, or hematopoietic blood stem cells).
- Customize cellular reprogramming cocktails (Yamanaka factors: OCT4, SOX2, KLF4, c-MYC, L-MYC, LIN28).

#### What the Software Does for the User:
- **Tumorigenic & Teratoma Risk Scoring:** Reprogramming adult cells back into pluripotent stem cells carries a dangerous risk of forming tumors (teratomas). The software evaluates the chosen cocktail and delivers an immediate safety score (from 0.0 to 1.0).
- **Oncogene Safeguard Warnings:** If the user selects dangerous cancer-promoting factors like `c-MYC`, the software flags the risk and suggests safer alternatives (like `L-MYC` or Sendai virus RNA delivery that does not integrate into host DNA).
- **Day-by-Day Differentiation Timelines (Waddington Landscape):** Provides a step-by-step laboratory roadmap showing what chemical growth factors to add on Day 0-2, Day 3-7, and Day 8-20, what molecular markers must be present (e.g., cardiac Troponin T, FOXA2), and what physical quality checks must be performed (such as checking for autonomous beating heart cells under the microscope).

#### The Real-World Outcome:
Researchers can safely grow healthy replacement tissues and organs from a patient's own cells without accidentally creating new cancers.

---

### Feature 5: Clinical Research Dossier & Regulatory Audit Trail
**Where:** Tab 5 — *Research Dossier & Audit*

#### What the User Can Do:
- Generate complete, hospital-ready clinical dossiers for institutional ethics boards, Institutional Review Boards (IRBs), and regulatory authorities.
- Download the complete session dataset as structured JSON.
- Open a formatted, print-ready document to save as an official PDF.

#### What the Software Does for the User:
- **21 CFR Part 11 Cryptographic Audit Trail:** Maintains an immutable, timestamped record of every action taken during the session (which patient was loaded, which guides were evaluated, who approved the safety override). Every entry is cryptographically linked with SHA-256 hashes, ensuring that medical records cannot be altered or fabricated.
- **Executive Clinical Summary:** Compiles patient genetics, nominated guide sequences, on/off-target scores, synthesis orders, delivery mechanisms, and expert approvals into an A4 document.

#### The Real-World Outcome:
Doctors and scientists have an unforgeable, legally compliant medical file ready to submit to regulatory bodies for pre-clinical clearance.

---

### Feature 6: Precision OncoCRISPR & The Tumor Fingerprint
**Where:** Tab 6 — *OncoCRISPR Designer* (ONCO Badge)

#### What the User Can Do:
- Target lethal oncogenic driver mutations that cause aggressive cancers (such as **KRAS G12D** in pancreatic and colon cancers, **BRAF V600E** in melanoma, or **EGFR L858R** in lung adenocarcinoma).
- Inspect the comprehensive biological identity of a patient's tumor.

#### What the Software Does for the User:
- **The 8-Axis Tumor Fingerprint (Polar Radar Chart):** Creates an instant visual signature of the patient's cancer across 8 critical dimensions:
  1. *Tumor Mutational Burden (TMB):* How mutated is the cancer?
  2. *Microsatellite Instability (MSI):* Is the DNA repair system broken?
  3. *Tumor Purity:* What percentage of the biopsy is cancer vs. healthy stroma?
  4. *Clonal Dominance (CCF):* Is this mutation present in all cancer cells, or just a small sub-clone?
  5. *Immune Infiltration:* Is the tumor "Hot" (swarming with immune cells) or "Cold" (invisible and shielded)?
  6. *ART Phage Potential:* Can novel direct-writing systems be deployed?
  7. *Druggable Targets:* Are there small-molecule drugs that can assist?
  8. *CRISPR Targetability:* Can this mutation be cleanly cleaved?
- **Allele-Specific Discrimination Engine:** In normal cells, cutting a vital gene kills the cell. The software designs guides that cut **only the mutant cancer letter** while leaving the normal wildtype allele intact (achieving over 20x discrimination ratios).
- **Neoantigen MHC-I Predictor:** Predicts which mutant protein fragments will be displayed on the surface of cancer cells (via HLA-A*02:01) to help design personalized mRNA cancer vaccines.
- **Synthetic Lethality Identification:** Recommends secondary metabolic vulnerabilities (e.g., MTHFD2, SHMT2) that can be targeted simultaneously to kill the tumor without toxicity to normal cells.

#### The Real-World Outcome:
Oncologists can target and eliminate the primary genetic driver of a patient's cancer with molecular precision, sparing normal organs from damage.

---

### Feature 7: Oncolytic Viral Therapy Planner
**Where:** Tab 7 — *OncoViral Therapy Planner* (ONCO Badge)

#### What the User Can Do:
- Design cancer-hunting oncolytic viruses for tumors that cannot be surgically removed or that fail to respond to standard immunotherapy.
- Select the patient's cancer type (Melanoma, Pancreatic PDAC, Glioblastoma brain tumors, Lung NSCLC, Colorectal, Ovarian, etc.).

#### What the Software Does for the User:
- **Intelligent Virus Backbone Selection:** Recommends the most potent viral backbones (such as modified Herpes Simplex Virus **HSV-1 / T-VEC**, **Adenovirus Ad5-Delta24**, or **Vesicular Stomatitis Virus / VSV**) based on their proven tropism (affinity) for the patient's specific tumor tissue.
- **Therapeutic Cytokine Engineering:** Lets the researcher insert immune-stimulating genes into the viral genome (such as **GM-CSF** to attract dendritic cells, or **IL-12** and **IFN-$\beta$** to activate killer T-cells).
- **Tumor-Specific Promoters:** Places viral replication under the control of cancer-only promoters (such as **TERT** or **Survivin / BIRC5**), ensuring that the virus only replicates and bursts open cancer cells, leaving healthy tissues untouched.
- **Tumor Microenvironment Transformation ("Cold-to-Hot"):** Predicts how effectively the virus will inflame the tumor, recruiting CD8+ killer T-cells and creating synergy with checkpoint inhibitor drugs (like Pembrolizumab / Keytruda).
- **Biosafety & Antibody Screening:** Verifies laboratory biocontainment levels (BSL-1 vs BSL-2) and estimates whether the patient's pre-existing immunity to common viruses will require direct intratumoral injection.

#### The Real-World Outcome:
Researchers can engineer a living, self-amplifying biological weapon tailored to destroy stroma-dense, immune-evasive tumors like pancreatic cancer.

---

### Feature 8: Next-Generation Direct DNA Writing Studio (Yoon et al. 2026)
**Where:** Tab 8 — *ART Research* (NEW Badge)

#### What the User Can Do:
- Explore the revolutionary frontier of genetic engineering: **Array-Associated Reverse Transcriptases (AART)** discovered in giant bacteriophages (Yoon et al. 2026).
- Test natural phage sequences or custom synthetic repeat arrays.

#### What the Software Does for the User:
- **Direct Repeat Array Discovery:** Scans DNA contigs to find tandem repeat arrays that guide phage reverse transcriptases.
- **RNA Structure & Stability Prediction:** Calculates secondary stem-loop folding and free energy ($\Delta G$) to confirm whether array transcripts can form stable functional units.
- **Technology Benchmark Comparison:** Directly contrasts:
  - *Standard CRISPR:* Cuts DNA (double-strand breaks) and relies on error-prone cell repair.
  - *Prime Editing:* Nicks DNA and uses an engineered M-MLV reverse transcriptase with complex pegRNA designs.
  - *Phage ART:* Direct RNA-templated DNA writing into the genome **without double-strand breaks**, opening the door to large-scale gene insertion.

#### The Real-World Outcome:
Researchers can stay years ahead of mainstream tools, evaluating the next paradigm of double-strand-break-free gene insertion for complex congenital diseases.

---

### Feature 9: The Real-Time Research Playground
**Where:** Tab 9 — *Real-Time Playground* (LIVE [●] Badge)

#### What the User Can Do:
- Interactively test biological hypotheses, run real-time cancer evolution experiments, and examine 3D molecular structures.
- Switch between 3 interactive simulation modes:
  1. **Clone Evolution Simulator**
  2. **3D Molecular Complex Viewer**
  3. **Real-Time Binding Animator**

#### What the Software Does for the User:
- **Mode 1: Live Cellular Automata & Moran Process:** Connects over a high-speed live WebSocket (`ws://localhost:8000/ws/playground`). When the user clicks "Start Simulation", a multi-clonal tumor is simulated across generations. The user sees a real-time area chart of cell populations under drug therapy:
  - *Cycle 0-5:* The tumor grows.
  - *Cycle 5:* The researcher applies a targeted drug (e.g., KRAS inhibitor).
  - *Cycle 6-12:* The primary cancer clone rapidly collapses.
  - *Cycle 14-20:* A drug-resistant sub-clone with a secondary mutation (e.g., TP53-null or MEK mutation) expands and takes over the population.
- **Mode 2: 3D Molecular Complex Viewer:** Visualizes the 3-dimensional physical arrangement of the Cas9 protein complex, the guide RNA strand, and the unzipped patient target DNA with rotation and zoom controls.
- **Mode 3: Real-Time Binding Animator:** Animates the sequential hydrogen-bonding process as the guide RNA invades the DNA double helix from the initial PAM recognition site through the proximal seed region to form a stable R-loop.

#### The Real-World Outcome:
Researchers can visually discover how tumors evade therapy and identify combination treatment regimens that shut down resistance *before* a patient relapses.

---

## 3. Cross-Platform Clinical Safeguards

### Safeguard A: The Human Expert Review Gate Modal
- **Why It Exists:** To prevent catastrophic errors and regulatory violations. If a computational guide has an elevated off-target probability, it cannot simply be sent to synthesis.
- **How It Works:** A mandatory clinical modal interrupts the workflow. It requires the researcher to:
  1. Input their full name and clinical credentials.
  2. Provide an active Institutional Review Board (IRB) protocol number.
  3. Confirm 5 ethical checkboxes (confirming no collision with tumor suppressor genes, verifying patient SNPs, mandating in-vitro validation).
  4. Write a scientific justification for overriding automated warnings.
- **Outcome:** Every override is permanently cryptographically signed and added to the official audit dossier.

### Safeguard B: The Scientific Knowledge Copilot Drawer
- **Why It Exists:** To provide instant, peer-reviewed scientific clarity without having to leave the software or search external databases.
- **How It Works:** A floating slide-out drawer accessible from any screen with one click (`[Ask AI]`). Powered by Google Gemini and grounded in PubMed, Nature, and the New England Journal of Medicine (NEJM).
- **Outcome:** The copilot answers complex questions (e.g., *"Why does this guide fail in heterozygous patients?"* or *"What are the oncogenic risks of c-MYC?"*) providing exact PubMed IDs (PMIDs), clinical trial citations, and explicit confidence boundaries.

---

## 4. Summary: The End-to-End User Experience

| Stage | What the User Starts With | What the Software Accomplishes | What the User Finishes With |
|---|---|---|---|
| **Intake** | Raw patient VCF sequencing file | Reconstructs patient's personalized genome | Personal digital twin with ClinVar flags |
| **Design** | Disease gene symbol (e.g., CCR5, KRAS) | Designs patient-specific guides with CFD off-target checks | Top-ranked, safe candidate guides |
| **Wet-Lab** | Selected computational guide | Formulates cloning oligos & checks viral vector limits | Physical IDT ordering CSV & delivery protocol |
| **Regen** | Damaged tissue goal (e.g. Heart) | Screens stem cell cocktail for cancer/teratoma risk | Day-by-day cell culture growth timeline |
| **Dossier** | Completed design session | Compiles SHA-256 chained audit logs & signatures | Print-ready pre-clinical PDF report |
| **Oncology** | Lethal cancer biopsy | Builds 8-axis Tumor Radar & allele-specific guides | Precision tumor-killing guides & neoantigen vaccine |
| **Viral** | Immune-cold metastatic cancer | Engineers oncolytic virus with cytokine payloads | Complete cancer-hunting viral blueprint |
| **Playground**| Hypothetical treatment strategy | Simulates real-time cancer mutation & drug resistance | Multi-drug strategy that prevents tumor escape |
