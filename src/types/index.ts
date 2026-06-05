/**
 * Tipi e interfacce per la gestione dello stato dell'applicazione
 */

// Tipi per utente
export interface User {
  email: string;
  uid: string;
  displayName?: string | null;
  photoURL?: string | null;
  isAdmin?: boolean;
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
  MOBILITA_INFERIORI = 'mobilita_inferiori',
  PERSONALIZZATA = 'personalizzata'
}

export type ScanKey = 'POSTURE' | 'POSTURE_UPPER' | 'ARM_LEFT' | 'ARM_RIGHT' | 'LEG_LEFT' | 'LEG_RIGHT' | 'SIDE_LEFT' | 'SIDE_RIGHT';

export interface SelectedScanDefinition {
  key: ScanKey;
  label: string;
  category: 'posture' | 'posture_upper' | 'mobility_upper' | 'mobility_lower' | 'lateral_chain';
  estimated_duration_sec: number;
}

export interface Visit {
  id: string;
  patient_id: string;
  operator_id: string;
  tipo_analisi: AnalysisType;
  status: string;
  note?: string;
  created_at: string;
  exercises: LimbResult[];
  scan_plan?: SelectedScanDefinition[];
  report_summary?: Record<string, any>;
}

export type ScanStep = 'SETUP' | ScanKey | 'SUMMARY';

export interface PostureMetric {
  label: string;
  value: number;
  unit: string;
  severity: 'green' | 'yellow' | 'red';
  direction?: string;
}

export interface PostureViewResult {
  view: string;
  score: number;
  score_percent?: number;
  quality_label: 'green' | 'yellow' | 'red';
  summary: string;
  findings: string[];
  metrics: Record<string, PostureMetric>;
  assessment_type?: 'complete' | 'upper_body';
}

export interface PostureSummary {
  score: number;
  score_percent?: number;
  quality_label: 'green' | 'yellow' | 'red';
  summary: string;
  findings: string[];
  metrics?: Record<string, PostureMetric>;
  views: Partial<Record<CameraView, PostureViewResult>>;
  frame_support?: Record<string, number | string>;
  assessment_type?: 'complete' | 'upper_body';
  algorithm_version?: string;
}

export interface LimbResult {
  step?: ScanStep; // Added optional step for when it's stored in array
  score: number;
  score_percent?: number;
  quality: 'green' | 'yellow' | 'red';
  angles: Record<string, number>;
  feedback: string;
  warnings: string[];
  smpl_mesh?: string;
  smpl_params?: any;
  smpl_status?: string;
  landmarks?: any[];
  scan_id?: string;
  posture?: PostureSummary;
  posture_upper_body?: PostureSummary;
  scan_label?: string;
  scan_type?: SelectedScanDefinition['category'];
  selected_views?: CameraView[];
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

export type CameraView = 'front' | 'left' | 'right';

export interface MultiCameraManifestItem {
  view: CameraView;
  deviceId?: string;
  label?: string;
  startedAtMs?: number;
  stoppedAtMs?: number;
  rotationDeg?: number;
}

export interface CameraIntrinsicCalibration {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  widthPx?: number;
  heightPx?: number;
  distortionCoefficients?: number[];
  calibrationErrorPx?: number;
}

export interface CameraExtrinsicCalibration {
  rotationMatrix?: number[][];
  translationVector?: number[];
  rigPositionCm?: {
    x: number;
    y: number;
    z: number;
  };
  floorOffsetCm?: number;
}

export interface CameraCalibrationViewProfile {
  view: CameraView;
  deviceId?: string;
  label?: string;
  rotationDeg?: number;
  isCalibrated?: boolean;
  intrinsic?: CameraIntrinsicCalibration;
  extrinsic?: CameraExtrinsicCalibration;
  capturedAt?: string;
}

export interface CameraCalibrationProfile {
  profileId?: string;
  rigLabel?: string;
  profileStatus?: 'calibrated' | 'partial' | 'uncalibrated' | 'missing';
  notes?: string;
  views: CameraCalibrationViewProfile[];
}

export interface SubjectProfile {
  patientId?: string;
  fullName?: string;
  heightCm?: number;
  weightKg?: number;
  sex?: string;
  analysisType?: string;
  visitId?: string;
}

export interface MultiCameraRecordingPayload {
  blobs: Partial<Record<CameraView, Blob>>;
  syncGroupId?: string;
  captureStartedAtMs?: number;
  captureStoppedAtMs?: number;
  cameraManifest?: MultiCameraManifestItem[];
  cameraCalibration?: CameraCalibrationProfile;
  subjectProfile?: SubjectProfile;
  scanDefinition?: SelectedScanDefinition;
}
// Stati delle view
export enum ViewType {
  LOGIN = 'login',
  DASHBOARD = 'dashboard',
  NEW_PATIENT = 'newPatient',
  PATIENT_DETAIL = 'patientDetail',
  EXERCISE = 'exercise',
  HISTORY = 'history',
  SETTINGS = 'settings',
  CONTACT = 'contact',
  SCAN = 'scan',
  CALENDAR = 'calendar'
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
  // PNG data URL della firma digitale (opzionale in fase di salvataggio)
  signature_data?: string;
}
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



