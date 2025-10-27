import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Play, Square, AlertCircle, Check, Sun, Image as ImageIcon } from 'lucide-react';
import type { Patient, Visit, StreamData } from '../types';

interface ExerciseViewProps {
  patient: Patient;
  visit: Visit;
  streamData: StreamData | null;
  isStreaming: boolean;
  isConnecting: boolean;
  onStartStreaming: () => void;
  onStopStreaming: () => void;
  onClose: () => void;
}

export const ExerciseView: React.FC<ExerciseViewProps> = ({
  patient,
  visit,
  streamData,
  isStreaming,
  isConnecting,
  onStartStreaming,
  onStopStreaming,
  onClose
}) => {
  type Step = 1 | 2 | 3 | 4 | 5;
  const [step, setStep] = useState<Step>(1);
  const [countdown, setCountdown] = useState<number>(3);

  const isConnected = useMemo(() => isStreaming && !isConnecting, [isStreaming, isConnecting]);

  // Step 2: local camera preview management
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Auto-progress on step 4 after countdown
  useEffect(() => {
    if (step !== 4) return;
    setCountdown(3);
    const t = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(t);
          setStep(5);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [step]);

  // Enumerate devices and show local preview on step 2
  useEffect(() => {
    const stopPreview = () => {
      if (previewStream) previewStream.getTracks().forEach(tr => tr.stop());
      setPreviewStream(null);
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const startPreview = async (deviceId?: string) => {
      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setPreviewStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        // ignore preview errors
      }
    };

    const init = async () => {
      if (step !== 2 || !navigator.mediaDevices) return;
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vids = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(vids);
        const first = vids[0]?.deviceId;
        setSelectedDeviceId(prev => prev ?? first);
        await startPreview(first);
      } catch {
        // ignore
      }
    };

    init();
    return () => {
      if (step === 2) stopPreview();
    };
  }, [step]);

  const handleSelectDevice = async (id: string) => {
    setSelectedDeviceId(id);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: id } }, audio: false });
      if (previewStream) previewStream.getTracks().forEach(tr => tr.stop());
      setPreviewStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      // ignore
    }
  };

  const renderVisualization = () => {
    if (!isStreaming) {
      return (
        <div className="text-center py-20">
          <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Premi "Avvia analisi" per iniziare</p>
        </div>
      );
    }

    if (streamData?.frame) {
      // TODO: render del frame base64 se disponibile
      return (
        <div className="text-center py-20">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-green-400">Streaming in corso...</p>
        </div>
      );
    }

    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-blue-400">Connessione in corso...</p>
      </div>
    );
  };

  const renderMetrics = () => {
    if (!streamData?.analysis) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">In attesa di dati...</p>
        </div>
      );
    }

    const { angles, symmetry } = streamData.analysis;

    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Angoli Articolari</h4>
          <div className="space-y-2">
            {Object.entries(angles || {}).map(([joint, angle]) => (
              <div key={joint} className="flex justify-between items-center">
                <span className="text-sm text-gray-300 capitalize">{joint.replace('_', ' ')}</span>
                <span className={`text-sm font-semibold ${
                  angle > 160 && angle < 200 ? 'text-green-400' :
                  angle > 140 && angle < 220 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {angle.toFixed(1)}°
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Simmetria</h4>
          <div className="space-y-2">
            {Object.entries(symmetry || {}).map(([part, value]) => (
              <div key={part} className="flex justify-between items-center">
                <span className="text-sm text-gray-300 capitalize">{part}</span>
                <span className="text-sm font-semibold text-blue-400">{value.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{patient.nome} {patient.cognome}</h1>
            <p className="text-sm text-gray-400">{visit.tipo_analisi.replace('_', ' ')}</p>
          </div>
          <div className="flex space-x-4">
            {isStreaming && (
              <button onClick={onStopStreaming} className="flex items-center space-x-2 bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors">
                <Square className="w-5 h-5" />
                <span>Ferma</span>
              </button>
            )}
            <button onClick={onClose} className="px-6 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors">Chiudi</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Step indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">Step {step} di 5</span>
            <span className={`text-sm ${isConnected ? 'text-green-400' : isStreaming ? 'text-blue-400' : 'text-gray-400'}`}>
              {isConnected ? 'Streaming connesso' : isStreaming ? 'Connessione...' : 'In attesa'}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded">
            <div className="h-2 bg-brand-blue rounded transition-all" style={{ width: `${(step / 5) * 100}%` }} />
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="bg-gray-800 rounded-md p-8">
            <h2 className="text-2xl font-semibold text-white text-center mb-2">Controlla l'ambiente</h2>
            <p className="text-center text-gray-400 mb-8">Assicurati che lo sfondo sia libero e ben illuminato.</p>
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center justify-between bg-gray-900 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Sun className="w-6 h-6 text-gray-300" />
                  <div>
                    <p className="text-white font-medium">Illuminazione</p>
                    <p className="text-gray-400 text-sm">L'area è sufficientemente illuminata per una foto chiara.</p>
                  </div>
                </div>
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex items-center justify-between bg-gray-900 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <ImageIcon className="w-6 h-6 text-gray-300" />
                  <div>
                    <p className="text-white font-medium">Sfondo</p>
                    <p className="text-gray-400 text-sm">Rimuovi elementi di disturbo dallo sfondo.</p>
                  </div>
                </div>
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex items-center justify-between pt-4">
                <span />
                <button onClick={() => setStep(2)} className="px-6 py-3 bg-brand-blue text-white rounded-md hover:opacity-90">Continua</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="bg-gray-800 rounded-md p-8">
            <h2 className="text-2xl font-semibold text-white text-center mb-6">Seleziona e verifica la videocamera</h2>
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                </div>
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm text-gray-300 mb-2">Dispositivo</label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => handleSelectDevice(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700"
                >
                  {videoDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || 'Videocamera'}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-3">Concedi i permessi del browser quando richiesto.</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-6">
              <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-500 text-white rounded-md hover:bg-gray-700">Indietro</button>
              <button onClick={() => setStep(3)} className="px-6 py-3 bg-brand-blue text-white rounded-md hover:opacity-90">Continua</button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="bg-gray-800 rounded-md p-8">
            <h2 className="text-2xl font-semibold text-white text-center mb-2">Posizionati</h2>
            <p className="text-center text-gray-400 mb-6">Stai a 2-3 metri dalla camera e allinea il corpo alle guide.</p>
            <div className="max-w-4xl mx-auto rounded-xl overflow-hidden">
              <div className="aspect-[16/9] bg-gray-900 relative">
                <div className="absolute inset-0">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`v-${i}`} className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: `${(i / 3) * 100}%` }} />
                  ))}
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`h-${i}`} className="absolute left-0 right-0 h-px bg-white/30" style={{ top: `${(i / 3) * 100}%` }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-6">
              <button onClick={() => setStep(2)} className="px-6 py-3 border border-gray-500 text-white rounded-md hover:bg-gray-700">Indietro</button>
              <button onClick={() => setStep(4)} className="px-6 py-3 bg-brand-blue text-white rounded-md hover:opacity-90">Sono pronto</button>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="bg-gray-800 rounded-md p-8">
            <h2 className="text-2xl font-semibold text-white text-center mb-2">Posizione neutra</h2>
            <p className="text-center text-gray-400 mb-6">Piedi allineati ai marker, braccia rilassate lungo i fianchi.</p>
            <div className="max-w-3xl mx-auto aspect-[16/9] bg-gray-900 rounded-xl" />
            <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4 mt-8">
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">00</div>
                <div className="text-gray-400 text-sm">Ore</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">00</div>
                <div className="text-gray-400 text-sm">Minuti</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">{String(countdown).padStart(2, '0')}</div>
                <div className="text-gray-400 text-sm">Secondi</div>
              </div>
            </div>
            <p className="text-center text-gray-400 mt-6">Verifica cattura in corso...</p>
            <div className="flex items-center justify-between mt-6">
              <button onClick={() => setStep(3)} className="px-6 py-3 border border-gray-500 text-white rounded-md hover:bg-gray-700">Indietro</button>
              <button onClick={() => setStep(5)} className="px-6 py-3 bg-brand-blue text-white rounded-md hover:opacity-90">Continua</button>
            </div>
          </div>
        )}

        {/* Step 5 */}
        {step === 5 && (
          <>
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 bg-gray-800 rounded-md p-4">
                <div className="aspect-video bg-gray-900 rounded-md flex items-center justify-center">
                  {renderVisualization()}
                </div>
              </div>

              <div className="bg-gray-800 rounded-md p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Metriche real-time</h3>
                {renderMetrics()}
              </div>
            </div>

            <div className="mt-6 bg-gray-800 rounded-md p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Istruzioni per il paziente</h3>
              <div className="bg-gray-900 rounded-md p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Check className="w-6 h-6 text-green-400" />
                  <p className="text-white text-lg">Resta immobile con le mani lungo i fianchi</p>
                </div>
                <p className="text-gray-400 ml-9">Mantieni la posizione per permettere al sistema di acquisire i dati posturali</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <button onClick={() => setStep(4)} className="px-6 py-3 border border-gray-500 text-white rounded-md hover:bg-gray-700">Indietro</button>
              {!isStreaming ? (
                <button onClick={onStartStreaming} className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors">
                  <Play className="w-5 h-5" />
                  <span>Avvia analisi</span>
                </button>
              ) : (
                <button onClick={onStopStreaming} className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors">
                  <Square className="w-5 h-5" />
                  <span>Ferma</span>
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

