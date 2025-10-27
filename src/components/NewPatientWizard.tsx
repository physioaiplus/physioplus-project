import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { NewPatientFormData } from '../types';
import { Header } from './header/Header';

interface NewPatientWizardProps {
  onSubmit: (formData: NewPatientFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

type Step = 1 | 2;

export const NewPatientWizard: React.FC<NewPatientWizardProps> = ({
  onSubmit,
  onCancel,
  isLoading
}) => {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<NewPatientFormData>({
    nome: '',
    cognome: '',
    email: '',
    altezza: '',
    peso: '',
    sesso: 'M',
    patologia: '',
    obiettivo: '',
    privacy_accepted: false
  });

  // Consensi GDPR (step 2)
  const [consentRecording, setConsentRecording] = useState(false);
  const [consentImprovement, setConsentImprovement] = useState(false);
  // Signature pad
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const isStep1Valid = useMemo(() => {
    return (
      !!formData.nome &&
      !!formData.cognome &&
      !!formData.email &&
      !!formData.altezza &&
      !!formData.peso &&
      !!formData.sesso
    );
  }, [formData]);

  const isStep2Valid = useMemo(() => {
    return consentRecording && consentImprovement && hasSignature;
  }, [consentRecording, consentImprovement, hasSignature]);

  const handleInputChange = (field: keyof NewPatientFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep1Valid) return;
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep2Valid) return;
    const canvas = canvasRef.current;
    const signatureData = canvas ? canvas.toDataURL('image/png') : undefined;
    await onSubmit({ ...formData, privacy_accepted: true, signature_data: signatureData });
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-6 text-sm text-gray-600">
      <div className={`flex items-center ${step === 1 ? 'text-brand-blue' : ''}`}>
        <span className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 border ${step >= 1 ? 'bg-brand-blue text-white border-brand-blue' : 'border-gray-300'}`}>1</span>
        <span>Dati paziente</span>
      </div>
      <div className="w-12 h-px bg-gray-300 mx-4" />
      <div className={`flex items-center ${step === 2 ? 'text-brand-blue' : ''}`}>
        <span className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 border ${step >= 2 ? 'bg-brand-blue text-white border-brand-blue' : 'border-gray-300'}`}>2</span>
        <span>Consenso GDPR</span>
      </div>
    </div>
  );

  const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }>
    = ({ checked, onChange, label }) => (
    <label className="flex items-center justify-between py-3 cursor-pointer">
      <span className="text-gray-800">{label}</span>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-brand-blue' : 'bg-gray-300'}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`}
        />
      </button>
    </label>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Nuovo Paziente" onBack={onCancel} />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="card-outset p-8">
          <StepIndicator />

          {step === 1 && (
            <form onSubmit={handleContinue} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={handleInputChange('nome')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cognome *</label>
                  <input
                    type="text"
                    value={formData.cognome}
                    onChange={handleInputChange('cognome')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Altezza (cm) *</label>
                  <input
                    type="number"
                    value={formData.altezza}
                    onChange={handleInputChange('altezza')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg) *</label>
                  <input
                    type="number"
                    value={formData.peso}
                    onChange={handleInputChange('peso')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sesso *</label>
                  <select
                    value={formData.sesso}
                    onChange={handleInputChange('sesso')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue"
                    disabled={isLoading}
                  >
                    <option value="M">Maschio</option>
                    <option value="F">Femmina</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Patologia</label>
                <input
                  type="text"
                  value={formData.patologia}
                  onChange={handleInputChange('patologia')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue"
                  placeholder="Opzionale"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Obiettivo</label>
                <textarea
                  value={formData.obiettivo}
                  onChange={handleInputChange('obiettivo')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue"
                  rows={3}
                  placeholder="Obiettivo della terapia"
                  disabled={isLoading}
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-brand-blue text-white rounded-md hover:opacity-90 transition-colors disabled:opacity-50"
                  disabled={isLoading || !isStep1Valid}
                >
                  Continua
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Consenso al Trattamento Dati</h2>
                <p className="text-gray-600 mt-2">
                  Questa sessione potrebbe essere registrata per finalità di miglioramento del servizio, verifica o documentazione clinica, in conformità al GDPR UE (Art. 6 e Art. 7).
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Avvertenze legali</h3>
                  <p className="text-gray-700">
                    Procedendo, accetti il trattamento, l'archiviazione e l'eventuale cancellazione dei tuoi dati come descritto nella nostra Informativa Privacy.
                  </p>
                </div>

                <Toggle
                  checked={consentRecording}
                  onChange={setConsentRecording}
                  label="Acconsento alla registrazione durante la sessione."
                />
                <Toggle
                  checked={consentImprovement}
                  onChange={setConsentImprovement}
                  label="Acconsento all'uso dei miei dati per miglioramento del servizio e ricerca."
                />
              </div>

              <SignatureSection
                canvasRef={canvasRef}
                containerRef={containerRef}
                isLoading={isLoading}
                onHasSignatureChange={setHasSignature}
              />

              <div className="border-t pt-4 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Timestamp</span>
                  <span>{new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
                </div>
              </div>

              <div className="flex space-x-4 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-brand-blue text-white rounded-md hover:opacity-90 transition-colors disabled:opacity-50"
                  disabled={isLoading || !isStep2Valid}
                >
                  {isLoading ? 'Creazione...' : 'Conferma e Firma'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

// Sezione firma con canvas (mouse/touch/stilo)
const SignatureSection: React.FC<{
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  onHasSignatureChange: (v: boolean) => void;
}> = ({ canvasRef, containerRef, isLoading, onHasSignatureChange }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    onHasSignatureChange(hasSignature);
  }, [hasSignature, onHasSignatureChange]);

  // Resize canvas to container width
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = 140; // fixed visual height
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [canvasRef, containerRef]);

  const getPos = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
  };

  const start = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const move = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const end = (e?: MouseEvent | TouchEvent) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // repaint background white to avoid transparent PNGs
    const cssWidth = parseInt(canvas.style.width || '0', 10) || canvas.width;
    const cssHeight = parseInt(canvas.style.height || '0', 10) || canvas.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    setHasSignature(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => start(e);
    const onMouseMove = (e: MouseEvent) => move(e);
    const onMouseUp = (e: MouseEvent) => end(e);
    const onMouseLeave = (e: MouseEvent) => end(e);
    const onTouchStart = (e: TouchEvent) => start(e);
    const onTouchMove = (e: TouchEvent) => move(e);
    const onTouchEnd = (e: TouchEvent) => end(e);

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [canvasRef, isDrawing]);

  return (
    <div className="pt-4">
      <h3 className="font-medium mb-2">Firma digitale</h3>
      <div ref={containerRef} className="border border-gray-300 rounded-md bg-white">
        <canvas ref={canvasRef} className="w-full h-36 touch-none" />
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className={`text-xs ${hasSignature ? 'text-green-600' : 'text-gray-500'}`}>
          {hasSignature ? 'Firma acquisita correttamente' : 'Firma all’interno del riquadro'}
        </p>
        <button
          type="button"
          onClick={clear}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isLoading}
        >
          Pulisci
        </button>
      </div>
    </div>
  );
};
