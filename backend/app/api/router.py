"""
Router principale dell'API
"""
from fastapi import APIRouter
from app.api.auth import auth_router
from app.api.patients import patients_router
from app.api.visits import visits_router
from app.api.camera import camera_router
from app.api.streaming import streaming_router
from app.api.ai import ai_router

main_router = APIRouter()

# Includiamo tutti i router
main_router.include_router(auth_router)
main_router.include_router(patients_router)
main_router.include_router(visits_router)
main_router.include_router(camera_router)
main_router.include_router(streaming_router)
main_router.include_router(ai_router)

# Route principale
@main_router.get("/")
async def root():
    return {"message": "Sistema Rilevamento Posturale API", "version": "1.0.0"}

@main_router.get("/health")
async def health_check():
    """Health check endpoint"""
    from app.core.camera import camera_manager
    from app.core.database import firebase_manager
    
    return {
        "status": "healthy",
        "camera": camera_manager.get_status(),
        "firebase": firebase_manager.is_initialized()
    }
