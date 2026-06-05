import React, { useEffect, useState } from 'react';
import { X, Calendar, Activity, AlertTriangle, CheckCircle, Info, BarChart3, Layers3, Minus, Ruler, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { Visit } from '../types';
import { apiService } from '../services/api';
import { safeFormatDate } from '../utils/date';
import { getAnalysisTypeLabel } from '../utils/analysis';
import { formatAngleValue, getStoredLanguage, localizeMeasurementLabel } from '../utils/localization';
import {
    getVisitScanCountLabel,
    getComparablePreviousVisit,
    getVisitComparison,
    getVisitScoreLabel,
    getVisitStatusClassName,
    getVisitStatusLabel,
} from '../utils/visits';
import { SmplViewer } from './3d/SmplViewer';

interface VisitDetailModalProps {
    visit: Visit;
    patientName?: string;
    onClose: () => void;
}

const getSeverityClassName = (severity?: string): string => {
    if (severity === 'red') return 'bg-red-100 text-red-700';
    if (severity === 'yellow') return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
};

const formatMetricValue = (metric: any): string => {
    const value = typeof metric?.value === 'number' ? metric.value.toFixed(1) : String(metric?.value ?? '-');
    return `${value}${metric?.unit ? ` ${metric.unit}` : ''}`;
};

const formatMeasurementValue = (value: number | null, unit?: string): string => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
    const suffix = unit === 'deg' ? '°' : unit ? ` ${unit}` : '';
    return `${value.toFixed(1)}${suffix}`;
};

const getScorePercent = (score?: number, scorePercent?: number): number => {
    if (typeof scorePercent === 'number' && Number.isFinite(scorePercent)) {
        return Math.max(0, Math.min(100, Math.round(scorePercent)));
    }
    if (typeof score !== 'number' || !Number.isFinite(score)) return 0;
    return Math.max(0, Math.min(100, Math.round((score / 3) * 100)));
};

const getQualityText = (score?: number): string => {
    if ((score ?? 0) >= 3) return 'Buono';
    if (score === 2) return 'Da monitorare';
    return 'Critico';
};

const getQualityBarClassName = (score?: number): string => {
    if ((score ?? 0) >= 3) return 'bg-green-500';
    if (score === 2) return 'bg-yellow-500';
    return 'bg-red-500';
};

const renderComparisonIcon = (direction?: string) => {
    if (direction === 'up' || direction === 'improved') return <TrendingUp className="w-4 h-4" />;
    if (direction === 'down' || direction === 'worse') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
};

const getMeasurementComparisonClassName = (direction: string): string => {
    if (direction === 'improved') return 'bg-green-100 text-green-700';
    if (direction === 'worse') return 'bg-red-100 text-red-700';
    if (direction === 'new') return 'bg-gray-100 text-gray-700';
    return 'bg-blue-100 text-blue-700';
};

const getMeasurementComparisonLabel = (direction: string): string => {
    if (direction === 'improved') return 'Migliorata';
    if (direction === 'worse') return 'Peggiorata';
    if (direction === 'new') return 'Nuova';
    return 'Stabile';
};

const PostureMetricGrid: React.FC<{ metrics?: Record<string, any> }> = ({ metrics }) => {
    const entries = Object.entries(metrics || {});
    if (entries.length === 0) return null;
    const currentLanguage = getStoredLanguage();

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {entries.map(([key, metric]) => (
                <div key={key} className="bg-gray-50 border rounded p-3 text-xs">
                    <div className="flex items-start justify-between gap-3">
                        <span className="font-medium text-gray-700">{metric?.label || localizeMeasurementLabel(key, currentLanguage)}</span>
                        <span className={`px-2 py-0.5 rounded font-semibold ${getSeverityClassName(metric?.severity)}`}>
                            {formatMetricValue(metric)}
                        </span>
                    </div>
                    {metric?.direction && <div className="text-gray-500 mt-1">Direzione: {metric.direction}</div>}
                </div>
            ))}
        </div>
    );
};

export const VisitDetailModal: React.FC<VisitDetailModalProps> = ({ visit, patientName, onClose }) => {
    const [activeTab, setActiveTab] = useState<'report' | '3d'>('report');
    const [loadedVisit, setLoadedVisit] = useState<Visit>(visit);
    const [patientVisits, setPatientVisits] = useState<Visit[]>([]);
    const currentLanguage = getStoredLanguage();

    useEffect(() => {
        let mounted = true;
        setLoadedVisit(visit);
        setPatientVisits([]);

        Promise.all([
            apiService.getVisit(visit.id),
            apiService.getPatientVisits(visit.patient_id),
        ])
            .then(([visitResponse, visitsResponse]) => {
                if (!mounted) return;

                if (visitResponse.success && visitResponse.data) {
                    setLoadedVisit(visitResponse.data as Visit);
                }

                if (visitsResponse.success && Array.isArray(visitsResponse.data)) {
                    setPatientVisits(visitsResponse.data as Visit[]);
                }
            })
            .catch((error) => {
                console.warn('Failed to refresh visit detail', error);
            });

        return () => {
            mounted = false;
        };
    }, [visit]);

    const exercises = loadedVisit.exercises || [];
    const scanPlan = loadedVisit.scan_plan || [];
    const reportSummary = loadedVisit.report_summary || {};
    const posture = reportSummary.posture;
    const upperBodyPosture = reportSummary.posture_upper_body;
    const has3D = exercises.some(e => e.smpl_mesh || (Array.isArray(e.landmarks) && e.landmarks.length > 0));
    const hasSavedMetadata = scanPlan.length > 0 || Boolean(reportSummary.total_scans) || Boolean(reportSummary.posture) || Boolean(reportSummary.posture_upper_body);
    const showEmptyState = exercises.length === 0 && !hasSavedMetadata;
    const previousVisit = getComparablePreviousVisit(loadedVisit, patientVisits);
    const comparison = getVisitComparison(loadedVisit, previousVisit);
    const measurementComparisons = comparison.measurements.items;
    const measurementCount = exercises.reduce((count, exercise) => count + Object.keys(exercise.angles || {}).length, 0);
    const keypointCount = exercises.reduce((count, exercise) => count + (exercise.landmarks?.length || 0), 0);
    const warningCount = exercises.reduce((count, exercise) => count + (exercise.warnings?.length || 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

                <div className="p-6 border-b flex justify-between items-start bg-gray-50">
                    <div>
                        <div className="flex items-center space-x-3 mb-1">
                            <h2 className="text-2xl font-semibold text-gray-800">Dettaglio Visita</h2>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getVisitStatusClassName(loadedVisit.status)}`}>
                                {getVisitStatusLabel(loadedVisit.status)}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center text-sm text-gray-500 gap-x-4 gap-y-2">
                            <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> {safeFormatDate(loadedVisit.created_at)}</span>
                            {patientName && <span className="flex items-center"><Activity className="w-4 h-4 mr-1" /> {patientName}</span>}
                            <span className="px-2 py-0.5 bg-gray-200 rounded text-gray-700 text-xs text-brand-blue-dark">{getAnalysisTypeLabel(loadedVisit.tipo_analisi)}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'report' ? 'border-b-2 border-brand-blue text-brand-blue' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Report & Valutazioni
                    </button>
                    <button
                        onClick={() => setActiveTab('3d')}
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === '3d' ? 'border-b-2 border-brand-blue text-brand-blue' : 'text-gray-500 hover:bg-gray-50'} ${!has3D ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!has3D}
                    >
                        Modello 3D {has3D ? '' : '(Non disponibile)'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                    {activeTab === 'report' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="bg-white border rounded-lg p-4">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Scansioni</p>
                                    <p className="text-xl font-semibold text-gray-900">{getVisitScanCountLabel(loadedVisit)}</p>
                                </div>
                                <div className="bg-white border rounded-lg p-4">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Score medio</p>
                                    <p className="text-xl font-semibold text-gray-900">{getVisitScoreLabel(loadedVisit)}</p>
                                </div>
                                <div className="bg-white border rounded-lg p-4">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Stato</p>
                                    <p className="text-xl font-semibold text-gray-900">{getVisitStatusLabel(loadedVisit.status)}</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg border p-5 shadow-sm">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Lettura dati</h3>
                                        <p className="text-sm text-gray-500">Sintesi dei dati salvati per questa visita.</p>
                                    </div>
                                    <span className={`inline-flex w-fit items-center gap-2 rounded px-3 py-1 text-sm font-semibold ${comparison.className}`}>
                                        {renderComparisonIcon(comparison.direction)}
                                        {comparison.label}
                                    </span>
                                </div>
                                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="rounded border border-gray-100 bg-gray-50 p-3">
                                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                                            <BarChart3 className="w-4 h-4" /> Misure confrontabili
                                        </div>
                                        <p className="mt-2 text-lg font-semibold text-gray-900">
                                            {comparison.measurements.comparable || '-'}
                                        </p>
                                    </div>
                                    <div className="rounded border border-gray-100 bg-gray-50 p-3">
                                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                                            <Ruler className="w-4 h-4" /> Misure
                                        </div>
                                        <p className="mt-2 text-lg font-semibold text-gray-900">{measurementCount}</p>
                                    </div>
                                    <div className="rounded border border-gray-100 bg-gray-50 p-3">
                                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                                            <Target className="w-4 h-4" /> Punti
                                        </div>
                                        <p className="mt-2 text-lg font-semibold text-gray-900">{keypointCount || '-'}</p>
                                    </div>
                                    <div className="rounded border border-gray-100 bg-gray-50 p-3">
                                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                                            <Layers3 className="w-4 h-4" /> Avvisi
                                        </div>
                                        <p className="mt-2 text-lg font-semibold text-gray-900">{warningCount}</p>
                                    </div>
                                </div>
                            </div>

                            {measurementComparisons.length > 0 && (
                                <div className="bg-white rounded-lg border p-5 shadow-sm">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Confronto misure</h3>
                                            <p className="text-sm text-gray-500">
                                                Ogni misura viene confrontata con la stessa misura della visita precedente.
                                            </p>
                                        </div>
                                        <span className={`inline-flex w-fit items-center gap-2 rounded px-3 py-1 text-sm font-semibold ${comparison.className}`}>
                                            {renderComparisonIcon(comparison.direction)}
                                            {comparison.shortLabel}
                                        </span>
                                    </div>
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b text-left text-gray-500">
                                                    <th className="py-2 pr-3">Scansione</th>
                                                    <th className="py-2 pr-3">Misura</th>
                                                    <th className="py-2 pr-3">Attuale</th>
                                                    <th className="py-2 pr-3">Precedente</th>
                                                    <th className="py-2 pr-3">Delta</th>
                                                    <th className="py-2">Esito</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {measurementComparisons.map((item) => (
                                                    <tr key={item.id} className="border-b last:border-0">
                                                        <td className="py-2 pr-3 capitalize text-gray-600">{item.scanLabel}</td>
                                                        <td className="py-2 pr-3 text-gray-900">
                                                            {item.id.includes(':angle:')
                                                                ? localizeMeasurementLabel(item.label, currentLanguage)
                                                                : item.label}
                                                        </td>
                                                        <td className="py-2 pr-3 font-mono">{formatMeasurementValue(item.value, item.unit)}</td>
                                                        <td className="py-2 pr-3 font-mono">{formatMeasurementValue(item.previousValue, item.unit)}</td>
                                                        <td className="py-2 pr-3 font-mono">
                                                            {item.delta === null ? '-' : `${item.delta > 0 ? '+' : ''}${formatMeasurementValue(item.delta, item.unit)}`}
                                                        </td>
                                                        <td className="py-2">
                                                            <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${getMeasurementComparisonClassName(item.direction)}`}>
                                                                {renderComparisonIcon(item.direction)}
                                                                {getMeasurementComparisonLabel(item.direction)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {loadedVisit.note && (
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start space-x-3">
                                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-blue-800 text-sm">Note Operatore</h4>
                                        <p className="text-blue-900 text-sm">{loadedVisit.note}</p>
                                    </div>
                                </div>
                            )}

                            {scanPlan.length > 0 && (
                                <div className="bg-white rounded-lg border p-5 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-3">Piano scansione</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {scanPlan.map((scan) => (
                                            <span key={scan.key} className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                                {scan.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {posture && (
                                <div className="bg-white rounded-lg border p-5 shadow-sm">
                                    <div className="flex items-center justify-between gap-4 mb-3">
                                        <h3 className="font-semibold text-gray-900">Riepilogo postura</h3>
                                        {typeof posture.score === 'number' && (
                                            <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                                                {posture.score}/3
                                            </span>
                                        )}
                                    </div>
                                    {posture.summary && <p className="text-sm text-gray-700 mb-3">{posture.summary}</p>}
                                    {Array.isArray(posture.findings) && posture.findings.length > 0 && (
                                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                            {posture.findings.map((finding: string, index: number) => (
                                                <li key={`${finding}-${index}`}>{finding}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {posture.metrics && (
                                        <div className="mt-4">
                                            <h4 className="font-semibold text-gray-700 text-sm mb-2">Metriche aggregate</h4>
                                            <PostureMetricGrid metrics={posture.metrics} />
                                        </div>
                                    )}
                                    {posture.views && (
                                        <div className="mt-4 space-y-3">
                                            {Object.entries(posture.views).map(([viewName, viewPosture]: [string, any]) => (
                                                <div key={viewName}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-semibold text-gray-700 text-sm capitalize">Vista {viewName}</h4>
                                                        {typeof viewPosture?.score === 'number' && (
                                                            <span className="text-xs text-gray-500">{viewPosture.score}/3</span>
                                                        )}
                                                    </div>
                                                    <PostureMetricGrid metrics={viewPosture?.metrics} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {upperBodyPosture && (
                                <div className="bg-white rounded-lg border p-5 shadow-sm">
                                    <div className="flex items-center justify-between gap-4 mb-3">
                                        <h3 className="font-semibold text-gray-900">Riepilogo postura upper body</h3>
                                        {typeof upperBodyPosture.score === 'number' && (
                                            <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                                                {upperBodyPosture.score}/3
                                            </span>
                                        )}
                                    </div>
                                    {upperBodyPosture.summary && <p className="text-sm text-gray-700 mb-3">{upperBodyPosture.summary}</p>}
                                    {Array.isArray(upperBodyPosture.findings) && upperBodyPosture.findings.length > 0 && (
                                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                            {upperBodyPosture.findings.map((finding: string, index: number) => (
                                                <li key={`${finding}-${index}`}>{finding}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {upperBodyPosture.metrics && (
                                        <div className="mt-4">
                                            <h4 className="font-semibold text-gray-700 text-sm mb-2">Metriche aggregate</h4>
                                            <PostureMetricGrid metrics={upperBodyPosture.metrics} />
                                        </div>
                                    )}
                                    {upperBodyPosture.views && (
                                        <div className="mt-4 space-y-3">
                                            {Object.entries(upperBodyPosture.views).map(([viewName, viewPosture]: [string, any]) => (
                                                <div key={viewName}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-semibold text-gray-700 text-sm capitalize">Vista {viewName}</h4>
                                                        {typeof viewPosture?.score === 'number' && (
                                                            <span className="text-xs text-gray-500">{viewPosture.score}/3</span>
                                                        )}
                                                    </div>
                                                    <PostureMetricGrid metrics={viewPosture?.metrics} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {showEmptyState ? (
                                    <div className="col-span-2 text-center py-12 text-gray-500">
                                        Nessun risultato disponibile per questa visita.
                                    </div>
                                ) : exercises.length === 0 ? (
                                    <div className="col-span-2 bg-white rounded-lg border p-5 text-gray-600">
                                        La visita e stata salvata, ma non contiene ancora risultati di scansione dettagliati.
                                    </div>
                                ) : (
                                    exercises.map((ex, idx) => (
                                        <div key={idx} className="bg-white rounded-lg border p-5 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-4 gap-3">
                                                <h3 className="font-semibold text-lg capitalize">{ex.scan_label || ex.step?.replace('_', ' ').toLowerCase() || `Step ${idx + 1}`}</h3>
                                                <div className={`flex items-center px-2 py-1 rounded text-sm font-medium ${ex.score >= 3 ? 'bg-green-100 text-green-700' :
                                                    ex.score === 2 ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {ex.score >= 3 ? <CheckCircle className="w-4 h-4 mr-1" /> : <AlertTriangle className="w-4 h-4 mr-1" />}
                                                    Score: {getScorePercent(ex.score, ex.score_percent)}/100
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <p className="text-sm text-gray-700 italic">"{ex.feedback || 'Nessun feedback disponibile.'}"</p>
                                            </div>

                                            <div className="mb-4 rounded bg-gray-50 p-3">
                                                <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                                                    <span>{getQualityText(ex.score)}</span>
                                                    <span>{getScorePercent(ex.score, ex.score_percent)}/100</span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                                                    <div
                                                        className={`h-full rounded-full ${getQualityBarClassName(ex.score)}`}
                                                        style={{ width: `${getScorePercent(ex.score, ex.score_percent)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {ex.angles && Object.keys(ex.angles).length > 0 && (
                                                <div className="bg-gray-50 rounded p-3 text-xs">
                                                    <h4 className="font-semibold text-gray-500 mb-2 uppercase tracking-wide">Misure rilevate</h4>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {Object.entries(ex.angles).map(([key, val]) => (
                                                            <div key={key} className="flex justify-between border-b border-gray-100 last:border-0 pb-1 gap-3">
                                                                <span className="text-gray-600">{localizeMeasurementLabel(key, currentLanguage)}:</span>
                                                                <span className="font-mono font-medium">{typeof val === 'number' ? formatAngleValue(val, currentLanguage) : String(val)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {ex.posture?.metrics && (
                                                <div className="mt-3">
                                                    <h4 className="font-semibold text-gray-500 mb-2 uppercase tracking-wide text-xs">Metriche postura</h4>
                                                    <PostureMetricGrid metrics={ex.posture.metrics} />
                                                </div>
                                            )}

                                            {ex.warnings && ex.warnings.length > 0 && (
                                                <div className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                                                    <strong>Attenzione:</strong>
                                                    <ul className="list-disc list-inside mt-1">
                                                        {ex.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === '3d' && (
                        <div className="h-full min-h-[500px] flex flex-col">
                            <div className="flex-1 bg-white rounded-lg border shadow-inner relative overflow-hidden">
                                <SmplViewer exercises={exercises} />
                            </div>
                            <p className="text-center text-xs text-gray-400 mt-2">
                                Modello generato automaticamente dai dati di scansione.
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 rounded shadow-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};
