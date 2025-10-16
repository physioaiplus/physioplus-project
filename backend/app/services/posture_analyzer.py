"""
Servizio per analisi posturale con MediaPipe
"""
import logging
import numpy as np
import cv2
import mediapipe as mp
from typing import Dict, Optional, Tuple
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)

class PoseAnalyzer:
    """Servizio per analisi della postura"""
    
    def __init__(self):
        # Inizializzazione MediaPipe
        self.mp_pose = mp.solutions.pose
        self.mp_face_detection = mp.solutions.face_detection
        
        # Istanziazione modelli
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=settings.pose_model_complexity,
            enable_segmentation=False,
            min_detection_confidence=settings.pose_min_detection_confidence,
            min_tracking_confidence=settings.pose_min_tracking_confidence
        )
        
        self.face_detection = self.mp_face_detection.FaceDetection(
            min_detection_confidence=settings.face_min_detection_confidence
        )
        
        # Nomi landmark
        self.landmark_names = [
            name for name in self.mp_pose.PoseLandmark.__members__.keys()
        ]
    
    def calculate_angle(self, a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
        """Calcola angolo tra tre punti"""
        ba = a - b
        bc = c - b
        
        # Evita divisione per zero
        norm_ba = np.linalg.norm(ba)
        norm_bc = np.linalg.norm(bc)
        
        if norm_ba == 0 or norm_bc == 0:
            return 0.0
        
        cosine_angle = np.dot(ba, bc) / (norm_ba * norm_bc)
        cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
        angle = np.arccos(cosine_angle)
        
        return np.degrees(angle)
    
    def calculate_symmetry(self, left_landmark, right_landmark) -> float:
        """Calcola simmetria tra landmark sinistro e destro"""
        if left_landmark and right_landmark:
            left_point = np.array([left_landmark.x, left_landmark.y, left_landmark.z])
            right_point = np.array([right_landmark.x, right_landmark.y, right_landmark.z])
            distance = np.linalg.norm(left_point - right_point)
            return float(distance)
        return 0.0
    
    def extract_keypoints(self, landmarks) -> Dict[str, Dict[str, float]]:
        """Estrae keypoints da landmarks MediaPipe"""
        keypoints = {}
        
        if not landmarks:
            return keypoints
        
        for idx, landmark in enumerate(landmarks.landmark):
            if idx < len(self.landmark_names):
                keypoints[self.landmark_names[idx]] = {
                    'x': landmark.x,
                    'y': landmark.y,
                    'z': landmark.z,
                    'visibility': landmark.visibility
                }
        
        return keypoints
    
    def calculate_joint_angles(self, keypoints: Dict[str, Dict[str, float]]) -> Dict[str, float]:
        """Calcola angoli articolari principali"""
        angles = {}
        
        if not keypoints:
            return angles
        
        try:
            # Angolo spalla destra (gomito-spalla-fianco)
            if all(k in keypoints for k in ['RIGHT_ELBOW', 'RIGHT_SHOULDER', 'RIGHT_HIP']):
                elbow = np.array([keypoints['RIGHT_ELBOW']['x'], keypoints['RIGHT_ELBOW']['y']])
                shoulder = np.array([keypoints['RIGHT_SHOULDER']['x'], keypoints['RIGHT_SHOULDER']['y']])
                hip = np.array([keypoints['RIGHT_HIP']['x'], keypoints['RIGHT_HIP']['y']])
                angles['right_shoulder'] = self.calculate_angle(elbow, shoulder, hip)
            
            # Angolo spalla sinistra
            if all(k in keypoints for k in ['LEFT_ELBOW', 'LEFT_SHOULDER', 'LEFT_HIP']):
                elbow = np.array([keypoints['LEFT_ELBOW']['x'], keypoints['LEFT_ELBOW']['y']])
                shoulder = np.array([keypoints['LEFT_SHOULDER']['x'], keypoints['LEFT_SHOULDER']['y']])
                hip = np.array([keypoints['LEFT_HIP']['x'], keypoints['LEFT_HIP']['y']])
                angles['left_shoulder'] = self.calculate_angle(elbow, shoulder, hip)
            
            # Angolo gomito destro
            if all(k in keypoints for k in ['RIGHT_WRIST', 'RIGHT_ELBOW', 'RIGHT_SHOULDER']):
                wrist = np.array([keypoints['RIGHT_WRIST']['x'], keypoints['RIGHT_WRIST']['y']])
                elbow = np.array([keypoints['RIGHT_ELBOW']['x'], keypoints['RIGHT_ELBOW']['y']])
                shoulder = np.array([keypoints['RIGHT_SHOULDER']['x'], keypoints['RIGHT_SHOULDER']['y']])
                angles['right_elbow'] = self.calculate_angle(wrist, elbow, shoulder)
            
            # Angolo gomito sinistro
            if all(k in keypoints for k in ['LEFT_WRIST', 'LEFT_ELBOW', 'LEFT_SHOULDER']):
                wrist = np.array([keypoints['LEFT_WRIST']['x'], keypoints['LEFT_WRIST']['y']])
                elbow = np.array([keypoints['LEFT_ELBOW']['x'], keypoints['LEFT_ELBOW']['y']])
                shoulder = np.array([keypoints['LEFT_SHOULDER']['x'], keypoints['LEFT_SHOULDER']['y']])
                angles['left_elbow'] = self.calculate_angle(wrist, elbow, shoulder)
            
        except Exception as e:
            logger.error(f"Errore calcolo angoli: {e}")
        
        return angles
    
    def calculate_body_symmetry(self, landmarks) -> Dict[str, float]:
        """Calcola simmetria corporea"""
        symmetry = {}
        
        if not landmarks:
            return symmetry
        
        try:
            # Simmetria spalle
            left_shoulder = landmarks.landmark[self.mp_pose.PoseLandmark.LEFT_SHOULDER]
            right_shoulder = landmarks.landmark[self.mp_pose.PoseLandmark.RIGHT_SHOULDER]
            symmetry['shoulder'] = self.calculate_symmetry(left_shoulder, right_shoulder)
            
            # Simmetria fianchi
            left_hip = landmarks.landmark[self.mp_pose.PoseLandmark.LEFT_HIP]
            right_hip = landmarks.landmark[self.mp_pose.PoseLandmark.RIGHT_HIP]
            symmetry['hip'] = self.calculate_symmetry(left_hip, right_hip)
            
        except Exception as e:
            logger.error(f"Errore calcolo simmetria: {e}")
        
        return symmetry
    
    def anonymize_face(self, image: np.ndarray, face_detections) -> np.ndarray:
        """Applica blur al volto per anonimizzazione"""
        if not face_detections or not face_detections.detections:
            return image
        
        h, w, _ = image.shape
        anonymized_image = image.copy()
        
        try:
            for detection in face_detections.detections:
                bbox = detection.location_data.relative_bounding_box
                x = int(bbox.xmin * w)
                y = int(bbox.ymin * h)
                width = int(bbox.width * w)
                height = int(bbox.height * h)
                
                # Verifica bounds
                x = max(0, min(x, w - 1))
                y = max(0, min(y, h - 1))
                width = min(width, w - x)
                height = min(height, h - y)
                
                if width > 0 and height > 0:
                    # Estrai regione del volto
                    face_region = anonymized_image[y:y+height, x:x+width]
                    
                    # Applica blur pesante
                    kernel_size = max(99, min(width, height) // 4)
                    if kernel_size % 2 == 0:
                        kernel_size += 1
                    
                    blurred_face = cv2.GaussianBlur(face_region, (kernel_size, kernel_size), 30)
                    anonymized_image[y:y+height, x:x+width] = blurred_face
        
        except Exception as e:
            logger.error(f"Errore anonimizzazione volto: {e}")
        
        return anonymized_image
    
    def draw_pose_overlay(self, image: np.ndarray, landmarks, angles: Dict[str, float]) -> np.ndarray:
        """Disegna overlay scheletro con colorazione basata su angoli"""
        if not landmarks:
            return image
        
        overlay_image = image.copy()
        h, w, _ = overlay_image.shape
        
        try:
            # Connessioni MediaPipe
            connections = self.mp_pose.POSE_CONNECTIONS
            
            for connection in connections:
                start_idx = connection[0]
                end_idx = connection[1]
                
                if start_idx < len(landmarks.landmark) and end_idx < len(landmarks.landmark):
                    start = landmarks.landmark[start_idx]
                    end = landmarks.landmark[end_idx]
                    
                    if start.visibility > 0.5 and end.visibility > 0.5:
                        start_point = (int(start.x * w), int(start.y * h))
                        end_point = (int(end.x * w), int(end.y * h))
                        
                        # Colorazione basata su qualità postura
                        color = (0, 255, 0)  # Verde default
                        cv2.line(overlay_image, start_point, end_point, color, 3)
            
            # Disegna landmark
            for landmark in landmarks.landmark:
                if landmark.visibility > 0.5:
                    cx, cy = int(landmark.x * w), int(landmark.y * h)
                    cv2.circle(overlay_image, (cx, cy), 5, (255, 0, 0), -1)
            
            # Disegna angoli su frame
            y_offset = 30
            for joint, angle in angles.items():
                if 160 < angle < 200:
                    color = (0, 255, 0)  # Verde - normale
                elif 140 < angle < 220:
                    color = (0, 255, 255)  # Giallo - attenzione
                else:
                    color = (0, 0, 255)  # Rosso - anomaloso
                
                text = f"{joint.replace('_', ' ').capitalize()}: {angle:.1f}°"
                cv2.putText(overlay_image, text, (10, y_offset), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                y_offset += 25
        
        except Exception as e:
            logger.error(f"Errore disegno overlay: {e}")
        
        return overlay_image
    
    def analyze_posture(self, landmarks) -> Dict[str, any]:
        """Analizza postura e calcola metriche"""
        if not landmarks:
            return {}
        
        try:
            # Estrazione keypoints
            keypoints = self.extract_keypoints(landmarks)
            
            # Calcolo angoli articolari
            angles = self.calculate_joint_angles(keypoints)
            
            # Calcolo simmetria
            symmetry = self.calculate_body_symmetry(landmarks)
            
            return {
                'keypoints': keypoints,
                'angles': angles,
                'symmetry': symmetry,
                'timestamp': datetime.now().isoformat(),
                'frame_quality': self._calculate_frame_quality(landmarks)
            }
            
        except Exception as e:
            logger.error(f"Errore analisi postura: {e}")
            return {}
    
    def _calculate_frame_quality(self, landmarks) -> float:
        """Calcola qualità del frame basata su visibility dei landmark"""
        if not landmarks:
            return 0.0
        
        total_visibility = sum(landmark.visibility for landmark in landmarks.landmark)
        avg_visibility = total_visibility / len(landmarks.landmark)
        
        return float(avg_visibility)
    
    def process_frame(self, rgb_image: np.ndarray) -> Tuple[Dict[str, any], np.ndarray]:
        """Processa singolo frame completo"""
        try:
            # Rilevamento pose
            results = self.pose.process(rgb_image)
            
            # Rilevamento volto per anonimizzazione
            face_results = self.face_detection.process(rgb_image)
            
            analysis = {}
            processed_image = rgb_image.copy()
            
            if results.pose_landmarks:
                # Analisi postura
                analysis = self.analyze_posture(results.pose_landmarks)
                
                # BGR per annotazioni
                bgr_image = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2BGR)
                
                # Anonimizzazione volto
                anonymized_image = self.anonymize_face(bgr_image, face_results)
                
                # Disegna overlay
                processed_image = self.draw_pose_overlay(
                    anonymized_image,
                    results.pose_landmarks,
                    analysis.get('angles', {})
                )
            
            return analysis, processed_image
            
        except Exception as e:
            logger.error(f"Errore processamento frame: {e}")
            return {}, rgb_image

# Istanza globale
pose_analyzer = PoseAnalyzer()
