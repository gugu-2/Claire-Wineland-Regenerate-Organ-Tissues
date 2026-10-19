# Feature Spec 10 — Multi-User Live Collaborative Workspace

**Version:** 1.0  
**Priority:** 🟡 High  
**Effort Estimate:** 12 days  
**Status:** Not Started  
**Depends On:** Existing WebSocket at `/ws/playground`, existing `chat_messages` + `audit_logs` tables

---

## 1. User-Facing Description

Multiple researchers — oncologists, bioinformaticians, lab leads — can join the same analysis session simultaneously and:

1. **See each other's cursors** in real-time on the locus track, molecular viewer, and CRISPR designer
2. **Know who's online** — a sidebar shows avatars and names of all connected collaborators
3. **Collaborate on annotations** — when Researcher A adds a note to a guide RNA result, Researcher B sees it appear instantly
4. **Share the same active analysis** — if Researcher A triggers a new CRISPR scan, the results appear on Researcher B's screen automatically
5. **Leave persistent session notes** — a shared notepad visible to all session members, persisted in the database
6. **Sign off on shared decisions** — a lightweight "consensus sign-off" for each guide RNA design choice (required for clinical research teams)

This transforms the tool from a solo research workbench into a team precision oncology platform.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    FRONTEND  (Multiple Browser Windows)               │
│                                                                      │
│  User A (Oncologist)               User B (Bioinformatician)         │
│  ┌──────────────────────┐          ┌──────────────────────┐          │
│  │  CrisprDesignerView  │          │  CrisprDesignerView  │          │
│  │                      │◄────────►│                      │          │
│  │  [👤 Dr. Chen  🟢]   │  sync   │  [👤 Dr. Smith 🟢]   │          │
│  │  [cursor overlay ▲]  │  docs   │  [cursor overlay ▲]  │          │
│  └──────────────────────┘          └──────────────────────┘          │
│           │                                   │                      │
│  useCollaborationWS.js hook (both browsers)                          │
└──────────────────────────────────────────────────────────────────────┘
         │  WebSocket ws://localhost:8000/ws/collaboration/{session_id}
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    BACKEND  (FastAPI + WebSocket)                     │
│                                                                      │
│  backend/routers/collaboration_router.py                             │
│    WS  /ws/collaboration/{session_id}  ← new endpoint               │
│    POST /api/collaboration/sessions    ← create session              │
│    GET  /api/collaboration/sessions/{id} ← get session state         │
│    POST /api/collaboration/sessions/{id}/notes ← save shared notes   │
│    POST /api/collaboration/sessions/{id}/signoff ← consensus sign-off│
│                                                                      │
│  backend/modules/collaboration_manager.py                            │
│    ├── CollaborationHub    ← broadcast manager (in-memory dict)      │
│    ├── SessionStore        ← SQLite persistence                      │
│    └── CRDTMerger          ← Yjs-compatible state merge (optional)   │
└──────────────────────────────────────────────────────────────────────┘
         │  In-memory broadcast + SQLite persistence
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                         │
│                                                                      │
│  SQLite table: collaboration_sessions                                 │
│  SQLite table: collaboration_events (event log)                      │
│  SQLite table: collaboration_notes (shared notepad entries)          │
│  SQLite table: collaboration_signoffs (consensus decisions)          │
│  Redis pub/sub (optional for multi-process scaling)                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Package / Version | Purpose |
|-------|-----------|-------------------|---------|
| Real-time sync | WebSocket (FastAPI native) | `websockets` (bundled with FastAPI) | Bidirectional real-time messages |
| CRDT for concurrent text edits | Yjs | `yjs>=13.6` (npm) + `y-websocket>=1.5` (npm) | Conflict-free concurrent editing of shared notepad |
| Yjs backend awareness | `ypy-websocket` | `ypy-websocket>=0.12` (pip) | Yjs-compatible WS server in Python |
| Cursor presence | Custom JSON protocol | (in-house) | Broadcast cursor positions, active tab |
| User identification | JWT sub claim | Existing auth or UUID | Identify users without full auth overhaul |
| Frontend hooks | Custom React hook | `useCollaborationWS.js` | WebSocket lifecycle management |
| Cursor overlay | CSS absolute positioning | (in-component) | Render other users' cursors |
| Presence sidebar | `CollaborationSidebar.jsx` | (new component) | Who's online widget |
| Avatar colors | deterministic hash | (in-house) | `userId → hex color` via string hash |
| Shared notepad | Tiptap or Yjs prosemirror | `@tiptap/react>=2.3` (npm) | Rich-text collaborative editor |

---

## 4. WebSocket Message Protocol

All messages are JSON. The `type` field determines the handler:

```typescript
// Outgoing from client → server
type CollaborationMessage =
  | { type: "join";       session_id: string; user_id: string; display_name: string; color: string }
  | { type: "leave";      user_id: string }
  | { type: "cursor";     user_id: string; view: string; x: number; y: number; element_id?: string }
  | { type: "tab_change"; user_id: string; tab: string }
  | { type: "action";     user_id: string; action_type: string; payload: object }  // e.g., ran CRISPR scan
  | { type: "note";       user_id: string; content: string; timestamp: string }
  | { type: "signoff";    user_id: string; item_id: string; decision: "approve" | "reject"; comment: string }
  | { type: "ping" }

// Incoming from server → all clients in session
type BroadcastMessage =
  | { type: "user_joined"; user: UserPresence; all_users: UserPresence[] }
  | { type: "user_left";   user_id: string; all_users: UserPresence[] }
  | { type: "cursor";      user_id: string; view: string; x: number; y: number; color: string }
  | { type: "tab_change";  user_id: string; tab: string }
  | { type: "action";      user_id: string; action_type: string; payload: object }
  | { type: "note_added";  note: CollaborationNote }
  | { type: "signoff";     signoff: CollaborationSignoff }
  | { type: "full_state";  state: SessionState }   // sent on join
  | { type: "pong" }

interface UserPresence {
  user_id: string;
  display_name: string;
  color: string;           // hex e.g. "#3B82F6"
  active_tab: string;
  last_seen: string;       // ISO timestamp
}
```

---

## 5. Backend Module Design

### `backend/modules/collaboration_manager.py`

```python
from collections import defaultdict
from fastapi import WebSocket
import asyncio
import json

class CollaborationHub:
    """
    In-memory broadcast hub for a single server process.
    For multi-process scaling, swap internal dict for Redis pub/sub.
    """
    def __init__(self):
        self.sessions: dict[str, dict[str, WebSocket]] = defaultdict(dict)
        # sessions[session_id][user_id] = websocket

    async def connect(self, session_id: str, user_id: str, ws: WebSocket):
        """Register new connection. Send full_state to the joining user."""
        await ws.accept()
        self.sessions[session_id][user_id] = ws
        state = await self._get_session_state(session_id)
        await ws.send_json({"type": "full_state", "state": state})

    async def disconnect(self, session_id: str, user_id: str):
        """Remove connection. Broadcast user_left to remaining users."""
        self.sessions[session_id].pop(user_id, None)
        await self.broadcast(session_id, {
            "type": "user_left",
            "user_id": user_id,
            "all_users": list(self.sessions[session_id].keys())
        }, exclude_user=None)

    async def broadcast(
        self,
        session_id: str,
        message: dict,
        exclude_user: str | None = None
    ):
        """Send message to all users in session (except optional exclude_user)."""
        dead = []
        for uid, ws in self.sessions[session_id].items():
            if uid == exclude_user:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(uid)
        for uid in dead:
            await self.disconnect(session_id, uid)

    async def handle_message(self, session_id: str, user_id: str, raw: str):
        """Route incoming message to appropriate handler and broadcast."""
        msg = json.loads(raw)
        msg_type = msg.get("type")

        if msg_type == "cursor":
            # Broadcast cursor position to all OTHER users
            await self.broadcast(session_id, msg, exclude_user=user_id)

        elif msg_type == "action":
            # Broadcast action (e.g., CRISPR scan triggered) to ALL including sender
            await self._persist_event(session_id, user_id, msg)
            await self.broadcast(session_id, msg)

        elif msg_type == "note":
            note = await self._persist_note(session_id, user_id, msg["content"])
            await self.broadcast(session_id, {"type": "note_added", "note": note})

        elif msg_type == "signoff":
            signoff = await self._persist_signoff(session_id, user_id, msg)
            await self.broadcast(session_id, {"type": "signoff", "signoff": signoff})

        elif msg_type == "tab_change":
            await self._update_presence(session_id, user_id, msg["tab"])
            await self.broadcast(session_id, msg, exclude_user=user_id)

        elif msg_type == "ping":
            ws = self.sessions[session_id].get(user_id)
            if ws:
                await ws.send_json({"type": "pong"})

    async def _persist_event(self, session_id, user_id, msg): ...
    async def _persist_note(self, session_id, user_id, content) -> dict: ...
    async def _persist_signoff(self, session_id, user_id, msg) -> dict: ...
    async def _update_presence(self, session_id, user_id, active_tab): ...
    async def _get_session_state(self, session_id) -> dict: ...

# Global singleton instance
hub = CollaborationHub()
```

### `backend/routers/collaboration_router.py`

```python
@router.websocket("/ws/collaboration/{session_id}")
async def collaboration_ws(
    websocket: WebSocket,
    session_id: str,
    user_id: str = Query(...),
    display_name: str = Query(...),
):
    """Main WebSocket endpoint for collaboration."""
    await hub.connect(session_id, user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await hub.handle_message(session_id, user_id, data)
    except WebSocketDisconnect:
        await hub.disconnect(session_id, user_id)

@router.post("/api/collaboration/sessions")
async def create_session(payload: CreateSessionPayload) -> CollaborationSession:
    """Create a new named collaboration session. Returns session_id."""

@router.get("/api/collaboration/sessions/{session_id}")
async def get_session(session_id: str) -> SessionState:
    """Get current session state (users, notes, signoffs, event log)."""

@router.post("/api/collaboration/sessions/{session_id}/notes")
async def add_note(session_id: str, payload: NotePayload) -> CollaborationNote:
    """Add a persistent note (also broadcast via WS)."""

@router.get("/api/collaboration/sessions/{session_id}/notes")
async def get_notes(session_id: str) -> list[CollaborationNote]:
    """Get all notes for a session."""

@router.post("/api/collaboration/sessions/{session_id}/signoffs")
async def record_signoff(session_id: str, payload: SignoffPayload) -> CollaborationSignoff:
    """Record a consensus decision on a guide RNA or construct."""
```

---

## 6. Database Schema

```sql
CREATE TABLE collaboration_sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT UNIQUE NOT NULL,   -- UUID
    session_name    TEXT NOT NULL,          -- "KRAS G12D Analysis - Oct 19"
    created_by      TEXT NOT NULL,          -- user_id
    active_analysis TEXT,                   -- JSON snapshot of current analysis state
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collaboration_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    event_type      TEXT NOT NULL,          -- 'crispr_scan', 'annotation', 'tab_change'
    payload_json    TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collaboration_notes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    display_name    TEXT,
    content         TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collaboration_signoffs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT NOT NULL,
    item_id         TEXT NOT NULL,          -- guide RNA ID or construct ID
    item_type       TEXT NOT NULL,          -- 'guide_rna', 'art_construct', 'cart_antigen'
    user_id         TEXT NOT NULL,
    display_name    TEXT,
    decision        TEXT CHECK(decision IN ('approve','reject')),
    comment         TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. Frontend Component Design

### `CollaborationSidebar.jsx` (right side panel)

```
┌──────────────────────────────────────────┐
│  👥 Collaboration  [3 online]      [≡]   │
│──────────────────────────────────────────│
│  🟢 Dr. Sarah Chen (You)                 │
│     Viewing: CRISPR Designer             │
│  🟢 Dr. Marcus Smith                     │
│     Viewing: Molecular Viewer            │
│  🟡 Lab Bot (AI assistant)               │
│     Idle                                 │
│──────────────────────────────────────────│
│  Session: KRAS G12D - Oct 19, 2024       │
│  [📋 Copy Invite Link]                   │
│──────────────────────────────────────────│
│  📝 Shared Notes                [+ Add]  │
│  ──────────────────────────────────────  │
│  Dr. Smith (2:45pm): "Compare g3 vs g7"  │
│  Dr. Chen  (3:01pm): "g3 off-target OK"  │
│  [_________________________] [Send]      │
│──────────────────────────────────────────│
│  ✅ Sign-offs                             │
│  Guide RNA g3: ✅ Chen ✅ Smith (2/2)    │
│  Guide RNA g7: ✅ Chen ⏳ Smith (1/2)    │
│  [Approve g7]  [Reject g7]              │
└──────────────────────────────────────────┘
```

### Cursor Overlay (in `CrisprDesignerView.jsx`)

Each remote user's cursor rendered as an absolutely-positioned label over the component:

```
┌─────────────────────────────────────────────────────────────────┐
│  CRISPR Designer                                                 │
│                                                                  │
│  Locus Track:  ████████████████████████████████████████         │
│                        ↑                                        │
│                   ┌──────────┐                                  │
│                   │ Dr. Smith│  ← cursor overlay                │
│                   └──────────┘                                  │
│                   (color: #3B82F6)                              │
└─────────────────────────────────────────────────────────────────┘
```

### `useCollaborationWS.js` Hook API

```javascript
const {
  users,            // UserPresence[]  — all connected users
  notes,            // CollaborationNote[]
  signoffs,         // CollaborationSignoff[]
  cursors,          // {[userId]: {x, y, view, color}}
  sendCursor,       // (x, y, view) => void
  sendAction,       // (action_type, payload) => void
  sendNote,         // (content) => void
  sendSignoff,      // (item_id, decision, comment) => void
  connectionStatus, // 'connected' | 'disconnected' | 'reconnecting'
} = useCollaborationWS({ sessionId, userId, displayName });
```

---

## 8. Collaborative Notepad — Yjs Integration

For the shared notepad (rich text, concurrent editing):

```
Frontend (both users):
  ┌──────────────────────────────────────────────┐
  │  Yjs Doc (in-memory CRDT)                    │
  │    Y.Text "shared_notes"                     │
  └────────────────┬─────────────────────────────┘
                   │  y-websocket provider
                   ▼
  ws://localhost:8000/ws/yjs/{session_id}

Backend (ypy-websocket):
  ┌──────────────────────────────────────────────┐
  │  YWebsocketServer                            │
  │  Persists Yjs doc updates to collaboration_notes table │
  └──────────────────────────────────────────────┘
```

The Yjs-based notepad is **separate from** the simple text notes in `CollaborationSidebar`. The Yjs notepad is a full-page collaborative document (like Google Docs lite). The sidebar notes are simple append-only chat-style entries.

---

## 9. Integration Points with Existing Code

| Existing File | How It Integrates |
|---------------|-------------------|
| `backend/main.py` | Add `collaboration_router` include + WebSocket endpoint registration |
| Existing `/ws/playground` | `collaboration_router.py` follows same WebSocket pattern — new separate endpoint |
| `frontend/src/App.jsx` | Add collaboration session state in global context; render `CollaborationSidebar` when session active |
| `frontend/src/components/CrisprDesignerView.jsx` | Add cursor overlay render loop; fire `sendAction` when CRISPR scan runs |
| `frontend/src/components/PlaygroundView.jsx` | Add cursor overlay for the molecular viewer area |
| `backend/models.py` | Add 4 new DB tables via migration |
| `backend/audit_logs` table | All collaboration sign-offs also written to `audit_logs` for compliance |

---

## 10. Day-by-Day Execution Plan

| Day | Task |
|-----|------|
| 1 | DB migration: 4 new tables. Install `ypy-websocket`. Scaffold `collaboration_manager.py` with CollaborationHub. |
| 2 | Implement `CollaborationHub.connect()`, `disconnect()`, `broadcast()`. Basic WS echo test. |
| 3 | Implement all `handle_message()` handlers (cursor, action, note, signoff, tab_change). |
| 4 | Build all REST endpoints in `collaboration_router.py`. Test session creation + state retrieval. |
| 5 | Build `useCollaborationWS.js` hook. Implement WS connect/reconnect logic with exponential backoff. |
| 6 | Build `CollaborationSidebar.jsx` — presence list, simple notes, sign-off panel. |
| 7 | Implement cursor overlay rendering in `CrisprDesignerView.jsx`. Fire `sendAction` on CRISPR scan trigger. |
| 8 | Integrate Yjs notepad: install `yjs`, `@tiptap/react`, `ypy-websocket`. Wire Yjs WS endpoint. |
| 9 | Build collaborative notepad UI panel. Test concurrent editing from two browser windows. |
| 10 | Add "Start Collaboration" button to Nav. Session invite link (copy URL with session_id param). |
| 11 | Test 3+ concurrent users. Fix race conditions in CollaborationHub. |
| 12 | Full end-to-end test: 2 users run CRISPR scan concurrently, see each other's cursors, leave notes, sign off. Push. |
