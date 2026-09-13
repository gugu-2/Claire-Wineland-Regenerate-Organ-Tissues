# Genomic Research Copilot
### A Computational Research Platform for CRISPR Design, Gene Therapy, and Stem-Cell/Organ Regeneration Studies

![System Architecture](file:///C:/Users/majip/.gemini/antigravity/brain/e505eb43-024e-44d5-b624-97243e5f631a/architecture_diagram.png)

> **MANDATORY PRECLINICAL DISCLAIMER**  
> *FOR RESEARCH PURPOSES ONLY — NOT FOR CLINICAL OR DIAGNOSTIC USE.*  
> Every computational prediction, guide RNA ranking, on-target efficiency score, and off-target risk metric produced by this system is an experimental research hypothesis. Real-world application requires rigorous wet-lab experimental validation (in vitro cleavage assays, cellular GUIDE-seq/CIRCLE-seq, and animal studies) under institutional oversight (IRB/IACUC).

---

## 1. Product Vision & Principles

The Genomic Research Copilot is a specialized computational platform that bridges genomic databases, individual patient/cell-line sequences, and cutting-edge machine learning models for CRISPR design and regenerative medicine:

1. **Patient-Specific Genome Grounding**: Rather than designing against generic reference genomes (GRCh38), the engine reconstitutes the target locus using the individual's actual VCF/FASTA data, pinpointing personal single-nucleotide polymorphisms (SNPs) and indels that alter PAM motifs (`NGG`, `TTTV`) or disrupt the critical seed region (positions 1–10 adjacent to PAM).
2. **Traceable Biomedical Evidence**: The AI research co-pilot grounds every claim in primary peer-reviewed literature (PubMed, NEJM, Nature) and registered clinical trials (ClinicalTrials.gov), presenting explicit PMIDs, DOIs, and stated uncertainty intervals.
3. **Tumorigenic & Teratoma Risk Screening**: Reprogramming workflows (e.g. iPSC derivation to dopaminergic neurons, cardiomyocytes, or pancreatic beta cells) evaluate transcription factor cocktails and delivery vehicles, flagging proto-oncogene reactivation (e.g. *c-MYC*) and genomic insertional risks.
4. **Mandatory Human Expert Review Gate**: A formal review state machine (`PENDING_REVIEW` &rarr; `EXPERT_APPROVED` / `APPROVED_WITH_CAVEATS` / `EXPERT_REJECTED`) prevents automated or unvetted export of candidate therapeutic edits.
5. **Cryptographic Audit Trail & Dual-Use Screening**: Real-time screening for Dual-Use Research of Concern (DURC) and SHA-256 integrity-chained audit logging ensure complete compliance.

---

## 2. System Architecture

```
genom/
├── backend/
│   ├── main.py                          # FastAPI REST API & route definitions
│   ├── requirements.txt                 # Python dependencies
│   ├── core/
│   │   ├── config.py                    # Global configuration & safety flags
│   │   └── security.py                  # DURC screening filter & cryptographic audit logger
│   ├── modules/
│   │   ├── sample_intake.py             # VCF parsing & personalized sequence reconstitution
│   │   ├── variant_annotation.py        # ClinVar, dbSNP, & gnomAD pathogenicity/protective flagging
│   │   ├── crispr_designer.py           # PAM scanning, Doench Rule Set 2 efficiency, & CFD scoring
│   │   ├── regeneration.py              # Stem cell differentiation & tumorigenic risk calculation
│   │   ├── knowledge_copilot.py         # Literature RAG, graph traversal, & citation resolver
│   │   ├── review_gate.py               # Human expert review state machine & sign-off
│   │   └── report_generator.py          # Structured dossier & HTML report generation
│   ├── data/
│   │   ├── reference_genes.json         # GRCh38 coordinates & sequences for CCR5, HBB, OCT4
│   │   ├── benchmark_samples.json       # Curated patient profiles (WT, CCR5-Δ32, Seed SNP, Sickle Cell)
│   │   ├── regeneration_protocols.json  # Lineage protocols, markers, & oncogene risk metrics
│   │   └── knowledge_graph.json         # Graph linking genes, diseases, trials, & landmark papers
│   └── tests/
│       ├── test_sample_intake.py        # VCF parsing & sequence reconstruction tests
│       ├── test_crispr_designer.py      # PAM checks, Doench efficiency, & CFD tests
│       ├── test_regeneration.py         # Lineage differentiation & oncogenic risk tests
│       └── test_review_and_security.py  # DURC filter, RAG citations, & review gate tests
└── frontend/
    ├── index.html                       # Application shell
    ├── vite.config.js                   # Vite dev server & backend API proxy
    ├── tailwind.config.js               # Biomedical dark-mode theme
    └── src/
        ├── App.jsx                      # Application orchestrator & state manager
        ├── components/
        │   ├── Navbar.jsx               # Navigation, compliance banners, & status badges
        │   ├── SampleIntakeView.jsx     # Patient sample manager, VCF upload & locus inspector
        │   ├── CrisprDesignerView.jsx   # Candidate sgRNA ranking, personal SNP impact & CFD scores
        │   ├── RegenerationView.jsx     # Reprogramming cocktail builder & tumorigenic risk gauge
        │   ├── KnowledgeCopilotView.jsx # AI research chat with verified literature citations
        │   ├── ExpertReviewModal.jsx    # Human-in-the-loop review signoff gate
        │   └── ResearchReportView.jsx   # Publication-ready dossier & cryptographic audit trail
        └── services/
            └── api.js                   # Client connector to FastAPI REST endpoints
```

---

## 3. Quick Start & Execution

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Start the Backend Service
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
- API Documentation available at: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/status`

### 2. Run Backend Unit Tests
```bash
cd backend
python -m pytest tests -v
```

### 3. Start the Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 4. Worked Preclinical Research Workflows

### Workflow 1: CCR5-Based HIV Resistance Study
1. Select **Patient #1 (Wildtype)** vs. **Patient #3 (PAM/Seed Disrupting SNP)** in the *Sample & Locus Intake* module.
2. In the *CRISPR Designer*, note how candidate `sgRNA_CCR5_Exon3_01` achieves **82% on-target efficiency** in the reference genome, but drops to **26% cleavage** with a **HIGH_RISK** warning in Patient #3 due to their personal `chr3:46373140 C>T` seed mutation.
3. Consult the *AI Research Co-Pilot* on the precedent established by the Berlin and London patients.
4. Execute formal sign-off in the *Human Expert Review Gate* with mandatory safety criteria checked.

### Workflow 2: Midbrain Dopaminergic Neuron Regeneration Study
1. Navigate to *Stem Cell & Regeneration*.
2. Select **Dopaminergic Neurons (Parkinson's Disease)**.
3. Compare the classical Yamanaka 4-Factor protocol (tumorigenic score **0.82**, Critical Risk due to *c-MYC* retroviral reactivation) against the modern non-integrative Floor Plate protocol (tumorigenic score **0.08**, Low Risk).
4. Review differentiation stage milestones (Days 0–5 Neural Induction &rarr; Days 6–12 Midbrain Floor Plate `FOXA2+`/`LMX1A+` &rarr; Days 22–40 Mature Post-Mitotic `TH+`/`DAT+` DA neurons).
5. Generate and export the complete **Research Candidate Dossier (PDF/HTML)**.
