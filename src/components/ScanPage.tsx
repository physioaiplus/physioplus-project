import React, { useState, useRef, useEffect, useMemo } from 'react';
import { XCircle, ArrowLeft, Camera, ChevronRight, User, CheckCircle, Loader2, Box, Activity, Target, FileDown, RotateCw } from 'lucide-react';
import { apiService } from '../services/api';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { AdminStatusPanel } from './AdminStatusPanel';
import { AnalysisType } from '../types';
import type {
    CameraCalibrationProfile,
    CameraCalibrationViewProfile,
    CameraView,
    MultiCameraManifestItem,
    MultiCameraRecordingPayload,
    Patient,
    ScanKey,
    SelectedScanDefinition,
    SubjectProfile,
    Visit,
} from '../types';
import { getAnalysisTypeLabel, getPresetScanKeysForAnalysisType, resolveAnalysisTypeFromScanKeys } from '../utils/analysis';
import { readCameraCalibrationProfile } from '../utils/cameraCalibration';
import { safeFormatDate } from '../utils/date';
import { formatAngleValue, getStoredLanguage, localizeLandmarkName, localizeMeasurementLabel } from '../utils/localization';
import { getComparablePreviousVisit, getVisitComparison } from '../utils/visits';

type ScanStep = 'SETUP' | ScanKey | 'SUMMARY';
type ScanPhase = 'PREPARE' | 'COUNTDOWN' | 'RECORDING' | 'ANALYZING' | 'RESULT';

interface ScanDefinition extends SelectedScanDefinition {
    short_label: string;
    description: string;
    instructions: string;
    setup_hint: string;
    recommended_views: CameraView[];
}

const CAMERA_VIEWS: CameraView[] = ['front', 'left', 'right'];
const CAMERA_VIEW_LABELS: Record<CameraView, string> = {
    front: 'Frontale',
    left: 'Sinistra',
    right: 'Destra',
};
const CAMERA_VIEW_SHORT_LABELS: Record<CameraView, string> = {
    front: 'F',
    left: 'L',
    right: 'R',
};
const CAMERA_ROTATIONS = [0, 90, 180, 270] as const;
type CameraRotation = typeof CAMERA_ROTATIONS[number];
const DEFAULT_CAMERA_ROTATIONS: Record<CameraView, CameraRotation> = {
    front: 0,
    left: 0,
    right: 0,
};
const SCAN_DEFINITIONS: ScanDefinition[] = [
    {
        key: 'POSTURE',
        label: 'Postura statica',
        short_label: 'P',
        category: 'posture',
        estimated_duration_sec: 10,
        description: 'Valutazione dell\'allineamento di capo, spalle, tronco e bacino sulle viste disponibili.',
        instructions: 'Mantieni una stazione eretta naturale, sguardo avanti e braccia rilassate lungo i fianchi.',
        setup_hint: 'Per la postura sono raccomandate una vista frontale e almeno una laterale. Il calcolo verifica simmetria di spalle e bacino, centratura del capo e allineamento laterale vicino alla linea orecchio-spalla-anca-caviglia.',
        recommended_views: ['front', 'left', 'right'],
    },
    {
        key: 'POSTURE_UPPER',
        label: 'Postura upper body',
        short_label: 'PU',
        category: 'posture_upper',
        estimated_duration_sec: 10,
        description: 'Valutazione preliminare di capo, spalle, tronco e bacino senza richiedere ginocchia, caviglie e piedi.',
        instructions: 'Mantieni una stazione eretta naturale, sguardo avanti e braccia rilassate lungo i fianchi.',
        setup_hint: 'Richiede soprattutto la vista frontale del tronco superiore, ma acquisisce anche le viste laterali disponibili per controllare capo, tronco e bacino. I punti sotto il bacino non entrano nel punteggio.',
        recommended_views: ['front', 'left', 'right'],
    },
    {
        key: 'ARM_LEFT',
        label: 'Arto superiore sinistro',
        short_label: 'AS',
        category: 'mobility_upper',
        estimated_duration_sec: 10,
        description: 'Analisi della mobilita del braccio sinistro.',
        instructions: 'Esegui il movimento richiesto mantenendo il lato sinistro ben visibile.',
        setup_hint: 'Consigliata almeno una vista frontale o obliqua che mostri spalla, gomito e polso.',
        recommended_views: ['front', 'left'],
    },
    {
        key: 'ARM_RIGHT',
        label: 'Arto superiore destro',
        short_label: 'AD',
        category: 'mobility_upper',
        estimated_duration_sec: 10,
        description: 'Analisi della mobilita del braccio destro.',
        instructions: 'Esegui il movimento richiesto mantenendo il lato destro ben visibile.',
        setup_hint: 'Consigliata almeno una vista frontale o obliqua che mostri spalla, gomito e polso.',
        recommended_views: ['front', 'right'],
    },
    {
        key: 'LEG_LEFT',
        label: 'Arto inferiore sinistro',
        short_label: 'GS',
        category: 'mobility_lower',
        estimated_duration_sec: 10,
        description: 'Analisi della mobilita dell\'arto inferiore sinistro.',
        instructions: 'Esegui il movimento richiesto mantenendo anca, ginocchio e caviglia sinistri in vista.',
        setup_hint: 'Consigliata almeno una vista frontale o laterale libera da ostacoli.',
        recommended_views: ['front', 'left'],
    },
    {
        key: 'LEG_RIGHT',
        label: 'Arto inferiore destro',
        short_label: 'GD',
        category: 'mobility_lower',
        estimated_duration_sec: 10,
        description: 'Analisi della mobilita dell\'arto inferiore destro.',
        instructions: 'Esegui il movimento richiesto mantenendo anca, ginocchio e caviglia destri in vista.',
        setup_hint: 'Consigliata almeno una vista frontale o laterale libera da ostacoli.',
        recommended_views: ['front', 'right'],
    },
    {
        key: 'SIDE_LEFT',
        label: 'Catena laterale sinistra',
        short_label: 'LS',
        category: 'lateral_chain',
        estimated_duration_sec: 10,
        description: 'Analisi laterale della catena corporea sinistra.',
        instructions: 'Posizionati di profilo sinistro e resta stabile durante l\'acquisizione.',
        setup_hint: 'Utile per valutare compensi del profilo sinistro.',
        recommended_views: ['left', 'front'],
    },
    {
        key: 'SIDE_RIGHT',
        label: 'Catena laterale destra',
        short_label: 'LD',
        category: 'lateral_chain',
        estimated_duration_sec: 10,
        description: 'Analisi laterale della catena corporea destra.',
        instructions: 'Posizionati di profilo destro e resta stabile durante l\'acquisizione.',
        setup_hint: 'Utile per valutare compensi del profilo destro.',
        recommended_views: ['right', 'front'],
    },
];

const SCAN_DEFINITION_BY_KEY = SCAN_DEFINITIONS.reduce<Record<ScanKey, ScanDefinition>>((acc, definition) => {
    acc[definition.key] = definition;
    return acc;
}, {} as Record<ScanKey, ScanDefinition>);

const LANDMARK_NAMES = [
    'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer', 'right_eye_inner', 'right_eye', 'right_eye_outer',
    'left_ear', 'right_ear', 'mouth_left', 'mouth_right', 'left_shoulder', 'right_shoulder', 'left_elbow',
    'right_elbow', 'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky', 'left_index', 'right_index',
    'left_thumb', 'right_thumb', 'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle',
    'left_heel', 'right_heel', 'left_foot_index', 'right_foot_index'
] as const;

const LANDMARK_TO_STEP: Record<string, ScanKey> = {
    nose: 'POSTURE',
    left_ear: 'POSTURE',
    right_ear: 'POSTURE',
    left_eye: 'POSTURE',
    right_eye: 'POSTURE',
    left_shoulder: 'ARM_LEFT',
    left_elbow: 'ARM_LEFT',
    left_wrist: 'ARM_LEFT',
    left_pinky: 'ARM_LEFT',
    left_index: 'ARM_LEFT',
    left_thumb: 'ARM_LEFT',
    right_shoulder: 'ARM_RIGHT',
    right_elbow: 'ARM_RIGHT',
    right_wrist: 'ARM_RIGHT',
    right_pinky: 'ARM_RIGHT',
    right_index: 'ARM_RIGHT',
    right_thumb: 'ARM_RIGHT',
    left_hip: 'LEG_LEFT',
    left_knee: 'LEG_LEFT',
    left_ankle: 'LEG_LEFT',
    left_heel: 'LEG_LEFT',
    left_foot_index: 'LEG_LEFT',
    right_hip: 'LEG_RIGHT',
    right_knee: 'LEG_RIGHT',
    right_ankle: 'LEG_RIGHT',
    right_heel: 'LEG_RIGHT',
    right_foot_index: 'LEG_RIGHT',
};

const POSTURE_UPPER_LANDMARKS = new Set([
    'nose',
    'left_ear',
    'right_ear',
    'left_shoulder',
    'right_shoulder',
    'left_hip',
    'right_hip',
]);

const getLandmarkNameByIndex = (index: number): string => LANDMARK_NAMES[index] || '';

const mapLandmarkToVector = (landmark: any): THREE.Vector3 => new THREE.Vector3(
    ((Number(landmark?.x) || 0.5) - 0.5) * 2.25,
    (0.55 - (Number(landmark?.y) || 0.5)) * 3.2 + 1.25,
    -(Number(landmark?.z) || 0) * 1.5,
);

const normalizeQuality = (qualityLabel: unknown, score: number): 'green' | 'yellow' | 'red' => {
    const normalized = typeof qualityLabel === 'string' ? qualityLabel.toLowerCase() : '';
    if (normalized.includes('red') || normalized.includes('scar') || score <= 1) return 'red';
    if (normalized.includes('yellow') || normalized.includes('med') || score === 2) return 'yellow';
    return 'green';
};

type QualityFlag = 'green' | 'yellow' | 'red';

interface PostureMetric {
    label: string;
    value: number;
    unit: string;
    severity: QualityFlag;
    direction?: string;
}

interface PostureViewResult {
    view: string;
    score: number;
    quality_label: QualityFlag;
    summary: string;
    findings: string[];
    metrics: Record<string, PostureMetric>;
}

interface PostureSummary {
    score: number;
    score_percent?: number;
    quality_label: QualityFlag;
    summary: string;
    findings: string[];
    views: Partial<Record<CameraView, PostureViewResult>>;
    assessment_type?: 'complete' | 'upper_body';
}

interface LimbResult {
    score: number;
    score_percent?: number;
    quality: QualityFlag;
    angles: Record<string, number>;
    feedback: string;
    warnings: string[];
    smpl_mesh?: string;
    smpl_params?: unknown;
    smpl_status?: string;
    landmarks?: Array<Record<string, any>>;
    scan_id?: string;
    posture?: PostureSummary;
    posture_upper_body?: PostureSummary;
    scan_label?: string;
    scan_type?: SelectedScanDefinition['category'];
    selected_views?: CameraView[];
}

interface AsyncResult {
    status: 'pending' | 'success' | 'error';
    data?: LimbResult;
    error?: string;
}

interface ScanPageProps {
    onBack?: () => void;
    patient?: Patient;
    visit?: Visit;
}

const scoreToColor = (score?: number) => {
    if (score === 1) return '#ef4444';
    if (score === 2) return '#eab308';
    if ((score ?? 0) >= 3) return '#22c55e';
    return '#e5e7eb';
};

const qualityFlagFromScore = (score?: number): QualityFlag => {
    if ((score ?? 0) <= 1) return 'red';
    if (score === 2) return 'yellow';
    return 'green';
};

const qualityClasses: Record<QualityFlag, string> = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
};

const getPostureScore = (stepResults?: Record<string, LimbResult>): number | undefined => (
    stepResults?.POSTURE?.score ?? stepResults?.POSTURE_UPPER?.score
);

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const getResultScorePercent = (result?: Pick<LimbResult, 'score' | 'score_percent'> | null): number => {
    if (typeof result?.score_percent === 'number' && Number.isFinite(result.score_percent)) {
        return clampPercent(result.score_percent);
    }

    if (typeof result?.score === 'number' && Number.isFinite(result.score)) {
        return clampPercent((result.score / 3) * 100);
    }

    return 0;
};

const toPositiveNumber = (value: unknown): number | undefined => {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : undefined;
};

const buildSubjectProfile = (
    patient?: Patient,
    visit?: Visit,
    analysisType?: AnalysisType,
): SubjectProfile | undefined => {
    if (!patient) {
        return undefined;
    }

    return {
        patientId: patient.id,
        fullName: `${patient.nome} ${patient.cognome}`.trim(),
        heightCm: toPositiveNumber(patient.altezza),
        weightKg: toPositiveNumber(patient.peso),
        sex: typeof patient.sesso === 'string' && patient.sesso.trim().length > 0 ? patient.sesso.trim() : undefined,
        analysisType,
        visitId: visit?.id,
    };
};

const buildCameraCalibrationProfile = (
    cameraManifest: MultiCameraManifestItem[],
    storedProfile: CameraCalibrationProfile | null,
): CameraCalibrationProfile | undefined => {
    if (!cameraManifest.length) {
        return undefined;
    }

    const storedViewsByView = new Map<CameraView, CameraCalibrationViewProfile>();
    (storedProfile?.views || []).forEach((viewProfile) => {
        storedViewsByView.set(viewProfile.view, viewProfile);
    });

    const views = cameraManifest.map<CameraCalibrationViewProfile>((manifestItem) => {
        const storedView = storedViewsByView.get(manifestItem.view);
        const matchesDevice = !storedView?.deviceId || !manifestItem.deviceId || storedView.deviceId === manifestItem.deviceId;
        const canReuseStoredCalibration = Boolean(storedView && matchesDevice);

        return {
            view: manifestItem.view,
            deviceId: manifestItem.deviceId,
            label: manifestItem.label,
            rotationDeg: manifestItem.rotationDeg,
            isCalibrated: canReuseStoredCalibration ? Boolean(storedView?.isCalibrated) : false,
            intrinsic: canReuseStoredCalibration ? storedView?.intrinsic : undefined,
            extrinsic: canReuseStoredCalibration ? storedView?.extrinsic : undefined,
            capturedAt: canReuseStoredCalibration ? storedView?.capturedAt : undefined,
        };
    });

    const calibratedCount = views.filter((viewProfile) => viewProfile.isCalibrated).length;
    let profileStatus: CameraCalibrationProfile['profileStatus'] = 'missing';
    if (calibratedCount === views.length && views.length > 0) {
        profileStatus = 'calibrated';
    } else if (calibratedCount > 0) {
        profileStatus = 'partial';
    } else if (views.length > 0) {
        profileStatus = 'uncalibrated';
    }

    return {
        profileId: storedProfile?.profileId,
        rigLabel: storedProfile?.rigLabel,
        profileStatus,
        notes: storedProfile?.notes,
        views,
    };
};

const extractSmplPreviewNote = (smplParams: unknown): string | null => {
    if (!smplParams || typeof smplParams !== 'object') {
        return null;
    }

    const params = smplParams as Record<string, unknown>;
    if (params.is_personalized === true) {
        return null;
    }

    const note = typeof params.note === 'string' ? params.note.trim() : '';
    if (note) {
        return note;
    }

    return typeof params.fit_mode === 'string'
        ? 'La mesh 3D mostrata e una preview digitale e non un fitting clinico personalizzato.'
        : null;
};

const isSmplStillProcessing = (status?: string): boolean => {
    const normalized = (status || '').toUpperCase();
    return normalized === 'PENDING' || normalized === 'PROCESSING' || normalized === 'RUNNING';
};

const parseOBJ = (objString: string): THREE.BufferGeometry | null => {
    try {
        const vertices: number[] = [];
        const indices: number[] = [];
        for (const line of objString.split('\n')) {
            const parts = line.trim().split(/\s+/);
            if (parts[0] === 'v') {
                vertices.push(Number(parts[1]), Number(parts[2]), Number(parts[3]));
            } else if (parts[0] === 'f') {
                const face = parts
                    .slice(1)
                    .map((part) => parseInt(part.split('/')[0], 10) - 1)
                    .filter((index) => Number.isFinite(index) && index >= 0);
                for (let i = 1; i < face.length - 1; i += 1) {
                    indices.push(face[0], face[i], face[i + 1]);
                }
            }
        }
        if (vertices.length === 0 || indices.length === 0) {
            return null;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return geometry;
    } catch (error) {
        console.error('Error parsing OBJ:', error);
        return null;
    }
};

const isQuarterTurnRotation = (rotation: CameraRotation) => rotation === 90 || rotation === 270;

const waitForVideoMetadata = (video: HTMLVideoElement) => new Promise<void>((resolve, reject) => {
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0 && video.videoHeight > 0) {
        resolve();
        return;
    }

    const handleLoadedMetadata = () => {
        cleanup();
        resolve();
    };
    const handleError = () => {
        cleanup();
        reject(new Error('Impossibile leggere la sorgente video della webcam.'));
    };
    const cleanup = () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
    video.addEventListener('error', handleError, { once: true });
});

const drawRotatedFrame = (
    context: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    sourceWidth: number,
    sourceHeight: number,
    rotation: CameraRotation,
) => {
    const targetWidth = context.canvas.width;
    const targetHeight = context.canvas.height;

    context.save();
    context.clearRect(0, 0, targetWidth, targetHeight);

    switch (rotation) {
        case 90:
            context.translate(targetWidth, 0);
            context.rotate(Math.PI / 2);
            context.drawImage(video, 0, 0, sourceWidth, sourceHeight);
            break;
        case 180:
            context.translate(targetWidth, targetHeight);
            context.rotate(Math.PI);
            context.drawImage(video, 0, 0, sourceWidth, sourceHeight);
            break;
        case 270:
            context.translate(0, targetHeight);
            context.rotate(-Math.PI / 2);
            context.drawImage(video, 0, 0, sourceWidth, sourceHeight);
            break;
        default:
            context.drawImage(video, 0, 0, sourceWidth, sourceHeight);
            break;
    }

    context.restore();
};

const createRotatedRecordingStream = async (sourceStream: MediaStream, rotation: CameraRotation) => {
    const sourceVideo = document.createElement('video');
    sourceVideo.muted = true;
    sourceVideo.playsInline = true;
    sourceVideo.srcObject = sourceStream;

    await waitForVideoMetadata(sourceVideo);
    await sourceVideo.play();

    const sourceWidth = sourceVideo.videoWidth || 1280;
    const sourceHeight = sourceVideo.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = isQuarterTurnRotation(rotation) ? sourceHeight : sourceWidth;
    canvas.height = isQuarterTurnRotation(rotation) ? sourceWidth : sourceHeight;

    const context = canvas.getContext('2d');
    if (!context) {
        sourceVideo.pause();
        sourceVideo.srcObject = null;
        throw new Error('Canvas 2D non disponibile per ruotare il video.');
    }

    const frameRate = sourceStream.getVideoTracks()[0]?.getSettings().frameRate || 30;
    let animationFrameId = 0;

    const renderFrame = () => {
        drawRotatedFrame(context, sourceVideo, sourceWidth, sourceHeight, rotation);
        animationFrameId = window.requestAnimationFrame(renderFrame);
    };

    renderFrame();

    const rotatedStream = canvas.captureStream(frameRate);

    return {
        stream: rotatedStream,
        cleanup: () => {
            if (animationFrameId) {
                window.cancelAnimationFrame(animationFrameId);
            }
            rotatedStream.getTracks().forEach((track) => track.stop());
            sourceVideo.pause();
            sourceVideo.srcObject = null;
        },
    };
};

const BodySegment = ({ position, args, type, stepName, stepResults, rotation }: {
    position: [number, number, number];
    args: number[];
    type: 'box' | 'cylinder' | 'sphere';
    stepName: ScanStep;
    stepResults?: Record<string, LimbResult>;
    rotation?: [number, number, number];
}) => {
    const score = stepName === 'POSTURE' ? getPostureScore(stepResults) : stepResults?.[stepName]?.score;
    const color = scoreToColor(score);
    return (
        <mesh position={position} rotation={rotation || [0, 0, 0]} castShadow receiveShadow>
            {type === 'box' && <boxGeometry args={args as [number, number, number]} />}
            {type === 'cylinder' && <cylinderGeometry args={args as [number, number, number, number]} />}
            {type === 'sphere' && <sphereGeometry args={args as [number, number, number]} />}
            <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
    );
};

const FallbackBodyModel = ({ stepResults }: { stepResults?: Record<string, LimbResult> }) => (
    <group position={[0, 0, 0]}>
        <BodySegment position={[0, 2.25, 0]} args={[0.36, 24, 24]} type="sphere" stepName="POSTURE" stepResults={stepResults} />
        <BodySegment position={[0, 1.28, 0]} args={[0.42, 0.58, 1.45, 28]} type="cylinder" stepName="POSTURE" stepResults={stepResults} />
        <BodySegment position={[0, 0.32, 0]} args={[0.52, 0.46, 0.34, 24]} type="cylinder" stepName="POSTURE" stepResults={stepResults} />
        <BodySegment position={[0.68, 1.34, 0]} args={[0.13, 0.16, 1.35, 18]} type="cylinder" stepName="ARM_LEFT" stepResults={stepResults} rotation={[0, 0, -0.2]} />
        <BodySegment position={[-0.68, 1.34, 0]} args={[0.13, 0.16, 1.35, 18]} type="cylinder" stepName="ARM_RIGHT" stepResults={stepResults} rotation={[0, 0, 0.2]} />
        <BodySegment position={[0.32, -0.58, 0]} args={[0.16, 0.19, 1.75, 18]} type="cylinder" stepName="LEG_LEFT" stepResults={stepResults} rotation={[0, 0, 0.06]} />
        <BodySegment position={[-0.32, -0.58, 0]} args={[0.16, 0.19, 1.75, 18]} type="cylinder" stepName="LEG_RIGHT" stepResults={stepResults} rotation={[0, 0, -0.06]} />
    </group>
);

const getLandmarkVector = (landmarks: Array<Record<string, any>>, index: number): THREE.Vector3 | null => {
    const landmark = landmarks[index];
    if (!landmark || Number(landmark.visibility ?? 1) < 0.25) {
        return null;
    }
    return mapLandmarkToVector(landmark);
};

const getBuildMultiplier = (subjectProfile?: SubjectProfile): number => {
    const heightM = subjectProfile?.heightCm ? subjectProfile.heightCm / 100 : undefined;
    const bmi = heightM && subjectProfile?.weightKg ? subjectProfile.weightKg / (heightM * heightM) : undefined;
    const bmiScale = bmi ? THREE.MathUtils.clamp(0.9 + ((bmi - 22) * 0.018), 0.82, 1.24) : 1;
    const sex = (subjectProfile?.sex || '').toLowerCase();
    const sexScale = sex.includes('m') || sex.includes('uomo') ? 1.05 : sex.includes('f') || sex.includes('donna') ? 0.96 : 1;
    return bmiScale * sexScale;
};

const CapsuleSegment = ({ start, end, radius, color }: {
    start: THREE.Vector3 | null;
    end: THREE.Vector3 | null;
    radius: number;
    color: string;
}) => {
    if (!start || !end) return null;

    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    if (length < 0.05) return null;

    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize(),
    );

    return (
        <group>
            <mesh position={midpoint} quaternion={quaternion} castShadow receiveShadow>
                <cylinderGeometry args={[radius, radius, length, 24]} />
                <meshStandardMaterial color={color} roughness={0.54} metalness={0.01} />
            </mesh>
            {[start, end].map((point, index) => (
                <mesh key={index} position={point} castShadow receiveShadow>
                    <sphereGeometry args={[radius, 20, 20]} />
                    <meshStandardMaterial color={color} roughness={0.54} metalness={0.01} />
                </mesh>
            ))}
        </group>
    );
};

const PoseFittedBodyModel = ({
    landmarks,
    stepResults,
    subjectProfile,
}: {
    landmarks?: Array<Record<string, any>> | null;
    stepResults?: Record<string, LimbResult>;
    subjectProfile?: SubjectProfile;
}) => {
    const validLandmarks = Array.isArray(landmarks) ? landmarks : [];
    if (!validLandmarks.length) {
        return <FallbackBodyModel stepResults={stepResults} />;
    }

    const point = (index: number) => getLandmarkVector(validLandmarks, index);
    const leftShoulder = point(11);
    const rightShoulder = point(12);
    const leftHip = point(23);
    const rightHip = point(24);
    const shoulderCenter = leftShoulder && rightShoulder ? new THREE.Vector3().addVectors(leftShoulder, rightShoulder).multiplyScalar(0.5) : null;
    const hipCenter = leftHip && rightHip ? new THREE.Vector3().addVectors(leftHip, rightHip).multiplyScalar(0.5) : null;
    const shoulderWidth = leftShoulder && rightShoulder ? leftShoulder.distanceTo(rightShoulder) : 0.9;
    const buildMultiplier = getBuildMultiplier(subjectProfile);
    const torsoRadius = THREE.MathUtils.clamp(shoulderWidth * 0.28 * buildMultiplier, 0.18, 0.36);
    const limbRadius = THREE.MathUtils.clamp(shoulderWidth * 0.09 * buildMultiplier, 0.055, 0.14);
    const legRadius = THREE.MathUtils.clamp(shoulderWidth * 0.115 * buildMultiplier, 0.07, 0.18);
    const neck = shoulderCenter ? shoulderCenter.clone().add(new THREE.Vector3(0, 0.18, 0)) : null;
    const nose = point(0);
    const headPosition = nose || (neck ? neck.clone().add(new THREE.Vector3(0, 0.28, 0)) : null);

    return (
        <group>
            <CapsuleSegment start={shoulderCenter} end={hipCenter} radius={torsoRadius} color={scoreToColor(getPostureScore(stepResults))} />
            {headPosition && (
                <mesh position={headPosition} castShadow receiveShadow>
                    <sphereGeometry args={[THREE.MathUtils.clamp(shoulderWidth * 0.24, 0.2, 0.34), 28, 28]} />
                    <meshStandardMaterial color={scoreToColor(getPostureScore(stepResults))} roughness={0.6} />
                </mesh>
            )}
            <CapsuleSegment start={neck} end={headPosition} radius={limbRadius * 0.8} color={scoreToColor(getPostureScore(stepResults))} />
            <CapsuleSegment start={leftShoulder} end={point(13)} radius={limbRadius} color={scoreToColor(stepResults?.ARM_LEFT?.score)} />
            <CapsuleSegment start={point(13)} end={point(15)} radius={limbRadius * 0.82} color={scoreToColor(stepResults?.ARM_LEFT?.score)} />
            <CapsuleSegment start={rightShoulder} end={point(14)} radius={limbRadius} color={scoreToColor(stepResults?.ARM_RIGHT?.score)} />
            <CapsuleSegment start={point(14)} end={point(16)} radius={limbRadius * 0.82} color={scoreToColor(stepResults?.ARM_RIGHT?.score)} />
            <CapsuleSegment start={leftHip} end={point(25)} radius={legRadius} color={scoreToColor(stepResults?.LEG_LEFT?.score)} />
            <CapsuleSegment start={point(25)} end={point(27)} radius={legRadius * 0.82} color={scoreToColor(stepResults?.LEG_LEFT?.score)} />
            <CapsuleSegment start={point(27)} end={point(31)} radius={legRadius * 0.62} color={scoreToColor(stepResults?.LEG_LEFT?.score)} />
            <CapsuleSegment start={rightHip} end={point(26)} radius={legRadius} color={scoreToColor(stepResults?.LEG_RIGHT?.score)} />
            <CapsuleSegment start={point(26)} end={point(28)} radius={legRadius * 0.82} color={scoreToColor(stepResults?.LEG_RIGHT?.score)} />
            <CapsuleSegment start={point(28)} end={point(32)} radius={legRadius * 0.62} color={scoreToColor(stepResults?.LEG_RIGHT?.score)} />
        </group>
    );
};

const ResultModel = ({ result, stepResults, subjectProfile }: { result?: LimbResult; stepResults?: Record<string, LimbResult>; subjectProfile?: SubjectProfile }) => {
    const objData = result?.smpl_mesh;
    const smplParams = result?.smpl_params;
    const isPersonalizedMesh = Boolean(
        smplParams
        && typeof smplParams === 'object'
        && (smplParams as Record<string, unknown>).is_personalized === true,
    );

    const baseGeometry = useMemo(() => {
        if (!objData) return null;

        const parsed = parseOBJ(objData);
        if (!parsed) return null;

        parsed.computeBoundingBox();
        const boundingBox = parsed.boundingBox;
        if (boundingBox) {
            const center = boundingBox.getCenter(new THREE.Vector3());
            const size = boundingBox.getSize(new THREE.Vector3());
            const scale = 3 / Math.max(size.x, size.y, size.z, 1);
            parsed.translate(-center.x, -boundingBox.min.y, -center.z);
            parsed.scale(scale, scale, scale);
            parsed.computeVertexNormals();
        }

        return parsed;
    }, [objData]);

    const validLandmarks = useMemo(() => {
        if (!stepResults) return null;
        return Object.values(stepResults).find((entry) => entry.landmarks && entry.landmarks.length > 0)?.landmarks || null;
    }, [stepResults]);

    const coloredGeometry = useMemo(() => {
        if (!baseGeometry) return null;

        const geometry = baseGeometry.clone();
        const count = geometry.attributes.position.count;
        const positionAttribute = geometry.attributes.position as THREE.BufferAttribute;
        const postureUpperScore = stepResults?.POSTURE_UPPER?.score;
        const postureScore = getPostureScore(stepResults);

        if (!stepResults || (postureUpperScore === undefined && postureScore === undefined)) {
            return geometry;
        }

        geometry.computeBoundingBox();
        const bounds = geometry.boundingBox;
        if (!bounds) return geometry;

        const colorArray = new Float32Array(count * 3);
        const vertex = new THREE.Vector3();
        const height = Math.max(bounds.max.y - bounds.min.y, 1e-6);

        for (let i = 0; i < count; i += 1) {
            vertex.fromBufferAttribute(positionAttribute, i);
            const yRatio = (vertex.y - bounds.min.y) / height;

            const color = new THREE.Color(
                postureUpperScore !== undefined
                    ? scoreToColor(yRatio >= 0.34 ? postureUpperScore : undefined)
                    : scoreToColor(postureScore),
            );
            colorArray[i * 3] = color.r;
            colorArray[(i * 3) + 1] = color.g;
            colorArray[(i * 3) + 2] = color.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        return geometry;
    }, [baseGeometry, stepResults]);

    if (!coloredGeometry) {
        return <PoseFittedBodyModel landmarks={validLandmarks} stepResults={stepResults} subjectProfile={subjectProfile} />;
    }

    if (!isPersonalizedMesh && validLandmarks) {
        return <PoseFittedBodyModel landmarks={validLandmarks} stepResults={stepResults} subjectProfile={subjectProfile} />;
    }

    const hasVertexColors = Boolean(coloredGeometry.getAttribute('color'));

    return (
        <group>
            <mesh geometry={coloredGeometry} position={[0, 0, 0]} castShadow receiveShadow>
                <meshStandardMaterial color={hasVertexColors ? '#ffffff' : '#bbf7d0'} roughness={0.68} metalness={0.02} vertexColors={hasVertexColors} />
            </mesh>
        </group>
    );
};

const CameraCapture = ({ view, onCapture }: { view: string | null; onCapture: (view: string, data: string) => void }) => {
    const { camera, gl, scene } = useThree();

    useEffect(() => {
        if (!view) return;

        const position = new THREE.Vector3();
        switch (view) {
            case 'FRONT':
                position.set(0, 1, 3.5);
                break;
            case 'BACK':
                position.set(0, 1, -3.5);
                break;
            case 'LEFT':
                position.set(-3.5, 1, 0);
                break;
            case 'RIGHT':
                position.set(3.5, 1, 0);
                break;
            default:
                return;
        }

        camera.position.copy(position);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();

        const timer = setTimeout(() => {
            gl.render(scene, camera);
            onCapture(view, gl.domElement.toDataURL('image/png'));
        }, 100);

        return () => clearTimeout(timer);
    }, [view, camera, gl, scene, onCapture]);

    return null;
};

const Scene = ({ result, stepResults, subjectProfile, captureView, onCapture }: {
    result?: LimbResult;
    stepResults?: Record<string, LimbResult>;
    subjectProfile?: SubjectProfile;
    captureView?: string | null;
    onCapture: (view: string, data: string) => void;
}) => (
    <Canvas gl={{ preserveDrawingBuffer: true }} camera={{ position: [0, 1, 4], fov: 50 }} shadows>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <React.Suspense fallback={null}>
            <group position={[0, -1, 0]}>
                <ResultModel result={result} stepResults={stepResults} subjectProfile={subjectProfile} />
                <ContactShadows resolution={1024} scale={50} blur={1} opacity={0.5} far={10} color="#000000" />
            </group>
            <Environment preset="city" />
        </React.Suspense>
        {captureView ? <CameraCapture view={captureView} onCapture={onCapture} /> : <OrbitControls minPolarAngle={0} maxPolarAngle={Math.PI / 2} />}
        <gridHelper args={[10, 10, 0xdddddd, 0xeeeeee]} position={[0, -1, 0]} />
    </Canvas>
);

const ScanPage: React.FC<ScanPageProps> = ({ onBack, patient, visit }) => {
    const [currentStep, setCurrentStep] = useState<ScanStep>('SETUP');
    const [expandedStep, setExpandedStep] = useState<ScanKey | null>(null);
    const [phase, setPhase] = useState<ScanPhase>('PREPARE');
    const [asyncResults, setAsyncResults] = useState<Record<string, AsyncResult>>({});
    const [selectedScanKeys, setSelectedScanKeys] = useState<ScanKey[]>(() => getPresetScanKeysForAnalysisType(visit?.tipo_analisi));
    const [isScanSaved, setIsScanSaved] = useState(false);

    const { user } = useAuth();
    console.log('ScanPage - user:', user, 'isAdmin:', user?.isAdmin);

    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
    const [leftDeviceId, setLeftDeviceId] = useState<string | undefined>(undefined);
    const [rightDeviceId, setRightDeviceId] = useState<string | undefined>(undefined);
    const [cameraRotations, setCameraRotations] = useState<Record<CameraView, CameraRotation>>(DEFAULT_CAMERA_ROTATIONS);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const leftVideoRef = useRef<HTMLVideoElement>(null);
    const rightVideoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaRecordersRef = useRef<Partial<Record<CameraView, MediaRecorder>>>({});
    const streamRef = useRef<MediaStream | null>(null);
    const leftStreamRef = useRef<MediaStream | null>(null);
    const rightStreamRef = useRef<MediaStream | null>(null);
    const activeDeviceIdsRef = useRef<Partial<Record<CameraView, string>>>({});
    const activeCloneStateRef = useRef<Partial<Record<CameraView, boolean>>>({});
    const cameraRequestIdsRef = useRef<Record<CameraView, number>>({ front: 0, left: 0, right: 0 });
    const scanListenersRef = useRef<Record<string, () => void>>({});
    const appliedStoredCameraConfigRef = useRef(false);

    const RECORDING_DURATION = 10;
    const COUNTDOWN_DURATION = 5;
    const [timeLeft, setTimeLeft] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const currentAnalysisType = resolveAnalysisTypeFromScanKeys(selectedScanKeys);
    const currentAnalysisLabel = getAnalysisTypeLabel(currentAnalysisType);
    const currentLanguage = getStoredLanguage();

    const scanSequence = useMemo(
        () => SCAN_DEFINITIONS.map(({ key }) => key).filter((key) => selectedScanKeys.includes(key)),
        [selectedScanKeys],
    );
    const selectedScanDefinitions = useMemo(
        () => scanSequence.map((key) => SCAN_DEFINITION_BY_KEY[key]),
        [scanSequence],
    );
    const hasCompletedScanResults = useMemo(
        () => Object.values(asyncResults).some((result) => result.status === 'success' && result.data),
        [asyncResults],
    );
    const hasPendingSmplResults = useMemo(
        () => Object.values(asyncResults).some((result) => (
            result.status === 'success'
            && result.data
            && isSmplStillProcessing(result.data.smpl_status)
        )),
        [asyncResults],
    );
    const hasUnsavedScanResults = hasCompletedScanResults && !isScanSaved;
    const STEP_LABELS: Record<ScanStep, string> = {
        SETUP: 'Setup Ambiente',
        POSTURE: SCAN_DEFINITION_BY_KEY.POSTURE.label,
        POSTURE_UPPER: SCAN_DEFINITION_BY_KEY.POSTURE_UPPER.label,
        ARM_LEFT: SCAN_DEFINITION_BY_KEY.ARM_LEFT.label,
        ARM_RIGHT: SCAN_DEFINITION_BY_KEY.ARM_RIGHT.label,
        LEG_LEFT: SCAN_DEFINITION_BY_KEY.LEG_LEFT.label,
        LEG_RIGHT: SCAN_DEFINITION_BY_KEY.LEG_RIGHT.label,
        SIDE_LEFT: SCAN_DEFINITION_BY_KEY.SIDE_LEFT.label,
        SIDE_RIGHT: SCAN_DEFINITION_BY_KEY.SIDE_RIGHT.label,
        SUMMARY: 'Report Finale',
    };
    const currentScanDefinition = currentStep !== 'SETUP' && currentStep !== 'SUMMARY'
        ? SCAN_DEFINITION_BY_KEY[currentStep]
        : null;
    const totalPlannedSeconds = scanSequence.length * (COUNTDOWN_DURATION + RECORDING_DURATION);
    const formattedPlannedDuration = totalPlannedSeconds >= 60
        ? `${Math.ceil(totalPlannedSeconds / 60)} min`
        : `${totalPlannedSeconds} sec`;
    const subjectProfile = useMemo(
        () => buildSubjectProfile(patient, visit, currentAnalysisType),
        [
            currentAnalysisType,
            patient?.altezza,
            patient?.cognome,
            patient?.id,
            patient?.nome,
            patient?.peso,
            patient?.sesso,
            visit?.id,
        ],
    );
    const storedCameraCalibration = useMemo(
        () => readCameraCalibrationProfile(),
        [selectedDeviceId, leftDeviceId, rightDeviceId],
    );

    useEffect(() => {
        setSelectedScanKeys(getPresetScanKeysForAnalysisType(visit?.tipo_analisi));
    }, [visit?.id, visit?.tipo_analisi]);

    const stopMediaStream = (mediaStream?: MediaStream | null) => {
        mediaStream?.getTracks().forEach((track) => track.stop());
    };

    const getStreamRefForView = (view: CameraView) => {
        if (view === 'front') return streamRef;
        if (view === 'left') return leftStreamRef;
        return rightStreamRef;
    };

    const getVideoRefForView = (view: CameraView) => {
        if (view === 'front') return videoRef;
        if (view === 'left') return leftVideoRef;
        return rightVideoRef;
    };

    const attachPreviewElement = (view: CameraView, mediaStream: MediaStream | null) => {
        const element = getVideoRefForView(view).current;
        if (!element) return;
        element.srcObject = mediaStream;
        if (mediaStream) {
            element.play().catch((playError) => console.error(`Error playing ${view} video:`, playError));
        }
    };

    const getSelectedDeviceIdForView = (view: CameraView) => {
        if (view === 'front') return selectedDeviceId;
        if (view === 'left') return leftDeviceId;
        return rightDeviceId;
    };

    const getCameraRotation = (view: CameraView): CameraRotation => cameraRotations[view] ?? 0;

    const cycleCameraRotation = (view: CameraView) => {
        setCameraRotations((prev) => {
            const currentIndex = CAMERA_ROTATIONS.indexOf(prev[view] ?? 0);
            const nextRotation = CAMERA_ROTATIONS[(currentIndex + 1) % CAMERA_ROTATIONS.length];
            return {
                ...prev,
                [view]: nextRotation,
            };
        });
    };

    const getPreviewVideoClassName = (view: CameraView) => {
        const rotation = getCameraRotation(view);
        return isQuarterTurnRotation(rotation)
            ? 'max-h-full w-auto max-w-none object-contain'
            : 'w-full h-full object-cover';
    };

    const getPreviewVideoStyle = (view: CameraView): React.CSSProperties => ({
        transform: `rotate(${getCameraRotation(view)}deg)`,
        transformOrigin: 'center center',
    });

    const deviceOptionLabels = useMemo(() => {
        return videoDevices.reduce<Record<string, string>>((acc, device, index) => {
            const baseLabel = (device.label || `Camera ${index + 1}`).trim();
            acc[device.deviceId] = `${baseLabel} | ${device.deviceId.slice(-6)}`;
            return acc;
        }, {});
    }, [videoDevices]);

    const getDeviceOptionLabel = (deviceId?: string) => {
        if (!deviceId) return 'N/A';

        const deviceIndex = videoDevices.findIndex((device) => device.deviceId === deviceId);
        const device = deviceIndex >= 0 ? videoDevices[deviceIndex] : undefined;
        const fallbackLabel = `Camera ${deviceIndex >= 0 ? deviceIndex + 1 : '?'}`;
        return deviceOptionLabels[deviceId] || `${device?.label || fallbackLabel} | ${deviceId.slice(-6)}`;
    };

    const getAssignedViewForDevice = (view: CameraView, deviceId?: string) => {
        if (!deviceId) return null;

        for (const candidateView of CAMERA_VIEWS) {
            if (candidateView === view) continue;
            if (getSelectedDeviceIdForView(candidateView) === deviceId) {
                return candidateView;
            }
        }

        return null;
    };

    const isDeviceAssignedToAnotherView = (view: CameraView, deviceId?: string) => (
        getAssignedViewForDevice(view, deviceId) !== null
    );

    const handleDeviceSelection = (view: CameraView, nextDeviceId?: string) => {
        const normalizedDeviceId = nextDeviceId || undefined;
        const conflictingView = getAssignedViewForDevice(view, normalizedDeviceId);

        if (conflictingView) {
            setError(
                `La camera ${getDeviceOptionLabel(normalizedDeviceId)} e gia assegnata a ${CAMERA_VIEW_LABELS[conflictingView].toLowerCase()}.`,
            );
            return;
        }

        if (error && error.includes('gia assegnata')) {
            setError(null);
        }

        if (view === 'front') {
            setSelectedDeviceId(normalizedDeviceId);
            return;
        }

        if (view === 'left') {
            setLeftDeviceId(normalizedDeviceId);
            return;
        }

        setRightDeviceId(normalizedDeviceId);
    };

    const toggleScanSelection = (scanKey: ScanKey) => {
        setSelectedScanKeys((prev) => (
            prev.includes(scanKey)
                ? prev.filter((key) => key !== scanKey)
                : SCAN_DEFINITIONS.map(({ key }) => key).filter((key) => key === scanKey || prev.includes(key))
        ));
    };

    const clearViewStream = (view: CameraView) => {
        const targetRef = getStreamRefForView(view);
        stopMediaStream(targetRef.current);
        targetRef.current = null;
        attachPreviewElement(view, null);
        delete activeDeviceIdsRef.current[view];
        activeCloneStateRef.current[view] = false;

        if (view === 'front') {
            setStream(null);
        }
    };

    const attachViewStream = (view: CameraView, deviceId: string, nextStream: MediaStream, isClone: boolean) => {
        const targetRef = getStreamRefForView(view);
        targetRef.current = nextStream;
        activeDeviceIdsRef.current[view] = deviceId;
        activeCloneStateRef.current[view] = isClone;
        attachPreviewElement(view, nextStream);

        if (view === 'front') {
            setStream(nextStream);
        }
    };

    const getReusableStreamForDevice = (view: CameraView, deviceId: string) => {
        for (const candidateView of CAMERA_VIEWS) {
            if (candidateView === view) continue;
            if (activeDeviceIdsRef.current[candidateView] !== deviceId) continue;

            const candidateStream = getStreamRefForView(candidateView).current;
            if (candidateStream) {
                return candidateStream;
            }
        }

        return null;
    };

    const syncSharedDeviceViews = (sourceView: CameraView, deviceId: string) => {
        CAMERA_VIEWS.forEach((candidateView) => {
            if (candidateView === sourceView) return;
            if (getSelectedDeviceIdForView(candidateView) !== deviceId) return;
            if (activeDeviceIdsRef.current[candidateView] === deviceId) return;

            if (candidateView === 'front') {
                void startCamera(deviceId);
            } else {
                void startSecondaryCamera(candidateView, deviceId);
            }
        });
    };

    const getCameraStartErrorMessage = (view: CameraView, error: unknown) => {
        if (error instanceof DOMException) {
            if (error.name === 'NotReadableError') {
                return `La camera ${CAMERA_VIEW_LABELS[view].toLowerCase()} non si avvia. Puo essere occupata da un'altra app oppure il controller USB non riesce a gestire piu webcam insieme.`;
            }
            if (error.name === 'NotAllowedError') {
                return `Permesso negato per la camera ${CAMERA_VIEW_LABELS[view].toLowerCase()}. Controlla i permessi del browser.`;
            }
            if (error.name === 'NotFoundError') {
                return `Camera ${CAMERA_VIEW_LABELS[view].toLowerCase()} non trovata.`;
            }
        }

        return `Errore avvio camera ${CAMERA_VIEW_LABELS[view].toLowerCase()}.`;
    };

    const openCameraStream = async (deviceId: string) => {
        const attempts: MediaStreamConstraints[] = [
            {
                video: {
                    deviceId: { exact: deviceId },
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 15, max: 24 },
                },
                audio: false,
            },
            {
                video: {
                    deviceId: { exact: deviceId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 24, max: 30 },
                },
                audio: false,
            },
            {
                video: { deviceId: { exact: deviceId } },
                audio: false,
            },
        ];

        let lastError: unknown = null;

        for (const constraints of attempts) {
            try {
                return await navigator.mediaDevices.getUserMedia(constraints);
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError;
    };

    useEffect(() => {
        const initCamera = async () => {
            let permissionStream: MediaStream | null = null;
            try {
                permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                const devices = await navigator.mediaDevices.enumerateDevices();
                const vids = devices.filter((device) => device.kind === 'videoinput');
                setVideoDevices(vids);

                const distinctDeviceIds = Array.from(new Set(vids.map((device) => device.deviceId)));
                const storedProfile = readCameraCalibrationProfile(user?.uid);
                const storedByView = new Map<CameraView, CameraCalibrationViewProfile>();
                (storedProfile?.views || []).forEach((viewProfile) => {
                    storedByView.set(viewProfile.view, viewProfile);
                });
                const getStoredDeviceId = (view: CameraView) => {
                    const candidate = storedByView.get(view)?.deviceId;
                    return candidate && distinctDeviceIds.includes(candidate) ? candidate : undefined;
                };

                if (!appliedStoredCameraConfigRef.current && storedProfile) {
                    const nextRotations = CAMERA_VIEWS.reduce<Record<CameraView, CameraRotation>>((acc, view) => {
                        const savedRotation = storedByView.get(view)?.rotationDeg;
                        acc[view] = CAMERA_ROTATIONS.includes(savedRotation as CameraRotation)
                            ? savedRotation as CameraRotation
                            : DEFAULT_CAMERA_ROTATIONS[view];
                        return acc;
                    }, { ...DEFAULT_CAMERA_ROTATIONS });
                    setCameraRotations(nextRotations);
                    appliedStoredCameraConfigRef.current = true;
                }

                const defaultFrontId = selectedDeviceId || getStoredDeviceId('front') || distinctDeviceIds[0];
                const defaultLeftId = leftDeviceId || getStoredDeviceId('left') || distinctDeviceIds.find((deviceId) => deviceId !== defaultFrontId);
                const defaultRightId = rightDeviceId || getStoredDeviceId('right') || distinctDeviceIds.find(
                    (deviceId) => deviceId !== defaultFrontId && deviceId !== defaultLeftId,
                );

                if (!selectedDeviceId && defaultFrontId) setSelectedDeviceId(defaultFrontId);
                if (!leftDeviceId && defaultLeftId) setLeftDeviceId(defaultLeftId);
                if (!rightDeviceId && defaultRightId) setRightDeviceId(defaultRightId);
            } catch (err) {
                console.error('Camera init error:', err);
                setError('Impossibile accedere alla fotocamera.');
            } finally {
                stopMediaStream(permissionStream);
            }
        };

        void initCamera();
        return () => stopCamera();
    }, []);

    useEffect(() => {
        if (selectedDeviceId) {
            void startCamera(selectedDeviceId);
        }
    }, [selectedDeviceId]);

    useEffect(() => {
        void startSecondaryCamera('left', leftDeviceId);
    }, [leftDeviceId, selectedDeviceId]);

    useEffect(() => {
        void startSecondaryCamera('right', rightDeviceId);
    }, [rightDeviceId, selectedDeviceId]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            if (stream) {
                videoRef.current.play().catch((playError) => console.error('Error playing video:', playError));
            }
        }
    }, [stream, currentStep, phase]);

    useEffect(() => {
        attachPreviewElement('left', leftStreamRef.current);
        attachPreviewElement('right', rightStreamRef.current);
    }, [leftDeviceId, rightDeviceId, currentStep, phase]);

    const startCamera = async (deviceId?: string) => {
        const requestId = ++cameraRequestIdsRef.current.front;

        if (!deviceId) {
            clearViewStream('front');
            return;
        }

        if (streamRef.current && activeDeviceIdsRef.current.front === deviceId) {
            setStream(streamRef.current);
            return;
        }

        clearViewStream('front');

        const reusableStream = getReusableStreamForDevice('front', deviceId);
        if (reusableStream) {
            const clonedStream = reusableStream.clone();

            if (cameraRequestIdsRef.current.front !== requestId) {
                stopMediaStream(clonedStream);
                return;
            }

            attachViewStream('front', deviceId, clonedStream, true);
            setError(null);
            syncSharedDeviceViews('front', deviceId);
            return;
        }

        try {
            const newStream = await openCameraStream(deviceId);

            if (cameraRequestIdsRef.current.front !== requestId) {
                stopMediaStream(newStream);
                return;
            }

            attachViewStream('front', deviceId, newStream, false);
            setError(null);
            syncSharedDeviceViews('front', deviceId);
        } catch (err) {
            if (cameraRequestIdsRef.current.front !== requestId) {
                return;
            }
            console.error('Start camera error:', { deviceId, err });
            setError(getCameraStartErrorMessage('front', err));
        }
    };

    const startSecondaryCamera = async (view: Exclude<CameraView, 'front'>, deviceId?: string) => {
        const targetRef = view === 'left' ? leftStreamRef : rightStreamRef;
        const requestId = ++cameraRequestIdsRef.current[view];

        if (!deviceId) {
            clearViewStream(view);
            return;
        }

        if (targetRef.current && activeDeviceIdsRef.current[view] === deviceId) {
            return;
        }

        clearViewStream(view);

        if (deviceId === selectedDeviceId && !streamRef.current) {
            return;
        }

        const reusableStream = getReusableStreamForDevice(view, deviceId);
        if (reusableStream) {
            const clonedStream = reusableStream.clone();
            if (cameraRequestIdsRef.current[view] !== requestId) {
                stopMediaStream(clonedStream);
                return;
            }

            attachViewStream(view, deviceId, clonedStream, true);
            setError(null);
            syncSharedDeviceViews(view, deviceId);
            return;
        }

        try {
            const auxStream = await openCameraStream(deviceId);

            if (cameraRequestIdsRef.current[view] !== requestId) {
                stopMediaStream(auxStream);
                return;
            }

            attachViewStream(view, deviceId, auxStream, false);
            setError(null);
            syncSharedDeviceViews(view, deviceId);
        } catch (err) {
            if (cameraRequestIdsRef.current[view] !== requestId) {
                return;
            }
            console.error(`Start ${view} camera error:`, { deviceId, err });
            setError(getCameraStartErrorMessage(view, err));
        }
    };

    const stopCamera = () => {
        CAMERA_VIEWS.forEach((view) => {
            cameraRequestIdsRef.current[view] += 1;
        });

        [streamRef, leftStreamRef, rightStreamRef].forEach((refItem) => {
            if (refItem.current) {
                stopMediaStream(refItem.current);
                refItem.current = null;
            }
        });

        activeDeviceIdsRef.current = {};
        activeCloneStateRef.current = {};

        Object.values(mediaRecordersRef.current).forEach((recorder) => {
            if (recorder && recorder.state === 'recording') {
                recorder.stop();
            }
        });
        mediaRecordersRef.current = {};
        mediaRecorderRef.current = null;
        setStream(null);
    };

    const startScanSequence = () => {
        if (!scanSequence.length) {
            setError('Seleziona almeno una scansione da eseguire.');
            return;
        }

        setIsScanSaved(false);
        handleNextStep(scanSequence[0]);
    };

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const clearTimer = () => {        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const clearScanListener = (stepKey: string) => {
        const unsubscribe = scanListenersRef.current[stepKey];
        if (unsubscribe) {
            unsubscribe();
            delete scanListenersRef.current[stepKey];
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearTimer();
            Object.values(scanListenersRef.current).forEach((unsubscribe) => unsubscribe());
            scanListenersRef.current = {};
        };
    }, []);

    const handleNextStep = (nextStep: ScanKey | 'SUMMARY') => {
        if (nextStep === 'SUMMARY') {
            clearTimer();
            stopCamera();
            setCurrentStep('SUMMARY');
            setPhase('RESULT');
            return;
        }

        // Prevent restarting the same step if we are arguably already there (unless it's a retry, but logic handles linear now)
        // Actually, we want to allow re-entry, but ensure clean state.

        clearTimer();
        setCurrentStep(nextStep);
        startCountdown(nextStep);
    };

    const startCountdown = (step: ScanKey) => {
        clearTimer(); // Safety clear
        setPhase('COUNTDOWN');
        setTimeLeft(COUNTDOWN_DURATION);
        setError(null);

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearTimer();
                    void startRecording(step);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const startRecording = async (step: ScanKey) => {
        const scanDefinition = SCAN_DEFINITION_BY_KEY[step];
        const targetViews = new Set(scanDefinition.recommended_views);
        const streamByView: Record<CameraView, MediaStream | null> = {
            front: streamRef.current,
            left: leftStreamRef.current,
            right: rightStreamRef.current,
        };
        const deviceByView: Partial<Record<CameraView, string | undefined>> = {
            front: selectedDeviceId,
            left: leftDeviceId,
            right: rightDeviceId,
        };

        const activeStreams = CAMERA_VIEWS.reduce<Array<{ view: CameraView; stream: MediaStream; deviceId?: string }>>(
            (acc, view) => {
                if (!targetViews.has(view)) {
                    return acc;
                }
                const streamForView = streamByView[view];
                if (streamForView) {
                    acc.push({
                        view,
                        stream: streamForView,
                        deviceId: deviceByView[view],
                    });
                }
                return acc;
            },
            []
        );

        if (!activeStreams.length) {
            setError('Nessuna camera attiva per la registrazione.');
            return;
        }

        clearTimer();
        setPhase('RECORDING');
        setTimeLeft(RECORDING_DURATION);

        const preparedStreams = await Promise.all(activeStreams.map(async ({ view, stream, deviceId }) => {
            const rotation = getCameraRotation(view);

            if (rotation === 0) {
                return {
                    view,
                    stream,
                    deviceId,
                    cleanup: () => undefined,
                };
            }

            try {
                const rotatedCapture = await createRotatedRecordingStream(stream, rotation);
                return {
                    view,
                    stream: rotatedCapture.stream,
                    deviceId,
                    cleanup: rotatedCapture.cleanup,
                };
            } catch (rotationError) {
                console.error(`Rotation pipeline failed for ${view}, using raw stream instead.`, rotationError);
                return {
                    view,
                    stream,
                    deviceId,
                    cleanup: () => undefined,
                };
            }
        }));

        const chunksByView: Partial<Record<CameraView, Blob[]>> = {};
        const startedAtByView: Partial<Record<CameraView, number>> = {};
        const stoppedAtByView: Partial<Record<CameraView, number>> = {};

        const captureStartedAtMs = Date.now();
        let pendingStops = 0;
        mediaRecordersRef.current = {};

        const finalizeRecording = () => {
            const blobs: Partial<Record<CameraView, Blob>> = {};
            preparedStreams.forEach(({ view }) => {
                const chunks = chunksByView[view] || [];
                if (chunks.length > 0) {
                    blobs[view] = new Blob(chunks, { type: 'video/webm' });
                }
            });

            preparedStreams.forEach(({ cleanup }) => cleanup());

            const cameraManifest = preparedStreams.map(({ view, deviceId }) => {
                const deviceInfo = videoDevices.find(device => device.deviceId === deviceId);
                return {
                    view,
                    deviceId,
                    label: deviceInfo?.label,
                    startedAtMs: startedAtByView[view],
                    stoppedAtMs: stoppedAtByView[view],
                    rotationDeg: getCameraRotation(view),
                };
            });
            const cameraCalibration = buildCameraCalibrationProfile(cameraManifest, storedCameraCalibration);

            triggerAsyncAnalysis(step, {
                blobs,
                syncGroupId: `${step}-${captureStartedAtMs}`,
                captureStartedAtMs,
                captureStoppedAtMs: Date.now(),
                cameraManifest,
                cameraCalibration,
                subjectProfile,
                scanDefinition,
            });

            const currentIdx = scanSequence.indexOf(step);
            const nextStep = scanSequence[currentIdx + 1] ?? 'SUMMARY';
            setTimeout(() => handleNextStep(nextStep), 500);
        };

        preparedStreams.forEach(({ view, stream }) => {
            try {
                const recorder = new MediaRecorder(stream);
                mediaRecordersRef.current[view] = recorder;
                if (!mediaRecorderRef.current) {
                    mediaRecorderRef.current = recorder;
                }
                chunksByView[view] = [];
                pendingStops += 1;

                recorder.onstart = () => {
                    startedAtByView[view] = Date.now();
                };

                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        (chunksByView[view] as Blob[]).push(e.data);
                    }
                };

                recorder.onstop = () => {
                    stoppedAtByView[view] = Date.now();
                    pendingStops -= 1;
                    if (pendingStops === 0) {
                        finalizeRecording();
                    }
                };

                recorder.start(200);
            } catch (recorderError) {
                console.error(`Recorder init failed for ${view}`, recorderError);
            }
        });

        if (pendingStops === 0) {
            preparedStreams.forEach(({ cleanup }) => cleanup());
            setError('Impossibile avviare la registrazione multi-camera.');
            return;
        }

        // Recording timer
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearTimer();
                    Object.values(mediaRecordersRef.current).forEach((recorder) => {
                        if (recorder && recorder.state === 'recording') {
                            recorder.stop();
                        }
                    });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // --- Async Analysis ---
    // --- Async Analysis with Realtime Updates ---
    const triggerAsyncAnalysis = async (step: ScanKey, payload: MultiCameraRecordingPayload) => {
        const scanDefinition = SCAN_DEFINITION_BY_KEY[step];
        setAsyncResults(prev => ({
            ...prev,
            [step]: { status: 'pending' }
        }));

        try {
            clearScanListener(step);
            console.log(`Starting analysis for ${step}...`);
            const initRes = await apiService.analyzePose(payload);
            const scanId = initRes.data?.scan_id ?? initRes.data?.scanId ?? initRes.data?.id ?? (initRes as any)?.scan_id ?? (initRes as any)?.scanId ?? (initRes as any)?.id;

            if (!initRes.success) {
                throw new Error(initRes.message || `Failed to start scan for ${step}`);
            }

            if (!scanId) {
                throw new Error(initRes.message || 'Failed to start scan: backend response did not include scan_id');
            }
            console.log(`Scan ${scanId} initiated. Listening for updates...`);

            const unsubscribe = onSnapshot(doc(db, 'scans', scanId), async (docSnap) => {
                if (!docSnap.exists()) return;

                const data = docSnap.data();
                const stepsStatus = data.steps || {};
                const results = data.results || {};

                if (stepsStatus.mediapipe === 'COMPLETED' && results.mediapipe_data) {
                    const mpData = results.mediapipe_data;
                    let smplMesh: string | undefined = undefined;
                    let smplParams = results.smpl_params;
                    const smplStatus = typeof stepsStatus.smpl === 'string' ? stepsStatus.smpl : undefined;

                    if (stepsStatus.smpl === 'COMPLETED') {
                        try {
                            smplMesh = await apiService.getScanAssetText(scanId, 'smpl_mesh.obj');
                            console.log('Loaded SMPL mesh successfully via backend proxy');
                        } catch (e) {
                            console.error('Failed to load SMPL mesh:', e);
                        }

                        if (!smplParams) {
                            try {
                                const smplResultText = await apiService.getScanAssetText(scanId, 'smpl_result.json');
                                const smplResult = JSON.parse(smplResultText);
                                smplParams = smplResult?.params || smplResult?.result?.params || smplParams;
                            } catch (e) {
                                console.warn('Failed to load SMPL params:', e);
                            }
                        }
                    }

                    const requiresRecapture = Boolean(mpData.recapture_required);
                    const resolvedScore = requiresRecapture
                        ? 1
                        : (typeof mpData.score === 'number' ? mpData.score : 0);
                    const newResult: LimbResult = {
                        score: resolvedScore,
                        score_percent: typeof mpData.score_percent === 'number'
                            ? mpData.score_percent
                            : undefined,
                        quality: requiresRecapture ? 'red' : normalizeQuality(mpData.quality_label, resolvedScore),
                        angles: mpData.angles || {},
                        feedback: mpData.capture_note || mpData.feedback || '',
                        warnings: mpData.warnings || [],
                        smpl_mesh: smplMesh,
                        smpl_params: smplParams,
                        smpl_status: smplStatus,
                        landmarks: mpData.landmarks,
                        scan_id: scanId,
                        posture: mpData.posture,
                        posture_upper_body: mpData.posture_upper_body,
                        scan_label: scanDefinition.label,
                        scan_type: scanDefinition.category,
                        selected_views: Object.keys(payload.blobs) as CameraView[],
                    };

                    setAsyncResults(prev => {
                        const previousData = prev[step]?.data;
                        return {
                            ...prev,
                            [step]: {
                                status: 'success',
                                data: {
                                    ...newResult,
                                    smpl_mesh: newResult.smpl_mesh || previousData?.smpl_mesh,
                                    smpl_params: newResult.smpl_params || previousData?.smpl_params,
                                    smpl_status: newResult.smpl_status || previousData?.smpl_status,
                                },
                            },
                        };
                    });
                    setIsScanSaved(false);

                    console.log(`Realtime update: ${step} status=${data.status}`);

                    if (data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'NEEDS_RECAPTURE') {
                        clearScanListener(step);
                        console.log('Analysis fully complete/failed. Unsubscribing.');
                    }
                } else if (data.status === 'FAILED') {
                    setAsyncResults(prev => ({
                        ...prev,
                        [step]: { status: 'error', error: data.error || 'Scan failed on server.' }
                    }));
                    clearScanListener(step);
                }
            }, (error) => {
                console.error('Firestore listener error:', error);
                clearScanListener(step);
                setAsyncResults(prev => ({
                    ...prev,
                    [step]: { status: 'error', error: 'Connection lost.' }
                }));
            });

            scanListenersRef.current[step] = unsubscribe;
        } catch (err: any) {
            console.error(`Analysis for ${step} failed to start:`, err);
            setAsyncResults(prev => ({
                ...prev,
                [step]: { status: 'error', error: err.message || 'Errore di avvio' }
            }));
        }
    };

    // --- Trend & Persistence ---
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        if (patient) {
            // Fetch history on load
            apiService.getPatientVisits(patient.id).then(res => {
                if (res.success && res.data) {
                    setHistory(res.data); // Assuming data is a list of visits
                }
            });
        }
    }, [patient]);

    const calculateTrends = (visitsForComparison: Visit[] = history) => {
        const successResults: any[] = [];
        scanSequence.forEach(step => {
            if (asyncResults[step]?.status === 'success' && asyncResults[step].data) {
                successResults.push({
                    step,
                    ...asyncResults[step].data
                });
            }
        });
        const scores = successResults
            .map((result) => result.score)
            .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
        const scorePercents = successResults.map((result) => getResultScorePercent(result));
        const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
        const scorePercent = scorePercents.length > 0
            ? Math.round(scorePercents.reduce((sum, score) => sum + score, 0) / scorePercents.length)
            : null;

        const currentVisitSnapshot: Visit = {
            id: visit?.id || '__current_visit__',
            patient_id: patient?.id || '',
            operator_id: user?.uid || 'system',
            tipo_analisi: currentAnalysisType,
            status: 'COMPLETED',
            note: visit?.note || '',
            created_at: visit?.created_at || new Date().toISOString(),
            exercises: successResults,
            scan_plan: selectedScanDefinitions.map((definition) => ({
                key: definition.key,
                label: definition.label,
                category: definition.category,
                estimated_duration_sec: definition.estimated_duration_sec,
            })),
            report_summary: {
                total_scans: scanSequence.length,
                completed_scans: successResults.length,
                average_score: averageScore,
                score_percent: scorePercent,
            },
        };

        const previousVisit = getComparablePreviousVisit(currentVisitSnapshot, visitsForComparison || []);
        const comparison = getVisitComparison(currentVisitSnapshot, previousVisit);

        return {
            trend: comparison.label,
            lastDate: previousVisit ? safeFormatDate(previousVisit.created_at) : null,
            comparison,
            previousVisit,
        };
    };

    const buildPostureOverview = (field: 'posture' | 'posture_upper_body' = 'posture') => {
        const isUpperBody = field === 'posture_upper_body';
        const preferredSteps = selectedScanDefinitions
            .filter((definition) => (
                isUpperBody
                    ? definition.key === 'POSTURE_UPPER'
                    : definition.category === 'posture' && definition.key !== 'POSTURE_UPPER'
            ))
            .map((definition) => definition.key);
        let postureEntries = preferredSteps
            .map(step => ({ step, posture: asyncResults[step]?.data?.[field] }))
            .filter((entry): entry is { step: ScanKey; posture: PostureSummary } => Boolean(entry.posture));

        if (!postureEntries.length) {
            postureEntries = scanSequence
                .filter((step) => (isUpperBody ? step === 'POSTURE_UPPER' : step !== 'POSTURE_UPPER'))
                .map(step => ({ step, posture: asyncResults[step]?.data?.[field] }))
                .filter((entry): entry is { step: ScanKey; posture: PostureSummary } => Boolean(entry.posture));
        }

        if (!postureEntries.length) {
            return null;
        }

        let overallScore = 3;
        const scorePercents: number[] = [];
        const findings: string[] = [];
        const views: Partial<Record<CameraView, PostureViewResult>> = {};

        postureEntries.forEach(({ posture }) => {
            overallScore = Math.min(overallScore, posture.score || 3);
            if (typeof posture.score_percent === 'number' && Number.isFinite(posture.score_percent)) {
                scorePercents.push(clampPercent(posture.score_percent));
            }
            Object.entries(posture.views || {}).forEach(([view, postureView]) => {
                if (postureView) {
                    views[view as CameraView] = postureView;
                }
            });
            (posture.findings || []).forEach((finding) => {
                if (!findings.includes(finding)) {
                    findings.push(finding);
                }
            });
        });

        const quality = qualityFlagFromScore(overallScore);
        const summary = isUpperBody
            ? (quality === 'green'
                ? 'Valutazione preliminare upper body complessivamente ben allineata nelle viste acquisite.'
                : quality === 'yellow'
                    ? 'Si osservano compensi lievi di capo, tronco o bacino, da monitorare nel tempo.'
                    : 'La valutazione preliminare upper body evidenzia alterazioni di capo, tronco o bacino meritevoli di approfondimento.')
            : (quality === 'green'
                ? 'Postura statica completa complessivamente ben allineata nelle viste acquisite.'
                : quality === 'yellow'
                    ? 'Si osservano compensi posturali lievi del tronco, del bacino o degli arti inferiori, da monitorare nel tempo.'
                    : 'La valutazione statica completa evidenzia alterazioni posturali o acquisizione incompleta meritevoli di approfondimento.');

        return {
            score: overallScore,
            score_percent: scorePercents.length
                ? Math.round(scorePercents.reduce((sum, score) => sum + score, 0) / scorePercents.length)
                : clampPercent((overallScore / 3) * 100),
            quality,
            summary,
            findings: findings.slice(0, 6),
            views,
            sources: postureEntries.map(entry => entry.step),
            assessment_type: isUpperBody ? 'upper_body' : 'complete',
        };
    };

    const saveScanResults = async () => {
        if (!patient) return null;
        if (hasPendingSmplResults) {
            setError('Attendi il completamento del modello 3D prima di salvare la visita.');
            return null;
        }

        const successResults: any[] = [];
        scanSequence.forEach(step => {
            if (asyncResults[step]?.status === 'success' && asyncResults[step].data) {
                successResults.push({
                    step,
                    ...asyncResults[step].data
                });
            }
        });
        const scores = successResults
            .map((result) => result.score)
            .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
        const scorePercents = successResults.map((result) => getResultScorePercent(result));
        const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
        const scorePercent = scorePercents.length > 0
            ? Math.round(scorePercents.reduce((sum, score) => sum + score, 0) / scorePercents.length)
            : null;

        const payload = {
            exercises: successResults,
            status: 'COMPLETED',
            note: visit?.note || `Report generato automaticamente da ${currentAnalysisLabel.toLowerCase()}`,
            tipo_analisi: currentAnalysisType,
            scan_plan: selectedScanDefinitions.map((definition) => ({
                key: definition.key,
                label: definition.label,
                category: definition.category,
                estimated_duration_sec: definition.estimated_duration_sec,
            })),
            report_summary: {
                total_scans: scanSequence.length,
                completed_scans: successResults.length,
                average_score: averageScore,
                score_percent: scorePercent,
                posture: buildPostureOverview(),
                posture_upper_body: buildPostureOverview('posture_upper_body'),
            },
        };

        try {
            if (visit?.id) {
                await apiService.updateVisitExercises(visit.id, payload);
                console.log("Visit saved successfully");
                setIsScanSaved(true);
                return visit.id;
            }

            const operatorId = user?.uid || 'system';
            const res = await apiService.createVisit(
                patient.id,
                operatorId,
                currentAnalysisType,
                payload.note,
                {
                    scan_plan: payload.scan_plan,
                },
            );

            if (res.success && res.data && res.data.visit_id) {
                await apiService.updateVisitExercises(res.data.visit_id, payload);
                console.log("Visit saved successfully");
                setIsScanSaved(true);
                return res.data.visit_id as string;
            }
        } catch (e) {
            console.error("Failed to save visit", e);
        }
        return null;
    };

    useEffect(() => {
        if (!hasUnsavedScanResults) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedScanResults]);

    const confirmDiscardUnsavedScan = (): boolean => (
        !hasUnsavedScanResults
        || window.confirm('La scansione non e stata salvata. Sei sicuro di voler uscire senza salvarla?')
    );

    const handleBackRequest = () => {
        if (!confirmDiscardUnsavedScan()) return;
        onBack?.();
    };

    const handleSaveAndClose = async () => {
        const savedVisitId = await saveScanResults();
        if (savedVisitId) {
            onBack?.();
        } else {
            setError('Non sono riuscito a salvare la scansione. Riprova prima di uscire.');
        }
    };

    // --- PDF Generation Logic ---
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [captureView, setCaptureView] = useState<string | null>(null);
    const capturedImages = useRef<Record<string, string>>({});

    const handleGeneratePdf = () => {
        setIsGeneratingPdf(true);
        capturedImages.current = {};
        setCaptureView('FRONT');
    };

    const handleCapture = (view: string, data: string) => {
        capturedImages.current[view] = data;

        // Sequence: FRONT -> RIGHT -> BACK -> LEFT -> Done
        if (view === 'FRONT') setCaptureView('RIGHT');
        else if (view === 'RIGHT') setCaptureView('BACK');
        else if (view === 'BACK') setCaptureView('LEFT');
        else if (view === 'LEFT') {
            setCaptureView(null);
            generateReport();
        }
    };

    const generateReport = async () => {
        try {
            // First, save the data
            await saveScanResults();
            let reportHistory = history as Visit[];
            if (patient?.id) {
                try {
                    const historyResponse = await apiService.getPatientVisits(patient.id);
                    if (historyResponse.success && Array.isArray(historyResponse.data)) {
                        reportHistory = historyResponse.data as Visit[];
                        setHistory(reportHistory);
                    }
                } catch (historyError) {
                    console.warn('Impossibile aggiornare lo storico visite prima del report.', historyError);
                }
            }
            {
                type ReportImage = {
                    dataUrl: string;
                    format: 'PNG' | 'JPEG';
                    width: number;
                    height: number;
                };

                const reportImagePaths = {
                    mark: '/assets/report/movelab-mark.png',
                    anatomyFull: '/assets/report/anatomy-full.png',
                    anatomyBlue: '/assets/report/anatomy-blue.jpg',
                    therapistStanding: '/assets/report/therapist-standing.jpg',
                    anatomyHead: '/assets/report/anatomy-head.png',
                    anatomySketch: '/assets/report/anatomy-sketch.jpg',
                    doctorTablet: '/assets/report/doctor-tablet.jpg',
                    therapistSitting: '/assets/report/therapist-sitting.jpg',
                } as const;

                const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(blob);
                });

                const getImageSize = (dataUrl: string) => new Promise<{ width: number; height: number }>((resolve) => {
                    const img = new window.Image();
                    img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
                    img.onerror = () => resolve({ width: 1, height: 1 });
                    img.src = dataUrl;
                });

                const loadReportImage = async (src: string): Promise<ReportImage | null> => {
                    try {
                        const response = await fetch(src);
                        if (!response.ok) return null;
                        const blob = await response.blob();
                        const dataUrl = await blobToDataUrl(blob);
                        const size = await getImageSize(dataUrl);
                        const format = blob.type.includes('png') ? 'PNG' : 'JPEG';
                        return { dataUrl, format, ...size };
                    } catch (error) {
                        console.warn(`Report asset non disponibile: ${src}`, error);
                        return null;
                    }
                };

                const reportImagesEntries = await Promise.all(
                    Object.entries(reportImagePaths).map(async ([key, path]) => [key, await loadReportImage(path)] as const),
                );
                const reportImages = Object.fromEntries(reportImagesEntries) as Record<keyof typeof reportImagePaths, ReportImage | null>;

                const doc = new jsPDF({ unit: 'mm', format: 'a4' });
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const margin = 18;
                const dark = [15, 23, 42] as const;
                const ink = [25, 32, 44] as const;
                const muted = [92, 101, 116] as const;
                const accent = [103, 232, 249] as const;
                const green = [34, 197, 94] as const;

                const successResults = Object.values(asyncResults)
                    .filter(r => r.status === 'success' && r.data)
                    .map(r => r.data!);
                const scores = successResults
                    .map(result => getResultScorePercent(result))
                    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
                const avgScore = scores.length > 0
                    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
                    : 0;
                const trendInfo = calculateTrends(reportHistory);
                const postureOverview = buildPostureOverview();
                const measurementCount = successResults.reduce((count, result) => count + Object.keys(result.angles || {}).length, 0);
                const keypointCount = successResults.reduce((count, result) => count + (result.landmarks?.length || 0), 0);
                const warningCount = successResults.reduce((count, result) => count + (result.warnings?.length || 0), 0);
                const dateStr = new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
                const patientName = patient ? `${patient.nome} ${patient.cognome}`.trim() : 'Ospite';

                const addImageContain = (image: ReportImage | null, x: number, y: number, w: number, h: number, fallback: string) => {
                    if (!image) {
                        doc.setDrawColor(203, 213, 225);
                        doc.setFillColor(248, 250, 252);
                        doc.rect(x, y, w, h, 'FD');
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(8);
                        doc.setTextColor(...muted);
                        doc.text(fallback, x + 5, y + (h / 2));
                        return;
                    }

                    const ratio = Math.min(w / image.width, h / image.height);
                    const targetWidth = image.width * ratio;
                    const targetHeight = image.height * ratio;
                    doc.addImage(image.dataUrl, image.format, x + ((w - targetWidth) / 2), y + ((h - targetHeight) / 2), targetWidth, targetHeight);
                };

                const drawFooter = (pageNumber: string, darkMode = false) => {
                    const footerTitleColor: [number, number, number] = darkMode ? [255, 255, 255] : [...ink];
                    const footerTextColor: [number, number, number] = darkMode ? [203, 213, 225] : [...muted];
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(...footerTitleColor);
                    doc.text('MOVELAB', margin, pageHeight - 14);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(...footerTextColor);
                    doc.text("Fisioterapia d'eccellenza per il tuo benessere quotidiano.", margin, pageHeight - 9);
                    doc.text(`Report ${dateStr}`, pageWidth - margin - 33, pageHeight - 9);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(12);
                    doc.text(pageNumber, pageWidth - margin - 3, 18);
                };

                const drawPageTitle = (pageNumber: string, eyebrow: string, title: string) => {
                    doc.setFillColor(255, 255, 255);
                    doc.rect(0, 0, pageWidth, pageHeight, 'F');
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(...muted);
                    doc.text(eyebrow, margin, 18);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(11);
                    doc.setTextColor(...ink);
                    doc.text(pageNumber, pageWidth - margin - 5, 18);
                    doc.setFontSize(24);
                    doc.text(title, margin, 42);
                    doc.setFillColor(...accent);
                    doc.rect(margin, 47, 38, 2, 'F');
                };

                const drawMetric = (x: number, y: number, w: number, label: string, value: string, note?: string) => {
                    doc.setFillColor(248, 250, 252);
                    doc.setDrawColor(226, 232, 240);
                    doc.rect(x, y, w, 31, 'FD');
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(...muted);
                    doc.text(label.toUpperCase(), x + 4, y + 7);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(value.length > 8 ? 13 : 17);
                    doc.setTextColor(...ink);
                    const valueLines = doc.splitTextToSize(value, w - 8).slice(0, 2);
                    doc.text(valueLines, x + 4, y + 18);
                    if (note) {
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(7);
                        doc.setTextColor(...muted);
                        const noteLines = doc.splitTextToSize(note, w - 8).slice(0, 1);
                        doc.text(noteLines, x + 4, y + 27);
                    }
                };

                const drawBar = (x: number, y: number, w: number, label: string, percent: number, color: readonly [number, number, number]) => {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(...ink);
                    doc.text(label, x, y);
                    doc.setFillColor(226, 232, 240);
                    doc.rect(x, y + 3, w, 4, 'F');
                    doc.setFillColor(...color);
                    doc.rect(x, y + 3, Math.max(3, (w * percent) / 100), 4, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${Math.round(percent)}/100`, x + w + 4, y + 6);
                };

                const addLongText = (text: string, x: number, y: number, width: number, lineHeight = 5) => {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9.5);
                    doc.setTextColor(...ink);
                    const lines = doc.splitTextToSize(text, width);
                    doc.text(lines, x, y);
                    return y + (lines.length * lineHeight);
                };

                // Page 1: cover
                doc.setFillColor(...dark);
                doc.rect(0, 0, pageWidth, pageHeight, 'F');
                addImageContain(reportImages.mark, margin, 14, 24, 24, 'Movelab');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(255, 255, 255);
                doc.text('MOVELAB', margin, 47);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(203, 213, 225);
                doc.text("Fisioterapia d'eccellenza per il tuo benessere quotidiano.", margin, 53);
                addImageContain(reportImages.anatomyFull, 91, 32, 88, 88, 'Render anatomico');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(30);
                doc.setTextColor(255, 255, 255);
                doc.text('REPORT', margin, 146);
                doc.text('HUMOTION', margin, 163);
                doc.setFillColor(...accent);
                doc.rect(margin, 170, 64, 2, 'F');
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(12);
                doc.setTextColor(203, 213, 225);
                doc.text(dateStr, margin, 184);
                doc.text(`Paziente: ${patientName}`, margin, 193);
                doc.text('by Movelab', margin, 204);
                drawFooter('01', true);

                // Page 2: method
                doc.addPage();
                drawPageTitle('02', 'Humotion', 'HUMOTION');
                const methodText = 'Il Metodo Humotion unisce intelligenza artificiale, diagnostica avanzata, terapia attiva e supporto umano in un percorso strutturato. Ogni paziente viene accompagnato in una valutazione su misura, pensata per individuare compensi, monitorare il recupero e costruire una nuova consapevolezza del proprio corpo.';
                addLongText(methodText, margin, 61, 106, 6);
                addImageContain(reportImages.therapistStanding, 141, 54, 48, 66, 'Foto fisioterapista');
                addImageContain(reportImages.anatomyBlue, margin, 136, 86, 57, 'Anatomia');
                doc.setFillColor(...dark);
                doc.rect(118, 140, 71, 44, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(255, 255, 255);
                doc.text('TIZIANA GIANNONI', 126, 156);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.text('Fisioterapista', 126, 166);
                doc.text('Metodo Humotion', 126, 174);
                drawFooter('02');

                // Page 3: patient dashboard
                doc.addPage();
                drawPageTitle('03', 'Humotion', 'Mobilita & Diagnosi');
                addImageContain(reportImages.anatomyHead, 154, 24, 32, 32, 'Anatomia');
                drawMetric(margin, 66, 54, 'Indice globale', `${avgScore}/100`, scores.length ? `${scores.length} scan validi` : 'Nessun dato');
                drawMetric(78, 66, 54, 'Confronto misure', trendInfo.comparison.shortLabel, trendInfo.lastDate ? `vs ${trendInfo.lastDate}` : 'Prima visita');
                drawMetric(138, 66, 54, 'Misure', String(measurementCount), `${keypointCount || 0} punti`);
                let barY = 111;
                scanSequence.forEach((step) => {
                    const result = asyncResults[step]?.data;
                    const percent = getResultScorePercent(result);
                    const color = result?.score === 1 ? [239, 68, 68] as const : result?.score === 2 ? [234, 179, 8] as const : green;
                    drawBar(margin, barY, 92, SCAN_DEFINITION_BY_KEY[step].label, percent, color);
                    barY += 12;
                });
                const dashboardNote = `Analisi generata da ${successResults.length}/${scanSequence.length} acquisizioni. ${warningCount > 0 ? `${warningCount} avvisi richiedono revisione clinica.` : 'Nessun avviso critico salvato.'}`;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(...ink);
                doc.text('Note:', 134, 111);
                addLongText(dashboardNote, 134, 121, 56, 5);
                drawFooter('03');

                // Page 4: posture and measurements
                doc.addPage();
                drawPageTitle('04', 'Humotion', 'Valutazione Posturale');
                addImageContain(reportImages.anatomySketch, 142, 51, 45, 45, 'Schema anatomico');
                const postureText = postureOverview
                    ? `${postureOverview.summary} ${postureOverview.findings.length ? `Rilievi principali: ${postureOverview.findings.slice(0, 4).join('; ')}.` : ''}`
                    : 'La scansione posturale non contiene ancora un riepilogo aggregato. Le misure disponibili sono riportate sotto per revisione clinica.';
                let textY = addLongText(postureText, margin, 62, 116, 5.3) + 10;
                textY = Math.max(textY, 118);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(...ink);
                doc.text('Misure rilevate', margin, textY);
                textY += 9;
                const allAngles = scanSequence.flatMap((step) => Object.entries(asyncResults[step]?.data?.angles || {}).map(([key, value]) => ({
                    label: `${SCAN_DEFINITION_BY_KEY[step].short_label} ${localizeMeasurementLabel(key, currentLanguage)}`,
                    value,
                })));
                if (allAngles.length === 0) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(...muted);
                    doc.text('Nessun angolo disponibile.', margin, textY);
                } else {
                    allAngles.slice(0, 12).forEach((angle, index) => {
                        const x = index % 2 === 0 ? margin : 96;
                        const y = textY + (Math.floor(index / 2) * 10);
                        doc.setFillColor(248, 250, 252);
                        doc.rect(x, y - 5, 72, 8, 'F');
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(8);
                        doc.setTextColor(...ink);
                        doc.text(angle.label.slice(0, 27), x + 3, y);
                        doc.setFont('helvetica', 'bold');
                        doc.text(formatAngleValue(Number(angle.value), currentLanguage), x + 47, y);
                    });
                }
                drawFooter('04');

                // Page 5: real-world comparison and extracted placeholders
                doc.addPage();
                drawPageTitle('05', 'Humotion', 'Confronto con la realta');
                addImageContain(reportImages.doctorTablet, margin, 55, 78, 35, 'Foto clinica');
                const modelViews = [
                    ['FRONT', 'Fronte'],
                    ['RIGHT', 'Lato destro'],
                    ['BACK', 'Retro'],
                    ['LEFT', 'Lato sinistro'],
                ] as const;
                modelViews.forEach(([view, label], index) => {
                    const x = index % 2 === 0 ? 108 : 151;
                    const y = 55 + (Math.floor(index / 2) * 47);
                    const dataUrl = capturedImages.current[view];
                    if (dataUrl) {
                        doc.addImage(dataUrl, 'PNG', x, y, 36, 35);
                    } else {
                        doc.setDrawColor(203, 213, 225);
                        doc.setFillColor(248, 250, 252);
                        doc.rect(x, y, 36, 35, 'FD');
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(7);
                        doc.setTextColor(...muted);
                        doc.text('Foto non', x + 8, y + 15);
                        doc.text('disponibile', x + 7, y + 21);
                    }
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(...muted);
                    doc.text(label, x, y + 40);
                });
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(...ink);
                doc.text('Sintesi misure:', margin, 113);
                doc.text('Supporto clinico:', 108, 113);
                addLongText(`${trendInfo.trend}. Misure confrontabili: ${trendInfo.comparison.measurements.comparable}/${trendInfo.comparison.measurements.total}.`, margin, 124, 72, 5);
                addLongText('Le immagini paziente non acquisite vengono sostituite da rendering 3D e asset anatomici estratti dal template originale.', 108, 124, 78, 5);
                drawFooter('05');

                // Page 6: contacts
                doc.addPage();
                drawPageTitle('06', 'Humotion', 'Informazioni');
                addImageContain(reportImages.therapistSitting, 139, 48, 48, 64, 'Foto studio');
                addLongText('Il report Humotion combina dati oggettivi, confronto storico e interpretazione fisioterapica. Le indicazioni operative devono essere sempre validate dal professionista prima di definire il piano terapeutico.', margin, 62, 108, 5.5);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);
                doc.setTextColor(...ink);
                doc.text('I nostri contatti', margin, 130);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.text('Telefono: +39 3891909556', margin, 145);
                doc.text('Indirizzo: Viale Europa 155 - Marlia (LU)', margin, 156);
                doc.text('Sito: www.movelabfisioterapia.com', margin, 167);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(28);
                doc.setTextColor(...green);
                doc.text('GRAZIE!', margin, 207);
                drawFooter('06');

                doc.save(`Humotion_Report_${patient?.cognome || 'Guest'}.pdf`);
                return;
            }

            /*
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);
            let yPos = 20;

            const ensureSpace = (height: number) => {
                if (yPos + height > pageHeight - 18) {
                    doc.addPage();
                    yPos = 20;
                }
            };

            const drawSectionTitle = (title: string) => {
                ensureSpace(14);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.setTextColor(17, 24, 39);
                doc.text(title, margin, yPos);
                doc.setFillColor(34, 197, 94);
                doc.rect(margin, yPos + 3, 36, 1.4, 'F');
                yPos += 11;
                doc.setFont("helvetica", "normal");
            };

            const drawMetricCard = (x: number, y: number, width: number, title: string, value: string, note?: string) => {
                doc.setDrawColor(226, 232, 240);
                doc.setFillColor(248, 250, 252);
                doc.rect(x, y, width, 27, 'FD');
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text(title.toUpperCase(), x + 4, y + 7);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(15);
                doc.setTextColor(15, 23, 42);
                doc.text(value, x + 4, y + 17);
                if (note) {
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7);
                    doc.setTextColor(100, 116, 139);
                    doc.text(note, x + 4, y + 23);
                }
                doc.setFont("helvetica", "normal");
            };

            // --- Header ---
            const dateStr = new Date().toLocaleDateString('it-IT');
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageWidth, 38, 'F');
            doc.setFillColor(34, 197, 94);
            doc.rect(0, 35, pageWidth, 3, 'F');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(21);
            doc.setTextColor(255, 255, 255);
            doc.text("HUMOTION", margin, 16);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.text("Report biomeccanico e lettura dati", margin, 25);
            doc.setFontSize(9);
            doc.text(`Generato il ${dateStr}`, pageWidth - margin - 38, 16);
            yPos = 50;

            // --- Patient Info Box ---
            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, yPos, contentWidth, 36, 'FD');

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(33, 33, 33);
            doc.text(patient ? `${patient.nome} ${patient.cognome}` : 'Ospite', margin + 5, yPos + 9);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            const patientMeta = [
                `ID: ${patient?.id ? patient.id.slice(0, 8) : '-'}`,
                `Sesso: ${patient?.sesso || '-'}`,
                `Altezza/Peso: ${patient?.altezza || '-'} cm / ${patient?.peso || '-'} kg`,
                `Analisi: ${currentAnalysisLabel}`,
            ];
            patientMeta.forEach((item, index) => {
                const x = margin + 5 + ((index % 2) * (contentWidth / 2));
                const y = yPos + 19 + (Math.floor(index / 2) * 8);
                doc.text(item, x, y);
            });
            yPos += 48;

            // --- Section 1: Sintesi e Andamento ---
            drawSectionTitle("1. Sintesi e confronto");

            // Calculate Global Score
            const successResults = Object.values(asyncResults).filter(r => r.status === 'success' && r.data).map(r => r.data!);
            const scores = successResults.map(r => r.score);
            const rawAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            const avgScore = (rawAvg / 3) * 100;

            const trendInfo = calculateTrends();
            const postureOverview = buildPostureOverview();
            const comparison = trendInfo.comparison;
            const cardGap = 5;
            const cardWidth = (contentWidth - (cardGap * 2)) / 3;
            drawMetricCard(margin, yPos, cardWidth, "Indice globale", `${avgScore.toFixed(0)}/100`, scores.length ? `${scores.length} risultati validi` : 'Nessun risultato');
            drawMetricCard(margin + cardWidth + cardGap, yPos, cardWidth, "Confronto misure", comparison.shortLabel, trendInfo.lastDate ? `vs ${trendInfo.lastDate}` : 'Prima visita');
            drawMetricCard(margin + ((cardWidth + cardGap) * 2), yPos, cardWidth, "Scansioni", `${successResults.length}/${scanSequence.length}`, selectedScanDefinitions.map((definition) => definition.short_label).join(', ') || 'N/D');
            yPos += 38;

            const summaryText = `Il paziente ha ottenuto un Indice Globale di ${avgScore.toFixed(0)}/100. ` +
                (avgScore > 80 ? "La mobilita generale e ottima." : avgScore > 50 ? "Sono presenti alcune limitazioni motorie da monitorare." : "Si rilevano deficit significativi.") +
                `\nScansioni eseguite: ${selectedScanDefinitions.map((definition) => definition.label).join(', ') || 'N/D'}.` +
                `\nConfronto misure: ${trendInfo.trend}${trendInfo.lastDate ? ` (visita precedente: ${trendInfo.lastDate})` : ''}.`;

            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85);
            const splitSummary = doc.splitTextToSize(summaryText, pageWidth - (margin * 2));
            doc.text(splitSummary, margin, yPos);
            yPos += (splitSummary.length * 6) + 10;

            if (postureOverview) {
                drawSectionTitle("2. Valutazione posturale");

                doc.setFontSize(11);
                doc.setTextColor(33, 33, 33);
                const postureText = `${postureOverview.summary} ${postureOverview.findings.length > 0 ? `Rilievi: ${postureOverview.findings.join('; ')}.` : ''}`;
                const splitPosture = doc.splitTextToSize(postureText, pageWidth - (margin * 2));
                doc.text(splitPosture, margin, yPos);
                yPos += (splitPosture.length * 6) + 6;

                Object.entries(postureOverview.views).forEach(([view, postureView]) => {
                    if (!postureView) return;
                    if (yPos > 260) { doc.addPage(); yPos = 20; }
                    doc.setFontSize(10);
                    doc.setTextColor(60, 60, 60);
                    doc.text(`Vista ${view}: ${postureView.summary}`, margin + 2, yPos);
                    yPos += 6;
                    Object.values(postureView.metrics || {}).forEach((metric) => {
                        doc.text(`- ${metric.label}: ${metric.value.toFixed(1)} ${metric.unit}`, margin + 5, yPos);
                        yPos += 5;
                    });
                    yPos += 3;
                });
            }

            if (comparison.measurements.items.length > 0) {
                if (yPos > 230) { doc.addPage(); yPos = 20; }
                drawSectionTitle("3. Confronto misure");
                doc.setFontSize(9);
                doc.setTextColor(71, 85, 105);
                comparison.measurements.items.slice(0, 18).forEach((item) => {
                    if (yPos > 275) { doc.addPage(); yPos = 20; }
                    const previous = item.previousValue === null ? '-' : `${item.previousValue.toFixed(1)} ${item.unit}`;
                    const delta = item.delta === null ? '-' : `${item.delta > 0 ? '+' : ''}${item.delta.toFixed(1)} ${item.unit}`;
                    const outcome = item.direction === 'improved'
                        ? 'migliorata'
                        : item.direction === 'worse'
                            ? 'peggiorata'
                            : item.direction === 'new'
                                ? 'nuova'
                                : 'stabile';
                    doc.text(
                        `${item.scanLabel} - ${item.label}: ${item.value.toFixed(1)} ${item.unit} | prec. ${previous} | delta ${delta} | ${outcome}`,
                        margin + 2,
                        yPos,
                    );
                    yPos += 5;
                });
                if (comparison.measurements.items.length > 18) {
                    doc.text(`Altre ${comparison.measurements.items.length - 18} misure disponibili nel dettaglio visita.`, margin + 2, yPos);
                    yPos += 6;
                }
            }

            if (yPos > 240) { doc.addPage(); yPos = 20; }

            // --- Section 3: Immagini (Photos) ---
            drawSectionTitle("4. Dettaglio visivo");

            const views = ['FRONT', 'RIGHT', 'BACK', 'LEFT'];
            const labels = ['Fronte', 'Lato Destro', 'Retro', 'Lato Sinistro'];
            const imgWidth = 80;
            const imgHeight = 60;

            views.forEach((v, i) => {
                const imgData = capturedImages.current[v];
                if (imgData) {
                    // Check new page
                    if (yPos + imgHeight > 280) {
                        doc.addPage();
                        yPos = 20;
                    }

                    const x = (i % 2 === 0) ? margin : margin + imgWidth + 10;
                    // Fix Y for grid
                    const currentRowY = yPos + (Math.floor(i / 2) * (imgHeight + 15));

                    doc.addImage(imgData, 'PNG', x, currentRowY, imgWidth, imgHeight);
                    doc.setFontSize(9);
                    doc.setTextColor(100, 100, 100);
                    doc.text(labels[i], x, currentRowY + imgHeight + 5);
                }
            });
            yPos += (imgHeight * 2) + 30; // Move past grid

            if (yPos > 250) { doc.addPage(); yPos = 20; }

            // --- Section 4: Dettaglio Tecnico (Scores & Measurements) ---
            drawSectionTitle("4. Analisi tecnica dettagliata");

            scanSequence.forEach(step => {
                const res = asyncResults[step]?.data;
                const label = SCAN_DEFINITION_BY_KEY[step].label;

                if (yPos > 260) { doc.addPage(); yPos = 20; }

                // Limb Header
                doc.setFillColor(245, 247, 250);
                doc.setDrawColor(220, 220, 220);
                doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'FD');
                doc.setFontSize(11);
                doc.setTextColor(33, 33, 33);
                doc.setFont("helvetica", "bold");
                doc.text(label, margin + 2, yPos + 6);

                // Score
                const scoreLabel = res ? `${res.score}/3` : "N/D";
                doc.text(`Punteggio: ${scoreLabel}`, pageWidth - margin - 30, yPos + 6);
                doc.setFont("helvetica", "normal");
                yPos += 14;

                if (res) {
                    // Measurements (Angles)
                    doc.setFontSize(10);
                    doc.text("Misurazioni (Angoli):", margin + 2, yPos);
                    yPos += 6;

                    if (res.angles && Object.keys(res.angles).length > 0) {
                        let xOff = margin + 5;
                        Object.entries(res.angles).forEach(([k, v]) => {
                            const txt = `${k}: ${v.toFixed(1)} deg`;
                            if (xOff + doc.getTextWidth(txt) > pageWidth - margin) {
                                yPos += 6;
                                xOff = margin + 5;
                            }
                            doc.text(txt, xOff, yPos);
                            xOff += 40;
                        });
                        yPos += 8;
                    } else {
                        doc.setTextColor(150, 150, 150);
                        doc.text("- Nessun angolo rilevante", margin + 5, yPos);
                        doc.setTextColor(33, 33, 33);
                        yPos += 8;
                    }

                    // Keypoints count (stub)
                    // doc.text(`Punti tracciati: ${res.landmarks?.length || 0}`, margin + 5, yPos);
                    // yPos += 6;
                } else {
                    doc.setTextColor(150, 150, 150);
                    doc.text("Dato non acquisito", margin + 5, yPos);
                    doc.setTextColor(33, 33, 33);
                    yPos += 8;
                }

                yPos += 5; // Spacer
            });

            doc.save(`PhysioAI_Report_${patient?.cognome || 'Guest'}.pdf`);
            */

        } catch (err) {
            console.error("PDF Generation error:", err);
            alert("Errore generazione PDF");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // --- Render Helpers ---
    const renderProgressBar = () => (
        <div className="flex justify-between mb-8 px-4">
            {scanSequence.map((step, idx) => {
                const currentIndex = currentStep === 'SUMMARY'
                    ? scanSequence.length
                    : currentStep === 'SETUP'
                        ? -1
                        : scanSequence.indexOf(currentStep);
                const isCompleted = currentIndex > idx || asyncResults[step]?.status === 'success';
                const isActive = step === currentStep;
                const resultStatus = asyncResults[step]?.status;

                return (
                    <div key={step} className="flex flex-col items-center gap-2 relative">
                        {/* Connection line */}
                        {idx < scanSequence.length - 1 && (
                            <div
                                className={`absolute top-4 left-full h-0.5 -z-10 ${isCompleted ? 'bg-green-200' : 'bg-gray-200'}`}
                                style={{ width: `${Math.max(48, 360 / Math.max(scanSequence.length, 1))}px` }}
                            />
                        )}

                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all relative
                            ${isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110' :
                                isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>

                            {/* Inner Status Icon */}
                            {resultStatus === 'pending' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                            {resultStatus === 'success' && <CheckCircle className="w-5 h-5" />}
                            {resultStatus === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                            {!resultStatus && <span>{idx + 1}</span>}
                        </div>
                        <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                            {SCAN_DEFINITION_BY_KEY[step].short_label}
                        </span>
                    </div>
                );
            })}
        </div>
    );

    const renderSetup = () => (
        <div className="text-center space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-bold text-gray-800">Configura la scansione del paziente</h2>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-left space-y-4">
                <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg"><User className="w-5 h-5 text-blue-600" /></div>
                    <div>
                        <h4 className="font-semibold text-gray-900">Piano dinamico di acquisizione</h4>
                        <p className="text-sm text-gray-600">
                            Seleziona liberamente le scansioni da eseguire. Ogni acquisizione dura 10 secondi,
                            viene inviata al server in sequenza e i risultati vengono elaborati in modo asincrono.
                        </p>
                        <p className="text-xs text-blue-700 mt-2">
                            Configurazione iniziale: <span className="font-semibold">{getAnalysisTypeLabel(visit?.tipo_analisi)}</span>.
                            {visit?.tipo_analisi === AnalysisType.PERSONALIZZATA || !visit?.tipo_analisi
                                ? ' Scegli i componenti che vuoi eseguire.'
                                : ' Il preset puo essere modificato prima di avviare la scansione.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                {SCAN_DEFINITIONS.map((definition) => {
                    const selected = selectedScanKeys.includes(definition.key);
                    return (
                        <button
                            key={definition.key}
                            type="button"
                            onClick={() => toggleScanSelection(definition.key)}
                            className={`p-4 rounded-2xl border transition-all text-left ${selected
                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-gray-300'}`}
                        >
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                    <div className="text-sm font-semibold text-gray-900">{definition.label}</div>
                                    <div className="text-xs uppercase tracking-wide text-gray-500">{definition.category.replace('_', ' ')}</div>
                                </div>
                                {selected ? <CheckCircle className="w-5 h-5 text-blue-600" /> : <div className="w-5 h-5 rounded-full border border-gray-300" />}
                            </div>
                            <p className="text-sm text-gray-600">{definition.description}</p>
                            <p className="mt-2 text-xs text-gray-500">{definition.setup_hint}</p>
                        </button>
                    );
                })}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 text-left space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h4 className="font-semibold text-gray-900">Scansioni selezionate</h4>
                        <p className="text-sm text-gray-500">
                            {selectedScanDefinitions.length > 0
                                ? `${selectedScanDefinitions.length} acquisizioni previste, durata guidata circa ${formattedPlannedDuration}. Tipo risultante: ${currentAnalysisLabel}.`
                                : 'Nessuna scansione selezionata.'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {selectedScanDefinitions.length > 0 ? selectedScanDefinitions.map((definition) => (
                        <span key={definition.key} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                            {definition.label}
                        </span>
                    )) : (
                        <span className="text-sm text-red-600">Seleziona almeno una voce dalla checklist.</span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-5xl mx-auto">
                {CAMERA_VIEWS.map((view) => {
                    const hasDevice = Boolean(getSelectedDeviceIdForView(view));
                    return (
                        <div key={`setup-preview-${view}`} className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-lg">
                            <div className="absolute inset-0 flex items-center justify-center">
                                {hasDevice ? (
                                    <video
                                        ref={getVideoRefForView(view)}
                                        className={getPreviewVideoClassName(view)}
                                        style={getPreviewVideoStyle(view)}
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <span className="text-sm text-gray-400">Camera non assegnata</span>
                                )}
                            </div>
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                                <span className="inline-block bg-black/65 text-white text-xs px-3 py-1 rounded-full">
                                    {CAMERA_VIEW_LABELS[view]}
                                </span>
                                <span className="inline-block bg-black/65 text-white text-xs px-3 py-1 rounded-full">
                                    {getCameraRotation(view)}°
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
                {CAMERA_VIEWS.filter((view) => getSelectedDeviceIdForView(view)).map((view) => (
                    <button
                        key={`setup-rotation-${view}`}
                        type="button"
                        onClick={() => cycleCameraRotation(view)}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                        <RotateCw className="w-4 h-4" />
                        {CAMERA_VIEW_LABELS[view]} {getCameraRotation(view)}°
                    </button>
                ))}
            </div>

            <button
                onClick={startScanSequence}
                disabled={selectedScanDefinitions.length === 0 || (!selectedDeviceId && !leftDeviceId && !rightDeviceId)}
                className={`w-full max-w-md py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 mx-auto
                 ${selectedScanDefinitions.length > 0 && (selectedDeviceId || leftDeviceId || rightDeviceId)
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
                Avvia {selectedScanDefinitions.length || 0} scansioni <ChevronRight className="w-6 h-6" />
            </button>
        </div>
    );

    const renderActivePhase = () => (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            <div className="text-center mb-2">
                <h2 className="text-3xl font-bold text-gray-900">{currentScanDefinition?.label || STEP_LABELS[currentStep]}</h2>
                <p className="text-gray-500 text-lg">{currentScanDefinition?.instructions || (phase === 'COUNTDOWN' ? 'Preparati...' : 'Esegui il movimento')}</p>
            </div>

            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-4 ring-gray-100">
                <div className="absolute inset-0 flex items-center justify-center">
                    <video
                        ref={videoRef}
                        className={getPreviewVideoClassName('front')}
                        style={getPreviewVideoStyle('front')}
                        muted
                        playsInline
                    />
                </div>

                {/* Countdown Overlay */}
                {phase === 'COUNTDOWN' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm transition-all">
                        <div className="text-9xl font-black text-white drop-shadow-2xl animate-bounce">
                            {timeLeft}
                        </div>
                        <p className="text-white text-xl font-semibold mt-4 bg-blue-600/80 px-6 py-2 rounded-full">
                            {currentScanDefinition?.short_label || 'Scan'} in partenza...
                        </p>
                    </div>
                )}

                {/* Recording Overlay */}
                {phase === 'RECORDING' && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-6 right-6 flex items-center gap-3 bg-red-600/90 text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
                            <div className="w-3 h-3 bg-white rounded-full" />
                            <span className="font-mono font-bold text-xl">REC 00:{timeLeft.toString().padStart(2, '0')}</span>
                        </div>
                        {/* Framing Guide or Center Line could be added here */}
                        <div className="absolute inset-0 border-4 border-red-500/30 rounded-2xl" />
                    </div>
                )}

                <div className="absolute bottom-5 left-5 bg-black/60 text-white text-xs px-3 py-2 rounded-full">
                    Rotazione frontale: {getCameraRotation('front')}°
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
                {CAMERA_VIEWS.filter((view) => getSelectedDeviceIdForView(view)).map((view) => (
                    <button
                        key={`active-rotation-${view}`}
                        type="button"
                        onClick={() => cycleCameraRotation(view)}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                        <RotateCw className="w-4 h-4" />
                        {CAMERA_VIEW_LABELS[view]} {getCameraRotation(view)}°
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['left', 'right'] as CameraView[]).filter((view) => getSelectedDeviceIdForView(view)).map((view) => (
                    <div key={`active-preview-${view}`} className="aspect-video bg-black rounded-xl overflow-hidden relative shadow">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <video
                                ref={getVideoRefForView(view)}
                                className={getPreviewVideoClassName(view)}
                                style={getPreviewVideoStyle(view)}
                                muted
                                playsInline
                            />
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                            <span className="bg-black/65 text-white text-xs px-3 py-1 rounded-full">
                                {CAMERA_VIEW_LABELS[view]}
                            </span>
                            <span className="bg-black/65 text-white text-xs px-3 py-1 rounded-full">
                                {getCameraRotation(view)}°
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderSummary = () => {
        // Calculate average only from successful results
        const successResults = Object.values(asyncResults).filter(r => r.status === 'success' && r.data).map(r => r.data!);
        const scores = successResults.map((result) => getResultScorePercent(result));
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        // Find "Best" mesh to display (highest scored region or default)
        const bestResult = [...successResults].sort((a, b) => b.score - a.score)[0];
        const displayResult = [...successResults].sort((a, b) => (
            Number(Boolean(b.smpl_mesh)) - Number(Boolean(a.smpl_mesh))
            || b.score - a.score
        ))[0];

        // Check if any are still pending
        const isAnalyzing = Object.values(asyncResults).some(r => r.status === 'pending') || hasPendingSmplResults;

        const stepResultsMap: Record<string, LimbResult> = {};
        scanSequence.forEach(step => {
            if (asyncResults[step]?.status === 'success' && asyncResults[step].data) {
                stepResultsMap[step] = asyncResults[step].data!;
            }
        });

        const postureOverview = buildPostureOverview();
        const upperBodyPostureOverview = buildPostureOverview('posture_upper_body');
        const smplPreviewNote = extractSmplPreviewNote((displayResult || bestResult)?.smpl_params);
        const trendInfo = calculateTrends();
        return (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold text-gray-900">Modello 3D Ricostruito</h2>
                        {isAnalyzing ? (
                            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 inline-flex px-4 py-2 rounded-full">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="font-medium">Elaborazione finale in corso...</span>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-lg">Analisi biomeccanica e posturale completa</p>
                        )}
                    </div>

                    <button
                        onClick={handleGeneratePdf}
                        disabled={isGeneratingPdf || isAnalyzing}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg transition-all
                            ${isGeneratingPdf || isAnalyzing
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'}`}
                    >
                        {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                        {isGeneratingPdf ? "Generazione PDF..." : "Scarica Report PDF"}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
                    {/* Unified 3D Model View */}
                    <div className="lg:col-span-2 bg-gray-900 rounded-3xl overflow-hidden shadow-2xl relative">
                        {bestResult ? (
                            <>
                                <Scene
                                    result={displayResult || bestResult}
                                    stepResults={stepResultsMap}
                                    subjectProfile={subjectProfile}
                                    captureView={captureView}
                                    onCapture={handleCapture}
                                />
                                <div className="absolute bottom-8 left-8 text-white max-w-md pointer-events-none">
                                    <h3 className="text-2xl font-bold mb-2">{smplPreviewNote ? 'Preview 3D' : 'Ricostruzione Digitale'}</h3>
                                    <p className={`${smplPreviewNote ? 'text-amber-200' : 'text-gray-300'} text-sm`}>
                                        {smplPreviewNote || 'Modello generato combinando i dati delle viste disponibili.'}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 flex-col gap-4">
                                <Box className="w-16 h-16 opacity-50" />
                                <p>Nessun dato 3D disponibile</p>
                            </div>
                        )}
                    </div>

                    {/* Metrics Panel */}
                    <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-indigo-600" />
                            <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider text-xs">Indice Globale</div>
                            <div className="text-6xl font-black text-gray-900 tracking-tight">{avgScore.toFixed(0)}</div>
                            <div className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold
                                ${avgScore >= 80 ? 'bg-green-100 text-green-700' : avgScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                {avgScore >= 80 ? 'Ottimo' : avgScore >= 50 ? 'Medio' : 'Attenzione'}
                            </div>
                        </div>

                        
                        {(postureOverview || upperBodyPostureOverview) && (
                            <div className="grid grid-cols-1 gap-4">
                                {postureOverview && (
                                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider text-xs">Valutazione Posturale</div>
                                                <div className="text-lg font-bold text-gray-900">Postura completa</div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${qualityClasses[postureOverview.quality]}`}>
                                                {postureOverview.score}/3
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">{postureOverview.summary}</p>
                                        {postureOverview.findings.length > 0 && (
                                            <div className="space-y-2">
                                                {postureOverview.findings.map((finding) => (
                                                    <div key={finding} className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                                                        {finding}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {upperBodyPostureOverview && (
                                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider text-xs">Valutazione preliminare</div>
                                                <div className="text-lg font-bold text-gray-900">Upper body</div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${qualityClasses[upperBodyPostureOverview.quality]}`}>
                                                {upperBodyPostureOverview.score}/3
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">{upperBodyPostureOverview.summary}</p>
                                        {upperBodyPostureOverview.findings.length > 0 && (
                                            <div className="space-y-2">
                                                {upperBodyPostureOverview.findings.map((finding) => (
                                                    <div key={finding} className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                                                        {finding}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider text-xs">Lettura dati</div>
                                    <div className="text-lg font-bold text-gray-900">Confronto misure</div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${trendInfo.comparison.className}`}>
                                    {trendInfo.comparison.shortLabel}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                                    <div className="text-xl font-black text-gray-900">{trendInfo.comparison.measurements.improved}</div>
                                    <div className="text-[11px] text-gray-500 uppercase">Migliorate</div>
                                </div>
                                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                                    <div className="text-xl font-black text-gray-900">{trendInfo.comparison.measurements.comparable || '-'}</div>
                                    <div className="text-[11px] text-gray-500 uppercase">Confrontabili</div>
                                </div>
                                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                                    <div className="text-xl font-black text-gray-900">{trendInfo.comparison.measurements.worsened}</div>
                                    <div className="text-[11px] text-gray-500 uppercase">Peggiorate</div>
                                </div>
                            </div>
                        </div>

{/* Detailed List */}
                        <div className="space-y-3">
                            {scanSequence.map((step) => {
                                const res = asyncResults[step];
                                const data = res?.data;
                                const isExpanded = expandedStep === step;

                                // Filter landmarks relevant to this step for display
                                const relevantLandmarks = (data?.landmarks ?? [])
                                    .map((lm: any, idx: number) => ({ ...lm, name: getLandmarkNameByIndex(idx) }))
                                    .filter((lm: any) => (
                                        step === 'POSTURE'
                                        || (step === 'POSTURE_UPPER' && POSTURE_UPPER_LANDMARKS.has(lm.name))
                                        || LANDMARK_TO_STEP[lm.name] === step
                                    ));

                                return (
                                    <div key={step} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                                        <div
                                            onClick={() => setExpandedStep(isExpanded ? null : step)}
                                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                {res?.status === 'pending' ? (
                                                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                                ) : res?.status === 'error' ? (
                                                    <XCircle className="w-5 h-5 text-red-500" />
                                                ) : (
                                                    <CheckCircle className={`w-5 h-5 ${data?.quality === 'green' ? 'text-green-500' : 'text-yellow-500'}`} />
                                                )}
                                                <span className="font-semibold text-gray-700">{SCAN_DEFINITION_BY_KEY[step].label}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {data && <span className="font-bold text-gray-900">{getResultScorePercent(data)}/100</span>}
                                                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                            </div>
                                        </div>
                                        {data && (
                                            <div className="px-4 pb-4">
                                                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                                    <div
                                                        className={`h-full rounded-full ${data.score >= 3 ? 'bg-green-500' : data.score === 2 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                        style={{ width: `${Math.max(8, getResultScorePercent(data))}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Detailed Expansion */}
                                        {isExpanded && res?.status === 'error' && (
                                            <div className="bg-red-50 p-4 border-t border-red-100 text-sm animate-in slide-in-from-top-2 duration-200">
                                                <p className="text-red-700 font-medium">Errore scansione</p>
                                                <p className="text-red-600 text-xs mt-1 break-words">{res.error || 'Errore non specificato.'}</p>
                                            </div>
                                        )}

                                        {isExpanded && data && (
                                            <div className="bg-gray-50 p-4 border-t border-gray-100 text-sm space-y-4 animate-in slide-in-from-top-2 duration-200">

                                                {/* Angles */}
                                                <div>
                                                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                                        <Activity className="w-3 h-3 text-blue-500" /> Angoli Rilevati (Range of Motion)
                                                    </h4>
                                                    {data.angles && Object.keys(data.angles).length > 0 ? (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {Object.entries(data.angles).map(([key, val]) => (
                                                                <div key={key} className="bg-white px-3 py-2 rounded-lg border border-gray-200 flex justify-between items-center">
                                                                    <span className="text-gray-500">{localizeMeasurementLabel(key, currentLanguage)}</span>
                                                                    <span className="font-mono font-bold text-gray-900">{formatAngleValue(val, currentLanguage)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-400 italic text-xs">Nessun angolo critico calcolato per questa parte.</p>
                                                    )}
                                                </div>

                                                {/* Keypoints */}
                                                <div>
                                                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                                        <Target className="w-3 h-3 text-blue-500" /> Punti Tracciati ({relevantLandmarks?.length || 0})
                                                    </h4>
                                                    {relevantLandmarks && relevantLandmarks.length > 0 ? (
                                                        <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto pr-1">
                                                            {relevantLandmarks.map((lm, i) => (
                                                                <div key={i} className="flex justify-between text-xs text-gray-600 bg-white/50 px-2 py-1 rounded">
                                                                    <span>{localizeLandmarkName(lm.name, currentLanguage)}</span>
                                                                    <span className="font-mono text-[10px] text-gray-400">
                                                                        vis: {(lm.visibility * 100).toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-400 italic text-xs">Punti specifici non disponibili.</p>
                                                    )}
                                                </div>

                                                {/* Feedback Text */}
                                                {data.feedback && (
                                                    <div className="bg-blue-50 text-blue-800 px-3 py-2 rounded-lg text-xs leading-relaxed border border-blue-100">
                                                        "{data.feedback}"
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={handleSaveAndClose}
                            disabled={hasPendingSmplResults}
                            className={`w-full py-4 rounded-xl font-bold transition-colors shadow-lg mt-auto ${
                                hasPendingSmplResults
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-gray-900 text-white hover:bg-gray-800'
                            }`}
                        >
                            {hasPendingSmplResults ? 'Attendo modello 3D...' : 'Salva e Chiudi'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans">
            <header className="max-w-7xl mx-auto flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={handleBackRequest} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6 text-gray-700" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            {currentStep === 'SUMMARY' ? 'Analisi Biometrica' : 'Scansione Guidata'}
                        </h1>
                        {patient && <p className="text-gray-500 text-sm font-medium">{patient.nome} {patient.cognome}</p>}
                    </div>
                </div>

                {currentStep !== 'SUMMARY' && (
                    <div className="hidden sm:flex items-center gap-3 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                        <Camera className="w-4 h-4 text-gray-500" />

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500">{CAMERA_VIEW_SHORT_LABELS.front}</span>
                            <select
                                value={selectedDeviceId || ''}
                                onChange={e => handleDeviceSelection('front', e.target.value)}
                                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600"
                            >
                                {videoDevices.map((device) => {
                                    const assignedElsewhere = isDeviceAssignedToAnotherView('front', device.deviceId) && device.deviceId !== selectedDeviceId;
                                    return (
                                        <option key={device.deviceId} value={device.deviceId} disabled={assignedElsewhere}>
                                            {getDeviceOptionLabel(device.deviceId)}{assignedElsewhere ? ' (in uso)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                            <button
                                type="button"
                                onClick={() => cycleCameraRotation('front')}
                                className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                                title="Ruota anteprima e registrazione della camera frontale di 90 gradi"
                            >
                                <RotateCw className="w-3.5 h-3.5" />
                                {getCameraRotation('front')}°
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500">{CAMERA_VIEW_SHORT_LABELS.left}</span>
                            <select
                                value={leftDeviceId || ''}
                                onChange={e => handleDeviceSelection('left', e.target.value)}
                                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600"
                            >
                                <option value="">N/A</option>
                                {videoDevices.map((device) => {
                                    const assignedElsewhere = isDeviceAssignedToAnotherView('left', device.deviceId) && device.deviceId !== leftDeviceId;
                                    return (
                                        <option key={`left-${device.deviceId}`} value={device.deviceId} disabled={assignedElsewhere}>
                                            {getDeviceOptionLabel(device.deviceId)}{assignedElsewhere ? ' (in uso)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                            <button
                                type="button"
                                onClick={() => cycleCameraRotation('left')}
                                className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                                title="Ruota anteprima e registrazione della camera sinistra di 90 gradi"
                            >
                                <RotateCw className="w-3.5 h-3.5" />
                                {getCameraRotation('left')}°
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500">{CAMERA_VIEW_SHORT_LABELS.right}</span>
                            <select
                                value={rightDeviceId || ''}
                                onChange={e => handleDeviceSelection('right', e.target.value)}
                                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600"
                            >
                                <option value="">N/A</option>
                                {videoDevices.map((device) => {
                                    const assignedElsewhere = isDeviceAssignedToAnotherView('right', device.deviceId) && device.deviceId !== rightDeviceId;
                                    return (
                                        <option key={`right-${device.deviceId}`} value={device.deviceId} disabled={assignedElsewhere}>
                                            {getDeviceOptionLabel(device.deviceId)}{assignedElsewhere ? ' (in uso)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                            <button
                                type="button"
                                onClick={() => cycleCameraRotation('right')}
                                className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                                title="Ruota anteprima e registrazione della camera destra di 90 gradi"
                            >
                                <RotateCw className="w-3.5 h-3.5" />
                                {getCameraRotation('right')}°
                            </button>
                        </div>
                    </div>
                )}
            </header>

            <main className="max-w-7xl mx-auto">
                {error && (
                    <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 animate-pulse">
                        <XCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {renderProgressBar()}

                <div className="min-h-[600px]">
                    {currentStep === 'SETUP' && renderSetup()}
                    {(currentStep !== 'SETUP' && currentStep !== 'SUMMARY') && renderActivePhase()}
                    {currentStep === 'SUMMARY' && renderSummary()}
                </div>
            </main>

            {/* Admin Only Diagnostics Panel */}
            {user?.isAdmin && <AdminStatusPanel />}
        </div>
    );
};

export { ScanPage };





























