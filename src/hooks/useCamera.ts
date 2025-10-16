import { useState, useCallback } from 'react';
import { API_URL } from '../constants';

export const useCamera = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/camera/start`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsStreaming(true);
        return true;
      } else {
        throw new Error(data.message || 'Errore nell\'avvio della camera');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Errore avvio camera:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/camera/stop`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsStreaming(false);
        return true;
      } else {
        throw new Error(data.message || 'Errore nel fermare la camera');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Errore stop camera:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCameraStatus = useCallback(async (): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/camera/status`);
      const data = await response.json();
      
      if (data.success) {
        return data.status;
      } else {
        throw new Error(data.message || 'Errore nel recupero dello stato della camera');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Errore status camera:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isStreaming,
    isLoading,
    error,
    startCamera,
    stopCamera,
    getCameraStatus
  };
};





