# Feature Spec 02 — Genome-Wide 3.2B Base-Pair Real Off-Target Alignment

> **Status:** Not Started  
> **Priority:** 🔴 Sprint 1  
> **Estimated Effort:** 6–8 development days  
> **Current Limitation:** `azimuth_cfd.py` computes mismatch penalty scores mathematically but does not perform actual genomic sequence alignment across all 3.2 billion base pairs

---

## 1. What This Does for the User

Today, when a researcher clicks "Compute Off-Target Score" for a guide RNA, the system uses the mathematical CFD matrix to estimate risk. This is scientifically meaningful but incomplete: it doesn't actually search the genome for hidden binding sites.

**After this feature is built**, the researcher will:
- Click **"Run Full Genome Scan"** and wait ~60–90 seconds.
- See a complete ranked table of every location in the human genome (GRCh38) where the guide could bind with 0, 1, 2, 3, or 4 mismatches.
- Each off-target site will show: Chromosome, Position, Strand, Number of Mismatches, Mismatch Positions, Gene Name if in/near a gene, Gene Type (coding exon, intron, intergenic, tumor suppressor), and the estimated CFD penalty score.
- A safety traffic light: 🟢 (no genic hits) / 🟡 (intronic hits only) / 🔴 (exonic off-target hit — guide rejected).
- The system will automatically block clinical approval if an off-target site falls within a known tumor suppressor gene (TP53, BRCA1, BRCA2, APC, RB1, PTEN).

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React 18)                               │
│                                                                         │
│  [CrisprDesignerView.jsx]                                               │
│       Button: "Run Genome-Wide Off-Target Scan"                         │
│       → POST /api/crispr/offtarget-scan  { guide_seq, pam_type }       │
│       → Shows progress bar: polling GET /api/crispr/offtarget-scan/{id} │
│       → Renders results table when job completes                        │
│                                                                         │
│  [OffTargetTable.jsx] (new component)                                   │
│       Columns: Chr | Position | Strand | Mismatches | Gene | Type | CFD │
│       Color rows: green / amber / red by risk                           │
│       Filter: Show only exonic | Show only tumor suppressors            │
└─────────────────────────────────────────────────────────────────────────┘
                     |
                     ▼ (async job system)
┌─────────────────────────────────────────────────────────────────────────┐
│                   FASTAPI BACKEND                                        │
│                                                                         │
│  POST /api/crispr/offtarget-scan                                        │
│    → Validates guide sequence                                           │
│    → Creates new job row in offtarget_scans table                       │
│    → Spawns background asyncio task                                     │
│    → Returns { job_id: "scan_abc123", status: "queued" }               │
│                                                                         │
│  GET /api/crispr/offtarget-scan/{job_id}                               │
│    → Returns { status: "running" | "complete", progress: 42, hits: [] } │
│                                                                         │
│  BACKGROUND WORKER (offtarget_scanner.py):                              │
│    → Calls Cas-OFFinder subprocess with guide + genome index            │
│    → As hits arrive, annotates each with gene info from genome_annotator│
│    → Stores results in offtarget_scans table                           │
│    → Updates job status to "complete"                                   │
└─────────────────────────────────────────────────────────────────────────┘
                     |
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                CAS-OFFINDER PROCESS (local binary)                      │
│                                                                         │
│  Tool: Cas-OFFinder v2.4.1 (C/C++ binary, runs via Python subprocess)  │
│  Input: Guide RNA (20nt) + PAM pattern + mismatch threshold (0-4)       │
│  Index: Pre-built GRCh38 genome FASTA index (~3.2GB disk)               │
│  Output: TSV file listing every genomic coordinate with mismatches      │
│  Runtime: ~45-90 seconds on modern CPU (parallelizable with OpenMP)     │
└─────────────────────────────────────────────────────────────────────────┘
                     |
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                GENOME ANNOTATION LAYER                                  │
│                                                                         │
│  Tool: PyRanges + GFF3 annotation file (Ensembl GRCh38 gene models)    │
│  Purpose: For each off-target coordinate, find the overlapping gene     │
│  Output: Gene name, transcript type, exon/intron/intergenic status     │
│                                                                         │
│  Pre-loaded Blocklist: Critical tumor suppressor gene coordinates:      │
│    TP53 (chr17), BRCA1 (chr17), BRCA2 (chr13), APC (chr5),            │
│    RB1 (chr13), PTEN (chr10), VHL (chr3), CDH1 (chr16)                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Off-Target Alignment Tool

| Tool | Description |
|------|-------------|
| **Cas-OFFinder** | The gold-standard open-source tool for CRISPR off-target site identification. Used by >5,000 published papers. Supports all Cas variants. |
| **Download** | `https://github.com/hkkim-work/cas-offinder` (C++ binary, compile or download pre-built) |
| **Execution** | Called via Python `subprocess.run(['cas-offinder', input_file, 'G', output_file])` |
| **Performance** | CPU mode: ~90s for 20nt guide. GPU mode (CUDA/OpenCL): ~5s |
| **Alternative** | CRISPOR (Python wrapper around Cas-OFFinder + Bowtie; higher-level but slower for batch use) |

### Genome Reference Files

| File | Size | Source |
|------|------|--------|
| `hg38.fa` | ~3.2 GB | UCSC Genome Browser or Ensembl FTP |
| `hg38.fa.fai` | ~8 KB | Generated by `samtools faidx hg38.fa` |
| `Homo_sapiens.GRCh38.109.gff3.gz` | ~1.2 GB | Ensembl FTP server |

### Python Libraries (Backend)

| Library | pip package | Purpose |
|---------|-------------|---------|
| **PyRanges** | `pyranges` | Ultra-fast genomic interval overlap queries |
| **pysam** | `pysam` | Read/index FASTA files efficiently |
| **asyncio** | built-in | Async subprocess management for Cas-OFFinder |
| **aiofiles** | `aiofiles` | Async file I/O for reading Cas-OFFinder output TSV |
| **pandas** | `pandas` | Parse and filter Cas-OFFinder output table |

### Frontend React Packages

| Package | Purpose |
|---------|---------|
| `@tanstack/react-table` | Powerful headless table library for paginated sortable results |
| `recharts` | Chromosome-level bar chart showing off-target site distribution |

---

## 4. Data Flow — Step by Step

```
STEP 1:  User selects a guide RNA in Tab 2 (CrisprDesignerView)
         Clicks "Run Full Genome-Wide Scan (GRCh38)"
         ↓
STEP 2:  Frontend POSTs:
         { guide_seq: "GATAGTCATCTTGGGGCTGG", pam_type: "NGG", max_mismatches: 3 }
         to POST /api/crispr/offtarget-scan
         ↓
STEP 3:  Backend creates offtarget_scans row:
         { job_id: "uuid-abc", status: "queued", guide_seq: ..., created_at: ... }
         Returns: { job_id: "uuid-abc" }
         ↓
STEP 4:  Background asyncio coroutine starts:
         a. Writes Cas-OFFinder input file to /tmp/{job_id}.txt
            Format: "hg38.fa\nNGG\nGATAGTCATCTTGGGGCTGG NNN 3\n"
         b. Calls: subprocess.run(['cas-offinder', '/tmp/{job_id}.txt', 'G', '/tmp/{job_id}_out.txt'])
         c. Parses /tmp/{job_id}_out.txt (TSV):
            chr3  46373452  GATAGTCATCTTGGGGCTGG  +  0  [exact match]
            chr7  12938410  GATATCATCTTGGGGCTGG   +  1  [1 mismatch pos 4]
            ...
         ↓
STEP 5:  For each hit: query PyRanges genome interval tree:
         gene_info = genome_gr.query(chrom='chr7', start=12938410, end=12938430)
         → Returns: { gene: 'TP53', type: 'exon', transcript: 'ENST00000269305' }
         ↓
STEP 6:  Apply safety classification:
         - 0 mismatches in known tumor suppressor exon → CRITICAL BLOCK
         - 1 mismatch in any coding exon → HIGH RISK (red)
         - 2-3 mismatches in intron → MODERATE (amber)
         - 3-4 mismatches in intergenic → LOW RISK (green)
         ↓
STEP 7:  Frontend polls GET /api/crispr/offtarget-scan/{job_id} every 3 seconds
         Response: { status: "running", progress: 67, hits_found_so_far: 12 }
         ↓
STEP 8:  On completion: renders OffTargetTable.jsx with all annotated hits
         If any CRITICAL BLOCK hit found → ExpertReviewModal is forced open
```

---

## 5. Backend Module Design

### New File: `backend/modules/offtarget_scanner.py`

```
CLASS: CasOFFinderRunner

  METHOD: prepare_input(guide_seq, pam, max_mismatches, genome_path, tmp_dir) -> str
    Creates Cas-OFFinder input file. Returns path to input file.

  METHOD: run_scan(input_path, tmp_dir) -> str   (ASYNC)
    Calls Cas-OFFinder subprocess. Returns path to output TSV file.

  METHOD: parse_output(output_path) -> list[dict]
    Reads TSV. Returns list of hits:
    [{ chrom, position, strand, mismatches, mismatch_positions, aligned_seq }]

CLASS: GenomeAnnotator

  METHOD: load_gff3(gff3_path)  — called at startup, cached in memory
    Loads Ensembl GFF3 file into PyRanges object.

  METHOD: annotate_hit(chrom, position, length) -> dict
    Returns { gene_name, gene_type, feature_type: "exon"|"intron"|"intergenic",
              is_tumor_suppressor: bool }

  PRELOADED TUMOR SUPPRESSORS:
    TP53, BRCA1, BRCA2, APC, RB1, PTEN, VHL, CDH1, MLH1, MSH2,
    CDKN2A, NF1, NF2, TSC1, TSC2, SMAD4, ATM, CHEK2, PALB2

CLASS: OffTargetJobManager

  METHOD: create_job(guide_seq, pam_type, max_mismatches) -> job_id (str)

  METHOD: run_job_async(job_id)  — launched as asyncio background task
    Orchestrates: prepare → run → parse → annotate → save → mark complete

  METHOD: get_job_status(job_id) -> dict
    Returns: { status, progress_percent, hits_count, results }
```

---

## 6. Frontend Component Design

### New File: `frontend/src/components/OffTargetTable.jsx`

```
PROPS:
  - jobId: string
  - onCriticalHitFound: callback (triggers ExpertReviewModal)

STATE:
  - pollingInterval: setInterval handle
  - jobStatus: 'queued' | 'running' | 'complete' | 'error'
  - progress: number (0-100)
  - hits: array of annotated off-target objects
  - filter: 'all' | 'exonic' | 'tumor_suppressors' | 'critical'

UI LAYOUT:
  ┌──────────────────────────────────────────────────────────────────────┐
  │ GENOME-WIDE OFF-TARGET SCAN RESULTS                                  │
  │ Guide: GATAGTCATCTTGGGGCTGG  |  PAM: NGG  |  Max Mismatches: 3     │
  │ Status: COMPLETE ✔  |  Total Hits: 47  |  Critical: 0  |  High: 3  │
  ├──────────────────────────────────────────────────────────────────────┤
  │ Filter: [All] [Exonic only] [Tumor Suppressors] [Critical]          │
  ├──────────────────────────────────────────────────────────────────────┤
  │ Chr  | Position    | MM | Gene       | Type    | Risk  | CFD Score  │
  │──────+─────────────+────+────────────+---------+───────+────────────│
  │ chr3 | 46,373,452  | 0  | CCR5       | Exon 3  | 🟢 OK | 1.000     │
  │ chr7 | 12,938,410  | 1  | MIR203A    | Intron  | 🟡 MOD| 0.821     │
  │ chr11| 5,227,200   | 2  | HBB        | Intron  | 🟡 MOD| 0.341     │
  │ chr17| 7,674,220   | 2  | TP53       | Exon 8  | 🔴 HIGH→ BLOCKED  │
  └──────────────────────────────────────────────────────────────────────┘
  
  If any 🔴 BLOCKED row exists → Banner: "EXPERT REVIEW REQUIRED"
  Button: [View on UCSC Genome Browser ↗] (external link with coordinates)
```

---

## 7. One-Time Setup (Genome Data)

The genome index and reference files (~6GB total) need to be downloaded once. A setup script handles this:

```
backend/scripts/setup_genome.py:

  1. Download hg38.fa.gz from UCSC (3.2GB)
  2. Decompress and index with samtools faidx
  3. Download Ensembl GRCh38 GFF3 annotation (1.2GB)
  4. Download and compile Cas-OFFinder binary (or use pre-built)
  5. Write config: GENOME_PATH, GFF3_PATH, CAS_OFFINDER_PATH to .env
```

---

## 8. Execution Plan

| Day | Task |
|-----|------|
| **Day 1** | Write `setup_genome.py` script. Download GRCh38 FASTA and Ensembl GFF3. Verify Cas-OFFinder binary runs locally. |
| **Day 2** | Build `CasOFFinderRunner` class. Write unit test with a known guide (CCR5-targeting guide) against a small test FASTA. |
| **Day 3** | Build `GenomeAnnotator` class using PyRanges. Test that querying chr17:7,674,220 returns TP53 exon 8. |
| **Day 4** | Build `OffTargetJobManager`. Wire up background asyncio job lifecycle. Add DB schema (already has `offtarget_scans` table). |
| **Day 5** | Build FastAPI endpoints: POST (create job) and GET (poll status). Manual test via curl. |
| **Day 6** | Build `OffTargetTable.jsx` frontend component with polling, live progress bar, and risk color coding. |
| **Day 7** | Wire TP53/BRCA1 critical block logic to ExpertReviewModal automatic trigger. |
| **Day 8** | End-to-end integration test. Performance profile scan time. Document expected runtime in UI. |
