"""
Gestione database Firebase
"""
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore, auth
from app.config import settings

logger = logging.getLogger(__name__)

class FirebaseManager:
    """Manager per Firebase Firestore e Authentication"""
    
    def __init__(self):
        self.db: Optional[firestore.Client] = None
        self._initialized = False
        
    def initialize(self) -> bool:
        """Inizializza connessione Firebase"""
        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate(settings.firebase_credentials_path)
                firebase_admin.initialize_app(cred)
            
            self.db = firestore.client()
            self._initialized = True
            logger.info("Firebase inizializzato con successo")
            return True
            
        except Exception as e:
            logger.error(f"Errore inizializzazione Firebase: {e}")
            return False
    
    def is_initialized(self) -> bool:
        """Verifica se Firebase è inizializzato"""
        return self._initialized and self.db is not None
    
    async def verify_token(self, token: str) -> Dict[str, Any]:
        """Verifica token Firebase"""
        try:
            decoded_token = auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            logger.error(f"Errore verifica token: {e}")
            raise ValueError("Token non valido")
    
    # Operazioni CRUD per pazienti
    async def create_patient(self, patient_data: Dict[str, Any]) -> str:
        """Crea nuovo paziente"""
        if not self.db:
            raise RuntimeError("Database non inizializzato")
            
        patient_data.update({
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        })
        
        doc_ref = self.db.collection('patients').document()
        doc_ref.set(patient_data)
        
        # Crea scheda evolutiva
        evolutionary_sheet = {
            'patient_id': doc_ref.id,
            'visits': [],
            'created_at': datetime.now()
        }
        self.db.collection('evolutionary_sheets').document(doc_ref.id).set(evolutionary_sheet)
        
        return doc_ref.id
    
    async def get_patients(self) -> List[Dict[str, Any]]:
        """Ottieni tutti i pazienti"""
        if not self.db:
            raise RuntimeError("Database non inizializzato")
            
        patients = []
        docs = self.db.collection('patients').stream()
        
        for doc in docs:
            patient = doc.to_dict()
            patient['id'] = doc.id
            patients.append(patient)
        
        return patients
    
    async def get_patient_by_id(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """Ottieni paziente by ID"""
        if not self.db:
            raise RuntimeError("Database non inizializzato")
            
        doc = self.db.collection('patients').document(patient_id).get()
        if not doc.exists:
            return None
            
        patient = doc.to_dict()
        patient['id'] = doc.id
        
        # Ottieni scheda evolutiva
        sheet = self.db.collection('evolutionary_sheets').document(patient_id).get()
        if sheet.exists:
            patient['evolutionary_sheet'] = sheet.to_dict()
        
        return patient
    
    # Operazioni CRUD per visite
    async def create_visit(self, visit_data: Dict[str, Any]) -> str:
        """Crea nuova visita"""
        if not self.db:
            raise RuntimeError("Database non inizializzato")
            
        visit_data.update({
            'created_at': datetime.now(),
            'status': 'in_progress',
            'exercises': []
        })
        
        doc_ref = self.db.collection('visits').document()
        doc_ref.set(visit_data)
        
        return self.db.document().id
    
    async def get_visit_by_id(self, visit_id: str) -> Optional[Dict[str, Any]]:
        """Ottieni visita by ID"""
        if not self.db:
            raise RuntimeError("Database non inizializzato")
            
        doc = self.db.collection('visits').document(visit_id).get()
        if not doc.exists:
            return None
            
        visit = doc.to_dict()
        visit['id'] = doc.id
        
        return visit
    
    async def update_visit_exercises(self, visit_id: str, exercises: List[Dict[str, Any]]) -> bool:
        """Aggiorna esercizi di una visita"""
        if not self.db:
            raise RuntimeError("Database non inizializzato")
            
        try:
            self.db.collection('visits').document(visit_id).update({
                'exercises': exercises,
                'updated_at': datetime.now()
            })
            return True
        except Exception as e:
            logger.error(f"Errore aggiornamento visita {visit_id}: {e}")
            return False

# Istanza globale
firebase_manager = FirebaseManager()


