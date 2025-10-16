import React, { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { PatientCard } from './PatientCard';
import type { Patient, ViewType } from '../types';

interface DashboardProps {
  patients: Patient[];
  isLoading: boolean;
  onAddPatient: () => void;
  onPatientSelect: (patient: Patient) => void;
  onViewChange: (view: ViewType) => void;
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h fa`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gg fa`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mesi fa`;
  const years = Math.floor(months / 12);
  return `${years} anni fa`;
}

export const Dashboard: React.FC<DashboardProps> = ({
  patients,
  isLoading,
  onAddPatient,
  onPatientSelect,
  onViewChange
}) => {
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState<'all' | 'M' | 'F'>('all');
  const [onlyDiagnosis, setOnlyDiagnosis] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      const genderOk = gender === 'all' || p.sesso === gender;
      const diagOk = !onlyDiagnosis || !!p.patologia;
      const text = `${p.nome} ${p.cognome} ${p.email}`.toLowerCase();
      const searchOk = q === '' || text.includes(q);
      return genderOk && diagOk && searchOk;
    });
  }, [patients, query, gender, onlyDiagnosis]);

  const recentPatients = useMemo(() => {
    return [...patients]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [patients]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pazienti</h2>
          <button
            onClick={onAddPatient}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Nuovo Paziente</span>
          </button>
        </div>

        {/* Barra ricerca + filtri */}
        <div className="bg-white rounded-md shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca per nome o email"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">Tutti i generi</option>
              <option value="M">Maschio</option>
              <option value="F">Femmina</option>
            </select>
            <label className="inline-flex items-center space-x-2 select-none">
              <input
                type="checkbox"
                checked={onlyDiagnosis}
                onChange={(e) => setOnlyDiagnosis(e.target.checked)}
              />
              <span className="text-sm text-gray-700">Solo con patologia</span>
            </label>
          </div>
        </div>

        {/* Sezione Recenti */}
        {!isLoading && recentPatients.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Pazienti recenti</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentPatients.map((p) => (
                <div key={p.id} className="bg-white rounded-md border p-4 flex items-center justify-between hover:shadow cursor-pointer" onClick={() => onPatientSelect(p)}>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold">
                      {p.nome.charAt(0)}{p.cognome.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{p.nome} {p.cognome}</div>
                      <div className="text-xs text-gray-500">Ultimo aggiornamento: {timeAgo(p.updated_at)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">Caricamento pazienti...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onClick={onPatientSelect}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};





