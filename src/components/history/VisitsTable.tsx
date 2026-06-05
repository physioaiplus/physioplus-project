import React, { useEffect, useMemo, useState } from 'react';
import type { Visit } from '../../types';
import { apiService } from '../../services/api';
import { getAnalysisTypeLabel } from '../../utils/analysis';
import { safeFormatDate } from '../../utils/date';
import {
  getComparablePreviousVisit,
  getVisitScanCountLabel,
  getVisitComparison,
  getVisitScoreLabel,
  getVisitStatusClassName,
  getVisitStatusLabel,
} from '../../utils/visits';
import { VisitDetailModal } from '../VisitDetailModal';

type Row = Visit & { patientName?: string; patientEmail?: string };

export const VisitsTable: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | string>('all');
  const [selectedVisit, setSelectedVisit] = useState<Row | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setIsLoading(true);

      try {
        const response = await apiService.getAllVisits();
        if (response.success && response.data) {
          const visits = response.data as Visit[];
          const uniquePatientIds = Array.from(new Set(visits.map((visit) => visit.patient_id)));
          const patientMap = new Map<string, { name: string; email: string }>();

          await Promise.all(uniquePatientIds.map(async (id) => {
            try {
              const patientRes = await apiService.getPatient(id);
              if (patientRes.success && patientRes.data) {
                const patient = patientRes.data;
                patientMap.set(id, { name: `${patient.nome} ${patient.cognome}`, email: patient.email });
              }
            } catch (error) {
              console.warn(`Failed to fetch patient ${id}`, error);
            }
          }));

          if (mounted) {
            setRows(visits.map((visit) => ({
              ...visit,
              patientName: patientMap.get(visit.patient_id)?.name,
              patientEmail: patientMap.get(visit.patient_id)?.email,
            })));
          }
        }
      } catch (error) {
        console.error('Failed to load visits', error);
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

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesType = type === 'all' || row.tipo_analisi === type;
      const text = `${row.patientName || ''} ${row.patientEmail || ''}`.toLowerCase();
      const matchesQuery = normalizedQuery === '' || text.includes(normalizedQuery);
      return matchesType && matchesQuery;
    });
  }, [rows, query, type]);

  return (
    <>
      <div>
        <div className="card-outset p-4 mb-4 flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca paziente"
            className="flex-1 border rounded px-3 py-2"
          />
          <select value={type} onChange={(event) => setType(event.target.value)} className="border rounded px-3 py-2">
            <option value="all">Tutti i tipi</option>
            <option value="completa">Analisi Completa</option>
            <option value="posturale">Analisi Posturale</option>
            <option value="mobilita_superiori">Mobilità Arti Superiori</option>
            <option value="mobilita_inferiori">Mobilità Arti Inferiori</option>
            <option value="personalizzata">Scansiona</option>
          </select>
        </div>

        <div className="card-outset p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Paziente</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Stato</th>
                <th className="py-3 px-4">Scansioni</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Confronto misure</th>
                <th className="py-3 px-4">Note</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="py-4 px-4 text-gray-500" colSpan={8}>Caricamento...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="py-4 px-4 text-gray-500" colSpan={8}>Nessun elemento</td>
                </tr>
              ) : (
                filtered.map((visit) => {
                  const previousVisit = getComparablePreviousVisit(visit, rows);
                  const comparison = getVisitComparison(visit, previousVisit);
                  return (
                    <tr
                      key={visit.id}
                      className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedVisit(visit)}
                    >
                      <td className="py-3 px-4">{safeFormatDate(visit.created_at)}</td>
                      <td className="py-3 px-4">
                        {visit.patientName || visit.patient_id}
                        <div className="text-xs text-gray-500">{visit.patientEmail || ''}</div>
                      </td>
                      <td className="py-3 px-4">{getAnalysisTypeLabel(visit.tipo_analisi)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getVisitStatusClassName(visit.status)}`}>
                          {getVisitStatusLabel(visit.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">{getVisitScanCountLabel(visit)}</td>
                      <td className="py-3 px-4">{getVisitScoreLabel(visit)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${comparison.className}`}>
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
      </div>

      {selectedVisit && (
        <VisitDetailModal
          visit={selectedVisit}
          patientName={selectedVisit.patientName}
          onClose={() => setSelectedVisit(null)}
        />
      )}
    </>
  );
};
