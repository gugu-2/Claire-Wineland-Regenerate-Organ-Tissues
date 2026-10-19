# Feature Specifications Index — Unfinished Features

> **Project:** Genomic Research Copilot / Precision Oncology OS  
> **Scope:** Detailed architecture, technology stack, modules, execution plans for every unfinished feature  
> **Status:** Design & Specification Phase (No Code Written Yet)  
> **Created:** October 2026  
> **Last Updated:** October 2026 — All 11 specs complete ✅

---

## How to Use These Documents

Each file in this folder is a **complete engineering specification** for one unfinished feature. Before any engineer writes a single line of code, they must read the relevant spec. Each spec contains:

1. **What It Does for the User** — plain English
2. **System Architecture Diagram** — boxes and arrows
3. **Technology Stack** — exact npm packages, Python libraries, APIs
4. **Data Flow** — step by step from user action to response
5. **Backend Design** — module name, file path, function signatures, data models
6. **Frontend Design** — component name, file path, props, state, UI layout
7. **Integration Points** — how it connects to existing code
8. **Execution Plan** — day-by-day sprint breakdown

---

## Feature Specification Files

| # | Feature | Spec File | Priority | Estimated Effort |
|---|---------|-----------|----------|-----------------|
| 01 | True Atomistic WebGL 3D Molecular Viewer | `01_3D_MOLECULAR_VIEWER.md` | 🔴 Critical | 7 days |
| 02 | Genome-Wide 3.2B bp Real Off-Target Alignment | `02_GENOME_WIDE_ALIGNMENT.md` | 🔴 Critical | 8 days |
| 03 | Multi-Allele NetMHCpan-4.1 Neoantigen Engine | `03_NEOANTIGEN_ENGINE.md` | 🔴 Critical | 5 days |
| 04 | Multi-Omics RNA-seq Expression Integration | `04_RNASEQ_INTEGRATION.md` | 🔴 Critical | 7 days |
| 05 | Single-Cell RNA-seq & Spatial Transcriptomics | `05_SCRNA_SPATIAL.md` | 🟡 High | 10 days |
| 06 | CAR-T Surface Antigen Identification Engine | `06_CART_ENGINE.md` | 🟡 High | 6 days |
| 07 | In-Silico Phage ART Construct Designer | `07_ART_WRITER.md` | 🔴 Critical | 10 days |
| 08 | Automated B2B Synthesis API (IDT/Twist/GenScript) | `08_SYNTHESIS_API.md` | 🔴 Critical | 8 days |
| 09 | ClinicalTrials.gov Live Patient Matching | `09_CLINICAL_TRIALS.md` | 🟡 High | 7 days |
| 10 | Multi-User Live Collaborative Workspace | `10_COLLABORATION.md` | 🟡 High | 12 days |
| 11 | Mobile & Tablet Responsive Layouts | `11_MOBILE_RESPONSIVE.md` | 🟢 Medium | 6 days |

**Total estimated engineering effort: ~86 developer-days (~17 weeks solo / ~4 weeks with a 4-person team)**

---

## Execution Sprint Plan

```
Sprint 1 (Weeks 1-3):  Features 01, 02        — Core science accuracy
Sprint 2 (Weeks 4-5):  Features 03, 04        — Omics integration
Sprint 3 (Weeks 6-8):  Features 05, 06, 07   — Advanced biology
Sprint 4 (Weeks 9-11): Features 08, 09        — Clinical + ordering
Sprint 5 (Weeks 12-17): Features 10, 11       — Platform & UX
```

---

## Technology Decision Summary

| Domain | Chosen Technology | Alternative Considered | Reason |
|--------|-----------------|----------------------|--------|
| 3D viewer | Mol* (molstar npm) | 3Dmol.js, NGL | Best large-complex WebGL performance |
| Off-target scan | Cas-OFFinder binary | CRISPOR web | Runs locally, GPU-accelerated |
| Neoantigen | MHCflurry (MIT) | NetMHCpan (academic) | License freedom; 150+ alleles |
| scRNA-seq | scanpy + Celery | Seurat (R) | Python ecosystem fit; async |
| CAR-T normal expr | GTEx API v2 | TCGA | Healthy tissue baseline |
| ART fragmentation | BioPython + ViennaRNA | Custom parser | Proven, codon-aware |
| Synthesis auth | OAuth2 client creds | Simple API key | IDT requires OAuth2 |
| Distance math | Haversine (stdlib) | geopy distance | Zero dependency |
| Real-time collab | WebSocket + Yjs CRDT | Socket.io | FastAPI-native WS; Yjs best CRDT |
| Mobile layout | Tailwind responsive | Separate mobile app | Zero-cost, same codebase |
