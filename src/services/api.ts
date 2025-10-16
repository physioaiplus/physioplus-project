/**
 * Servizio API centralizzato
 */
import { API_ENDPOINTS } from '../constants';
import type { 
  Patient, 
  NewPatientFormData, 
  AnalysisType, 
  LoginFormData,
  ApiResponse 
} from '../types';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Authentication
  async login(formData: LoginFormData): Promise<ApiResponse<any>> {
    // TODO: Implementare autenticazione Firebase reale
    return { success: true, data: { uid: 'demo-user-123', email: formData.email } };
  }

  async verifyToken(token: string): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.AUTH.VERIFY, {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  async logout(): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.AUTH.LOGOUT, {
      method: 'POST'
    });
  }

  // Patients
  async getPatients(): Promise<ApiResponse<Patient[]>> {
    return this.request(API_ENDPOINTS.PATIENTS.LIST);
  }

  async getPatient(patientId: string): Promise<ApiResponse<Patient>> {
    return this.request(API_ENDPOINTS.PATIENTS.GET.replace(':id', patientId));
  }

  async createPatient(patientData: NewPatientFormData): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.PATIENTS.CREATE, {
      method: 'POST',
      body: JSON.stringify(patientData)
    });
  }

  // Visits
  async createVisit(
    patientId: string,
    operatorId: string,
    tipoAnalisi: AnalysisType,
    note?: string
  ): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.VISITS.CREATE, {
      method: 'POST',
      body: JSON.stringify({
        patient_id: patientId,
        operator_id: operatorId,
        tipo_analisi: tipoAnalisi,
        note: note || ''
      })
    });
  }

  async getVisit(visitId: string): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.VISITS.GET.replace(':id', visitId));
  }

  async updateVisitExercises(
    visitId: string,
    exercises: any[]
  ): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.VISITS.UPDATE_EXERCISES.replace(':id', visitId), {
      method: 'PUT',
      body: JSON.stringify(exercises)
    });
  }

  // Camera
  async startCamera(): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.CAMERA.START, {
      method: 'POST'
    });
  }

  async stopCamera(): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.CAMERA.STOP, {
      method: 'POST'
    });
  }

  async getCameraStatus(): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.CAMERA.STATUS);
  }
}

// Singleton instance
export const apiService = new ApiService('http://localhost:8000');





