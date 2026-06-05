import { useState, useCallback } from 'react';
import type { Patient, NewPatientFormData } from '../types';
import { apiService } from '../services/api';

export const usePatients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.getPatients();
      if (response.success && response.data) {
        setPatients(response.data);
        return true;
      }
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Errore caricamento pazienti (API):', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPatient = useCallback(async (formData: NewPatientFormData): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.createPatient(formData);
      if (response.success) {
        await loadPatients();
        // Assuming the API returns the created patient object or an object with the ID.
        // We look for 'id' in data, or if data is the ID string itself.
        const createdData = response.data;
        if (createdData && typeof createdData === 'object' && 'id' in createdData) {
          return createdData.id;
        } else if (typeof createdData === 'string') {
          return createdData;
        }
        // Fallback: if success but no specific ID returned (unlikely for REST), assume success.
        // But we need to return a string to satisfy the interface.
        // If the backend returns the whole patient, return its ID.
        return (createdData as any)?.id || 'unknown_id';
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Errore creazione paziente (API):', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadPatients]);

  const getPatientById = useCallback(async (patientId: string): Promise<Patient | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.getPatient(patientId);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Errore recupero paziente (API):', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    patients,
    isLoading,
    error,
    loadPatients,
    createPatient,
    getPatientById
  };
};





