import React, { useEffect, useMemo, useState } from 'react';
import type { Visit } from '../../types';
import { listVisitsByDate } from '../../services/visits.firestore';
import { getPatientByIdFs } from '../../services/patients.firestore';

type Row = Visit & { patientName?: string; patientEmail?: string };

export const VisitsTable: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | string>('all');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const visits = await listVisitsByDate(50);
        // fetch patient names
        const unique = Array.from(new Set(visits.map(v => v.patient_id)));
        const map = new Map<string, { name: string; email: string }>();
        await Promise.all(unique.map(async id => {
          const p = await getPatientByIdFs(id);
          if (p) map.set(id, { name: `${p.nome} ${p.cognome}`, email: p.email });
        }));
        const withPatient = visits.map(v => ({
          ...v,
          patientName: map.get(v.patient_id)?.name,
          patientEmail: map.get(v.patient_id)?.email
        }));
        if (mounted) setRows(withPatient);
      } finally {
        setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      const tOk = type === 'all' || r.tipo_analisi === type;
      const text = `${r.patientName || ''} ${r.patientEmail || ''}`.toLowerCase();
      const qOk = q === '' || text.includes(q);
      return tOk && qOk;
    });
  }, [rows, query, type]);

  const formatDate = (iso: string) => new Date(iso).toISOString().slice(0,10);

  return (
    <div>
      <div className="bg-white rounded-md border p-4 mb-4 flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
        <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Cerca paziente" className="flex-1 border rounded px-3 py-2" />
        <select value={type} onChange={(e)=>setType(e.target.value)} className="border rounded px-3 py-2">
          <option value="all">Tutti i tipi</option>
          <option value="completa">Analisi Completa</option>
          <option value="posturale">Analisi Posturale</option>
          <option value="mobilita_superiori">Mobilità Superiori</option>
          <option value="mobilita_inferiori">Mobilità Inferiori</option>
        </select>
      </div>

      <div className="bg-white rounded-md shadow p-0 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-3 px-4">Data</th>
              <th className="py-3 px-4">Paziente</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Stato</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="py-4 px-4 text-gray-500" colSpan={4}>Caricamento...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="py-4 px-4 text-gray-500" colSpan={4}>Nessun elemento</td></tr>
            ) : (
              filtered.map(v => (
                <tr key={v.id} className="border-b last:border-0">
                  <td className="py-3 px-4">{formatDate(v.created_at)}</td>
                  <td className="py-3 px-4">{v.patientName || v.patient_id}<div className="text-xs text-gray-500">{v.patientEmail || ''}</div></td>
                  <td className="py-3 px-4 capitalize">{v.tipo_analisi.replace('_',' ')}</td>
                  <td className="py-3 px-4">{v.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

