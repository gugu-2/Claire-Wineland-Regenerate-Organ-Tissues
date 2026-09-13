# Genomic Research Copilot: System Architecture

The Genomic Research Copilot is designed with a modern, decoupled client-server architecture, prioritizing responsiveness, data integrity, and complex biological computation.

## High-Level Architecture

The system is composed of two primary tiers:
1.  **Frontend**: A responsive Single Page Application (SPA) built with React and Vite.
2.  **Backend**: A high-performance, asynchronous REST API built with Python and FastAPI, backed by SQLite.

---

## 1. Frontend Architecture (React / Vite)

### Technology Stack
- **Framework**: React 18, utilizing functional components and hooks.
- **Build Tool**: Vite (for rapid HMR and optimized production bundling).
- **Styling**: Tailwind CSS (ensuring a cohesive, dark-themed biological UI).
- **Icons**: Lucide React.
- **State Management**: Context/State hoisting (e.g., `App.jsx` handles global state like target samples and evaluated risk scores).

### Core Components
- **`App.jsx` (Root Orchestrator)**: Manages routing between the six primary modules. It maintains global state such as `selectedSample`, `candidateGuides`, and `customEvaluation`. It leverages `AbortController` to handle race conditions during rapid data fetching.
- **API Client (`api.js`)**: An abstracted fetch wrapper that connects to the FastAPI backend `/api` endpoints, managing HTTP requests for sequence personalization, CRISPR design, and AI queries.
- **Views**: Isolated, highly specialized UI modules (e.g., `SampleIntakeView`, `CrisprDesignerView`, `RegenerationView`).
- **Global Sidebar (`KnowledgeCopilotView.jsx`)**: Implemented as a Z-indexed drawer, allowing users to query the biomedical knowledge graph without losing context on their CRISPR designs.

---

## 2. Backend Architecture (Python / FastAPI)

### Technology Stack
- **Framework**: FastAPI (for asynchronous request handling and auto-generated OpenAPI docs).
- **Server**: Uvicorn (ASGI web server).
- **Database**: SQLite with `sqlite3` for local, file-based persistence.
- **Concurrency**: Python `asyncio` and `threading` (e.g., locking mechanisms for the audit trail).

### Core Modules
- **`main.py`**: The entry point that mounts the API routes and handles CORS middleware.
- **`sample_intake.py`**: Parses patient VCF files, handles strand orientation logic (`-1` vs `1`), and rebuilds patient-specific sequences by injecting SNPs and INDELs into reference GRCh38 intervals.
- **`crispr_designer.py`**: Locates PAM motifs across both forward and reverse strands, generates 20nt guides, designs Prime Editing pegRNAs, and applies Cas12a 5' geometry rules.
- **`azimuth_cfd.py`**: Contains the biological scoring heuristics. It computes on-target efficiency and off-target Cutting Frequency Determination (CFD) scores, accurately penalizing transition vs. transversion mismatches.
- **`knowledge_copilot.py`**: Simulates retrieval-augmented generation (RAG) by fetching structured literature citations and clinical trial data.
- **`core/security.py` & `core/database.py`**: Manages thread-safe writes to the `audit_trail.jsonl` and database schemas.

---

## 3. Data Flow & Execution Model

1. **Intake**: User selects a patient or uploads a VCF. Frontend calls `/api/samples/personalize`.
2. **Reconstitution**: Backend `sample_intake.py` fetches the wildtype reference and mutates it with the patient's VCF variants to create `personalized_sequence`.
3. **Design**: Frontend passes the personalized sequence to `/api/crispr/design`. `crispr_designer.py` scans for PAM sites.
4. **Scoring**: Each candidate guide is scored by `azimuth_cfd.py` for efficiency and collision risks (e.g., guide sitting on top of a personal SNP).
5. **Review**: User signs off via `ExpertReviewModal`, which POSTs to `/api/review/submit`. The backend logs this transaction in the immutable SHA-256 audit trail.
6. **Export**: The entire pipeline data is aggregated into a final JSON/PDF dossier via `ResearchReportView.jsx`.
