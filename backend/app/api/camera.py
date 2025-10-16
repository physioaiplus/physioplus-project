"""
Router per controllo camera
"""
from fastapi import APIRouter, HTTPException, Depends
import logging

from app.core.camera import camera_manager
from app.api.auth import verify_firebase_token

logger = logging.getLogger(__name__)

camera_router = APIRouter(prefix="/api/camera", tags=["camera"])

@camera_router.post("/start")
async def start_camera(decoded_token: dict = Depends(verify_firebase_token)):
    """Avvia stream camera"""
    try:
        success = camera_manager.initialize()
        
        if not success:
            raise HTTPException(
                status_code=500, 
                detail="Impossibile inizializzare camera RealSense"
            )
        
        return {"success": True, "message": "Camera avviata"}
        
    except Exception as e:
        logger.error(f"Errore avvio camera: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@camera_router.post("/stop")
async def stop_camera(decoded_token: dict = Depends(verify_firebase_token)):
    """Ferma stream camera"""
    try:
        camera_manager.stop()
        return {"success": True, "message": "Camera fermata"}
        
    except Exception as e:
        logger.error(f"Errore stop camera: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@camera_router.get("/status")
async def get_camera_status(decoded_token: dict = Depends(verify_firebase_token)):
    """Ottieni stato camera"""
    try:
        status = camera_manager.get_status()
        return {"success": True, "status": status}
        
    except Exception as e:
        logger.error(f"Errore status camera: {e}")
        raise HTTPException(status_code=500, detail=str(e))


