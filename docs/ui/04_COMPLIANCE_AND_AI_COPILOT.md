# Compliance, Audit, and AI Copilot

> **Purpose:** This document explains the safety-critical UI components. When building software that could eventually dictate how human DNA is altered, strict compliance and audit trails must be deeply integrated into the user experience.

## Tab 5: Research Dossier & Audit (`ResearchReportView.jsx`)

### Layout
- **Left Panel (Audit Log):** A chronological, uneditable feed of every action the user took in the current session (e.g., "Timestamp: Checked KRAS Azimuth Score", "Timestamp: Approved by Dr. Smith").
- **Right Panel (PDF Preview):** An A4-formatted, print-ready document preview summarizing the entire genetic design.

### Interaction Logic
1. This tab acts as the final "Checkout" page.
2. It aggregates state from all other tabs.
3. The user clicks "Generate Final Report". The backend compiles a highly secure PDF.
4. **Why this matters:** FDA compliance (21 CFR Part 11) requires strict audit trails. If an experiment fails in the wet lab, the PI needs to trace back exactly who designed the guide and what the in-silico predictions were.

---

## Global Component: The Expert Review Modal (`ExpertReviewModal.jsx`)

### Layout
- **Hard-Stop Modal Overlay:** A dark, screen-obscuring overlay that cannot be bypassed without valid input.
- **Form:** Requires a PIN or biometric auth, plus a mandatory text field justifying *why* an unsafe guide is being approved.

### Interaction Logic
1. Triggered automatically from Tab 2 if a user tries to proceed with a guide that has a High Off-Target Risk.
2. **Why this matters:** Prevents junior researchers or automated agents from accidentally ordering a dangerous CRISPR sequence. It enforces human-in-the-loop (HITL) protocol physically in the UI layer.

---

## Global Component: The Knowledge Copilot (`KnowledgeCopilotView.jsx`)

### Layout
- **Floating Sidebar:** Can be toggled open from anywhere in the application.
- **Chat Interface:** Familiar iMessage/ChatGPT-style bubbles.
- **Context Awareness Chips:** Small tags at the top of the chat indicating what the AI currently "sees" (e.g., `Context: Tab 6`, `Context: KRAS_G12D`).

### Interaction Logic
1. The user presses `Cmd+K` or clicks the Copilot button.
2. The user types a question: *"Why is this guide failing?"*
3. The UI bundles the user's current screen state + the chat message, sending it to the FastAPI backend.
4. The backend runs a RAG (Retrieval-Augmented Generation) pipeline against local PubMed data, queries the Google Gemini API, and streams the answer back to the UI.
5. **Why this matters:** It prevents the user from opening a new tab, going to Google, losing their train of thought, and breaking their workflow. The AI is embedded directly into the research process.
