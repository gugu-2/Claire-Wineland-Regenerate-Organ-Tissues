import pytest
from modules.collaboration_manager import (
    collab_hub,
    create_or_get_session,
    add_session_note,
    get_session_notes,
    add_consensus_signoff,
    get_consensus_signoffs
)

def test_collaboration_hub_user_management():
    session_id = "TEST_SESS_001"
    assert collab_hub.get_active_users(session_id) == []

def test_create_or_get_session_in_memory():
    sess = create_or_get_session(
        session_id="SESS_MEM_101",
        session_name="Tumor Board Alpha",
        host_user_id="Dr. Chen",
        target_gene="KRAS"
    )
    assert sess["session_id"] == "SESS_MEM_101"
    assert sess["session_name"] == "Tumor Board Alpha"
    assert sess["target_gene"] == "KRAS"

def test_add_and_get_session_note_in_memory():
    note = add_session_note(
        session_id="SESS_MEM_101",
        author_id="USER_01",
        author_name="Dr. Smith",
        content="Candidate sgRNA_KRAS_01 demonstrates 98% cleavage efficiency with 0 predicted off-targets.",
        author_role="Bioinformatician"
    )
    assert note["session_id"] == "SESS_MEM_101"
    assert note["author_name"] == "Dr. Smith"
    assert "98% cleavage" in note["content"]

def test_add_and_get_consensus_signoff_in_memory():
    signoff = add_consensus_signoff(
        session_id="SESS_MEM_101",
        candidate_guide_id="GUIDE_KRAS_G12D_TOP",
        signoff_decision="APPROVED",
        reviewer_name="Dr. Lead Oncologist",
        reviewer_role="Oncologist",
        rationale_notes="Cleared for wet-lab Golden Gate cloning into PX459."
    )
    assert signoff["session_id"] == "SESS_MEM_101"
    assert signoff["candidate_guide_id"] == "GUIDE_KRAS_G12D_TOP"
    assert signoff["signoff_decision"] == "APPROVED"

@pytest.mark.asyncio
async def test_websocket_chat_and_tab_change():
    import json
    from main import collaboration_websocket

    class MockWebSocket:
        def __init__(self):
            self.query_params = {"user_id": "TEST_U1", "display_name": "Dr. Sarah"}
            self.sent = []
            self.accepted = False
            self.queue = [
                json.dumps({"type": "TAB_CHANGE", "active_tab": "signoff"}),
                json.dumps({"type": "CHAT_MESSAGE", "text": "Evaluating KRAS G12D sgRNA."})
            ]
        async def accept(self):
            self.accepted = True
        async def receive_text(self):
            if self.queue:
                return self.queue.pop(0)
            from fastapi import WebSocketDisconnect
            raise WebSocketDisconnect()
        async def send_text(self, text):
            self.sent.append(json.loads(text))

    mock_ws = MockWebSocket()
    await collaboration_websocket(mock_ws, "ASYNC_TEST_SESSION")
    assert mock_ws.accepted
    # Initial message sent was SESSION_SNAPSHOT
    assert mock_ws.sent[0]["type"] == "SESSION_SNAPSHOT"
    # CHAT_MESSAGE broadcast should be received and contain timestamp
    chat_events = [s for s in mock_ws.sent if s.get("type") == "CHAT_MESSAGE"]
    assert len(chat_events) == 1
    assert "timestamp" in chat_events[0]
    assert chat_events[0]["text"] == "Evaluating KRAS G12D sgRNA."

