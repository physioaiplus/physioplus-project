/**
 * Tipi e interfacce per la gestione dello stato dell'applicazione
 */

// Tipi per utente
export interface User {
  email: string;
  uid: string;
  displayName?: string | null;
  photoURL?: string | null;
}

// Tipi per paziente
export interface Patient {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  altezza: number;
  peso: number;
  sesso: string;
  patologia?: string;
  obiettivo?: string;
  privacy_accepted: boolean;
  created_at: string;
  updated_at: string;
}

// Tipi per visita
export enum AnalysisType {
  COMPLETA = 'completa',
  POSTURALE = 'posturale',
  MOBILITA_SUPERIORI = 'mobilita_superiori',
  MOBILITA_INFERIORI = 'mobilita_inferiori'
}

export interface Visit {
  id: string;
  patient_id: string;
  operator_id: string;
  tipo_analisi: AnalysisType;
  status: string;
  note?: string;
  created_at: string;
  exercises: any[];
}

// Tipi per analisi posturale
export interface PostureAnalysis {
  keypoints: Record<string, {
    x: number;
    y: number;
    z: number;
    visibility: number;
  }>;
  angles: Record<string, number>;
  symmetry: Record<string, number>;
  timestamp: string;
  frame_quality: number;
}

export interface StreamData {
  frame: string;
  analysis: PostureAnalysis;
  timestamp: string;
  visit_id: string;
}

// Stati delle view
export enum ViewType {
  LOGIN = 'login',
  DASHBOARD = 'dashboard',
  NEW_PATIENT = 'newPatient',
  PATIENT_DETAIL = 'patientDetail',
  EXERCISE = 'exercise',
  HISTORY = 'history',
  SETTINGS = 'settings'
}

// Form data
export interface LoginFormData {
  email: string;
  password: string;
}

export interface NewPatientFormData {
  nome: string;
  cognome: string;
  email: string;
  altezza: string;
  peso: string;
  sesso: string;
  patologia: string;
  obiettivo: string;
  privacy_accepted: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PatientsResponse {
  success: boolean;
  patients: Patient[];
}

export interface PatientResponse {
  success: boolean;
  patient: Patient;
}

export interface VisitResponse {
  success: boolean;
  visit_id: string;
}

