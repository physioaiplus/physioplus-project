import { AnalysisType, type ScanKey } from '../types';

const ALL_SCAN_KEYS: ScanKey[] = [
  'POSTURE',
  'ARM_LEFT',
  'ARM_RIGHT',
  'LEG_LEFT',
  'LEG_RIGHT',
  'SIDE_LEFT',
  'SIDE_RIGHT',
];

const PRESET_SCAN_KEYS_BY_ANALYSIS_TYPE: Record<AnalysisType, ScanKey[]> = {
  [AnalysisType.COMPLETA]: ALL_SCAN_KEYS,
  [AnalysisType.POSTURALE]: ['POSTURE'],
  [AnalysisType.MOBILITA_SUPERIORI]: ['ARM_LEFT', 'ARM_RIGHT'],
  [AnalysisType.MOBILITA_INFERIORI]: ['LEG_LEFT', 'LEG_RIGHT'],
  [AnalysisType.PERSONALIZZATA]: [],
};

const ANALYSIS_TYPE_LABELS: Record<AnalysisType, string> = {
  [AnalysisType.COMPLETA]: 'Analisi Completa',
  [AnalysisType.POSTURALE]: 'Analisi Posturale',
  [AnalysisType.MOBILITA_SUPERIORI]: 'Mobilità Arti Superiori',
  [AnalysisType.MOBILITA_INFERIORI]: 'Mobilità Arti Inferiori',
  [AnalysisType.PERSONALIZZATA]: 'Scansiona',
};

const toStableSignature = (scanKeys: ScanKey[]): string => (
  [...new Set(scanKeys)].sort().join('|')
);

export const getAnalysisTypeLabel = (analysisType?: string | null): string => {
  if (!analysisType) {
    return ANALYSIS_TYPE_LABELS[AnalysisType.PERSONALIZZATA];
  }

  return ANALYSIS_TYPE_LABELS[analysisType as AnalysisType]
    || analysisType.replace(/_/g, ' ');
};

export const getPresetScanKeysForAnalysisType = (analysisType?: string | null): ScanKey[] => {
  if (!analysisType) {
    return [];
  }

  return [...(PRESET_SCAN_KEYS_BY_ANALYSIS_TYPE[analysisType as AnalysisType] || [])];
};

export const resolveAnalysisTypeFromScanKeys = (scanKeys: ScanKey[]): AnalysisType => {
  const nextSignature = toStableSignature(scanKeys);

  for (const analysisType of [
    AnalysisType.COMPLETA,
    AnalysisType.POSTURALE,
    AnalysisType.MOBILITA_SUPERIORI,
    AnalysisType.MOBILITA_INFERIORI,
  ]) {
    if (toStableSignature(PRESET_SCAN_KEYS_BY_ANALYSIS_TYPE[analysisType]) === nextSignature) {
      return analysisType;
    }
  }

  return AnalysisType.PERSONALIZZATA;
};
