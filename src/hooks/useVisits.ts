import { useState, useCallback } from 'react';
import type { Visit, AnalysisType } from '../types';
import { apiService } from '../services/api';

export const useVisits = () => {
  const [currentVisit, setCurrentVisit] = useState<Visit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createVisit = useCallback(async (
    patientId: string,
    operatorId: string,
    tipoAnalisi: AnalysisType,
    note?: string
  ): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.createVisit(patientId, operatorId, tipoAnalisi, note);
      let id: string | null = null;
      if (response && response.success) {
        // Handle different possible response structures
        const data: any = response.data;
        if (data && data.visit_id) id = data.visit_id;
        else if (data && data.id) id = data.id;
        else if (typeof data === 'string') id = data;
      }

      if (id) {
        const visit: Visit = {
          id,
          patient_id: patientId,
          operator_id: operatorId,
          tipo_analisi: tipoAnalisi,
          status: 'in_progress',
          created_at: new Date().toISOString(),
          exercises: []
        };
        setCurrentVisit(visit);
        return id;
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Errore creazione visita (API):', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getVisitById = useCallback(async (visitId: string): Promise<Visit | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.getVisit(visitId);
      if (response.success && response.data) {
        // Assume apiService.getVisit returns generic object, cast to Visit
        const visit = response.data as unknown as Visit;
        setCurrentVisit(visit);
        return visit;
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Errore recupero visita (API):', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateVisitExercises = useCallback(async (
    visitId: string,
    exercises: any[]
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiService.updateVisitExercises(visitId, exercises);
      if (data.success) {
        if (currentVisit && currentVisit.id === visitId) {
          setCurrentVisit({
            ...currentVisit,
            exercises: exercises
          });
        }
        return true;
      } else {
        throw new Error(data.message || 'Errore nell\'aggiornamento della visita');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Errore aggiornamento visita:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentVisit]);

  const clearCurrentVisit = useCallback(() => {
    setCurrentVisit(null);
  }, []);

  const listRecentVisitsByPatient = useCallback(async (patientId: string): Promise<Visit[]> => {
    try {
      const res = await apiService.getPatientVisits(patientId);
      if (res.success && Array.isArray(res.data)) {
        return res.data as Visit[];
      }
      return [];
    } catch (e) {
      console.error("Failed to list patient visits", e);
      return [];
    }
  }, []);

  return {
    currentVisit,
    isLoading,
    error,
    createVisit,
    getVisitById,
    updateVisitExercises,
    clearCurrentVisit,
    listRecentVisitsByPatient
  };
};





