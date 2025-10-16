"""
Router per gestione visite
"""
from fastapi import APIRouter, HTTPException, Depends
import logging

from app.models.visit import VisitCreate, VisitResponse
from app.core.database import firebase_manager
from app.api.auth import verify_firebase_token

logger = logging.getLogger(__name__)

visits_router = APIRouter(prefix="/api/visits", tags=["visits"])

@visits_router.post("/", response_model=dict)
async def create_visit(
    visit: VisitCreate,
    decoded_token: dict = Depends(verify_firebase_token)
):
    """Crea nuova visita"""
    try:
        visit_data = visit.dict()
        visit_id = await firebase_manager.create_visit(visit_data)
        
        return {"success": True, "visit_id": visit_id}
        
    except Exception as e:
        logger.error(f"Errore creazione visita: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@visits_router.get("/{visit_id}", response_model=dict)
async def get_visit(
    visit_id: str,
    decoded_token: dict = Depends(verify_firebase_token)
):
    """Ottieni dettagli visita"""
    try:
        visit = await firebase_manager.get_visit_by_id(visit_id)
        
        if not visit:
            raise HTTPException(status_code=404, detail="Visita non trovata")
        
        return {"success": True, "visit": visit}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore recupero visita {visit_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@visits_router.put("/{visit_id}/exercises")
async def update_visit_exercises(
    visit_id: str,
    exercises: list[dict],
    decoded_token: dict = Depends(verify_firebase_token)
):
    """Aggiorna esercizi di una visita"""
    try:
        success = await firebase_manager.update_visit_exercises(visit_id, exercises)
        
        if not success:
            raise HTTPException(status_code=500, detail="Errore aggiornamento visita")
        
        return {"success": True, "message": "Esercizi aggiornati"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore aggiornamento esercizi visita {visit_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


