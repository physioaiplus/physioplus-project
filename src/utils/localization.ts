export type SupportedLanguage = 'it' | 'en';

export const getStoredLanguage = (): SupportedLanguage => {
  if (typeof window === 'undefined') return 'it';

  try {
    const raw = window.localStorage.getItem('settings.pref');
    const language = raw ? JSON.parse(raw)?.language : null;
    return language === 'en' ? 'en' : 'it';
  } catch {
    return 'it';
  }
};

const LANDMARK_LABELS: Record<SupportedLanguage, Record<string, string>> = {
  it: {
    nose: 'naso',
    left_eye_inner: 'angolo interno occhio sinistro',
    left_eye: 'occhio sinistro',
    left_eye_outer: 'angolo esterno occhio sinistro',
    right_eye_inner: 'angolo interno occhio destro',
    right_eye: 'occhio destro',
    right_eye_outer: 'angolo esterno occhio destro',
    left_ear: 'orecchio sinistro',
    right_ear: 'orecchio destro',
    mouth_left: 'lato sinistro bocca',
    mouth_right: 'lato destro bocca',
    left_shoulder: 'spalla sinistra',
    right_shoulder: 'spalla destra',
    left_elbow: 'gomito sinistro',
    right_elbow: 'gomito destro',
    left_wrist: 'polso sinistro',
    right_wrist: 'polso destro',
    left_pinky: 'mignolo sinistro',
    right_pinky: 'mignolo destro',
    left_index: 'indice sinistro',
    right_index: 'indice destro',
    left_thumb: 'pollice sinistro',
    right_thumb: 'pollice destro',
    left_hip: 'anca sinistra',
    right_hip: 'anca destra',
    left_knee: 'ginocchio sinistro',
    right_knee: 'ginocchio destro',
    left_ankle: 'caviglia sinistra',
    right_ankle: 'caviglia destra',
    left_heel: 'tallone sinistro',
    right_heel: 'tallone destro',
    left_foot_index: 'punta piede sinistro',
    right_foot_index: 'punta piede destro',
  },
  en: {},
};

const HUMAN_PARTS_IT: Record<string, string> = {
  shoulder: 'spalla',
  elbow: 'gomito',
  wrist: 'polso',
  hip: 'anca',
  knee: 'ginocchio',
  ankle: 'caviglia',
  heel: 'tallone',
  foot: 'piede',
  foot_index: 'punta piede',
  eye: 'occhio',
  ear: 'orecchio',
  thumb: 'pollice',
  index: 'indice',
  pinky: 'mignolo',
};

const normalizeKey = (key: string): string => key.trim().toLowerCase().replace(/\s+/g, '_');

const prettifyFallback = (key: string): string => key.replace(/_/g, ' ');

export const localizeLandmarkName = (key: string, language: SupportedLanguage = getStoredLanguage()): string => {
  const normalized = normalizeKey(key);

  if (language === 'en') {
    return prettifyFallback(normalized);
  }

  return LANDMARK_LABELS.it[normalized] || prettifyFallback(normalized);
};

export const localizeMeasurementLabel = (key: string, language: SupportedLanguage = getStoredLanguage()): string => {
  const normalized = normalizeKey(key);

  if (language === 'en') {
    return prettifyFallback(normalized);
  }

  if (LANDMARK_LABELS.it[normalized]) {
    return LANDMARK_LABELS.it[normalized];
  }

  const side = normalized.startsWith('left_') ? 'sinistra' : normalized.startsWith('right_') ? 'destra' : '';
  const withoutSide = normalized.replace(/^(left|right)_/, '');
  const part = HUMAN_PARTS_IT[withoutSide] || prettifyFallback(withoutSide);

  return side ? `${part} ${side}` : part;
};

export const formatAngleValue = (value: number, language: SupportedLanguage = getStoredLanguage()): string => (
  language === 'it' ? `${value.toFixed(1)} gradi` : `${value.toFixed(1)} deg`
);
