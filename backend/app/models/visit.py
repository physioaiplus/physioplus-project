"""
Modelli per la gestione delle visite
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class AnalysisType(str, Enum):
    """Tipi di analisi disponibili"""
    COMPLETA = "completa"
    POSTURALE = "posturale"
    MOBILITA_SUPERIORI = "mobilita_superiori"
    MOBILITA_INFERIORI = "mobilita_inferiori"

class VisitStatus(float, Enum):
    """Stati di una visita"""
    CREATED = "created"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class VisitCreate(BaseModel):
    """Modello per creazione nuova visita"""
    patient_id: str
    operator_id: str
    tipo_analisi: AnalysisType
    note: Optional[str] = None

class VisitResponse(BaseModel):
    """Modello per risposta visita"""
    id: str
    patient_id: str
    operator_id: str
    tipo_analisi: AnalysisType
    status: VisitStatus
    note: Optional[str] = None
    created_at: datetime
    exercises: List[dict] = []

class VisitResponseWithPatient(VisitResponse):
    """Modello per risposta visita con dati paziente"""
    patient: dict

