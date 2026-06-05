import React, { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { Patient, ViewType } from '../types';

interface DashboardProps {
  patients: Patient[];
  isLoading: boolean;
  onAddPatient: () => void;
  onPatientSelect: (patient: Patient) => void;
  onViewChange: (view: ViewType) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  patients,
  isLoading,
  onAddPatient,
  onPatientSelect,
  onViewChange
}) => {
  // Prevent unused prop TypeScript warning (kept for future use)
  void onViewChange;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pazienti</h2>
          <button
            onClick={onAddPatient}
            className="flex items-center space-x-2 bg-[#007BFF] text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            <span>Nuovo Paziente</span>
          </button>
        </div>

        {/* Barra ricerca + filtri */}
        <div className="card-outset p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca per nome o email"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue"
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

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
            <span className="ml-2 text-gray-600">Caricamento pazienti...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((patient) => (
              <div
                key={patient.id}
                onClick={() => onPatientSelect(patient)}
                className="card-outset p-4 flex items-center justify-between hover:shadow-md cursor-pointer transition-all"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-brand-light/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-semibold text-brand-blue">
                      {patient.nome.charAt(0)}{patient.cognome.charAt(0)}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-[200px]">
                    <h3 className="font-semibold text-gray-900">{patient.nome} {patient.cognome}</h3>
                    <p className="text-sm text-gray-500">{patient.email}</p>
                  </div>

                  <div className="hidden md:flex items-center gap-6 text-sm text-gray-600 border-l border-gray-200 pl-6">
                    <div>
                      <span className="block text-xs text-gray-400">Altezza</span>
                      <span className="font-medium">{patient.altezza} cm</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400">Peso</span>
                      <span className="font-medium">{patient.peso} kg</span>
                    </div>
                  </div>

                  {patient.patologia && (
                    <div className="hidden lg:block ml-auto mr-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {patient.patologia}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nessun paziente trovato
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
