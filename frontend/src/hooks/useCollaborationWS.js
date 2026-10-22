import { useState, useEffect, useRef, useCallback } from 'react';

export function useCollaborationWS({
  sessionId = 'TUMOR_BOARD_01',
  userInfo = {
    user_id: 'USER_ONCO_01',
    display_name: 'Dr. Lead Oncologist',
    role: 'Oncologist',
    color: '#38bdf8'
  },
  onMessageReceived = null
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [peerCursors, setPeerCursors] = useState({});
  const [peerActiveTabs, setPeerActiveTabs] = useState({});
  const [sharedNotepad, setSharedNotepad] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:8000';
    const query = new URLSearchParams({
      user_id: userInfo.user_id,
      display_name: userInfo.display_name,
      role: userInfo.role,
      color: userInfo.color
    }).toString();

    const wsUrl = `${protocol}//${host}/ws/collaboration/${sessionId}?${query}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'SESSION_SNAPSHOT') {
          setActiveUsers(msg.active_users || []);
          setSharedNotepad(msg.shared_notepad || '');
        } else if (msg.type === 'USER_JOINED') {
          setActiveUsers(msg.active_users || []);
        } else if (msg.type === 'USER_LEFT') {
          setActiveUsers(msg.active_users || []);
          setPeerCursors((prev) => {
            const next = { ...prev };
            delete next[msg.user_id];
            return next;
          });
          setPeerActiveTabs((prev) => {
            const next = { ...prev };
            delete next[msg.user_id];
            return next;
          });
        } else if (msg.type === 'CURSOR_UPDATE') {
          setPeerCursors((prev) => ({
            ...prev,
            [msg.user_id]: {
              display_name: msg.display_name,
              color: msg.color,
              cursor: msg.cursor
            }
          }));
        } else if (msg.type === 'PEER_TAB_CHANGE') {
          setPeerActiveTabs((prev) => ({
            ...prev,
            [msg.user_id]: {
              display_name: msg.display_name,
              active_tab: msg.active_tab
            }
          }));
        } else if (msg.type === 'NOTEPAD_UPDATE') {
          setSharedNotepad(msg.content);
        } else if (msg.type === 'CHAT_MESSAGE') {
          setChatMessages((prev) => [...prev, msg]);
        }

        if (onMessageReceived) {
          onMessageReceived(msg);
        }
      } catch (e) {
        console.error('Error handling collaboration WS message:', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (e) => {
      console.warn('Collaboration WS connection error:', e);
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [sessionId, userInfo.user_id]);

  const sendCursorMove = useCallback((cursorData) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'CURSOR_MOVE',
        cursor: cursorData
      }));
    }
  }, []);

  const sendNotepadEdit = useCallback((content) => {
    setSharedNotepad(content);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'NOTEPAD_EDIT',
        content
      }));
    }
  }, []);

  const sendChatMessage = useCallback((text) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'CHAT_MESSAGE',
        text
      }));
    }
  }, []);

  const sendTabChange = useCallback((activeTab) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'TAB_CHANGE',
        active_tab: activeTab
      }));
    }
  }, []);

  return {
    isConnected,
    activeUsers,
    peerCursors,
    peerActiveTabs,
    sharedNotepad,
    chatMessages,
    sendCursorMove,
    sendNotepadEdit,
    sendChatMessage,
    sendTabChange
  };
}
