import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Camera, Play, Square, Sun, Image as ImageIcon, ArrowLeft, Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { Patient, Visit, StreamData } from '../types';
import { apiService } from '../services/api';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import { formatAngleValue, getStoredLanguage, localizeMeasurementLabel } from '../utils/localization';

// --- Types ---
interface AnalysisResult {
  movement_quality: 'green' | 'yellow' | 'red';
  score_percent?: number;
  angles: Record<string, number>;
  feedback: string;
  smpl_mesh?: string; // OBJ string
  smpl_params?: any;
  landmarks?: { x: number; y: number; z: number; visibility: number }[]; // MediaPipe landmarks
}

interface ScanStatusPayload {
  status?: string;
  steps?: Record<string, string>;
  results?: Record<string, any>;
  error?: string;
}

const normalizeMovementQuality = (qualityLabel: unknown, score: number): 'green' | 'yellow' | 'red' => {
  const normalized = typeof qualityLabel === 'string' ? qualityLabel.toLowerCase() : '';
  if (normalized.includes('red') || normalized.includes('scar') || score <= 1) return 'red';
  if (normalized.includes('yellow') || normalized.includes('med') || score === 2) return 'yellow';
  return 'green';
};

const extractSmplPreviewNote = (smplParams: unknown): string | null => {
  if (!smplParams || typeof smplParams !== 'object') {
    return null;
  }

  const params = smplParams as Record<string, unknown>;
  if (params.is_personalized === true) {
    return null;
  }

  const note = typeof params.note === 'string' ? params.note.trim() : '';
  if (note) {
    return note;
  }

  return typeof params.fit_mode === 'string'
    ? 'La mesh 3D mostrata e una preview digitale e non un fitting clinico personalizzato.'
    : null;
};

const buildAnalysisResult = (scanData: ScanStatusPayload, smplMesh?: string): AnalysisResult | null => {
  const mediapipeData = scanData.results?.mediapipe_data;
  if (!mediapipeData) {
    return null;
  }

  const resolvedScore = typeof mediapipeData.score === 'number' ? mediapipeData.score : 0;
  return {
    movement_quality: normalizeMovementQuality(mediapipeData.quality_label, resolvedScore),
    score_percent: typeof mediapipeData.score_percent === 'number' ? mediapipeData.score_percent : undefined,
    angles: mediapipeData.angles || {},
    feedback: mediapipeData.feedback || '',
    smpl_mesh: smplMesh,
    smpl_params: scanData.results?.smpl_params,
    landmarks: mediapipeData.landmarks,
  };
};

interface RecordedVideo {
  blob: Blob;
  url: string;
  timestamp: number;
  duration: number;
}

interface ExerciseViewProps {
  patient: Patient;
  visit: Visit;
  streamData?: StreamData | null;
  isStreaming?: boolean;
  isConnecting?: boolean;
  onStartStreaming?: () => void;
  onStopStreaming?: () => void;
  onClose: () => void;
}

// --- 3D Components ---

// Simple OBJ parser function
const parseOBJ = (objString: string): THREE.BufferGeometry | null => {
  try {
    const lines = objString.split('\n');
    const vertices: number[] = [];
    const indices: number[] = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);

      if (parts[0] === 'v') {
        // Vertex position
        vertices.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
      } else if (parts[0] === 'f') {
        // Face (triangle)
        // OBJ faces are 1-indexed, convert to 0-indexed
        for (let i = 1; i <= 3; i++) {
          const vertexIndex = parseInt(parts[i].split('/')[0]) - 1;
          indices.push(vertexIndex);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  } catch (e) {
    console.error("Error parsing OBJ:", e);
    return null;
  }
};

const Skeleton = ({ landmarks }: { landmarks: { x: number; y: number; z: number; visibility: number }[] }) => {
  // MediaPipe Pose connections (simplified)
  const connections = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms
    [11, 23], [12, 24], [23, 24], // Torso
    [23, 25], [24, 26], [25, 27], [26, 28], // Legs
    [27, 29], [28, 30], [29, 31], [30, 32]  // Feet
  ];

  // Convert landmarks to Vector3
  const points = useMemo(() => {
    return landmarks.map(l => new THREE.Vector3(-l.x, -l.y, -l.z)); // Invert for visualization if needed
  }, [landmarks]);

  return (
    <group>
      {/* Joints */}
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshStandardMaterial color="red" />
        </mesh>
      ))}
      {/* Connections */}
      {connections.map(([start, end], i) => {
        if (points[start] && points[end]) {
          return (
            <Line
              key={i}
              points={[points[start], points[end]]}
              color="white"
              lineWidth={2}
            />
          );
        }
        return null;
      })}
    </group>
  );
};

const SmplModel = ({ quality, objData, landmarks }: { quality?: string, objData?: string, landmarks?: any[] }) => {
  const color = quality === 'green' ? '#22c55e' : quality === 'yellow' ? '#eab308' : quality === 'red' ? '#ef4444' : '#cccccc';

  const geometry = useMemo(() => {
    if (objData) {
      return parseOBJ(objData);
    }
    return null;
  }, [objData]);

  if (geometry) {
    return (
      <mesh geometry={geometry} scale={[2, 2, 2]} position={[0, -1, 0]}>
        <meshStandardMaterial color={color} />
      </mesh>
    );
  }

  if (landmarks && landmarks.length > 0) {
    return <Skeleton landmarks={landmarks} />;
  }

  // Fallback if no mesh and no landmarks
  return (
    <mesh>
      <capsuleGeometry args={[0.5, 2, 4, 8]} />
      <meshStandardMaterial color={color} wireframe />
    </mesh>
  );
};

const Scene = ({ result }: { result: AnalysisResult | null }) => {
  return (
    <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <SmplModel
        quality={result?.movement_quality}
        objData={result?.smpl_mesh}
        landmarks={result?.landmarks}
      />
      <OrbitControls />
      <gridHelper args={[10, 10]} />
    </Canvas>
  );
};

export const ExerciseView: React.FC<ExerciseViewProps> = ({
  patient,
  visit,
  onClose
}) => {
  type Step = 1 | 2 | 3 | 4 | 5 | 6;
  const [step, setStep] = useState<Step>(1);
  const [countdown, setCountdown] = useState<number>(3);

  // Camera & Recording State
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const [videos, setVideos] = useState<RecordedVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<RecordedVideo | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const smplPreviewNote = extractSmplPreviewNote(analysisResult?.smpl_params);

  const videoRef = useRef<HTMLVideoElement>(null);
  const currentLanguage = getStoredLanguage();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

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

  // Camera Initialization
  useEffect(() => {
    const initCamera = async () => {
      if (step !== 2 && step !== 5) return; // Only init on camera steps

      try {
        // Initial permission request if needed
        if (!stream) {
          await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        // Enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vids = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(vids);

        // Select default if not set
        if (!selectedDeviceId && vids.length > 0) {
          setSelectedDeviceId(vids[0].deviceId);
        } else if (selectedDeviceId) {
          startCamera(selectedDeviceId);
        }
      } catch (err) {
        console.error("Error initializing camera:", err);
        setError("Impossibile accedere alla fotocamera. Verifica i permessi.");
      }
    };

    initCamera();

    // Cleanup on unmount or step change (if leaving camera steps)
    return () => {
      if (step !== 2 && step !== 5) {
        stopCamera();
      }
    };
  }, [step]);

  // Switch Camera when selection changes
  useEffect(() => {
    if (selectedDeviceId && (step === 2 || step === 5)) {
      startCamera(selectedDeviceId);
    }
  }, [selectedDeviceId, step]);

  const startCamera = async (deviceId?: string) => {
    // Don't stop if it's the same device? For now, simple restart.
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play();
      }
      setError(null);
    } catch (err) {
      console.error("Error starting camera:", err);
      setError("Errore nell'avvio della videocamera.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startRecording = () => {
    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const newVideo: RecordedVideo = {
        blob,
        url,
        timestamp: Date.now(),
        duration: 0
      };
      setVideos((prev) => [...prev, newVideo]);
      // Don't auto-select, just add to list
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAnalyze = async (video: RecordedVideo) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    setSelectedVideo(video);

    try {
      const response = await apiService.uploadVideoForAnalysis(video.blob);
      const scanId = response.data?.scan_id ?? response.data?.scanId ?? response.data?.id;

      if (!response.success || !scanId) {
        throw new Error(response.message || "Errore durante l'avvio dell'analisi");
      }

      let completedResult: AnalysisResult | null = null;

      for (let attempt = 0; attempt < 45; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const statusResponse = await apiService.getScanStatus(scanId);
        if (!statusResponse.success || !statusResponse.data) {
          throw new Error(statusResponse.message || "Errore durante il recupero dello stato scansione");
        }

        const scanData = statusResponse.data as ScanStatusPayload;
        if (scanData.status === 'FAILED') {
          throw new Error(scanData.error || "La scansione è fallita");
        }

        if (scanData.steps?.mediapipe === 'COMPLETED' && scanData.results?.mediapipe_data) {
          let smplMesh: string | undefined;
          if (scanData.steps?.smpl === 'COMPLETED' && scanData.results?.smpl_mesh_uri) {
            try {
              smplMesh = await apiService.getScanAssetText(scanId, 'smpl_mesh.obj');
            } catch (meshError) {
              console.error('Failed to load SMPL mesh:', meshError);
            }
          }

          completedResult = buildAnalysisResult(scanData, smplMesh);
          if (completedResult) {
            break;
          }
        }
      }

      if (!completedResult) {
        throw new Error('Timeout in attesa del completamento della scansione');
      }

      setAnalysisResult(completedResult);
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err instanceof Error ? err.message : "Errore di connessione al server");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{patient.nome} {patient.cognome}</h1>
              <p className="text-sm text-gray-500">{visit.tipo_analisi.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Camera Selector (Visible in Step 2 and 5) */}
            {(step === 2 || step === 5) && (
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-gray-500" />
                <select
                  value={selectedDeviceId || ''}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {videoDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                  {videoDevices.length === 0 && <option value="">Nessuna camera rilevata</option>}
                </select>
              </div>
            )}
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">Esci</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Step {step} di 6</span>
            <span className={`text-sm font-medium ${isRecording ? 'text-red-500' : 'text-gray-500'}`}>
              {isRecording ? 'Registrazione in corso...' :
                step === 1 ? 'Preparazione Ambiente' :
                  step === 2 ? 'Verifica Camera' :
                    step === 3 ? 'Posizionamento' :
                      step === 4 ? 'Calibrazione' :
                        step === 5 ? 'Acquisizione Video' : 'Ricostruzione 3D & Analisi'}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${(step / 6) * 100}%` }} />
          </div>
        </div>

        {/* Step 1: Environment Check */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Controlla l'ambiente</h2>
            <p className="text-center text-gray-500 mb-8">Assicurati che lo sfondo sia libero e ben illuminato per una rilevazione ottimale.</p>
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-full shadow-sm">
                    <Sun className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Illuminazione</p>
                    <p className="text-gray-500 text-sm">L'area e sufficientemente illuminata?</p>
                  </div>
                </div>
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-full shadow-sm">
                    <ImageIcon className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Sfondo</p>
                    <p className="text-gray-500 text-sm">Lo sfondo e libero da ostacoli?</p>
                  </div>
                </div>
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex justify-center pt-6">
                <button onClick={() => setStep(2)} className="px-8 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl">
                  Continua
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Camera Check */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Verifica la videocamera</h2>
            <div className="max-w-4xl mx-auto">
              <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg mb-6 relative">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                    Assicurati di essere visibile interamente
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button onClick={() => setStep(1)} className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">
                  Indietro
                </button>
                <button onClick={() => setStep(3)} className="px-8 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors shadow-lg">
                  La camera funziona
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Positioning */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Posizionati</h2>
            <p className="text-center text-gray-500 mb-6">Stai a 2-3 metri dalla camera e allinea il corpo alle guide.</p>
            <div className="max-w-4xl mx-auto">
              <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative shadow-lg mb-6">
                {/* Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`v-${i}`} className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${(i / 3) * 100}%` }} />
                  ))}
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`h-${i}`} className="absolute left-0 right-0 h-px bg-white/20" style={{ top: `${(i / 3) * 100}%` }} />
                  ))}
                  {/* Silhouette Placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <Activity className="w-32 h-32 text-white" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button onClick={() => setStep(2)} className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">
                  Indietro
                </button>
                <button onClick={() => setStep(4)} className="px-8 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors shadow-lg">
                  Sono pronto
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Calibration/Countdown */}
        {step === 4 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Posizione neutra</h2>
            <p className="text-center text-gray-500 mb-8">Resta immobile con le braccia lungo i fianchi.</p>

            <div className="max-w-md mx-auto text-center">
              <div className="text-8xl font-bold text-blue-600 mb-4 animate-pulse">
                {countdown}
              </div>
              <p className="text-gray-400">Avvio scansione in corso...</p>
            </div>

            <div className="flex justify-center mt-12">
              <button onClick={() => setStep(3)} className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Acquisition (Recording Only) */}
        {step === 5 && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Acquisizione Video</h2>

              <div className="bg-black rounded-xl overflow-hidden aspect-video relative shadow-lg mb-8">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {isRecording && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full animate-pulse">
                    <div className="w-3 h-3 bg-white rounded-full" />
                    Registrazione...
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-6">
                <div className="flex justify-center gap-4">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      disabled={!stream}
                      className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 ${!stream ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl'
                        }`}
                    >
                      <Play className="w-6 h-6" />
                      Avvia Registrazione
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-xl"
                    >
                      <Square className="w-6 h-6" />
                      Stop
                    </button>
                  )}
                </div>

                {videos.length > 0 && (
                  <div className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h3 className="font-semibold mb-3 text-gray-700">Video Acquisiti ({videos.length})</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {videos.map((vid, idx) => (
                        <div key={vid.timestamp} className="flex-shrink-0 w-32 bg-white p-2 rounded border border-gray-200">
                          <div className="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center">
                            <Play className="w-6 h-6 text-gray-400" />
                          </div>
                          <div className="text-xs font-medium text-center">Video #{idx + 1}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {videos.length > 0 && (
                  <button
                    onClick={() => setStep(6)}
                    className="w-full max-w-md flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full font-bold hover:bg-green-700 transition-colors shadow-lg"
                  >
                    Vai alla Ricostruzione 3D
                    <Activity className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Reconstruction & Analysis */}
        {step === 6 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Video List */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Video da Analizzare</h3>
              <div className="space-y-3">
                {videos.map((vid, idx) => (
                  <div
                    key={vid.timestamp}
                    onClick={() => handleAnalyze(vid)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedVideo === vid
                      ? 'bg-blue-50 border-blue-500 shadow-md'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-700">Video #{idx + 1}</span>
                      {selectedVideo === vid && isAnalyzing && (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(vid.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(5)} className="w-full py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">
                â† Torna all'acquisizione
              </button>
            </div>

            {/* Right Column: 3D & Results */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[500px] flex flex-col overflow-hidden relative">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <div>
                    <h3 className="font-semibold text-gray-700">Ricostruzione 3D</h3>
                    {smplPreviewNote && (
                      <p className="mt-1 text-xs text-amber-700">{smplPreviewNote}</p>
                    )}
                  </div>
                  {analysisResult && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-600">Punteggio:</span>
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-white ${analysisResult.movement_quality === 'green' ? 'bg-green-500' :
                        analysisResult.movement_quality === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                        {analysisResult.movement_quality === 'green' ? 3 : analysisResult.movement_quality === 'yellow' ? 2 : 1}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 bg-gray-900 relative">
                  {!analysisResult ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                      <Activity className="w-12 h-12 mb-2 opacity-50" />
                      <p>Seleziona un video per avviare la ricostruzione</p>
                    </div>
                  ) : (
                    <Scene result={analysisResult} />
                  )}
                </div>
              </div>

              {analysisResult && (
                <div className={`p-6 rounded-xl border ${analysisResult.movement_quality === 'green' ? 'bg-green-50 border-green-200' :
                  analysisResult.movement_quality === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                  <h4 className="text-lg font-bold mb-2 flex items-center gap-2">
                    {analysisResult.movement_quality === 'green' ? <CheckCircle className="w-6 h-6 text-green-600" /> :
                      analysisResult.movement_quality === 'yellow' ? <AlertTriangle className="w-6 h-6 text-yellow-600" /> :
                        <XCircle className="w-6 h-6 text-red-600" />}
                    Analisi Biomeccanica
                  </h4>
                  <p className="text-gray-800 text-lg mb-4">{analysisResult.feedback}</p>
                  {smplPreviewNote && (
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {smplPreviewNote}
                    </div>
                  )}

                  {analysisResult.angles && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(analysisResult.angles).map(([key, val]) => (
                        <div key={key} className="bg-white/60 p-3 rounded-lg">
                          <span className="text-xs text-gray-500 uppercase block mb-1">{localizeMeasurementLabel(key, currentLanguage)}</span>
                          <div className="font-mono font-bold text-xl">{formatAngleValue(val as number, currentLanguage)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
