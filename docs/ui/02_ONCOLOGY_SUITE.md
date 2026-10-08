# The Oncology Suite (Tabs 6 & 7)

> **Purpose:** This document outlines the highly specialized UI views designed for precision oncology and complex solid tumor treatment planning.

## Tab 6: OncoCRISPR Designer (`OncoCrisprDesignerView.jsx`)

### Layout
- **Top Section: The Tumor Fingerprint:** A visually striking 8-axis Radar Chart (`TumorFingerprint.jsx`) occupying the center-top. It visualizes Tumor Mutational Burden (TMB), Microsatellite Instability (MSI), Purity, and Immune Infiltration.
- **Left Panel (Somatic Variant Caller):** A list of all mutations found in the tumor, sorted by Cancer Cell Fraction (CCF) to show which mutations are driving the tumor.
- **Right Panel (Neoantigen Prediction):** A ranked list of 9-mer peptides that the immune system could recognize, scored by HLA binding affinity (IC50 in nM).

### Interaction Logic
1. The user looks at the Tumor Fingerprint. If the "Immune Infiltration" axis is low (a "Cold" tumor), the UI dynamically suggests that standard immunotherapy will fail.
2. The user clicks on a driver mutation (e.g., KRAS G12D) in the left panel.
3. The right panel updates to show if that mutation generates a strong Neoantigen.
4. **Why this matters:** Cancer isn't one disease; it's a dynamic ecosystem. This UI forces the researcher to look at the holistic immune-genetic state before designing a treatment.

---

## Tab 7: OncoViral Therapy Planner (`OncoViralPlannerView.jsx`)

### Layout
- **Left Panel (Viral Backbone Selector):** Cards representing different oncolytic viruses (e.g., Adenovirus, HSV-1, Vaccinia).
- **Center Panel (Payload Engineering):** Drag-and-drop slots to insert cytokine payloads (like GM-CSF or IL-12) into the viral genome to stimulate the immune system.
- **Right Panel (Tropism Prediction):** A 3D or graphical gauge showing the probability that the selected virus will successfully infect the target tumor tissue while ignoring healthy tissue.

### Interaction Logic
1. If the user identified a "Cold" tumor in Tab 6, they use Tab 7 to design a virus to infect it and make it "Hot".
2. They select HSV-1 (which has room for large payloads).
3. They insert GM-CSF into the viral genome.
4. The UI recalculates the safety and efficacy score.
5. **Why this matters:** Oncolytic virotherapy is the cutting edge of cancer treatment. This UI acts like a "build-a-virus" workshop, combining genetic engineering with immunological strategy.
