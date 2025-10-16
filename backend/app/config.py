"""
Configurazione dell'applicazione
"""
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Configurazioni dell'applicazione"""
    
    # FastAPI settings
    app_name: str = "Sistema Rilevamento Posturale"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    
    # CORS settings
    cors_origins: list[str] = ["*"]
    cors_allow_credentials: bool = True
    
    # Firebase settings
    firebase_credentials_path: str = "firebase-credentials.json"
    
    # Camera settings
    camera_width: int = 1280
    camera_height: int = 720
    camera_fps: int = 30
    
    # MediaPipe settings
    pose_model_complexity: int = 2
    pose_min_detection_confidence: float = 0.5
    pose_min_tracking_confidence: float = 0.5
    face_min_detection_confidence: float = 0.5
    
    # Logging settings
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"

settings = Settings()
