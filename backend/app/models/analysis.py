"""
Modelli per l'analisi posturale
"""
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime
import numpy as np

class Keypoint(BaseModel):
    """Modello per un singolo keypoint"""
    x: float
    y: float
    z: float
    visibility: float

class Keypoints(BaseModel):
    """Modello per tutti i keypoints del corpo"""
    landmark_name: str
    coordinates: Keypoint

class AngleMeasurement(BaseModel):
    """Modello per misurazione angolare"""
    joint_name: str
    angle_degrees: float
    is_normal_range: bool = True
    normal_range_min: float = 160
    normal_range_max: float = 200

class SymmetryMeasurement(BaseModel):
    """Modello per misurazione di simmetria"""
    body_part: str
    asymmetry_value: float
    threshold: float = 0.1

class PostureAnalysis(BaseModel):
    """Modello completo per analisi posturale"""
    keypoints: Dict[str, Dict[str, float]]
    angles: Dict[str, float]
    symmetry: Dict[str, float]
    timestamp: datetime
    frame_quality: float = 0.0
    
class StreamFrame(BaseModel):
    """Modello per frame di streaming"""
    frame_data: str  # base64 encoded
    analysis: Optional[PostureAnalysis] = None
    timestamp: datetime

