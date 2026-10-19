# Global UI Layout and User Navigation Strategy

> **Purpose:** This document defines the high-level architecture of the Genomic Research Copilot user interface. It explains how a researcher navigates the platform and why the interface is designed as a Tab-based Single Page Application (SPA).

## 1. The Global Layout Architecture

The application is structured as a **persistent dashboard**. In biomedical research, users deal with massive amounts of context (target genes, mutation lists, patient IDs). The UI prevents cognitive overload by keeping this context globally visible.

### 1.1 The Persistent Header (Navbar)
- **Top Compliance Banner:** A persistent amber/emerald strip indicating the current safety mode (e.g., "DURC SHIELD ACTIVE", "AUDIT TRAIL: ON"). 
  - *Reasoning:* In clinical and high-stakes research, users must always be aware if their actions are being logged for FDA/IRB compliance.
- **Project Identity:** The top left displays the platform name and version.
- **Connection Status:** A live indicator shows if the FastAPI backend and Ensembl/NCBI integrations are successfully connected via WebSocket/REST.
- **Navigation Tabs:** 9 horizontal tabs categorized by color (Cyan for Standard, Rose for Oncology, Violet for Experimental).

### 1.2 The Main Workspace (Viewport)
Below the navbar, the main workspace dynamically renders one of the 9 views based on the selected tab. 
- State is preserved globally using React context or top-level `App.jsx` state. 
- *Reasoning:* A user can upload a sample in Tab 1, design a CRISPR guide in Tab 2, and switch back to Tab 1 without losing their design.

### 1.3 The Global AI Copilot (Slide-out Overlay)
- Accessed via a floating button or keyboard shortcut.
- Slides out from the right side over any tab.
- *Reasoning:* If a user is looking at a complex Tumor Fingerprint in Tab 6 and doesn't understand a specific biomarker, they shouldn't have to leave the page to search PubMed. The Copilot slides out, reads the current screen context, and answers immediately.

---

## 2. The User Personas & Navigation Journeys

The platform serves three distinct user personas, each navigating the tabs differently:

### Persona A: The Gene Therapy Engineer
**Goal:** Fix a known monogenic disease (e.g., Sickle Cell Anemia).
**Navigation Path:**
1. **Tab 1 (Sample Intake):** Uploads patient cells and WT reference.
2. **Tab 2 (CRISPR Design):** Generates guides, reviews Azimuth efficiency.
3. **Tab 3 (Wet-Lab):** Exports oligo synthesis sequences and plans AAV delivery.
4. **Tab 5 (Dossier):** Generates the final PDF report for the Principal Investigator.

### Persona B: The Precision Oncologist
**Goal:** Design a combinatorial treatment for a complex solid tumor.
**Navigation Path:**
1. **Tab 1 (Sample Intake):** Uploads tumor VCF (Variant Call Format).
2. **Tab 6 (OncoCRISPR):** Analyzes the Tumor Fingerprint and Neoantigen affinity.
3. **Tab 7 (OncoViral Planner):** Selects an Oncolytic Virus backbone to target the specific tumor immune microenvironment.
4. **Tab 9 (Real-Time Playground):** Simulates how the tumor clones will evolve over time to ensure the treatment won't cause immediate resistance.

### Persona C: The Basic Science Pioneer
**Goal:** Research novel genome writing systems.
**Navigation Path:**
1. **Tab 8 (ART Research):** Explores RNA-guided DNA writing using the Yoon et al. 2026 system.
2. **Tab 4 (Regeneration):** Explores stem-cell differentiation protocols.
3. **Tab 9 (Playground):** Uses the 3D Molecular Viewer to visualize custom ribonucleoprotein bindings.
