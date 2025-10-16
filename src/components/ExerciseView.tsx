import React from 'react';
import { Camera, Play, Square, AlertCircle, Check } from 'lucide-react';
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
  const renderVisualization = () => {
    if (!isStreaming) {
      return (
        <div className="text-center py-20">
          <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Premi "Avvia Analisi" per iniziare</p>
        </div>
      );
    }

    if (streamData?.frame) {
      // TODO: Implementare rendering del frame base64
      return (
        <div className="text-center py-20">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-green-400">Streaming in corso...</p>
        </div>
      );
    }

    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
                <span className="text-sm text-gray-300 capitalize">
                  {joint.replace('_', ' ')}
                </span>
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
                <span className="text-sm font-semibold text-blue-400">
                  {value.toFixed(3)}
                </span>
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
            <h1 className="text-xl font-bold text-white">
              {patient.nome} {patient.cognome}
            </h1>
            <p className="text-sm text-gray-400">
              {visit.tipo_analisi.replace('_', ' ').toUpperCase()}
            </p>
          </div>
          <div className="flex space-x-4">
            {!isStreaming && !isConnecting ? (
              <button
                onClick={onStartStreaming}
                disabled={isConnecting}
                className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Play className="w-5 h-5" />
                <span>Av via Analisi</span>
              </button>
            ) : (
              <button
                onClick={onStopStreaming}
                className="flex items-center space-x-2 bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                <Square className="w-5 h-5" />
                <span>Ferma</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-gray-800 rounded-md p-4">
            <div className="aspect-video bg-gray-900 rounded-md flex items-center justify-center">
              {renderVisualization()}
            </div>
          </div>

          <div className="bg-gray-800 rounded-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Metriche Real-Time</h3>
            {renderMetrics()}
          </div>
        </div>

        <div className="mt-6 bg-gray-800 rounded-md p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Istruzioni per il Paziente</h3>
          <div className="bg-gray-900 rounded-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Check className="w-6 h-6 text-green-400" />
              <p className="text-white text-lg">Resta immobile con le mani lungo i fianchi</p>
            </div>
            <p className="text-gray-400 ml-9">
              Mantieni la posizione per permettere al sistema di acquisire i dati posturali
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};





