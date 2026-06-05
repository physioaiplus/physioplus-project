import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Minus, Search, TrendingDown, TrendingUp } from 'lucide-react';
import type { Patient, Visit } from '../../types';
import { apiService } from '../../services/api';
import { getAnalysisTypeLabel } from '../../utils/analysis';
import { safeFormatDate } from '../../utils/date';
import {
  getComparablePreviousVisit,
  getVisitScanCountLabel,
  getVisitComparison,
  getVisitScoreLabel,
  getVisitSortTime,
  getVisitStatusClassName,
  getVisitStatusLabel,
} from '../../utils/visits';
import { VisitDetailModal } from '../VisitDetailModal';

type PatientGroup = {
  patient: Patient;
  visits: Visit[];
};

const createFallbackPatient = (patientId: string): Patient => ({
  id: patientId,
  nome: 'Paziente',
  cognome: patientId ? patientId.slice(0, 8) : 'sconosciuto',
  email: '',
  altezza: 0,
  peso: 0,
  sesso: '',
  privacy_accepted: false,
  created_at: '',
  updated_at: '',
});

const getPatientName = (patient: Patient): string => (
  `${patient.nome || ''} ${patient.cognome || ''}`.trim() || patient.id
);

const renderComparisonIcon = (direction?: string) => {
  if (direction === 'up') return <TrendingUp className="w-4 h-4" />;
  if (direction === 'down') return <TrendingDown className="w-4 h-4" />;
  return <Minus className="w-4 h-4" />;
};

export const PatientVisitsHistory: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<{ visit: Visit; patientName: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setIsLoading(true);

      try {
        const [patientsResponse, visitsResponse] = await Promise.all([
          apiService.getPatients(),
          apiService.getAllVisits(),
        ]);

        if (!mounted) return;

        if (patientsResponse.success && Array.isArray(patientsResponse.data)) {
          setPatients(patientsResponse.data);
        }

        if (visitsResponse.success && Array.isArray(visitsResponse.data)) {
          setVisits(visitsResponse.data as Visit[]);
        }
      } catch (error) {
        console.error('Failed to load patient visit history', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const groups = useMemo<PatientGroup[]>(() => {
    const patientMap = new Map(patients.map((patient) => [patient.id, patient]));
    const grouped = new Map<string, Visit[]>();

    patients.forEach((patient) => grouped.set(patient.id, []));
    visits.forEach((visit) => {
      const patientId = visit.patient_id || 'unknown';
      if (!grouped.has(patientId)) {
        grouped.set(patientId, []);
      }
      grouped.get(patientId)?.push(visit);
    });

    return Array.from(grouped.entries())
      .map(([patientId, patientVisits]) => ({
        patient: patientMap.get(patientId) || createFallbackPatient(patientId),
        visits: [...patientVisits].sort((a, b) => getVisitSortTime(b) - getVisitSortTime(a)),
      }))
      .sort((a, b) => {
        const visitDelta = (b.visits[0] ? getVisitSortTime(b.visits[0]) : 0) - (a.visits[0] ? getVisitSortTime(a.visits[0]) : 0);
        if (visitDelta !== 0) return visitDelta;
        return getPatientName(a.patient).localeCompare(getPatientName(b.patient), 'it');
      });
  }, [patients, visits]);

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return groups;

    return groups.filter(({ patient, visits: patientVisits }) => {
      const patientText = `${patient.nome} ${patient.cognome} ${patient.email}`.toLowerCase();
      const visitText = patientVisits
        .map((visit) => `${visit.note || ''} ${getAnalysisTypeLabel(visit.tipo_analisi)}`)
        .join(' ')
        .toLowerCase();

      return patientText.includes(normalizedQuery) || visitText.includes(normalizedQuery);
    });
  }, [groups, query]);

  return (
    <>
      <div className="space-y-4">
        <div className="card-outset p-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca paziente, email, nota o tipo visita"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue"
            />
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="card-outset p-6 text-gray-500">Caricamento storico pazienti...</div>
          ) : filteredGroups.length === 0 ? (
            <div className="card-outset p-6 text-gray-500">Nessun paziente trovato</div>
          ) : (
            filteredGroups.map(({ patient, visits: patientVisits }) => {
              const patientName = getPatientName(patient);
              const isExpanded = expandedPatientId === patient.id;
              const lastVisit = patientVisits[0];

              return (
                <section key={patient.id} className="card-outset overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedPatientId(isExpanded ? null : patient.id)}
                    className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-brand-light/20 flex items-center justify-center text-brand-blue">
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{patientName}</h3>
                          <p className="text-sm text-gray-500">{patient.email || 'Email non disponibile'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm md:min-w-[360px]">
                        <div>
                          <span className="block text-xs text-gray-400">Visite</span>
                          <span className="font-semibold text-gray-900">{patientVisits.length}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-400">Ultima visita</span>
                          <span className="font-semibold text-gray-900">{lastVisit ? safeFormatDate(lastVisit.created_at) : '-'}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-400">Ultimo score</span>
                          <span className="font-semibold text-gray-900">{lastVisit ? getVisitScoreLabel(lastVisit) : '-'}</span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t bg-white overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600 border-b bg-gray-50">
                            <th className="py-3 px-4">Data</th>
                            <th className="py-3 px-4">Tipo</th>
                            <th className="py-3 px-4">Stato</th>
                            <th className="py-3 px-4">Scansioni</th>
                            <th className="py-3 px-4">Score</th>
                            <th className="py-3 px-4">Confronto misure</th>
                            <th className="py-3 px-4">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientVisits.length === 0 ? (
                            <tr>
                              <td className="py-4 px-4 text-gray-500" colSpan={7}>Nessuna visita registrata</td>
                            </tr>
                          ) : (
                            patientVisits.map((visit) => {
                              const comparison = getVisitComparison(visit, getComparablePreviousVisit(visit, patientVisits));
                              return (
                                <tr
                                  key={visit.id}
                                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                                  onClick={() => setSelectedVisit({ visit, patientName })}
                                >
                                  <td className="py-3 px-4 whitespace-nowrap">{safeFormatDate(visit.created_at)}</td>
                                  <td className="py-3 px-4">{getAnalysisTypeLabel(visit.tipo_analisi)}</td>
                                  <td className="py-3 px-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getVisitStatusClassName(visit.status)}`}>
                                      {getVisitStatusLabel(visit.status)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">{getVisitScanCountLabel(visit)}</td>
                                  <td className="py-3 px-4">{getVisitScoreLabel(visit)}</td>
                                  <td className="py-3 px-4">
                                    <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${comparison.className}`}>
                                      {renderComparisonIcon(comparison.direction)}
                                      {comparison.shortLabel}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 max-w-[280px] truncate">{visit.note || '-'}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>

      {selectedVisit && (
        <VisitDetailModal
          visit={selectedVisit.visit}
          patientName={selectedVisit.patientName}
          onClose={() => setSelectedVisit(null)}
        />
      )}
    </>
  );
};
