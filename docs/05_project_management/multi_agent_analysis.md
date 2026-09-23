# Multi-Agent Expert Analysis: Genom Platform

The specialized strike team has completed a comprehensive parallel audit of the `genom` codebase. Here is the synthesized intelligence from all five expert domains regarding what is currently broken or risky, and what should be added to build a world-class platform.

---

## 🧬 1. Genetic Engineering Agent
**Focus:** Molecular biology, bioinformatics, and CRISPR dynamics.

**🔴 What's Bad / Dangerous:**
*   **VCF Coordinate Shifts (Critical):** The sequence reconstitution math handles indels sequentially but fails to dynamically update downstream offsets. This effectively causes catastrophic frameshifts for all subsequent variants in a sample. Furthermore, it assumes all genes are on the `(+)` forward strand, causing reverse-strand gene mutations to map to garbage sequence.
*   **Pseudo-Scientific Azimuth/CFD:** The current scoring models in `azimuth_cfd.py` are heuristic approximations (linear summations and generic decay profiles). They are not the actual gradient-boosted ML ensembles used by Doench et al., making the scores scientifically invalid for clinical use.

**🟢 What to Add (Pro Features):**
*   **MMEJ Profiling:** Add Microhomology-Mediated End Joining (MMEJ) predictions (like *inDelphi*) to forecast exact indel distributions.
*   **True ML Pipelines:** Replace the heuristic math with actual `scikit-learn` or `XGBoost` inference endpoints using the validated weights for Azimuth 2.0 and DeepCpf1.
*   **Epigenetic Context:** Pull ATAC-seq or histone methylation tracks to score guides against local nucleosome occlusion (Cas9 doesn't cut tightly wound heterochromatin well).

---

## ⚕️ 2. Clinical & Translational Agent
**Focus:** Patient safety, medical ethics, and translational protocols.

**🔴 What's Bad / Dangerous:**
*   **Fake Patient Consenting:** Consent status is a static text string. Real clinical tools require cryptographic e-consent tracking and withdrawal mechanisms.
*   **Toothless Review Gate:** The expert review allows users to manually type any name and IRB number to approve a design. It lacks verification and doesn't explicitly force reviewers to assess immunogenicity or genotoxicity.
*   **No Clinical Ontologies:** Clinical status is free-text ("Severe Vaso-occlusive Crises"). Without standardized HPO or ICD-11 codes, automated trial matching is impossible.

**🟢 What to Add (Pro Features):**
*   **Adverse Event (AE) Prediction:** Translate molecular off-targets into clinical risks (e.g., "Off-target hit in *TP53* increases secondary leukemia risk").
*   **Clinical Trial Matching:** Link patient variant profiles directly to recruiting trials on ClinicalTrials.gov.
*   **Pharmacogenomics Check:** Check if the patient's other variants make them susceptible to the severe toxicity of the myeloablative conditioning drugs required for gene therapy.

---

## 💻 3. Backend Architecture Agent
**Focus:** FastAPI, Database, and Infrastructure Scaling.

**🔴 What's Bad / Dangerous:**
*   **Synchronous Bottlenecks:** Endpoints and database queries are completely synchronous. Heavy bioinformatics tasks will block the FastAPI event loop, causing the app to freeze under concurrent use.
*   **SQLite Limitations:** Storing massive JSON state blobs in a local SQLite file will corrupt or bottleneck rapidly if scaled beyond a single user.
*   **Fragile Job Queues:** Background tasks use in-memory dictionaries (`OFF_TARGET_JOBS`). If the server restarts, all running genome scans vanish.

**🟢 What to Add (Pro Features):**
*   **Asynchronous Overhaul:** Convert routes to `async def` and use `asyncpg` for database operations.
*   **Celery + Redis:** Offload genome scanning and literature RAG to a distributed Celery worker queue to guarantee task completion.
*   **Microservices:** Split the heavy CRISPR biophysics engine from the RAG chat copilot into separate services.

---

## 🎨 4. Product & UX Agent
**Focus:** UI workflows, user journeys, and feature friction.

**🔴 What's Bad / Dangerous:**
*   **Isolated Copilot:** The Knowledge Copilot is trapped in its own tab. Users lose visual context of their guide RNAs when asking the AI questions.
*   **Clunky VCF Intake:** Forcing scientists to paste massive raw VCF text into a small text area is error-prone and will crash the browser. 
*   **Rigid Reporting:** The generated dossier cannot be customized or edited before export.

**🟢 What to Add (Pro Features):**
*   **Global Sidebar Copilot:** Move the AI chat into a persistent, resizable right-hand panel accessible from *any* tab.
*   **Standardized Genome Browser:** Replace the custom locus UI with an industry-standard embedded browser (e.g., IGV.js) to visualize BAM alignments and read depths natively.
*   **Interactive Guide Optimization:** Allow scientists to drag a sliding window across the locus and watch the Azimuth/CFD scores recalculate in real-time.

---

## 🏢 5. Business Strategy Agent
**Focus:** Commercialization, Compliance, and Liability.

**🔴 What's Bad / Dangerous:**
*   **GDPR / HIPAA Violations:** Patient Data (PHI) is stored in plain text with no encryption. Even worse, appending patient data to an *immutable* cryptographic audit log directly violates the GDPR "Right to Erasure" (you cannot delete their data if it's hashed into an immutable chain).
*   **Zero Authentication:** The lack of SSO/RBAC makes this platform completely non-compliant for FDA 21 CFR Part 11 (electronic records/signatures).

**🟢 What to Add (Pro Features):**
*   **1-Click Manufacturer E-Commerce:** Integrate directly with Twist Bioscience, IDT, or Synthego APIs. Allow users to push their oligo designs straight to a cart, and capture a referral margin on the synthesis order.
*   **Enterprise SaaS Subscriptions:** Build multi-tenant, HIPAA-compliant workspaces (with AES-256 encryption and SAML SSO) to sell to research institutions and Pharma.
*   **Compute Billing:** Charge tokens or credits for heavy operations like genome-wide Cas-OFFinder scans or Deep-Learning inferences.
