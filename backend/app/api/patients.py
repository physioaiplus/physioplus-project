"""
Router per gestione pazienti
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
import logging

from app.models.patient import PatientCreate, PatientResponse, PatientsResponse
from app.core.database import firebase_manager
from app.api.auth import verify_firebase_token

logger = logging.getLogger(__name__)

patients_router = APIRouter(prefix="/api/patients", tags=["patients"])

@patients_router.post("/", response_model=dict)
async def create_patient(
    patient: PatientCreate,
    decoded_token: dict = Depends(verify_firebase_token)
):
    """Crea nuovo paziente"""
    try:
        patient_data = patient.dict()
        patient_id = await firebase_manager.create_patient(patient_data)
        
        return {"success": True, "patient_id": patient_id}
        
    except Exception as e:
        logger.error(f"Errore creazione paziente: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@patients_router.get("/", response_model=PatientsResponse)
async def get_patients(
    decoded_token: dict = Depends(verify_firebase_token)
):
    """Ottieni lista pazienti"""
    try:
        patients = await firebase_manager.get_patients()
        
        # Converte per il modello di risposta
        patient_responses = []
        for patient in patients:
            patient_responses.append(PatientResponse(**patient))
        
        return {"success": True, "patients": patient_responses}
        
    except Exception as e:
        logger.error(f"Errore recupero pazienti: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@patients_router.get("/{patient_id}", response_model=dict)
async def get_patient(
    patient_id: str,
    decoded_token: dict = Depends(verify_firebase_token)
):
    """Ottieni dettagli paziente"""
    try:
        patient = await firebase_manager.get_patient_by_id(patient_id)
        
        if not patient:
            raise HTTPException(status_code=404, detail="Paziente non trovato")
        
        return {"success": True, "patient": patient}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore recupero paziente {patient_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


