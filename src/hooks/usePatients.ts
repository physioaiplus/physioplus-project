import { useState, useCallback } from 'react';
import type { Patient, NewPatientFormData } from '../types';
import { listPatients, createPatientFs, getPatientByIdFs } from '../services/patients.firestore';

export const usePatients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const pts = await listPatients();
      setPatients(pts);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Errore caricamento pazienti (Firestore):', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPatient = useCallback(async (formData: NewPatientFormData): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const id = await createPatientFs(formData);
      await loadPatients();
      return id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Errore creazione paziente (Firestore):', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadPatients]);

  const getPatientById = useCallback(async (patientId: string): Promise<Patient | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const p = await getPatientByIdFs(patientId);
      return p;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Errore recupero paziente (Firestore):', error);
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





