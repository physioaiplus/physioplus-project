"""
Router per streaming WebSocket
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import logging
from datetime import datetime
import cv2

from app.core.camera import camera_manager
from app.services.posture_analyzer import pose_analyzer

logger = logging.getLogger(__status_code=__name__)

streaming_router = APIRouter(tags=["streaming"])

@streaming_router.websocket("/ws/pose-stream/{visit_id}")
async def pose_stream(websocket: WebSocket, visit_id: str):
    """WebSocket per streaming pose in tempo reale"""
    await websocket.accept()
    logger.info(f"WebSocket connesso per visita {visit_id}")
    
    try:
        while True:
            # Ottieni frame da RealSense
            color_image, depth_image = camera_manager.get_frames()
            
            if color_image is None:
                await asyncio.sleep(0.033)  # ~30 FPS
                continue
            
            # Conversione RGB
            rgb_image = cv2.cvtColor(color_image, cv2.COLOR_BGR2RGB)
            
            # Processamento completo
            analysis, processed_image = pose_analyzer.process_frame(rgb_image)
            
            if analysis:
                # Codifica frame per streaming
                _, buffer = cv2.imencode('.jpg', processed_image)
                frame_base64 = buffer.tobytes()
                
                # Invia dati via WebSocket
                data = {
                    'frame': frame_base64.hex(),
                    'analysis': analysis,
                    'timestamp': datetime.now().isoformat(),
                    'visit_id': visit_id
                }
                
                await websocket.send_json(data)
            
            await asyncio.sleep(0.033)  # ~30 FPS
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnesso per visita {visit_id}")
    except Exception as e:
        logger.error(f"Errore WebSocket per visita {visit_id}: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass


