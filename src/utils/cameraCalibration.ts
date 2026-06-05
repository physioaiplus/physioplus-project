import { auth } from '../config/firebase';
import type { CameraCalibrationProfile } from '../types';

export const CAMERA_CALIBRATION_STORAGE_KEY = 'humotion.cameraCalibration.v1';

const scopedCalibrationKey = (uid?: string | null): string => (
  uid ? `${CAMERA_CALIBRATION_STORAGE_KEY}.${uid}` : CAMERA_CALIBRATION_STORAGE_KEY
);

export const readCameraCalibrationProfile = (uid: string | null | undefined = auth.currentUser?.uid): CameraCalibrationProfile | null => {
  if (typeof window === 'undefined') return null;

  const keys = [scopedCalibrationKey(uid), CAMERA_CALIBRATION_STORAGE_KEY];
  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.views)) {
        return parsed as CameraCalibrationProfile;
      }
    } catch (error) {
      console.warn('Unable to parse stored camera calibration profile.', error);
    }
  }

  return null;
};

export const writeCameraCalibrationProfile = (
  profile: CameraCalibrationProfile,
  uid: string | null | undefined = auth.currentUser?.uid,
): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(scopedCalibrationKey(uid), JSON.stringify(profile));
};
