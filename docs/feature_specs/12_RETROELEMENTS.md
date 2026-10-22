# Feature Spec 12 — Bacterial Retron & Diversity-Generating Retroelement (DGR) Synthesizer

> **Status:** Specification Complete  
> **Sprint:** Sprint 6  
> **Priority:** 🔴 Advanced Biological Engineering  
> **Estimated Effort:** 4–6 development days  
> **Integration:** `backend/modules/retroelement_synthesizer.py`, `backend/modules/aart_modeler.py`, `frontend/src/components/ArtResearchView.jsx`, `frontend/src/components/SynthesisOrderModal.jsx`

---

## 1. Executive Summary & Biological Rationale

While CRISPR-Cas systems excel at targeted double-strand breaks (DSBs), clinical therapeutic applications face severe hurdles with unintended insertions/deletions (indels), chromosomal translocations, and low homology-directed repair (HDR) efficiency in non-dividing primary human cells.

Two non-canonical reverse transcriptase systems offer break-free and combinatorial advantages:

### 1.1 Bacterial Retrons (msDNA-Mediated Genome Editing)
- **Natural Role:** Tripartite bacterial defense systems comprising a non-coding RNA transcript (`msr`), a single-stranded DNA transcript (`msd`), and a specialized reverse transcriptase (`ret`).
- **Mechanism:** The RT uses a conserved internal 2'-guanosine branching residue on `msr` to prime synthesis of `msd`, producing a hybrid branched multicopy single-stranded DNA (msDNA).
- **Therapeutic Editing (RetronEditor, Broad Institute / Harvard 2022):** By encoding a donor repair template within the `msd` loop, thousands of copies of precise ssDNA donor templates are synthesized continuously *inside* the cell without exogenous DNA toxicity or viral capsid limits.

### 1.2 Diversity-Generating Retroelements (DGRs)
- **Natural Role:** Discovered in Bordetella bacteriophage BPP-1 (Miller et al., Science 2002); drives tropism switching between bacterial host variants.
- **Mechanism:** The DGR reverse transcriptase (`bprt`) copies an invariant Template Repeat (`TR`) into a Variable Repeat (`VR`), **selectively mutagenizing adenines (A $\to$ N)** with astronomical error rates (>50% at adenine positions, while C, G, and T are copied with high fidelity).
- **Therapeutic Application:** Directed molecular evolution of antibody antigen-binding loops (e.g. CDR-H3 of single-chain variable fragments / scFvs, nanobodies, or engineered T-cell receptors) to generate vast combinatorial libraries (> $10^{14}$ theoretical variants) for affinity maturation.

---

## 2. Architecture & Computational Workflow

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                      RETRON & DGR COMPUTATIONAL PIPELINE                      │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
     ┌─────────────────────────────────┴─────────────────────────────────┐
     ▼                                                                   ▼
[RETRON MSDNA EDITOR]                                           [DGR MUTAGENESIS ENGINE]
- Input: Target Gene, Exon, Mutation                            - Input: Target Binding Loop (CDR-H3)
- Select Chassis: Eco1 / Ec86 / Ec48                            - Select DGR System: BPP-1 / TdDGR
- Validate msr-msd branched hairpin folding                     - Identify Adenine Codons in Loop
- Predict HDR repair efficiency                                 - Predict Combinatorial Diversity (4^Na)
- Generate BsaI Golden Gate cloning oligos                      - Export Degenerate Synthesis Matrix
     │                                                                   │
     └─────────────────────────────────┬─────────────────────────────────┘
                                       ▼
                     [7-MODALITY COMPARISON MATRIX]
          Cas9 DSB vs CBE vs ABE vs Prime vs Phage ART vs Retron vs DGR
                                       │
                                       ▼
                     [B2B SYNTHESIS CHECKOUT MODAL]
              Direct order to IDT / Twist Bioscience / GenScript
```

---

## 3. Retron Editor Engineering Specifications

### 3.1 Curated Retron Chassis
1. **Eco1 (Escherichia coli - RetronEditor benchmark):**
   - High expression in human mammalian cell lines (HEK293T, K562, CD34+ HSPCs).
   - Optimal donor length: 40–120 nt.
   - Fold change in HDR over naked ssDNA: 2.8x–4.5x.
2. **Ec86 (Escherichia coli 86):**
   - High-yield in bacterial and synthetic biology platforms.
   - Compact `msr-msd` cassette (~280 bp).
3. **Ec48 (Escherichia coli 48):**
   - Increased thermal stability at 37°C–42°C.
4. **Mx162 (Myxococcus xanthus 162):**
   - Extended loop capacity for multi-kilobase donor insertions.

### 3.2 Output Artifacts
- Complete `msr-msd-ret` plasmid insert sequence (FASTA).
- 5'-flanking and 3'-flanking BsaI Golden Gate overhangs for vector assembly.
- Secondary structure $\Delta G$ thermodynamic prediction of the 2'-5' branched junction.

---

## 4. DGR Mutagenesis Specifications

### 4.1 Curated DGR Systems
1. **Bordetella phage BPP-1 (`bprt`):**
   - Canonical 134-bp Template Repeat (`TR`) and Variable Repeat (`VR`).
   - Highly specific adenine mutagenic error profile: $A \to A (50\%)$, $A \to T (18\%)$, $A \to C (18\%)$, $A \to G (14\%)$.
2. **Treponema denticola (`TdDGR`):**
   - Mammalian-compatible codon bias.
3. **Vibrio campbellii (`VcDGR`):**
   - High processivity across long loops (>40 amino acids).

### 4.2 Hypervariable Library Metrics
- Number of mutable adenines ($N_A$) in target sequence.
- Theoretical diversity space: $4^{N_A}$ variants.
- Productive in-frame percentage (stop-codon avoidance rate).
- Exportable mixed-base IUPAC sequence (e.g. `NNK` or `NWT` codon mixtures) for IDT synthesis.

---

## 5. REST API Endpoints

1. `POST /api/retroelements/retron/design`
   - Designs synthetic retron editor construct for specified mutation.
2. `POST /api/retroelements/dgr/library`
   - Generates adenine-mutagenized hypervariable diversity library for input peptide loop.
3. `GET /api/retroelements/presets`
   - Returns benchmark clinical targets (KRAS G12D Retron, TP53 R248W Retron, anti-HER2 CDR-H3 DGR, anti-EGFRvIII scFv DGR).
4. `POST /api/retroelements/modality-comparison`
   - Evaluates multi-modality suitability across 7 genetic engineering tools.
5. `GET /api/retroelements/designs/{design_id}`
   - Retrieves previously generated retron or DGR constructs.
