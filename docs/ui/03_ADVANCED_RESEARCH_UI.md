# Advanced & Interactive Research UI (Tabs 4, 8, 9)

> **Purpose:** This document details the experimental boundaries of the platform. These UIs move beyond standard static tables into real-time, highly interactive visual simulations.

## Tab 9: Real-Time Playground (`PlaygroundView.jsx`)

### Layout
- **Sub-Tabs Configuration:** Because this is an interactive sandbox, it has its own internal sub-routing (`Clone Evolution`, `3D Molecular Viewer`, `Binding Animator`).
- **Clone Evolution Chart (`CloneEvolutionChart.jsx`):** A large, real-time updating stacked bar chart. 
- **Binding Animator (`BindingAnimator.jsx`):** A horizontal DNA track showing 5' to 3' nucleotide sequences.
- **Molecular Viewer (`MolecularViewer.jsx`):** A WebGL/CSS 3D abstraction of a Cas9 protein interacting with DNA.

### Interaction Logic
1. **The WebSockets Engine:** Unlike Tabs 1-8 which use standard HTTP REST requests, Tab 9 establishes a persistent `ws://` WebSocket connection to the backend (`clone_simulator.py`).
2. **Clone Evolution:** The user clicks "Start Therapy Simulation". The backend runs a Moran process cellular automata simulation. Every 300ms, the frontend chart updates, visualizing how cancer clones shrink under drug pressure while new resistant clones emerge.
3. **Binding Animator:** The user inputs a 20nt guide. The UI animates the strand invasion step-by-step, mimicking the exact biophysical timing of a Cas9 enzyme scanning for a PAM and unwinding the DNA.
4. **Why this matters:** Researchers cannot physically "see" molecules. By providing real-time, game-like simulations, researchers build an intuitive "feel" for how therapies will actually behave in a living organism over time.

---

## Tab 8: ART Research (`ArtResearchView.jsx`)

### Layout
- **Split-Screen Design:** 
  - Top half: Array-Associated Reverse Transcriptase (AART) locus analysis (based on Yoon et al. 2026).
  - Bottom half: RNA secondary structure predictions for the repeated non-coding RNA segments that guide the enzyme.

### Interaction Logic
- The user inputs a massive repetitive genome segment.
- The UI highlights the exact boundaries where the Type I/II retroelements sit.
- **Why this matters:** This is the absolute bleeding edge of genetic engineering (programmable RNA-guided DNA writing). No commercial tool has UI for this yet.

---

## Tab 4: Stem Cell & Regeneration (`RegenerationView.jsx`)

### Layout
- **Node-Based Graph Viewer:** Displays the Waddington landscape (differentiation pathways) as an interactive network graph (e.g., Fibroblast -> iPSC -> Cardiomyocyte).
- **Transcription Factor Matrix:** A heatmap of Yamanaka factors and other transcription factors required to force a cell down a specific pathway.

### Interaction Logic
- User selects a starting cell type and a target organ tissue.
- The UI highlights the optimal path through the differentiation graph and generates a "Chemical Cocktail" recipe.
