import { useState, useRef, useCallback, useEffect } from 'react';
import type { StreamData } from '../types';
import { WS_URL } from '../constants';

export const useWebSocket = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback((visitId: string) => {
    setError(null);
    
    try {
      const websocket = new WebSocket(`${WS_URL}/ws/pose-stream/${visitId}`);
      
      websocket.onopen = () => {
        console.log('WebSocket connesso');
        setIsConnected(true);
        setWs(websocket);
        reconnectAttempts.current = 0;
      };
      
      websocket.onmessage = (event) => {
        try {
          const data: StreamData = JSON.parse(event.data);
          setStreamData(data);
        } catch (error) {
          console.error('Errore parsing messaggio WebSocket:', error);
          setError('Errore nel parsing dei dati');
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Errore di connessione WebSocket');
        setIsConnected(false);
      };
      
      websocket.onclose = (event) => {
        console.log('WebSocket disconnesso');
        setIsConnected(false);
        setWs(null);
        
        // Tentativo di riconnessione se non è stata una chiusura volontaria
        if (!event.wasClean && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          console.log(`Tentativo di riconnessione ${reconnectAttempts.current}/${maxReconnectAttempts}`);
          setTimeout(() => connect(visitId), 2000 * reconnectAttempts.current);
        }
      };
      
    } catch (error) {
      console.error('Errore creazione WebSocket:', error);
      setError('Impossibile creare connessione WebSocket');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (ws) {
      ws.close(1000, 'Connessione chiusa dall\'utente');
      setWs(null);
      setIsConnected(false);
      setStreamData(null);
      reconnectAttempts.current = maxReconnectAttempts; // Previeni riconnessioni
    }
  }, [ws]);

  const reconnect = useCallback((visitId: string) => {
    disconnect();
    reconnectAttempts.current = 0;
    connect(visitId);
  }, [disconnect, connect]);

  // Cleanup sulla dismount
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  return {
    ws,
    streamData,
    isConnected,
    error,
    connect,
    disconnect,
    reconnect
  };
};





