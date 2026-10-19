# Oncology Expansion — Master Index
## Five Expert Reports on Expanding the Genomic Research Copilot into Cancer Research

**Date:** September 2026  
**Status:** Complete — Ready for Review

---

## Overview

This document indexes five expert-level reports commissioned to evaluate whether and how the Genomic Research Copilot can be expanded to support two groundbreaking cancer treatment approaches:

1. **Oncolytic Virotherapy** — Using engineered viruses to selectively destroy cancer cells (inspired by Dr. Beata Halassy's self-treatment of breast cancer using Measles Virus + VSV)
2. **CRISPR Cancer Gene Correction** — Using CRISPR to correct the genetic mutations that cause cancer, rather than just attacking the tumor

All five reports are based on direct analysis of the platform's codebase.

---

## The Five Reports

| # | File | Agent | Focus |
|---|------|-------|-------|
| 1 | [01_scientific_virology_crispr_cancer_report.md](./01_scientific_virology_crispr_cancer_report.md) | 🧬 Virologist & Cancer Biologist | The underlying science of both approaches; current platform gaps; feasibility scoring (CRISPR: 8/10, OVT: 3/10) |
| 2 | [02_product_strategy_oncology.md](./02_product_strategy_oncology.md) | 📊 Oncology Product Strategist | Market opportunity ($100B+), two new modules (OncoCRISPR Designer + OncoViral Planner), user journey, GTM, pricing |
| 3 | [03_clinical_regulatory_framework.md](./03_clinical_regulatory_framework.md) | 🏥 Clinical Regulatory Expert | FDA/IRB requirements, HIPAA for tumor data, 8 compliance features needed, updated Expert Review Gate checklist |
| 4 | [04_bioinformatics_architecture_oncology.md](./04_bioinformatics_architecture_oncology.md) | 💻 Bioinformatics Architect | 5 new backend modules, 3 new database schemas, 4 new API endpoints; tumor-normal pair pipeline design |
| 5 | [05_visionary_precision_cancer_cure_os.md](./05_visionary_precision_cancer_cure_os.md) | 🚀 Vision & Innovation Futurist | The grand "Precision Cancer Cure OS" vision; 10 revolutionary features; Cancer Kill Stack concept; letter to the builder |

---

## Cross-Report Consensus: Key Findings

### ✅ What the Platform Already Has Right
- Patient-specific sequence personalization (the single most important capability for cancer targeting)
- SHA-256 cryptographic audit trail (FDA 21 CFR Part 11 ready)
- HIPAA pseudonymization of patient identifiers
- Expert Review Gate with IRB number documentation
- DURC (biosecurity) screening shield
- Modular FastAPI architecture easy to extend

### ⚠️ The Most Critical Gap: Somatic vs. Germline Distinction
Every report independently identified the same critical gap: **the platform currently treats all VCF files as germline**. In oncology, the primary targets are somatic mutations (occurring only in cancer cells). Without tumor-normal pair analysis, the platform cannot safely support cancer therapy design.

### 🎯 Recommended Priority Order
1. **First:** Build the somatic variant pipeline (tumor-normal pair intake, VAF-aware CRISPR targeting, COSMIC database integration) — **Medium complexity, maximum impact**
2. **Second:** Extend the CRISPR designer for allele-specific oncogene targeting (KRAS G12D, EGFR, BRAF V600E) — **High complexity, clinical value**
3. **Third:** Build the OncoViral Therapy Planner as a standalone module — **High complexity, groundbreaking capability**
4. **Fourth:** CAR-T Designer, Neoantigen Vaccine Generator, Digital Patient Twin — **Long-term vision**

### 💰 Business Opportunity Summary
- Precision oncology market: **>$100 billion by 2030**
- No competitor currently offers personalized, patient-VCF-grounded cancer therapeutic design
- Target customers: Cancer hospitals (MD Anderson, MSKCC), oncology CROs, pharma oncology divisions
- Pricing model: $150K/year enterprise + $1,500–3,000/patient analysis fee
- FDA pathway: Breakthrough Device Designation for SaMD

---

## The "Cancer Kill Stack" Concept

The most compelling insight across all five reports is the concept of a **sequential, multi-modal Cancer Kill Stack**:

```
Phase 1: DESTROY     → Oncolytic virus debulks the tumor, primes immune system
Phase 2: CORRECT     → CRISPR corrects the oncogenic mutation, prevents recurrence  
Phase 3: REGENERATE  → Stem cell protocols rebuild damaged tissue (already in platform)
```

Every component of this stack either exists in the current platform (CRISPR design, stem cell regeneration) or can be added as a natural architectural extension (oncolytic virus planning). No competitor is positioned to offer all three phases in a single, audited, patient-specific workflow.

---

## Next Steps

After reading these reports, the key decision is:

> **"Which of these modules should we build first?"**

Recommended answer from all 5 agents: **Start with the Somatic CRISPR Oncology Module (OncoCRISPR Designer)**. It has the fastest path to clinical value, the most direct extension of existing architecture, and immediately unlocks cancer use cases for the world's most common cancer driver mutations (KRAS, TP53, BRCA, EGFR).
