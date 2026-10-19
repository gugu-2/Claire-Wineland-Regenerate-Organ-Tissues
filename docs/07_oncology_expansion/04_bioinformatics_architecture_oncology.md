# Bioinformatics Architecture Report: Precision Oncology Pipeline
## Technical Analysis of Required Additions for Cancer Genomics Support

**Agent:** Principal Bioinformatics Engineer & Computational Genomics Architect  
**Date:** September 2026  
**Codebase Reviewed:** Full backend modules analysis

---

## SECTION 1: Current Bioinformatics Pipeline Assessment

The current bioinformatics architecture is beautifully optimized for monogenic germline editing (e.g., CCR5 or HBB mutations). The `sample_intake.py` and `crispr_designer.py` modules excel at generating a personalized genomic sequence by superimposing a patient's germline VCF onto a reference genome, then discovering optimal sgRNAs for nuclease cleavage. The `azimuth_cfd.py` module accurately scores guides based on robust biophysics (CFD for off-targets, Azimuth 2.0 for on-targets) while intelligently alerting when a personal germline variant disrupts a PAM sequence or seed region.

### What the Platform Does Very Well
- **Patient-Specific Sequence Reconstitution:** The positional offset arithmetic in `sample_intake.py` correctly handles SNPs and indels, applying them to the reference sequence to produce a patient-specific locus. This is the foundational requirement for any personalized therapy design.
- **Dual-Strand PAM Scanning:** `crispr_designer.py` scans both the forward and reverse complement strands, with correct Cas12a 5'-PAM inversion logic.
- **Strand-Aware Variant Application:** The fixed reverse-strand arithmetic correctly applies allele substitutions on minus-strand genes.
- **Modular API Architecture:** The clean separation of modules makes it straightforward to add new biological computation modules without restructuring the system.

### Where the Pipeline Critically Falls Short for Cancer

The pipeline operates under a rigid assumption: **a stable, diploid genome represented by a single germline VCF**. In precision oncology, this breaks down completely.

1. **No Tumor vs. Normal Distinction:** The system has zero capability to differentiate between a germline (Normal) VCF and a somatic (Tumor) VCF. Every variant is currently treated as an inherited germline mutation. Treating a tumor requires exclusively targeting mutations present *only* in cancer cells.

2. **Diploid Assumption & Clonal Heterogeneity:** `sample_intake.py` logic relies on simple heterozygosity (`HET`) or homozygosity (`HOM`) parsing. It cannot accommodate Variant Allele Frequencies (VAF), which are essential for understanding tumor subclones and heterogeneity. A mutation with 8% VAF indicates a subclonal variant — extremely dangerous to target with CRISPR as the therapy would affect < 10% of tumor cells while causing off-target damage everywhere else.

3. **Copy Number and Structural Variants:** Cancer genomes are notoriously aneuploid. The pipeline has no native handling for massive copy number variations (CNVs) or complex structural variants (SVs) like translocations and chromothripsis.

### Specific Technical Debt Identified

- **Static Off-Target Search:** The Cas-OFFinder background scan is run against a static hg38 reference. A tumor genome with focal amplifications (e.g., HER2 amplified 50x) will possess a drastically different off-target landscape that the current engine completely misses.

- **Missing Oncology Databases:** `variant_annotation.py` relies on ClinVar and gnomAD — excellent for inherited diseases, but lacking the somatic context provided by oncology-specific databases like COSMIC and OncoKB.

- **No Tumor Microenvironment Modeling:** `azimuth_cfd.py` was trained on stable cell lines. Tumor cells exist in hypoxic, acidic environments with dysregulated DNA repair pathways (BRCA mutations causing NHEJ/HDR imbalances). Standard efficiency scores are inaccurate in the tumor context.

---

## SECTION 2: Somatic Tumor Genomics Pipeline — What Needs to Be Built

### Tumor-Normal Pair Analysis Pipeline
The system must ingest matched Tumor and Normal genomic data. By computationally subtracting germline variants (Normal) from the tumor's genetic profile, we isolate somatic-only mutations. This is non-negotiable: accidentally targeting a germline variant in healthy tissue would be catastrophic.

**Computational Approach:**
```
Somatic Mutations = All Tumor Variants − Germline Variants (with VAF threshold filtering)
```
Each remaining somatic variant receives:
- **VAF (Variant Allele Frequency):** The proportion of cancer cells carrying this mutation
- **Cancer Cell Fraction (CCF):** Estimated fraction corrected for tumor purity and local copy number
- **Clonal Classification:** Truncal (present in all cells) vs. Subclonal (present in subset)

### Tumor Mutational Burden (TMB) Calculation
Algorithm: Count all non-synonymous somatic mutations in coding regions divided by the size of the coding genome analyzed (in megabases). **FDA-approved biomarker threshold: ≥10 mutations/Mb** for pembrolizumab (Keytruda) eligibility.

High TMB tumors:
- Are strong candidates for oncolytic viral therapy (more neoantigens = stronger immune response)
- May respond poorly to targeted CRISPR approaches (too many driver mutations)
- Are excellent candidates for neoantigen vaccine design

### Microsatellite Instability (MSI) Detection
Evaluate shifts in microsatellite repeat lengths across the tumor genome compared to normal. MSI-High status is an FDA-approved pan-tumor biomarker for checkpoint inhibitor therapy and correlates with strong oncolytic virus response.

### Clonal Evolution and Heterogeneity — Why It Matters for CRISPR
If a CRISPR guide is designed against a **subclonal** mutation (present in only 15% of tumor cells), the therapy will merely prune the tumor tree. The remaining 85% of cells — the ones with different driver mutations — will continue growing and cause rapid relapse. The pipeline must compute CCF and enforce a minimum clonal fraction threshold (e.g., >60% CCF) before recommending a CRISPR target.

### Copy Number Variation (CNV) Impact on CRISPR Design
CNVs drastically alter CRISPR dynamics:
- If an oncogene is amplified 100-fold, Cas9 cutting that locus 100 times can trigger massive DNA damage responses and potentially lethal chromosomal shattering (a phenomenon called "chromothripsis")
- Targeting regions with Loss of Heterozygosity (LOH) requires allele-specific design
- CNV profiles must be overlaid onto guide selection algorithms to prevent catastrophic toxicity

---

## SECTION 3: CRISPR for Oncogene Targeting — Technical Additions Needed

### Allele-Specific Guide Design for Somatic Hotspots
For precision oncology, guides must selectively target the mutant allele (KRAS G12D) while completely sparing the wildtype allele. 

**Strategy:** Design guides where the somatic mutation uniquely creates a novel PAM site, or falls precisely in the seed region (positions 15-20), maximizing thermodynamic discrimination between mutant and wildtype:

| Mutation | Strategy | Mechanism |
|----------|---------|-----------|
| KRAS G12D | Mutation creates novel PAM sequence | Guide cuts G12D allele only |
| TP53 R175H | Mutation falls at seed position 17 | 2°C lower Tm = no cutting of wildtype |
| BRAF V600E | Prime editing pegRNA overwrites V600E | Base change correction |
| EGFR exon 19 del | Large deletion creates unique junction | Junction-spanning guide |

### Extending the PAM-Scanning Engine
The existing engine in `crispr_designer.py` must be expanded to:
- Accept tumor-vs-germline sequence pairs as input
- Score allele-specific discrimination (thermal mismatch at seed positions)
- Support Base Editors for single-base oncogene correction
- Support Prime Editors for complex insertion/deletion correction
- Target tumor-specific regulatory enhancers (e.g., BCL11A enhancer strategy from sickle cell applied to lymphoma)

### Why Standard Azimuth Scoring is Insufficient for Tumors
Azimuth 2.0 was trained on stable, immortalized cell lines under controlled conditions. Mathematical correction weights needed for:
- **Hypoxic environments:** Reduced HDR efficiency (prefer NHEJ-based strategies)
- **BRCA1/2 mutations:** Severely impaired HDR (Prime Editing preferred over HDR templates)
- **TP53 loss:** DNA damage response is blunted, meaning DSBs may not trigger apoptosis as expected
- **High copy number loci:** Multiple simultaneous cuts creating chromosomal instability

### Tumor-Specific Off-Target Analysis
Off-target analysis cannot rely solely on a standard hg38 build. The pipeline must:
1. Construct a personalized *tumor* reference genome incorporating structural variants and CNVs
2. Run CFD/Cas-OFFinder against this tumor-specific genome
3. Weight off-target sites by copy number (a site present 50x due to amplification has 50x the cleavage risk)
4. Flag any off-target sites that overlap with known tumor suppressor genes (second-hit risk)

---

## SECTION 4: Oncolytic Virus Engineering Pipeline — Architecture Design

### Required Data Inputs
- Patient's tumor antigen profile (neoantigens derived from the somatic pipeline)
- High-resolution HLA typing (Class I and II) to model antigen presentation efficiency
- RNA-seq data quantifying tumor surface receptor expression
- Viral backbone database (Adenovirus, HSV-1, Vaccinia, NDV, VSV with pre-characterized deletion libraries)
- Immune checkpoint expression profile (PD-L1, CD47, IDO1)

### Modeling Viral Tropism and Tumor Selectivity
Computationally model viral entry and replication using:
- Receptor-ligand binding affinity calculations (tumor receptors vs. viral surface proteins)
- Logic-gated viral replication simulation: viral promoters driven by tumor-specific TFs (TERT, survivin), attenuated by miRNAs in healthy tissues (let-7, miR-21)
- Viral spread kinetics within a tumor model vs. clearance by anti-viral immune response

### Key Databases to Integrate
| Database | Purpose |
|---------|---------|
| **TCGA (The Cancer Genome Atlas)** | Baseline expression and mutational frequencies across cancer types |
| **COSMIC** | Validated somatic driver mutations and therapeutic resistance markers |
| **cBioPortal** | Complex multi-omics cancer genomic data visualization |
| **OncoKB** | Clinical actionability tiers for specific mutations (Tier 1 = FDA-approved targeted therapy) |
| **IPD-IMGT/HLA** | HLA allele database for immune response prediction |
| **NetMHCpan** | Peptide-MHC binding affinity (for neoantigen and viral antigen prediction) |

### Predicting Immune Response to Oncolytic Virus
Algorithm:
1. Predict viral peptide presentation on tumor HLA alleles using NetMHCpan
2. Check patient's pre-existing viral immunity (ELISpot/serology data input)
3. Estimate viral clearance rate vs. tumor replication time window
4. Calculate probability of successful oncolysis before immune clearance

---

## SECTION 5: Implementation Roadmap

### 5 New Backend Python Modules Needed

| Module | Function | Complexity |
|--------|---------|------------|
| `somatic_variant_caller.py` | Tumor-Normal subtraction, VAF calculation, CCF estimation, clonal architecture analysis | **Medium** |
| `tumor_cnv_analyzer.py` | Copy Number Variation and Structural Variant processing; aneuploidy map construction | **Medium** |
| `allele_specific_designer.py` | Specialized CRISPR engine for thermodynamic discrimination between somatic mutations and wildtype alleles | **High** |
| `viral_tropism_modeler.py` | Optimal viral backbone selection and logic-gated promoter design based on tumor receptor expression | **High** |
| `immunogenicity_predictor.py` | HLA-typing integration, neoantigen and viral peptide binding affinity prediction, immune clearance estimation | **High** |

### 3 New Database Schemas Needed
1. **`SomaticMutations`**: Tracks tumor variants with VAF, clonal fraction, matched normal validation status, COSMIC annotation, and OncoKB tier
2. **`ViralBackbones`**: Genetic maps of oncolytic viruses, available payload insertion sites, native receptor tropisms, BSL containment level
3. **`OncologyAnnotations`**: Cache from COSMIC and OncoKB linking specific somatic mutations to known pathogenic drivers and therapeutic resistance markers

### 4 New API Endpoints Needed
1. `POST /api/oncology/tumor-normal-ingest` — Accepts paired VCFs and RNA-seq, returns pure somatic variant profile with VAF and CCF
2. `POST /api/crispr/allele-specific-design` — Generates CRISPR guides specifically targeting heterozygous somatic drivers with wildtype-sparing scoring
3. `POST /api/oncolytic/viral-chassis-select` — Recommends optimal viral backbone based on tumor receptor expression profile and TMB
4. `GET /api/oncology/tumor-mutational-burden` — Calculates and returns TMB, MSI status, and immune checkpoint expression from the somatic profile

### Estimated Data Science Complexity by Component

| Component | Complexity | Reason |
|-----------|-----------|--------|
| Somatic Variant Calling & Tumor-Normal Subtraction | **Medium** | Standard algorithms exist (Mutect2 logic); integration required |
| TMB and MSI Calculation | **Low** | Well-defined mathematical counting models |
| Allele-Specific CRISPR Design with CNV awareness | **High** | Novel thermodynamic modeling; no off-the-shelf algorithm |
| Viral Tropism and Logic-Gate Modeling | **High** | Multi-omics integration: RNA-seq + TF binding + microRNA regulation |
| Immunogenicity & HLA Binding Prediction | **High** | Requires deep learning (NetMHCpan integration); complex peptide processing |

---

## Conclusion

The platform's existing architecture is an excellent computational foundation that can be extended for precision oncology with focused engineering investment. The highest-priority addition is the **somatic variant pipeline** (tumor-normal pair analysis, VAF-aware CRISPR targeting) — this unlocks the entire cancer use case with medium complexity. The oncolytic virus module is architecturally more ambitious but follows naturally once the somatic genomics foundation is in place.

The core insight: the same patient-specific sequence personalization that makes this platform powerful for inherited diseases makes it uniquely powerful for somatic cancer targeting — because cancer, like inheritance, is a VCF.
