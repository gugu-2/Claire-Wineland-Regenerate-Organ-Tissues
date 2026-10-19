# Core Genome Editing Pipeline (Tabs 1, 2, 3)

> **Purpose:** This document details the UI layout and interaction logic for the standard CRISPR engineering pipeline. This is the "Dry-Lab to Wet-Lab" bridge.

## Tab 1: Sample & Locus Intake (`SampleIntakeView.jsx`)

### Layout
- **Left Column (Data Input):** Dropdowns for selecting pre-loaded benchmark patients (e.g., CCR5 delta32, KRAS G12D) or uploading raw VCF files.
- **Right Column (Locus Visualization):** A linear DNA sequence viewer showing the target gene, exons, and highlighted single nucleotide polymorphisms (SNPs).

### Interaction Logic
1. User selects a sample.
2. The UI fires an API call to Ensembl to fetch real-time gene coordinates.
3. The right column renders the reference sequence vs. the patient's personalized sequence.
4. **Why this matters:** Designing CRISPR guides on a "reference genome" fails in reality if the patient has a silent SNP exactly where the guide binds. This UI forces the user to see the *patient's actual DNA*.

---

## Tab 2: Personalized CRISPR Design (`CrisprDesignerView.jsx`)

### Layout
- **Top Dashboard (Metrics):** Cards displaying total guides found, average efficiency, and highest safety score.
- **Main Data Grid:** A sortable, filterable table of Guide RNAs (sgRNAs).
  - Columns: Sequence, PAM, Location, Azimuth Score (Efficiency), CFD Score (Off-Target Safety).
- **Action Buttons:** "Request Expert Review" buttons on individual guides.

### Interaction Logic
1. User clicks "Scan for Targets". The backend processes the sequence from Tab 1.
2. Guides populate the grid. The user sorts by "Highest Azimuth Score".
3. **The Review Gate Mechanism:** A user *cannot* proceed to synthesis if a guide has a high off-target risk. They must click "Request Expert Review", which opens a modal (`ExpertReviewModal.jsx`) demanding human oversight. 
4. **Why this matters:** It builds FDA-style safety guardrails directly into the software's UI flow.

---

## Tab 3: Wet-Lab & Delivery Studio (`WetLabStudioView.jsx`)

### Layout
- **Left Panel (Oligo Synthesis):** Generates exact 5' to 3' DNA sequences needed to order the guides from a manufacturer (like IDT or Twist Bioscience), complete with Golden Gate cloning overhangs (e.g., BsmBI/BsaI).
- **Right Panel (Delivery Physics):** A visual selector for how to get the CRISPR into the cell (Lentivirus, AAV, Lipid Nanoparticle, Electroporation).

### Interaction Logic
1. User selects the approved guide from Tab 2.
2. User selects their plasmid backbone (e.g., lentiCRISPR v2).
3. The UI automatically calculates and displays the exact physical oligos to order.
4. **Why this matters:** Bioinformaticians often struggle to translate digital sequences into physical lab orders. This UI screen entirely automates the physical prep, eliminating human copy-paste errors.
