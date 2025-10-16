"""
Gestione camera RealSense D435
"""
import logging
import numpy as np
import pyrealsense2 as rs
from typing import Optional, Tuple
from app.config import settings

logger = logging.getLogger(__name__)

class RealSenseManager:
    """Manager per camera Intel RealSense D435"""
    
    def __init__(self):
        self.pipeline: Optional[rs.pipeline] = None
        self.config: Optional[rs.config] = None
        self.align: Optional[rs.align] = None
        self.is_streaming: bool = False
        
    def initialize(self) -> bool:
        """Inizializza la pipeline RealSense"""
        try:
            self.pipeline = rs.pipeline()
            self.config = rs.config()
            
            # Configurazione stream
            self.config.enable_stream(
                rs.stream.color, 
                settings.camera_width, 
                settings.camera_height, 
                rs.format.bgr8, 
                settings.camera_fps
            )
            self.config.enable_stream(
                rs.stream.depth, 
                settings.camera_width, 
                settings.camera_height, 
                rs.format.z16, 
                settings.camera_fps
            )
            
            # Avvio pipeline
            profile = self.pipeline.start(self.config)
            
            # Allineamento depth a color
            align_to = rs.stream.color
            self.align = rs.align(align_to)
            
            self.is_streaming = True
            logger.info(f"RealSense D435 inizializzato: {settings.camera_width}x{settings.camera_height}@{settings.camera_fps}fps")
            return True
            
        except Exception as e:
            logger.error(f"Errore inizializzazione RealSense: {e}")
            return False
    
    def get_frames(self) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        """Ottieni frame RGB e Depth allineati"""
        if not self.is_streaming or not self.pipeline:
            return None, None
        
        try:
            frames = self.pipeline.wait_for_frames()
            aligned_frames = self.align.process(frames)
            
            color_frame = aligned_frames.get_color_frame()
            depth_frame = aligned_frames.get_depth_frame()
            
            if not color_frame or not depth_frame:
                return None, None
            
            color_image = np.asanyarray(color_frame.get_data())
            depth_image = np.asanyarray(depth_frame.get_data())
            
            return color_image, depth_image
            
        except Exception as e:
            logger.error(f"Errore acquisizione frame: {e}")
            return None, None
    
    def stop(self) -> None:
        """Ferma la pipeline"""
        if self.pipeline and self.is_streaming:
            self.pipeline.stop()
            self.is_streaming = False
            logger.info("RealSense fermato")
    
    def get_status(self) -> dict:
        """Ottieni stato camera"""
        return {
            'is_streaming': self.is_streaming,
            'is_pipeline_active': self.pipeline is not None,
            'config_height': settings.camera_height,
            'config_width': settings.camera_width,
            'config_fps': settings.camera_fps
        }

# Istanza globale
camera_manager = RealSenseManager()


