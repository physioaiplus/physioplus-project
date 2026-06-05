import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { AnalysisType, type Patient, type Visit } from '../types';
import { apiService } from '../services/api';
import { safeFormatDate } from '../utils/date';
import { getAnalysisTypeLabel } from '../utils/analysis';
import {
  getComparablePreviousVisit,
  getVisitScanCountLabel,
  getVisitComparison,
  getVisitScoreLabel,
  getVisitSortTime,
  getVisitStatusClassName,
  getVisitStatusLabel,
} from '../utils/visits';
import { Header } from './header/Header';
import { VisitDetailModal } from './VisitDetailModal';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
  onCreateVisit: (tipoAnalisi: string) => void;
}

const ANALYSIS_TYPES = [
  {
    id: AnalysisType.PERSONALIZZATA,
    title: 'Scansiona',
    description: 'Scegli liberamente i componenti della scansione',
    icon: Activity,
  },
  {
    id: AnalysisType.COMPLETA,
    title: 'Analisi Completa',
    description: 'Preset con tutte le scansioni selezionate',
    icon: Activity,
  },
  {
    id: AnalysisType.POSTURALE,
    title: 'Analisi Posturale',
    description: 'Preset con la scansione postura gia selezionata',
    icon: Activity,
  },
  {
    id: AnalysisType.MOBILITA_SUPERIORI,
    title: 'Mobilita Arti Superiori',
    description: 'Preset con le scansioni arti superiori gia selezionate',
    icon: Activity,
  },
  {
    id: AnalysisType.MOBILITA_INFERIORI,
    title: 'Mobilita Arti Inferiori',
    description: 'Preset con le scansioni arti inferiori gia selezionate',
    icon: Activity,
  },
];

export const PatientDetail: React.FC<PatientDetailProps> = ({
  patient,
  onBack,
  onCreateVisit,
}) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  const sortedVisits = useMemo(
    () => [...visits].sort((a, b) => getVisitSortTime(b) - getVisitSortTime(a)),
    [visits],
  );
  const latestVisit = sortedVisits[0];
  const latestComparison = latestVisit
    ? getVisitComparison(latestVisit, getComparablePreviousVisit(latestVisit, sortedVisits))
    : null;

  const renderComparisonIcon = (direction?: string) => {
    if (direction === 'up') return <TrendingUp className="w-4 h-4" />;
    if (direction === 'down') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setIsLoading(true);
        const response = await apiService.getPatientVisits(patient.id);
        if (mounted && response.success && response.data) {
          setVisits(response.data as Visit[]);
        }
      } catch (error) {
        console.error('Failed to load patient visits', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [patient.id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title={`${patient.nome} ${patient.cognome}`}
        onBack={onBack}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="card-outset p-8 mb-6">
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

        <div className="card-outset p-8">
          <h2 className="text-xl font-semibold mb-6">Nuova Analisi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ANALYSIS_TYPES.map(({ id, title, description, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onCreateVisit(id)}
                className="card-outset p-6 transition-all text-left hover:shadow-md hover:bg-brand-light/20"
              >
                <Icon className="w-8 h-8 text-brand-blue mb-2" />
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="card-outset p-8 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Storico visite</h2>
          </div>
          {latestComparison && (
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Ultima visita</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{safeFormatDate(sortedVisits[0].created_at)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Score attuale</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{getVisitScoreLabel(sortedVisits[0])}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Confronto misure</p>
                <span className={`mt-2 inline-flex items-center gap-2 rounded px-3 py-1 text-sm font-semibold ${latestComparison.className}`}>
                  {renderComparisonIcon(latestComparison.direction)}
                  {latestComparison.shortLabel}
                </span>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-3 pr-4">Data</th>
                  <th className="py-3 pr-4">Tipo</th>
                  <th className="py-3 pr-4">Stato</th>
                  <th className="py-3 pr-4">Scansioni</th>
                  <th className="py-3 pr-4">Score</th>
                  <th className="py-3 pr-4">Confronto misure</th>
                  <th className="py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={7}>Caricamento...</td>
                  </tr>
                ) : sortedVisits.length === 0 ? (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={7}>Nessuna visita registrata</td>
                  </tr>
                ) : (
                  sortedVisits.map((visit) => {
                    const comparison = getVisitComparison(visit, getComparablePreviousVisit(visit, sortedVisits));
                    return (
                      <tr
                        key={visit.id}
                        className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedVisit(visit)}
                      >
                        <td className="py-3 pr-4">{safeFormatDate(visit.created_at)}</td>
                        <td className="py-3 pr-4">{getAnalysisTypeLabel(visit.tipo_analisi)}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getVisitStatusClassName(visit.status)}`}>
                            {getVisitStatusLabel(visit.status)}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{getVisitScanCountLabel(visit)}</td>
                        <td className="py-3 pr-4">{getVisitScoreLabel(visit)}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${comparison.className}`}>
                            {renderComparisonIcon(comparison.direction)}
                            {comparison.shortLabel}
                          </span>
                        </td>
                        <td className="py-3 max-w-[320px] truncate">{visit.note || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end" />
      </main>

      {selectedVisit && (
        <VisitDetailModal
          visit={selectedVisit}
          patientName={`${patient.nome} ${patient.cognome}`}
          onClose={() => setSelectedVisit(null)}
        />
      )}
    </div>
  );
};
