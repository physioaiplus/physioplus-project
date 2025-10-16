"""
Modelli per la gestione dei pazienti
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class PatientCreate(BaseModel):
    """Modello per creazione nuovo paziente"""
    nome: str
    cognome: str
    email: str
    altezza: float
    peso: float
    sesso: str
    patologia: Optional[str] = None
    obiettivo: Optional[str] = None
    privacy_accepted: bool

class PatientResponse(BaseModel):
    """Modello per risposta paziente"""
    id: str
    nome: str
    cognome: str
    email: str
    altezza: float
    peso: float
    sesso: str
    patologia: Optional[str] = None
    obiettivo: Optional[str] = None
    privacy_accepted: bool
    created_at: datetime
    updated_at: datetime

class PatientsResponse(BaseModel):
    """Modello per lista pazienti"""
    success: bool
    patients: list[PatientResponse]

