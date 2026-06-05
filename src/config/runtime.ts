export type RuntimeFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export type RuntimeAppConfig = {
  apiBaseUrl: string;
  functionsBaseUrl: string;
  wsBaseUrl: string;
  firebase: RuntimeFirebaseConfig;
};

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<RuntimeAppConfig> & {
      firebase?: Partial<RuntimeFirebaseConfig>;
    };
  }
}

const DEV_API_BASE = 'http://localhost:8000';
const DEV_WS_BASE = 'ws://localhost:8000';

const normalizeBase = (value: string) => value.replace(/\/+$/, '');

const resolveString = (runtimeValue: string | undefined, fallback = '', normalize = false): string => {
  const trimmed = runtimeValue?.trim();
  if (trimmed && trimmed.length > 0) {
    return normalize ? normalizeBase(trimmed) : trimmed;
  }
  return normalize ? normalizeBase(fallback) : fallback;
};

const deriveWsBase = (base: string): string => {
  if (!base) return '';
  if (base.startsWith('https://')) {
    return `wss://${base.slice('https://'.length)}`;
  }
  if (base.startsWith('http://')) {
    return `ws://${base.slice('http://'.length)}`;
  }
  return base;
};

const runtimeConfig: Partial<RuntimeAppConfig> & { firebase?: Partial<RuntimeFirebaseConfig> } = typeof window !== 'undefined' ? window.__APP_CONFIG__ ?? {} : {};
const runtimeFirebaseConfig: Partial<RuntimeFirebaseConfig> = runtimeConfig.firebase ?? {};
const isDev = import.meta.env.DEV;

const apiBaseUrl = resolveString(
  runtimeConfig.apiBaseUrl,
  isDev ? import.meta.env.VITE_API_BASE_URL || DEV_API_BASE : '',
  true,
);

const functionsBaseUrl = resolveString(
  runtimeConfig.functionsBaseUrl,
  isDev ? import.meta.env.VITE_FUNCTIONS_BASE_URL || apiBaseUrl || DEV_API_BASE : apiBaseUrl,
  true,
);

const wsBaseUrl = resolveString(
  runtimeConfig.wsBaseUrl,
  isDev ? import.meta.env.VITE_WS_BASE_URL || deriveWsBase(apiBaseUrl || DEV_API_BASE) || DEV_WS_BASE : deriveWsBase(apiBaseUrl),
  true,
);

const firebaseConfig: RuntimeFirebaseConfig = {
  apiKey: resolveString(runtimeFirebaseConfig.apiKey, isDev ? import.meta.env.VITE_FIREBASE_API_KEY || '' : ''),
  authDomain: resolveString(runtimeFirebaseConfig.authDomain, isDev ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '' : ''),
  projectId: resolveString(runtimeFirebaseConfig.projectId, isDev ? import.meta.env.VITE_FIREBASE_PROJECT_ID || '' : ''),
  storageBucket: resolveString(runtimeFirebaseConfig.storageBucket, isDev ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '' : ''),
  messagingSenderId: resolveString(runtimeFirebaseConfig.messagingSenderId, isDev ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '' : ''),
  appId: resolveString(runtimeFirebaseConfig.appId, isDev ? import.meta.env.VITE_FIREBASE_APP_ID || '' : ''),
};

const missingConfig = [
  ['apiBaseUrl', apiBaseUrl],
  ['functionsBaseUrl', functionsBaseUrl],
  ['wsBaseUrl', wsBaseUrl],
  ['firebase.apiKey', firebaseConfig.apiKey],
  ['firebase.authDomain', firebaseConfig.authDomain],
  ['firebase.projectId', firebaseConfig.projectId],
  ['firebase.storageBucket', firebaseConfig.storageBucket],
  ['firebase.messagingSenderId', firebaseConfig.messagingSenderId],
  ['firebase.appId', firebaseConfig.appId],
].filter(([, value]) => !value);

if (missingConfig.length > 0 && !isDev) {
  throw new Error(
    `Missing runtime app config: ${missingConfig.map(([key]) => key).join(', ')}. Check /runtime-config.js before deploy.`,
  );
}

export const APP_RUNTIME_CONFIG: RuntimeAppConfig = {
  apiBaseUrl,
  functionsBaseUrl,
  wsBaseUrl,
  firebase: firebaseConfig,
};

export const buildApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${APP_RUNTIME_CONFIG.apiBaseUrl}${normalizedPath}`;
};

