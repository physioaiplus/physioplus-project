/**
 * Costanti dell'applicazione
 */
export const API_URL = 'http://localhost:8000';
export const WS_URL = 'ws://localhost:8000';

export const APP_NAME = 'Human+™';
export const APP_DESCRIPTION = 'Sistema Rilevamento Posturale';

// Routes
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PATIENTS: '/patients',
  NEW_PATIENT: '/new-patient',
  PATIENT_DETAIL: '/patient/:id',
  EXERCISE: '/exercise/:visitId',
  HISTORY: '/history',
  SETTINGS: '/settings'
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    VERIFY: '/api/auth/verify',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout'
  },
  PATIENTS: {
    LIST: '/api/patients',
    CREATE: '/api/patients',
    GET: '/api/patients/:id'
  },
  VISITS: {
    CREATE: '/api/visits',
    GET: '/api/visits/:id',
    UPDATE_EXERCISES: '/api/visits/:id/exercises'
  },
  CAMERA: {
    START: '/api/camera/start',
    STOP: '/api/camera/stop',
    STATUS: '/api/camera/status'
  }
} as const;

// WebSocket endpoints
export const WS_ENDPOINTS = {
  POSE_STREAM: '/ws/pose-stream'
} as const;

// Configuration
export const CAMERA_CONFIG = {
  FRAME_RATE: 30,
  WIDTH: 1280,
  HEIGHT: 720
} as const;

// UI Configuration
export const UI_CONFIG = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 3000
} as const;





