import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Visit, AnalysisType } from '../types';

const COLLECTION_NAME = 'visits';

type FirestoreVisit = {
  createdAt?: Timestamp;
  patient_id: string;
  operator_id: string;
  tipo_analisi: AnalysisType;
  status: string;
  note?: string;
  exercises?: any[];
};

function tsToIso(ts?: Timestamp): string {
  return ts ? ts.toDate().toISOString() : new Date().toISOString();
}

function mapToVisit(id: string, data: FirestoreVisit): Visit {
  return {
    id,
    patient_id: data.patient_id,
    operator_id: data.operator_id,
    tipo_analisi: data.tipo_analisi,
    status: data.status,
    note: data.note,
    created_at: tsToIso(data.createdAt),
    exercises: data.exercises || []
  };
}

export async function createVisitFs(
  patientId: string,
  operatorId: string,
  tipoAnalisi: AnalysisType,
  note?: string
): Promise<string> {
  const payload: FirestoreVisit = {
    patient_id: patientId,
    operator_id: operatorId,
    tipo_analisi: tipoAnalisi,
    status: 'in_progress',
    note: note || '',
    exercises: [],
    createdAt: serverTimestamp() as unknown as Timestamp
  };
  const res = await addDoc(collection(db, COLLECTION_NAME), payload);
  return res.id;
}

export async function getVisitByIdFs(visitId: string): Promise<Visit | null> {
  const ref = doc(db, COLLECTION_NAME, visitId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapToVisit(snap.id, snap.data() as FirestoreVisit);
}

export async function listRecentVisitsByPatient(patientId: string, max: number = 10): Promise<Visit[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('patient_id', '==', patientId),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => mapToVisit(d.id, d.data() as FirestoreVisit));
}

// Lista globale visite, ordinate per data desc
export async function listVisitsByDate(max: number = 50): Promise<Visit[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => mapToVisit(d.id, d.data() as FirestoreVisit));
}
