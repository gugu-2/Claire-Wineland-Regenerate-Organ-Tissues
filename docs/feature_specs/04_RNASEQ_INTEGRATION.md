# Feature Spec 04 — Multi-Omics RNA-seq Expression Matrix Integration

> **Status:** Not Started  
> **Priority:** 🔴 Sprint 2  
> **Estimated Effort:** 5–7 development days  
> **Current Gap:** The platform only uses DNA mutations (VCF). A mutated gene that is not actually expressed in the tumor is not a good therapeutic target.

---

## 1. What This Does for the User

**After this feature is built**, the researcher will:
- Upload a **gene expression matrix** from their RNA-seq experiment (CSV file: genes as rows, samples as columns, values in TPM or raw counts).
- The platform will **automatically normalize** raw counts to TPM (Transcripts Per Million) if needed.
- Every CRISPR guide target gene will be color-coded by expression level in the CRISPR designer grid (green = highly expressed, grey = silent).
- Guides targeting genes with `TPM < 1.0` (effectively not expressed) will be flagged with a warning: "Target gene not expressed in this tumor sample — low therapeutic utility."
- The Tumor Fingerprint radar chart will gain a new expression overlay axis.
- The OncoCRISPR designer will automatically rank guides by `expression_level × allele_specificity_score` for optimal target selection.
- The researcher can also upload a **differential expression table** (from DESeq2 or edgeR) to directly import which genes are upregulated in the tumor versus matched normal tissue.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                BROWSER (React 18)                                        │
│                                                                          │
│  [SampleIntakeView.jsx] — New Sub-Tab: "RNA Expression"                 │
│    Upload widget: drag-and-drop CSV/TSV gene expression matrix          │
│    OR: manual entry for a few key genes                                 │
│    Preview: top 20 most expressed genes table                           │
│                                                                          │
│  [CrisprDesignerView.jsx] — Updated candidate table                    │
│    Column added: "Expression Level" with colored badges                 │
│    Filter button: "Hide unexpressed targets (TPM < 1)"                  │
│                                                                          │
│  [OncoCrisprDesignerView.jsx] — Expression-adjusted scoring             │
│    New sort option: "Expression × Discrimination Score"                 │
└─────────────────────────────────────────────────────────────────────────┘
                      |
                      ▼ POST /api/sample/upload-rnaseq
┌─────────────────────────────────────────────────────────────────────────┐
│               FASTAPI BACKEND                                            │
│                                                                          │
│  POST /api/sample/upload-rnaseq                                         │
│    Accepts: multipart/form-data (CSV file) + sample_id + normalization  │
│    Returns: { expression_profile_id, gene_count, top_genes, summary }  │
│                                                                          │
│  GET /api/sample/{sample_id}/expression/{gene_name}                    │
│    Returns: { tpm: 142.7, percentile_rank: 84, expressed: true }        │
│                                                                          │
│  Module: rnaseq_processor.py                                            │
│    - Reads CSV into pandas DataFrame                                    │
│    - Detects format (counts vs TPM)                                     │
│    - Normalizes if raw counts                                            │
│    - Stores in SQLite expression_profiles table                          │
└─────────────────────────────────────────────────────────────────────────┘
                      |
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│           SQLITE EXTENSION — New Table: expression_profiles             │
│                                                                          │
│  Columns: id, sample_id, gene_name, tpm, raw_counts, log2fc,            │
│           padj, source_file, created_at                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Python Libraries (Backend)

| Library | pip install | Purpose |
|---------|-------------|---------|
| **pandas** | already installed | Read CSV/TSV, matrix operations |
| **numpy** | `numpy` | TPM normalization calculations |
| **scipy** | `scipy` | Statistical tests for differential expression validation |
| **pydeseq2** | `pydeseq2` | Optional: run DESeq2-equivalent normalization in Python without R |
| **anndata** | `anndata` | Standard data structure for omics matrices (used by scanpy) |
| **python-multipart** | already in FastAPI stack | Handle file uploads |

### TPM Normalization Formula

```
If input is raw read counts:

Step 1: RPK (Reads Per Kilobase) = raw_counts / (gene_length_kb)
Step 2: TPM = (RPK / sum(all RPKs)) × 1,000,000

If gene lengths are unavailable:
  Use median library size normalization (CPM: Counts Per Million)
  TPM approximation = CPM (acceptable for relative expression comparison)
```

### Frontend React Packages

| Package | Purpose |
|---------|---------|
| `react-dropzone` | Drag-and-drop file upload zone |
| `papaparse` | Fast client-side CSV parsing (preview first 100 rows before upload) |
| `recharts` | Violin plot and expression distribution chart |

---

## 4. Data Flow — Step by Step

```
STEP 1:  User in Tab 1 (Sample Intake) → clicks "RNA Expression" sub-tab
         Sees drag-and-drop zone: "Drop expression matrix CSV here"
         File format guidance:
           - Rows: gene names (HGNC symbols or Ensembl IDs)
           - Columns: sample names (can be just one sample)
           - Values: raw counts or TPM
         ↓
STEP 2:  PapaParse previews first 5 rows in browser before upload
         User selects: normalization type (Raw Counts | TPM | FPKM | log2FC table)
         User clicks "Upload & Process"
         ↓
STEP 3:  POST to /api/sample/upload-rnaseq (multipart form data)
         Backend rnaseq_processor.py:
           a. Read CSV with pandas
           b. Detect gene ID type (HGNC or Ensembl → map to HGNC via id_mapper)
           c. Normalize if raw counts → TPM
           d. Compute percentile rank for each gene
           e. Store in expression_profiles table:
              { sample_id, gene: "KRAS", tpm: 312.5, percentile_rank: 91 }
         ↓
STEP 4:  Backend returns summary:
         { gene_count: 18502, top_expressed: ["KRAS", "EGFR", "MYC"], 
           unexpressed_count: 4102, median_tpm: 8.2 }
         ↓
STEP 5:  App.jsx stores expression_profile_id in global state
         ↓
STEP 6:  CrisprDesignerView.jsx fetches expression for active target gene:
         GET /api/sample/PT_001/expression/CCR5
         → { tpm: 847.3, expressed: true, percentile_rank: 78 }
         Each guide candidate row now shows expression badge:
           [● High: 847 TPM]  or  [○ Silent: 0.3 TPM ⚠]
         ↓
STEP 7:  If a guide targets a gene with TPM < 1.0:
         Banner appears: "⚠ CCR5 is not expressed in this sample (0.3 TPM).
         Editing this gene may have no therapeutic effect in this tumor."
```

---

## 5. Backend Module Design

### New File: `backend/modules/rnaseq_processor.py`

```
FUNCTION: detect_format(df: DataFrame) -> str
  LOGIC:
    - If all values are integers or low decimals and max > 1000 → "raw_counts"
    - If values between 0-1M and many < 10 → "tpm"
    - If values between -10 and +10 and a "padj" column exists → "log2fc_table"

FUNCTION: normalize_to_tpm(raw_count_df: DataFrame, gene_lengths: dict) -> DataFrame
  LOGIC:
    1. Calculate RPK = counts / gene_length_kb
    2. TPM = (RPK / RPK.sum()) * 1_000_000
    If gene lengths not provided: CPM = (counts / counts.sum()) * 1_000_000

FUNCTION: map_gene_ids(df: DataFrame, id_type: str) -> DataFrame
  LOGIC:
    - If Ensembl IDs (ENSG format): query local HGNC symbol mapping table
    - If already HGNC symbols: pass through

FUNCTION: compute_expression_summary(tpm_series: Series) -> dict
  RETURNS: {
    gene: str,
    tpm: float,
    expressed: bool (tpm > 1.0),
    percentile_rank: float (0-100),
    classification: "High" | "Medium" | "Low" | "Silent"
  }

FUNCTION: store_expression_profile(sample_id: str, tpm_df: DataFrame) -> str
  LOGIC: Bulk insert into expression_profiles SQLite table
  RETURNS: expression_profile_id (UUID)

FUNCTION: get_gene_expression(sample_id: str, gene_name: str) -> dict
  LOGIC: SELECT from expression_profiles WHERE sample_id = ? AND gene_name = ?
```

### New SQLite Table

```sql
CREATE TABLE expression_profiles (
    id TEXT PRIMARY KEY,
    sample_id TEXT NOT NULL REFERENCES samples(sample_id),
    gene_name TEXT NOT NULL,
    tpm REAL,
    raw_counts REAL,
    log2fc REAL,
    padj REAL,
    percentile_rank REAL,
    source_file TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expr_sample_gene ON expression_profiles(sample_id, gene_name);
```

---

## 6. Frontend Component Design

### Updated: `frontend/src/components/SampleIntakeView.jsx`

New Sub-Tab: **RNA Expression Upload**

```
UI LAYOUT FOR NEW SUB-TAB:

┌─────────────────────────────────────────────────────────────────────────┐
│  Module 1: RNA Expression Data — Optional but Recommended               │
│  Providing expression data ranks your CRISPR targets by clinical impact │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────┐           │
│  │  Drop your expression matrix CSV here, or click to browse│           │
│  │                                                          │           │
│  │     📄  Format: genes × samples, values = TPM or counts  │           │
│  └─────────────────────────────────────────────────────────┘           │
│                                                                          │
│  Normalization: (o) Raw Counts  (*) TPM  (o) FPKM  (o) Log2FC table   │
│  Sample Column: [ Tumor_Sample_01 ▼ ] (if multi-sample matrix)         │
│                                                                          │
│  [Upload & Normalize]                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  RESULT PREVIEW (after upload):                                         │
│  Genes loaded: 18,502 | Expressed (TPM > 1): 14,400 | Silent: 4,102   │
│                                                                          │
│  Top Expressed Genes:   KRAS (312 TPM), EGFR (244 TPM), MYC (198 TPM) │
│  Your Target Gene CCR5: 847 TPM — ● HIGH EXPRESSION                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Execution Plan

| Day | Task |
|-----|------|
| **Day 1** | Create `expression_profiles` SQLite table migration. Write `rnaseq_processor.py` with format detection and TPM normalization. Unit tests with a mock 100-gene CSV. |
| **Day 2** | Build `/api/sample/upload-rnaseq` endpoint. Test file upload via curl with a real TCGA expression matrix sample. |
| **Day 3** | Build `GET /api/sample/{id}/expression/{gene}` endpoint. Verify percentile ranking accuracy. |
| **Day 4** | Update `SampleIntakeView.jsx`: add new "RNA Expression" sub-tab with `react-dropzone`, PapaParse preview, and normalization selector. |
| **Day 5** | Update `CrisprDesignerView.jsx`: fetch expression for active target gene, add color-coded expression column to guide table. Add warning banner for unexpressed targets. |
| **Day 6** | Update `OncoCrisprDesignerView.jsx`: add "Expression × Score" composite ranking option. |
| **Day 7** | End-to-end integration with a real TCGA KRAS-mutant pancreatic adenocarcinoma expression dataset. |
