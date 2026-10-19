# Feature Spec 05 — Single-Cell RNA-seq & Spatial Transcriptomics

> **Status:** Not Started  
> **Priority:** 🟡 Sprint 3  
> **Estimated Effort:** 8–10 development days  
> **Why Critical:** Bulk tumor sequencing averages across millions of cells, hiding rare drug-resistant subclones. Single-cell analysis reveals the complete tumor ecosystem and identifies cells that will survive therapy.

---

## 1. What This Does for the User

**After this feature is built**, the researcher will:
- Upload a single-cell RNA-seq dataset (10x Genomics CellRanger output: `barcodes.tsv`, `features.tsv`, `matrix.mtx`).
- See an interactive **UMAP scatter plot** where each dot is a single cancer cell, colored by mutation status, gene expression, or cluster identity.
- Identify the tiny population of **cancer stem cells (CSCs)** or **therapy-resistant clones** (e.g., 1.2% of cells that are MYC-high, TP53-null) that would survive standard chemotherapy.
- Click on a cluster → see which genes are enriched in that cluster → automatically run CRISPR target design for those specific subclones.
- For spatial transcriptomics (10x Visium): overlay gene expression on a histological biopsy slide image, seeing which cancer-cell-dense zones are immune-excluded.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│               BROWSER (React 18)                                         │
│                                                                          │
│  [ScRnaView.jsx] — New Research Tab (Tab 10 or added to Playground)     │
│                                                                          │
│  Upload Zone: "Drop 10x CellRanger output folder files"                 │
│    (barcodes.tsv.gz + features.tsv.gz + matrix.mtx.gz)                  │
│                                                                          │
│  [UmapCanvas.jsx] — WebGL scatter plot (100k cells)                     │
│    Click cluster → show marker genes                                     │
│    Color by: Gene Expression | Cluster | Mutation Score | CSC Score     │
│                                                                          │
│  [SpatialView.jsx] — Biopsy image + expression overlay                  │
│    Upload: TIFF slide image + spot coordinates                          │
└─────────────────────────────────────────────────────────────────────────┘
                      |
                      ▼ (async heavy computation)
┌─────────────────────────────────────────────────────────────────────────┐
│               FASTAPI BACKEND (with Celery Worker)                      │
│                                                                          │
│  POST /api/scrna/upload                                                 │
│    → Accepts: CellRanger files (multipart)                              │
│    → Queues Celery task: process_scrna_dataset(task_id, files)          │
│    → Returns: { task_id }                                               │
│                                                                          │
│  GET /api/scrna/status/{task_id}                                        │
│    → Returns: { status, progress, umap_coords, clusters }              │
│                                                                          │
│  CELERY WORKER (scrna_processor.py):                                    │
│    Step 1: Load matrix with scanpy/anndata                              │
│    Step 2: Quality control (filter cells, normalize)                    │
│    Step 3: PCA dimensionality reduction (50 components)                 │
│    Step 4: UMAP embedding (2D coordinates per cell)                     │
│    Step 5: Leiden clustering                                             │
│    Step 6: Marker gene detection per cluster                            │
│    Step 7: Cancer stem cell scoring (CytoTRACE or CancerSEA signatures)│
│    Step 8: Save results to DB                                           │
└─────────────────────────────────────────────────────────────────────────┘
                      |
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  REDIS + CELERY                                                          │
│  Celery: async task queue for CPU-intensive scanpy pipeline              │
│  Redis: task state storage + results caching                             │
│  Alternative (no Redis): asyncio background task (simpler, less robust) │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Core Python Libraries

| Library | pip install | Purpose |
|---------|-------------|---------|
| **scanpy** | `scanpy` | The standard single-cell analysis library (AnnData, PCA, UMAP, Leiden clustering) |
| **anndata** | `anndata` | N-dimensional annotated matrix data structure |
| **umap-learn** | `umap-learn` | UMAP dimensionality reduction algorithm |
| **leidenalg** | `leidenalg` | Leiden graph community detection (cell clustering) |
| **celery** | `celery[redis]` | Distributed async task queue for heavy computations |
| **redis** | `redis-py` | Task state backend for Celery |
| **scipy** | already installed | Sparse matrix I/O for `.mtx` files |

### Frontend WebGL Scatter Plot

| Package | Purpose |
|---------|---------|
| **deck.gl** | WebGL-accelerated visualization. `ScatterplotLayer` handles 100k cells at 60fps |
| **@loaders.gl/core** | Efficient loading of large point cloud data |
| **react-dropzone** | Drag-and-drop upload for CellRanger output files |
| **d3** | Color scale mapping for expression gradients |

---

## 4. Data Flow — Step by Step

```
STEP 1:  User uploads 3 CellRanger output files:
         - matrix.mtx.gz (sparse count matrix: cells × genes)
         - barcodes.tsv.gz (cell barcodes)
         - features.tsv.gz (gene names)
         ↓
STEP 2:  Backend receives files → Celery task queued (ID returned immediately)
         ↓
STEP 3:  Celery worker loads data via scanpy:
         adata = sc.read_10x_mtx(path)              # Load matrix
         sc.pp.filter_cells(adata, min_genes=200)   # Remove low-quality cells
         sc.pp.filter_genes(adata, min_cells=3)     # Remove rare genes
         sc.pp.normalize_total(adata, 1e4)          # Normalize per cell
         sc.pp.log1p(adata)                         # Log-transform
         sc.pp.highly_variable_genes(adata, n=2000) # Select variable genes
         sc.pp.pca(adata, n_comps=50)               # PCA
         sc.pp.neighbors(adata)                     # kNN graph
         sc.tl.umap(adata)                          # UMAP embedding
         sc.tl.leiden(adata)                        # Cluster cells
         sc.tl.rank_genes_groups(adata, 'leiden')   # Marker genes per cluster
         ↓
STEP 4:  Extract and compress results for frontend:
         umap_coords: [(x, y, cluster_id, cell_barcode), ...]  — 100k entries
         cluster_summary: [{ id, cell_count, top_markers, name }]
         ↓
STEP 5:  Store compressed JSON in scrna_datasets SQLite table
         Update task status to "complete"
         ↓
STEP 6:  Frontend polls status → receives UMAP coordinates
         deck.gl ScatterplotLayer renders 100k points instantly in WebGL
         ↓
STEP 7:  User clicks a cluster:
         Frontend highlights clicked cluster cells
         API returns: top marker genes for cluster 4 = ["MYC", "CD44", "SOX2"]
         → "This cluster has high CSC (Cancer Stem Cell) markers"
         Button: "Design CRISPR guides targeting this subclone"
         ↓
STEP 8:  User clicks "Design guides for Cluster 4":
         Passes cluster marker genes to CrisprDesignerView
         Automatically runs guide design for MYC, CD44, SOX2
```

---

## 5. Backend Module Design

### New File: `backend/modules/scrna_processor.py`

```
FUNCTION: run_scanpy_pipeline(mtx_path, barcodes_path, features_path) -> AnnData
  STEPS: load → QC filter → normalize → log1p → HVG → PCA → neighbors → UMAP → Leiden

FUNCTION: compute_csc_score(adata) -> Series
  METHOD: Score each cell against the CancerSEA Cancer Stem Cell gene signature
          (CSC signature: CD44, SOX2, OCT4, NANOG, ALDH1A1, CD133/PROM1)
  RETURNS: Score per cell barcode (0-1 range)

FUNCTION: export_umap_for_frontend(adata) -> list[dict]
  RETURNS: [{ x, y, cluster, barcode, csc_score, key_gene_values }]
  Compressed: JSON gzipped (large datasets need compression)

FUNCTION: get_cluster_markers(adata, cluster_id) -> list[dict]
  RETURNS: [{ gene, log2fc, pval, pct_expressing }] top 20 genes per cluster

FUNCTION: compute_spatial_expression(adata_visium, gene_name) -> list[dict]
  RETURNS: [{ spot_id, x_pixel, y_pixel, expression }]
  PURPOSE: Overlays gene expression on histological slide image
```

---

## 6. Frontend Component Design

### New File: `frontend/src/components/ScRnaView.jsx`

```
STATE:
  - taskId: string
  - status: 'idle' | 'uploading' | 'processing' | 'ready'
  - umapData: array of {x, y, cluster, barcode}
  - selectedCluster: number | null
  - colorBy: 'cluster' | 'csc_score' | 'gene_expression'
  - geneForExpression: string (search input for gene to color by)

UI LAYOUT:
┌─────────────────────────────────────────────────────────────────────────┐
│ SINGLE-CELL RNA-seq ANALYSIS                                            │
│ Dataset: Pancreatic PDAC Biopsy | Cells: 8,423 | Clusters: 12         │
├─────────────────────────────────────────────────────────────────────────┤
│ Color By: [● Cluster] [CSC Score] [Gene: KRAS ___________________]     │
├───────────────────────────────────────┬─────────────────────────────────┤
│                                       │  CLUSTER DETAILS                │
│  [UMAP WebGL Canvas — deck.gl]        │  Selected: Cluster 4            │
│  100,000 single cells plotted         │  Cells: 847 (10.0%)             │
│  Each dot = 1 cancer cell             │  Top Markers:                   │
│  Color = cluster assignment           │    MYC ↑ (3.8x FC)             │
│                                       │    CD44 ↑ (2.4x FC)            │
│  Click cluster → show details →       │    ALDH1A1 ↑ (1.9x FC)        │
│                                       │  Classification: ⚠ CSC-rich     │
│                                       │  CSC Score: 0.78/1.0            │
│                                       │                                 │
│                                       │  [Design CRISPR for Cluster 4] │
└───────────────────────────────────────┴─────────────────────────────────┘
```

---

## 7. Execution Plan

| Day | Task |
|-----|------|
| **Day 1** | Install `scanpy`, `anndata`, `umap-learn`, `leidenalg`. Run pipeline locally on a small public 10x dataset (e.g., 3k PBMCs benchmark). |
| **Day 2** | Set up Redis + Celery worker. Write `run_scanpy_pipeline` as a Celery task. Test task queuing. |
| **Day 3** | Build `scrna_processor.py` module: QC, normalization, PCA, UMAP, Leiden. Add `compute_csc_score`. |
| **Day 4** | Build FastAPI endpoints: upload, status polling, cluster details. |
| **Day 5** | Build `UmapCanvas.jsx` using deck.gl ScatterplotLayer. Test rendering 50k+ points. |
| **Day 6** | Wire cluster click → marker gene query → display cluster summary panel. |
| **Day 7** | Build "Design CRISPR for this cluster" bridge to CrisprDesignerView. |
| **Day 8** | Build `SpatialView.jsx`: upload TIFF image, overlay expression heatmap using HTML5 Canvas 2D. |
| **Days 9-10** | Performance testing, lazy loading large datasets, error handling, integration tests. |
