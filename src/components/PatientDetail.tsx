import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import type { Patient, Visit } from '../types';
import { Header } from './header/Header';
import { listRecentVisitsByPatient } from '../services/visits.firestore';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
  onCreateVisit: (tipoAnalisi: string) => void;
}

const ANALYSIS_TYPES = [
  {
    id: 'completa',
    title: 'Analisi Completa',
    description: 'Postura + mobilità + peso + appoggi',
    icon: Activity
  },
  {
    id: 'posturale',
    title: 'Analisi Posturale',
    description: 'Scansione statica e simmetria',
    icon: Activity
  },
  {
    id: 'mobilita_superiori',
    title: 'Mobilità Arti Superiori',
    description: 'Spalla, braccio - frontale e laterale',
    icon: Activity
  },
  {
    id: 'mobilita_inferiori',
    title: 'Mobilità Arti Inferiori',
    description: 'Ginocchio, anca - frontale e laterale',
    icon: Activity
  }
];

export const PatientDetail: React.FC<PatientDetailProps> = ({
  patient,
  onBack,
  onCreateVisit
}) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const v = await listRecentVisitsByPatient(patient.id, 10);
        if (mounted) setVisits(v);
      } finally {
        setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [patient.id]);

  const formatDate = (iso: string) => new Date(iso).toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={`${patient.nome} ${patient.cognome}`} 
        onBack={onBack} 
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-md shadow-md p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4">Informazioni Paziente</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{patient.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Altezza / Peso</p>
              <p className="font-medium">{patient.altezza} cm / {patient.peso} kg</p>
            </div>
            {patient.patologia && (
              <div>
                <p className="text-sm text-gray-600">Patologia</p>
                <p className="font-medium">{patient.patologia}</p>
              </div>
            )}
            {patient.obiettivo && (
              <div>
                <p className="text-sm text-gray-600">Obiettivo</p>
                <p className="font-medium">{patient.obiettivo}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-md shadow-md p-8">
          <h2 className="text-xl font-semibold mb-6">Nuova Analisi</h2>
          <div className="grid grid-cols-2 gap-4">
            {ANALYSIS_TYPES.map(({ id, title, description, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onCreateVisit(id)}
                className="p-6 border-2 border-gray-300 rounded-md hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left"
              >
                <Icon className="w-8 h-8 text-indigo-600 mb-2" />
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Visite recenti */}
        <div className="bg-white rounded-md shadow-md p-8 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Visite recenti</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-3 pr-4">Data</th>
                  <th className="py-3 pr-4">Tipo</th>
                  <th className="py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="py-4 text-gray-500" colSpan={3}>Caricamento...</td></tr>
                ) : visits.length === 0 ? (
                  <tr><td className="py-4 text-gray-500" colSpan={3}>Nessuna visita registrata</td></tr>
                ) : (
                  visits.map(v => (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">{formatDate(v.created_at)}</td>
                      <td className="py-3 pr-4 capitalize">{v.tipo_analisi.replace('_', ' ')}</td>
                      <td className="py-3">{v.note || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};





