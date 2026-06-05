import React from 'react';
import { useBackendStatus } from '../../hooks/useBackendStatus';

const Dot: React.FC<{ ok?: boolean; label: string; warn?: boolean; title?: string }> = ({ ok, warn, label, title }) => {
  const color = ok ? 'bg-green-500' : warn ? 'bg-yellow-500' : 'bg-gray-400';
  return (
    <div className="flex items-center gap-1" title={title}>
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-gray-700">{label}</span>
    </div>
  );
};

export const BackendStatus: React.FC = () => {
  const { status, loading, error } = useBackendStatus(10000);

  if (loading) {
    return <div className="text-xs text-gray-500">Backend…</div>;
  }
  if (error || !status) {
    return <div className="text-xs text-red-600">Backend offline</div>;
  }

  const poseOk = !!status.pose_available;
  const smplOk = !!status.smpl_available;
  const camOk = !!status.camera?.streaming;

  return (
    <div className="flex items-center gap-3 px-2 py-1 bg-white border border-gray-200 rounded-full">
      <Dot ok={poseOk} warn={!poseOk} label="Pose" title={poseOk ? 'MediaPipe attivo' : 'MediaPipe non disponibile'} />
      <Dot ok={smplOk} warn={!smplOk} label="SMPL" title={smplOk ? `Modelli: ${status.smpl_model_dir || ''}` : 'SMPL non disponibile'} />
      <Dot ok={camOk} warn={!camOk} label="Cam" title={camOk ? `Streaming ${status.camera.width}x${status.camera.height}@${status.camera.fps}` : 'Camera non in streaming'} />
    </div>
  );
};

