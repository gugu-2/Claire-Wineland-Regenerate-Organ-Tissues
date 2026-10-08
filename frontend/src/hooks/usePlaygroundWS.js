import { useState, useEffect, useRef, useCallback } from 'react';

export function usePlaygroundWS(onMessage) {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    // Determine WS URL based on current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // When using vite proxy, we can try to connect to the backend directly if local
    // Otherwise fallback to relative host if production
    const wsHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? '127.0.0.1:8000' 
      : window.location.host;
      
    const url = `${protocol}//${wsHost}/ws/playground`;
    
    ws.current = new WebSocket(url);

    ws.current.onopen = () => setIsConnected(true);
    ws.current.onclose = () => setIsConnected(false);
    
    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (onMessage) onMessage(msg);
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [onMessage]);

  const send = useCallback((data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket not connected");
    }
  }, []);

  return { isConnected, send };
}
