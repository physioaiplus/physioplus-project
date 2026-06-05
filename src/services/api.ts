/**
 * Servizio API centralizzato
 */
import { API_ENDPOINTS } from '../constants';
import { API_BASE_URL } from '../config/api';
import type {
    Patient,
    NewPatientFormData,
    AnalysisType,
    LoginFormData,
    ApiResponse,
    CameraView,
    MultiCameraRecordingPayload,
} from '../types';

import { auth } from '../config/firebase';

const extractScanIdFromResponse = (payload: unknown): string | null => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const response = payload as Record<string, any>;
    const data = response.data && typeof response.data === 'object' ? response.data : null;

    const candidates = [
        data?.scan_id,
        data?.scanId,
        data?.id,
        response.scan_id,
        response.scanId,
        response.id,
    ];

    const resolved = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
    return typeof resolved === 'string' ? resolved : null;
};

class ApiService {
    private apiBaseUrl: string;
    private visitsCollectionPath = '/api/visits';

    constructor(apiBaseUrl: string) {
        this.apiBaseUrl = apiBaseUrl;
    }

    private async getAuthHeaders(includeJsonContentType = true): Promise<Record<string, string>> {
        const headers: Record<string, string> = {};

        if (includeJsonContentType) {
            headers['Content-Type'] = 'application/json';
        }

        if (auth.currentUser) {
            try {
                const token = await auth.currentUser.getIdToken();
                headers['Authorization'] = `Bearer ${token}`;
            } catch (e) {
                console.warn('Failed to get id token', e);
            }
        }

        return headers;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        const url = `${this.apiBaseUrl}${endpoint}`;

        const headers = {
            ...(await this.getAuthHeaders(true)),
            ...(options.headers as Record<string, string>),
        };

        const requestOptions: RequestInit = {
            headers,
            ...options,
        };

        try {
            const response = await fetch(url, requestOptions);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async login(formData: LoginFormData): Promise<ApiResponse<any>> {
        return { success: true, data: { uid: 'demo-user-123', email: formData.email } };
    }

    async verifyToken(token: string): Promise<ApiResponse<any>> {
        return this.request(API_ENDPOINTS.AUTH.VERIFY, {
            method: 'POST',
            body: JSON.stringify({ token }),
        });
    }

    async logout(): Promise<ApiResponse<any>> {
        return this.request(API_ENDPOINTS.AUTH.LOGOUT, {
            method: 'POST',
        });
    }

    async getPatients(): Promise<ApiResponse<Patient[]>> {
        return this.request(API_ENDPOINTS.PATIENTS.LIST);
    }

    async getPatient(patientId: string): Promise<ApiResponse<Patient>> {
        return this.request(API_ENDPOINTS.PATIENTS.GET.replace(':id', patientId));
    }

    async createPatient(patientData: NewPatientFormData): Promise<ApiResponse<any>> {
        return this.request(API_ENDPOINTS.PATIENTS.CREATE, {
            method: 'POST',
            body: JSON.stringify(patientData),
        });
    }

    async createVisit(
        patientId: string,
        operatorId: string,
        tipoAnalisi: AnalysisType,
        note?: string,
        extra?: Record<string, any>,
    ): Promise<ApiResponse<any>> {
        return this.request(API_ENDPOINTS.VISITS.CREATE, {
            method: 'POST',
            body: JSON.stringify({
                patient_id: patientId,
                operator_id: operatorId,
                tipo_analisi: tipoAnalisi,
                note: note || '',
                ...(extra || {}),
            }),
        });
    }

    async getVisit(visitId: string): Promise<ApiResponse<any>> {
        return this.request(API_ENDPOINTS.VISITS.GET.replace(':id', visitId));
    }

    async updateVisitExercises(visitId: string, exercises: any[] | Record<string, any>): Promise<ApiResponse<any>> {
        return this.request(API_ENDPOINTS.VISITS.UPDATE_EXERCISES.replace(':id', visitId), {
            method: 'PUT',
            body: JSON.stringify(exercises),
        });
    }

    async getPatientVisits(patientId: string): Promise<ApiResponse<any[]>> {
        return this.request(`${this.visitsCollectionPath}?patient_id=${patientId}`);
    }

    async getAllVisits(limit?: number): Promise<ApiResponse<any[]>> {
        const qs = limit ? `?limit=${limit}` : '';
        return this.request(`${this.visitsCollectionPath}${qs}`);
    }

    async startCamera(): Promise<ApiResponse<any>> {
        return this.request(API_ENDPOINTS.CAMERA.START, {
            method: 'POST',
        });
    }

    async stopCamera(): Promise<ApiResponse<any>> {
        return this.request(API_ENDPOINTS.CAMERA.STOP, {
            method: 'POST',
        });
    }

    async getCameraStatus(): Promise<ApiResponse<any>> {
        return this.request(API_ENDPOINTS.CAMERA.STATUS);
    }

    async getBackendStatus(): Promise<ApiResponse<any>> {
        return this.request(API_ENDPOINTS.STATUS);
    }

    async analyzePose(input: Blob | MultiCameraRecordingPayload): Promise<ApiResponse<any>> {
        const formData = new FormData();

        if (input instanceof Blob) {
            formData.append('file', input, 'scan.webm');
        } else {
            const orderedViews: CameraView[] = ['front', 'left', 'right'];

            orderedViews.forEach((view) => {
                const blob = input.blobs?.[view];
                if (blob instanceof Blob) {
                    formData.append('files', blob, `${view}.webm`);
                }
            });

            if (input.cameraManifest && input.cameraManifest.length > 0) {
                formData.append('camera_manifest', JSON.stringify(input.cameraManifest));
            }
            if (input.cameraCalibration) {
                formData.append('camera_calibration', JSON.stringify(input.cameraCalibration));
            }
            if (input.subjectProfile) {
                formData.append('subject_profile', JSON.stringify(input.subjectProfile));
            }
            if (input.syncGroupId) {
                formData.append('sync_group_id', input.syncGroupId);
            }
            if (typeof input.captureStartedAtMs === 'number') {
                formData.append('capture_started_at_ms', String(input.captureStartedAtMs));
            }
            if (typeof input.captureStoppedAtMs === 'number') {
                formData.append('capture_stopped_at_ms', String(input.captureStoppedAtMs));
            }
            if (input.scanDefinition) {
                formData.append('scan_key', input.scanDefinition.key);
                formData.append('scan_label', input.scanDefinition.label);
                formData.append('scan_category', input.scanDefinition.category);
            }
        }

        const fullUrl = `${this.apiBaseUrl}/api/analysis/pose/analyze`;
        const headers = await this.getAuthHeaders(false);

        try {
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers,
                body: formData,
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${text}`);
            }

            const result = await response.json();
            const normalizedScanId = extractScanIdFromResponse(result);

            if (result && typeof result === 'object' && result.success === false) {
                throw new Error(result.message || 'Failed to start analysis');
            }

            if (normalizedScanId) {
                result.data = {
                    ...(result.data ?? {}),
                    scan_id: normalizedScanId,
                };
            } else if (result?.success) {
                throw new Error('Analysis started but scan ID is missing in the response');
            }

            return result;

        } catch (error) {
            throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getScanAssetText(scanId: string, assetPath: string): Promise<string> {
        const normalizedPath = assetPath
            .split('/')
            .filter(Boolean)
            .map((segment) => encodeURIComponent(segment))
            .join('/');
        const fullUrl = `${this.apiBaseUrl}/api/analysis/scans/${scanId}/asset/${normalizedPath}`;
        const headers = await this.getAuthHeaders(false);

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${text}`);
        }

        return response.text();
    }

    async reconstructSmpl(landmarks: any[]): Promise<ApiResponse<any>> {
        return this.request('/api/analysis/smpl/reconstruct', {
            method: 'POST',
            body: JSON.stringify({ landmarks }),
        });
    }

    async uploadVideoForAnalysis(videoBlob: Blob): Promise<ApiResponse<any>> {
        return this.analyzePose(videoBlob);
    }

    async getScanStatus(scanId: string): Promise<ApiResponse<any>> {
        return this.request(`/api/analysis/scans/${scanId}`);
    }

    async getGoogleCalendarStatus(): Promise<ApiResponse<{ connected: boolean }>> {
        return this.request<{ connected: boolean }>('/api/calendar/status');
    }

    async connectGoogleCalendar(): Promise<ApiResponse<{ url: string }>> {
        return this.request<{ url: string }>('/api/calendar/connect', { method: 'POST' });
    }

    async disconnectGoogleCalendar(): Promise<ApiResponse<{ success: boolean }>> {
        return this.request<{ success: boolean }>('/api/calendar/disconnect', { method: 'POST' });
    }

    async getCalendarEvents(timeMin?: string, timeMax?: string): Promise<ApiResponse<{ events: any[] }>> {
        let qs = '';
        if (timeMin) qs += `?timeMin=${encodeURIComponent(timeMin)}`;
        if (timeMax) qs += `${qs ? '&' : '?'}timeMax=${encodeURIComponent(timeMax)}`;
        return this.request<{ events: any[] }>(`/api/calendar/events${qs}`);
    }

    async createCalendarEvent(eventData: any): Promise<ApiResponse<any>> {
        return this.request('/api/calendar/events', {
            method: 'POST',
            body: JSON.stringify(eventData),
        });
    }

    async updateCalendarEvent(id: string, eventData: any): Promise<ApiResponse<any>> {
        return this.request(`/api/calendar/events/${id}`, {
            method: 'PUT',
            body: JSON.stringify(eventData),
        });
    }

    async deleteCalendarEvent(id: string): Promise<ApiResponse<{ success: boolean }>> {
        return this.request(`/api/calendar/events/${id}`, {
            method: 'DELETE',
        });
    }

    async getAdminUsers(): Promise<ApiResponse<{ count: number; users: any[] }>> {
        return this.request<{ count: number; users: any[] }>('/api/users');
    }

    async getAdminUserStats(uid: string, year: number, month: number): Promise<ApiResponse<{ daily_access: Record<string, number>; period: string }>> {
        return this.request<{ daily_access: Record<string, number>; period: string }>(`/api/users/${uid}/stats?year=${year}&month=${month}`);
    }

    async sendHeartbeat(timestamp: string): Promise<ApiResponse<any>> {
        return this.request('/api/users/activity/heartbeat', {
            method: 'POST',
            body: JSON.stringify({ timestamp }),
        });
    }
}
export const apiService = new ApiService(API_BASE_URL);

