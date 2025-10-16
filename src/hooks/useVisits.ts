import { useState, useCallback } from 'react';
import { API_URL } from '../constants';
import type { Visit, AnalysisType } from '../types';
import { createVisitFs, getVisitByIdFs, listRecentVisitsByPatient } from '../services/visits.firestore';

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
      const id = await createVisitFs(patientId, operatorId, tipoAnalisi, note);
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Errore creazione visita (Firestore):', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getVisitById = useCallback(async (visitId: string): Promise<Visit | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const visit = await getVisitByIdFs(visitId);
      if (visit) setCurrentVisit(visit);
      return visit;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Errore recupero visita (Firestore):', error);
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
      const response = await fetch(`${API_URL}/api/visits/${visitId}/exercises`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exercises)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Aggiorna visita locale se è la stessa
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





