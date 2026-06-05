import type { Visit } from '../types';

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const normalizeScoreValue = (value: number): number => (
  value > 3 ? value / 100 * 3 : value
);

const getReportSummaryScore = (reportSummary?: Record<string, any>): number | null => {
  if (!reportSummary) return null;

  const candidates = [
    reportSummary.average_score,
    reportSummary.avg_score,
    reportSummary.score,
    reportSummary.global_score,
    reportSummary.score_percent,
  ];

  const score = candidates.find(isFiniteNumber);
  return isFiniteNumber(score) ? normalizeScoreValue(score) : null;
};

export const getVisitStatusLabel = (status?: string | null): string => {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'completed') return 'Completata';
  if (normalized === 'failed') return 'Fallita';
  if (normalized === 'in_progress') return 'In corso';
  if (!normalized) return '-';

  return status || '-';
};

export const getVisitStatusClassName = (status?: string | null): string => {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'completed') return 'bg-green-100 text-green-700';
  if (normalized === 'failed') return 'bg-red-100 text-red-700';

  return 'bg-yellow-100 text-yellow-700';
};

export const getVisitScoreLabel = (visit: Pick<Visit, 'exercises' | 'report_summary'>): string => {
  const percent = getVisitScorePercent(visit);
  return percent === null ? '-' : `${percent}/100`;
};

export const getVisitScoreValue = (visit: Pick<Visit, 'exercises' | 'report_summary'>): number | null => {
  const scorePercents = (visit.exercises || [])
    .map((exercise) => exercise.score_percent)
    .filter(isFiniteNumber);

  if (scorePercents.length > 0) {
    const averagePercent = scorePercents.reduce((sum, score) => sum + score, 0) / scorePercents.length;
    return normalizeScoreValue(averagePercent);
  }

  const scores = (visit.exercises || [])
    .map((exercise) => exercise.score)
    .filter(isFiniteNumber);

  if (scores.length > 0) {
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  const postureScore = visit.report_summary?.posture?.score;
  if (isFiniteNumber(postureScore)) {
    return postureScore;
  }

  const summaryScore = getReportSummaryScore(visit.report_summary);
  if (summaryScore !== null) {
    return summaryScore;
  }

  return null;
};

export const getVisitScorePercent = (visit: Pick<Visit, 'exercises' | 'report_summary'>): number | null => {
  const score = getVisitScoreValue(visit);
  return score === null ? null : Math.round((score / 3) * 100);
};

export type MeasurementImprovementRule = 'higher_better' | 'lower_better';
export type MeasurementComparisonDirection = 'improved' | 'worse' | 'stable' | 'new';

export interface VisitMeasurement {
  id: string;
  label: string;
  value: number;
  unit: string;
  scanLabel: string;
  rule: MeasurementImprovementRule;
}

export interface VisitMeasurementComparison extends VisitMeasurement {
  previousValue: number | null;
  delta: number | null;
  direction: MeasurementComparisonDirection;
}

export interface VisitMeasurementComparisonSummary {
  items: VisitMeasurementComparison[];
  total: number;
  comparable: number;
  improved: number;
  worsened: number;
  stable: number;
  newMeasurements: number;
}

const MEASUREMENT_STABLE_THRESHOLD = 0.5;

const normalizeMeasureKey = (value: unknown): string => (
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
);

const getExerciseScanKey = (exercise: any, index: number): string => (
  normalizeMeasureKey(exercise?.step || exercise?.scan_label || exercise?.scan_type || `scan_${index + 1}`)
);

const getExerciseScanLabel = (exercise: any, index: number): string => (
  String(exercise?.scan_label || exercise?.step || exercise?.scan_type || `Scansione ${index + 1}`).replace(/_/g, ' ')
);

const pushPostureMetrics = (
  measurements: VisitMeasurement[],
  sourceKey: string,
  scanLabel: string,
  posture: any,
  postureKey: string,
) => {
  if (!posture || typeof posture !== 'object') return;

  Object.entries(posture.metrics || {}).forEach(([metricKey, metric]: [string, any]) => {
    if (!isFiniteNumber(metric?.value)) return;
    measurements.push({
      id: `${sourceKey}:posture:${postureKey}:${normalizeMeasureKey(metricKey)}`,
      label: metric?.label || String(metricKey).replace(/_/g, ' '),
      value: metric.value,
      unit: metric?.unit || '',
      scanLabel,
      rule: 'lower_better',
    });
  });

  Object.entries(posture.views || {}).forEach(([viewName, viewPosture]: [string, any]) => {
    Object.entries(viewPosture?.metrics || {}).forEach(([metricKey, metric]: [string, any]) => {
      if (!isFiniteNumber(metric?.value)) return;
      measurements.push({
        id: `${sourceKey}:posture:${postureKey}:${normalizeMeasureKey(viewName)}:${normalizeMeasureKey(metricKey)}`,
        label: `${metric?.label || String(metricKey).replace(/_/g, ' ')} (${viewName})`,
        value: metric.value,
        unit: metric?.unit || '',
        scanLabel,
        rule: 'lower_better',
      });
    });
  });
};

export const getVisitMeasurements = (visit: Pick<Visit, 'exercises' | 'report_summary'>): VisitMeasurement[] => {
  const measurements: VisitMeasurement[] = [];

  (visit.exercises || []).forEach((exercise: any, index) => {
    const scanKey = getExerciseScanKey(exercise, index);
    const scanLabel = getExerciseScanLabel(exercise, index);

    Object.entries(exercise.angles || {}).forEach(([angleKey, value]) => {
      if (!isFiniteNumber(value)) return;
      measurements.push({
        id: `${scanKey}:angle:${normalizeMeasureKey(angleKey)}`,
        label: String(angleKey),
        value,
        unit: 'deg',
        scanLabel,
        rule: 'higher_better',
      });
    });

    pushPostureMetrics(measurements, scanKey, scanLabel, exercise.posture, 'complete');
    pushPostureMetrics(measurements, scanKey, scanLabel, exercise.posture_upper_body, 'upper_body');
  });

  if (measurements.length === 0 && visit.report_summary) {
    pushPostureMetrics(measurements, 'report', 'Riepilogo postura', visit.report_summary.posture, 'complete');
    pushPostureMetrics(measurements, 'report', 'Riepilogo upper body', visit.report_summary.posture_upper_body, 'upper_body');
  }

  return measurements;
};

const compareMeasurementValue = (
  current: VisitMeasurement,
  previousValue: number | null,
): MeasurementComparisonDirection => {
  if (previousValue === null) return 'new';

  const delta = current.value - previousValue;
  if (Math.abs(delta) < MEASUREMENT_STABLE_THRESHOLD) return 'stable';

  if (current.rule === 'lower_better') {
    return delta < 0 ? 'improved' : 'worse';
  }

  return delta > 0 ? 'improved' : 'worse';
};

export const getVisitMeasurementComparison = (
  currentVisit: Pick<Visit, 'exercises' | 'report_summary'>,
  previousVisit?: Pick<Visit, 'exercises' | 'report_summary'> | null,
): VisitMeasurementComparisonSummary => {
  const currentMeasurements = getVisitMeasurements(currentVisit);
  const previousMeasurements = new Map(
    getVisitMeasurements(previousVisit || { exercises: [], report_summary: {} }).map((measurement) => [measurement.id, measurement])
  );

  const items = currentMeasurements.map((measurement) => {
    const previous = previousMeasurements.get(measurement.id);
    const previousValue = previous?.value ?? null;
    const delta = previousValue === null ? null : measurement.value - previousValue;
    return {
      ...measurement,
      previousValue,
      delta,
      direction: compareMeasurementValue(measurement, previousValue),
    };
  });

  return {
    items,
    total: items.length,
    comparable: items.filter((item) => item.previousValue !== null).length,
    improved: items.filter((item) => item.direction === 'improved').length,
    worsened: items.filter((item) => item.direction === 'worse').length,
    stable: items.filter((item) => item.direction === 'stable').length,
    newMeasurements: items.filter((item) => item.direction === 'new').length,
  };
};

export const getVisitCompletedScanCount = (visit: Pick<Visit, 'exercises' | 'report_summary'>): number | null => {
  const completed = typeof visit.report_summary?.completed_scans === 'number'
    ? visit.report_summary.completed_scans
    : visit.exercises?.length;

  return typeof completed === 'number' && Number.isFinite(completed) ? completed : null;
};

export const getVisitTotalScanCount = (visit: Pick<Visit, 'report_summary' | 'scan_plan'>): number | null => {
  const total = typeof visit.report_summary?.total_scans === 'number'
    ? visit.report_summary.total_scans
    : visit.scan_plan?.length;

  return typeof total === 'number' && Number.isFinite(total) ? total : null;
};

export const getVisitScanCountLabel = (visit: Pick<Visit, 'exercises' | 'report_summary' | 'scan_plan'>): string => {
  const completed = getVisitCompletedScanCount(visit);
  const total = getVisitTotalScanCount(visit);

  if (typeof completed === 'number' && typeof total === 'number' && total > 0) {
    return `${completed}/${total}`;
  }

  if (typeof completed === 'number' && completed > 0) {
    return String(completed);
  }

  return '-';
};

const isCompletedVisitStatus = (status?: string | null): boolean => (
  (status || '').toLowerCase() === 'completed'
);

export const isVisitComparableForTrend = (visit: Visit): boolean => {
  if (!isCompletedVisitStatus(visit.status)) return false;
  if (getVisitMeasurements(visit).length === 0 && getVisitScoreValue(visit) === null) return false;

  const completedScans = getVisitCompletedScanCount(visit);
  return completedScans === null || completedScans > 0;
};

export type VisitComparisonDirection = 'up' | 'down' | 'flat' | 'new' | 'unknown';

export interface VisitComparison {
  previousVisit: Visit | null;
  currentScore: number | null;
  previousScore: number | null;
  currentPercent: number | null;
  previousPercent: number | null;
  deltaScore: number | null;
  deltaPercent: number | null;
  scanDelta: number | null;
  measurements: VisitMeasurementComparisonSummary;
  direction: VisitComparisonDirection;
  label: string;
  shortLabel: string;
  className: string;
}

export const getComparablePreviousVisit = (currentVisit: Visit, visits: Visit[]): Visit | null => {
  const currentTime = getVisitSortTime(currentVisit);
  const candidates = visits
    .filter((visit) => visit.id !== currentVisit.id)
    .filter((visit) => !currentVisit.patient_id || visit.patient_id === currentVisit.patient_id)
    .filter(isVisitComparableForTrend)
    .filter((visit) => currentTime === 0 || getVisitSortTime(visit) <= currentTime)
    .sort((a, b) => getVisitSortTime(b) - getVisitSortTime(a));

  return candidates[0] || null;
};

export const getVisitComparison = (currentVisit: Visit, previousVisit?: Visit | null): VisitComparison => {
  const currentScore = getVisitScoreValue(currentVisit);
  const previousScore = previousVisit ? getVisitScoreValue(previousVisit) : null;
  const currentPercent = getVisitScorePercent(currentVisit);
  const previousPercent = previousVisit ? getVisitScorePercent(previousVisit) : null;
  const currentScans = getVisitCompletedScanCount(currentVisit);
  const previousScans = previousVisit ? getVisitCompletedScanCount(previousVisit) : null;
  const scanDelta = currentScans !== null && previousScans !== null ? currentScans - previousScans : null;
  const measurements = getVisitMeasurementComparison(currentVisit, previousVisit);

  if (!isVisitComparableForTrend(currentVisit)) {
    return {
      previousVisit: previousVisit || null,
      currentScore,
      previousScore,
      currentPercent,
      previousPercent,
      deltaScore: null,
      deltaPercent: null,
      scanDelta,
      measurements,
      direction: 'unknown',
      label: 'Visita non salvata o incompleta',
      shortLabel: '-',
      className: 'bg-gray-100 text-gray-600',
    };
  }

  if (!previousVisit) {
    return {
      previousVisit: null,
      currentScore,
      previousScore: null,
      currentPercent,
      previousPercent: null,
      deltaScore: null,
      deltaPercent: null,
      scanDelta,
      measurements,
      direction: 'new',
      label: measurements.total > 0 ? `${measurements.total} misure registrate nella prima visita` : 'Prima visita registrata',
      shortLabel: measurements.total > 0 ? `${measurements.total} misure` : 'Prima visita',
      className: 'bg-gray-100 text-gray-700',
    };
  }

  if (measurements.comparable > 0 || measurements.total > 0) {
    const direction: VisitComparisonDirection = measurements.improved > measurements.worsened
      ? 'up'
      : measurements.worsened > measurements.improved
        ? 'down'
        : 'flat';
    const className = direction === 'up'
      ? 'bg-green-100 text-green-700'
      : direction === 'down'
        ? 'bg-red-100 text-red-700'
        : 'bg-blue-100 text-blue-700';
    const parts = [
      measurements.improved ? `${measurements.improved} migliorate` : '',
      measurements.worsened ? `${measurements.worsened} peggiorate` : '',
      measurements.stable ? `${measurements.stable} stabili` : '',
      measurements.newMeasurements ? `${measurements.newMeasurements} nuove` : '',
    ].filter(Boolean);

    return {
      previousVisit,
      currentScore,
      previousScore,
      currentPercent,
      previousPercent,
      deltaScore: currentScore !== null && previousScore !== null ? currentScore - previousScore : null,
      deltaPercent: currentPercent !== null && previousPercent !== null ? currentPercent - previousPercent : null,
      scanDelta,
      measurements,
      direction,
      label: parts.length ? `Misure: ${parts.join(', ')}` : 'Misure stabili rispetto alla visita precedente',
      shortLabel: measurements.comparable > 0
        ? `${measurements.improved}/${measurements.comparable} migliorate`
        : `${measurements.total} misure`,
      className,
    };
  }

  if (currentScore === null || previousScore === null || currentPercent === null || previousPercent === null) {
    return {
      previousVisit,
      currentScore,
      previousScore,
      currentPercent,
      previousPercent,
      deltaScore: null,
      deltaPercent: null,
      scanDelta,
      measurements,
      direction: 'unknown',
      label: 'Storico presente, misure non confrontabili',
      shortLabel: 'Storico',
      className: 'bg-blue-100 text-blue-700',
    };
  }

  const deltaScore = currentScore - previousScore;
  const deltaPercent = currentPercent - previousPercent;
  const absPercent = Math.abs(deltaPercent);

  if (absPercent < 2) {
    return {
      previousVisit,
      currentScore,
      previousScore,
      currentPercent,
      previousPercent,
      deltaScore,
      deltaPercent,
      scanDelta,
      measurements,
      direction: 'flat',
      label: 'Misure non disponibili: score stabile rispetto alla visita precedente',
      shortLabel: 'Stabile',
      className: 'bg-blue-100 text-blue-700',
    };
  }

  const improving = deltaPercent > 0;
  return {
    previousVisit,
    currentScore,
    previousScore,
    currentPercent,
    previousPercent,
    deltaScore,
    deltaPercent,
    scanDelta,
    measurements,
    direction: improving ? 'up' : 'down',
    label: `Misure non disponibili: ${improving ? 'miglioramento' : 'peggioramento'} dello score rispetto alla visita precedente`,
    shortLabel: improving ? 'Score migliore' : 'Score peggiore',
    className: improving ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
  };
};

export const getVisitSortTime = (visit: Pick<Visit, 'created_at'>): number => {
  const value = visit.created_at as unknown;

  if (typeof value === 'string') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const seconds = record.seconds ?? record._seconds;
    if (typeof seconds === 'number') {
      return seconds * 1000;
    }
  }

  return 0;
};
