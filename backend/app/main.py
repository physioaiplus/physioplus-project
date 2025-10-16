"""
Applicazione principale FastAPI
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.core.database import firebase_manager
from app.core.camera import camera_manager
from app.api.router import main_router

# Configurazione logging
logging.basicConfig(level=getattr(logging, settings.log_level))
logger = logging.getLogger(__name__)

# Inizializzazione FastAPI
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Includiamo il router principale
app.include_router(main_router)

@app.on_event("startup")
async def startup_event():
    """Inizializzazione all'avvio"""
    logger.info(f"Avvio applicazione {settings.app_name} v{settings.app_version}...")
    
    # Inizializza Firebase
    if not firebase_manager.initialize():
        logger.warning("Firebase non inizializzato - alcune funzionalità potrebbero non funzionare")
    
    # Camera viene inizializzata on-demand
    logger.info("Applicazione avviata correttamente")

@app.on_event("shutdown")
async def shutdown_event():
    """Pulizia alla chiusura"""
    logger.info("Chiusura applicazione...")

    # Ferma camera se attiva
    camera_manager.stop()
    
    logger.info("Applicazione chiusa correttamente")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host=settings.host, 
        port=settings.port,
        log_level=settings.log_level.lower()
    )


