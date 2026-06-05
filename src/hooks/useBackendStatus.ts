import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

type BackendStatus = {
  version: string;
  pose_available: boolean;
  smpl_available: boolean;
  smpl_model_dir?: string | null;
  camera: {
    streaming: boolean;
    width: number;
    height: number;
    fps: number;
    backend: string;
  };
  ws_endpoints: {
    pose_stream: string;
  };
};

export function useBackendStatus(pollMs: number = 10000) {
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchStatus() {
    try {
      setError(null);
      const data = await apiService.getBackendStatus();
      if (data?.success) setStatus(data.data);
      else setError(data?.message || 'Errore status backend');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, pollMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs]);

  return { status, loading, error, refresh: fetchStatus };
}
