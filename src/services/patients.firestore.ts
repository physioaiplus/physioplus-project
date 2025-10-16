import { collection, getDocs, getDoc, addDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Patient, NewPatientFormData } from '../types';

const COLLECTION_NAME = 'patients';

type FirestorePatient = {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  personal_info?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    birth_date?: string; // ISO string (YYYY-MM-DD)
    gender?: string; // 'M' | 'F' | etc.
  };
  clinical_info?: {
    height_cm?: number;
    weight_kg?: number;
    diagnosis?: string;
    therapy_goal?: string;
    notes?: string;
  };
  privacy_consent?: {
    signed_at?: Timestamp;
    version?: string;
    accepted_terms?: boolean;
  };
};

function tsToIso(ts?: Timestamp): string {
  return ts ? ts.toDate().toISOString() : new Date().toISOString();
}

function mapToPatient(id: string, data: FirestorePatient): Patient {
  const p = data.personal_info || {};
  const c = data.clinical_info || {};
  const pr = data.privacy_consent || {};

  return {
    id,
    nome: p.first_name || '',
    cognome: p.last_name || '',
    email: p.email || '',
    altezza: typeof c.height_cm === 'number' ? c.height_cm : 0,
    peso: typeof c.weight_kg === 'number' ? c.weight_kg : 0,
    sesso: p.gender || '',
    patologia: c.diagnosis || undefined,
    obiettivo: c.therapy_goal || undefined,
    privacy_accepted: pr.accepted_terms ?? false,
    created_at: tsToIso(data.createdAt),
    updated_at: tsToIso(data.updatedAt)
  };
}

export async function listPatients(): Promise<Patient[]> {
  const snap = await getDocs(collection(db, COLLECTION_NAME));
  return snap.docs.map((d) => mapToPatient(d.id, d.data() as FirestorePatient));
}

export async function getPatientByIdFs(id: string): Promise<Patient | null> {
  const ref = doc(db, COLLECTION_NAME, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapToPatient(snap.id, snap.data() as FirestorePatient);
}

export async function createPatientFs(form: NewPatientFormData): Promise<string> {
  // Mappa il form (UI) nello schema Firestore condiviso in chat
  const payload: FirestorePatient = {
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
    personal_info: {
      first_name: form.nome,
      last_name: form.cognome,
      email: form.email,
      birth_date: '',
      gender: form.sesso
    },
    clinical_info: {
      height_cm: parseInt(form.altezza || '0', 10) || 0,
      weight_kg: parseInt(form.peso || '0', 10) || 0,
      diagnosis: form.patologia || '',
      therapy_goal: form.obiettivo || ''
    },
    privacy_consent: {
      accepted_terms: !!form.privacy_accepted
    }
  };

  const res = await addDoc(collection(db, COLLECTION_NAME), payload);
  return res.id;
}

