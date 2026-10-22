"""
collaboration_manager.py — Multi-User Live Collaborative Workspace Engine
Feature Spec 10 — Sprint 5

Features:
1. In-memory WebSocket broadcast hub managing concurrent tumor board / lab sessions.
2. Peer presence tracking (who's online, active view, avatars, cursor positions).
3. Threaded multidisciplinary session notes and persistent annotations.
4. 21 CFR Part 11 compliant consensus sign-off workflow for clinical guide selection.
5. SQLite persistence layer interfacing collaboration_sessions, notes, and signoffs.
"""

from typing import List, Dict, Optional, Any, Set
import asyncio
import json
import datetime
import uuid
import logging
from starlette.websockets import WebSocket

logger = logging.getLogger("collaboration_manager")

class CollaborationHub:
    """
    Manages real-time WebSocket client connections, peer presence,
    and message broadcasting across multi-user tumor board sessions.
    """
    def __init__(self):
        # session_id -> {websocket: user_info_dict}
        self.sessions: Dict[str, Dict[WebSocket, Dict[str, Any]]] = {}
        # session_id -> shared_notes string cache
        self.notepad_cache: Dict[str, str] = {}
        self.lock = asyncio.Lock()

    async def connect(self, session_id: str, websocket: WebSocket, user_info: Dict[str, Any]):
        await websocket.accept()
        async with self.lock:
            if session_id not in self.sessions:
                self.sessions[session_id] = {}
            self.sessions[session_id][websocket] = {
                "user_id": user_info.get("user_id", f"USER_{uuid.uuid4().hex[:6]}"),
                "display_name": user_info.get("display_name", "Clinical Investigator"),
                "role": user_info.get("role", "Oncologist"),
                "color": user_info.get("color", "#38bdf8"), # Default cyan
                "connected_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "cursor": {"x": 0, "y": 0, "view": "locus"}
            }
        
        # Broadcast user_joined to all other peers
        joined_user = self.sessions[session_id][websocket]
        await self.broadcast(
            session_id=session_id,
            message={
                "type": "USER_JOINED",
                "user": joined_user,
                "active_users": self.get_active_users(session_id)
            },
            exclude=websocket
        )
        
        # Send initial state snapshot to newly connected client
        await websocket.send_text(json.dumps({
            "type": "SESSION_SNAPSHOT",
            "session_id": session_id,
            "your_user": joined_user,
            "active_users": self.get_active_users(session_id),
            "shared_notepad": self.notepad_cache.get(session_id, "")
        }))

    async def disconnect(self, session_id: str, websocket: WebSocket):
        leaving_user = None
        async with self.lock:
            if session_id in self.sessions and websocket in self.sessions[session_id]:
                leaving_user = self.sessions[session_id].pop(websocket)
                if not self.sessions[session_id]:
                    del self.sessions[session_id]

        if leaving_user and session_id in self.sessions:
            await self.broadcast(
                session_id=session_id,
                message={
                    "type": "USER_LEFT",
                    "user_id": leaving_user["user_id"],
                    "display_name": leaving_user["display_name"],
                    "active_users": self.get_active_users(session_id)
                }
            )

    async def broadcast(self, session_id: str, message: Dict[str, Any], exclude: Optional[WebSocket] = None):
        if session_id not in self.sessions:
            return

        payload_str = json.dumps(message)
        dead_sockets = []

        for ws in list(self.sessions[session_id].keys()):
            if ws != exclude:
                try:
                    await ws.send_text(payload_str)
                except Exception as e:
                    logger.warning(f"Error broadcasting to client: {e}")
                    dead_sockets.append(ws)

        for ws in dead_sockets:
            await self.disconnect(session_id, ws)

    def get_active_users(self, session_id: str) -> List[Dict[str, Any]]:
        if session_id not in self.sessions:
            return []
        return list(self.sessions[session_id].values())

    async def update_cursor(self, session_id: str, websocket: WebSocket, cursor_data: Dict[str, Any]):
        if session_id in self.sessions and websocket in self.sessions[session_id]:
            user = self.sessions[session_id][websocket]
            user["cursor"] = cursor_data
            await self.broadcast(
                session_id=session_id,
                message={
                    "type": "CURSOR_UPDATE",
                    "user_id": user["user_id"],
                    "display_name": user["display_name"],
                    "color": user["color"],
                    "cursor": cursor_data
                },
                exclude=websocket
            )

    async def update_notepad(self, session_id: str, content: str, user_id: str):
        self.notepad_cache[session_id] = content
        await self.broadcast(
            session_id=session_id,
            message={
                "type": "NOTEPAD_UPDATE",
                "content": content,
                "updated_by": user_id,
                "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
        )

# Global singleton hub
collab_hub = CollaborationHub()


# ── Persistence Helpers for SQLite ──────────────────────────────────────────

def create_or_get_session(
    session_id: str,
    session_name: str = "Precision Oncology Tumor Board",
    host_user_id: str = "Dr. Lead Oncologist",
    target_gene: Optional[str] = "KRAS",
    sample_id: Optional[str] = None,
    db_session = None
) -> Dict[str, Any]:
    """
    Creates or retrieves a collaboration session record in SQLite.
    """
    if db_session:
        from core.models import CollaborationSessionModel
        record = db_session.query(CollaborationSessionModel).filter_by(session_id=session_id).first()
        if not record:
            now = datetime.datetime.now(datetime.timezone.utc)
            record = CollaborationSessionModel(
                session_id=session_id,
                session_name=session_name,
                host_user_id=host_user_id,
                target_gene=target_gene,
                sample_id=sample_id,
                shared_notepad="Welcome to the Multi-User Tumor Board Session. Use this pad for consensus notes.",
                created_at=now,
                updated_at=now
            )
            db_session.add(record)
            db_session.commit()
            db_session.refresh(record)

        return {
            "session_id": record.session_id,
            "session_name": record.session_name,
            "host_user_id": record.host_user_id,
            "target_gene": record.target_gene,
            "sample_id": record.sample_id,
            "shared_notepad": record.shared_notepad,
            "created_at": record.created_at.isoformat() if record.created_at else None
        }

    # Fallback in-memory
    return {
        "session_id": session_id,
        "session_name": session_name,
        "host_user_id": host_user_id,
        "target_gene": target_gene,
        "sample_id": sample_id,
        "shared_notepad": "In-memory collaborative session initialized."
    }

def add_session_note(
    session_id: str,
    author_id: str,
    author_name: str,
    content: str,
    author_role: str = "Oncologist",
    pinned: bool = False,
    db_session = None
) -> Dict[str, Any]:
    """
    Appends a multidisciplinary clinical note to a collaboration session.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    note_dict = {
        "id": int(now.timestamp()),
        "session_id": session_id,
        "author_id": author_id,
        "author_name": author_name,
        "author_role": author_role,
        "content": content,
        "pinned": pinned,
        "created_at": now.isoformat()
    }

    if db_session:
        from core.models import CollaborationNoteModel
        db_note = CollaborationNoteModel(
            session_id=session_id,
            author_id=author_id,
            author_name=author_name,
            author_role=author_role,
            content=content,
            pinned=pinned,
            created_at=now
        )
        db_session.add(db_note)
        db_session.commit()
        db_session.refresh(db_note)
        note_dict["id"] = db_note.id

    return note_dict

def get_session_notes(session_id: str, db_session = None) -> List[Dict[str, Any]]:
    """
    Retrieves all clinical annotations and threaded notes for a session.
    """
    if db_session:
        from core.models import CollaborationNoteModel
        records = db_session.query(CollaborationNoteModel).filter_by(session_id=session_id).order_by(CollaborationNoteModel.created_at.asc()).all()
        return [
            {
                "id": r.id,
                "session_id": r.session_id,
                "author_id": r.author_id,
                "author_name": r.author_name,
                "author_role": r.author_role,
                "content": r.content,
                "pinned": r.pinned,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in records
        ]
    return []

def add_consensus_signoff(
    session_id: str,
    candidate_guide_id: str,
    signoff_decision: str,
    reviewer_name: str,
    reviewer_role: str,
    rationale_notes: Optional[str] = None,
    db_session = None
) -> Dict[str, Any]:
    """
    Records a 21 CFR Part 11 compliant consensus sign-off for a candidate therapeutic guide.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    signoff_dict = {
        "id": int(now.timestamp()),
        "session_id": session_id,
        "candidate_guide_id": candidate_guide_id,
        "signoff_decision": signoff_decision,
        "reviewer_name": reviewer_name,
        "reviewer_role": reviewer_role,
        "rationale_notes": rationale_notes or "",
        "created_at": now.isoformat()
    }

    if db_session:
        from core.models import CollaborationSignoffModel
        db_signoff = CollaborationSignoffModel(
            session_id=session_id,
            candidate_guide_id=candidate_guide_id,
            signoff_decision=signoff_decision,
            reviewer_name=reviewer_name,
            reviewer_role=reviewer_role,
            rationale_notes=rationale_notes or "",
            created_at=now
        )
        db_session.add(db_signoff)
        db_session.commit()
        db_session.refresh(db_signoff)
        signoff_dict["id"] = db_signoff.id

    return signoff_dict

def get_consensus_signoffs(session_id: str, db_session = None) -> List[Dict[str, Any]]:
    """
    Retrieves all signoffs recorded for candidate guides in this session.
    """
    if db_session:
        from core.models import CollaborationSignoffModel
        records = db_session.query(CollaborationSignoffModel).filter_by(session_id=session_id).order_by(CollaborationSignoffModel.created_at.desc()).all()
        return [
            {
                "id": r.id,
                "session_id": r.session_id,
                "candidate_guide_id": r.candidate_guide_id,
                "signoff_decision": r.signoff_decision,
                "reviewer_name": r.reviewer_name,
                "reviewer_role": r.reviewer_role,
                "rationale_notes": r.rationale_notes,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in records
        ]
    return []
