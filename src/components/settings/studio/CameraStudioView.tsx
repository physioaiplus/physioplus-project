import React, { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle, RotateCw, Save } from 'lucide-react';
import { auth } from '../../../config/firebase';
import type { CameraCalibrationProfile, CameraCalibrationViewProfile, CameraView } from '../../../types';
import { readCameraCalibrationProfile, writeCameraCalibrationProfile } from '../../../utils/cameraCalibration';

const CAMERA_VIEWS: CameraView[] = ['front', 'left', 'right'];
const VIEW_LABELS: Record<CameraView, string> = {
  front: 'Frontale',
  left: 'Laterale sinistra',
  right: 'Laterale destra',
};
const ROTATIONS = [0, 90, 180, 270] as const;

const emptyViewProfile = (view: CameraView): CameraCalibrationViewProfile => ({
  view,
  rotationDeg: 0,
  isCalibrated: false,
  extrinsic: {
    rigPositionCm: view === 'front'
      ? { x: 0, y: 140, z: 260 }
      : view === 'left'
        ? { x: -180, y: 140, z: 160 }
        : { x: 180, y: 140, z: 160 },
    floorOffsetCm: 0,
  },
});

const getViewProfile = (profile: CameraCalibrationProfile | null, view: CameraView): CameraCalibrationViewProfile => (
  profile?.views.find((item) => item.view === view) || emptyViewProfile(view)
);

export const CameraStudioView: React.FC = () => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [profile, setProfile] = useState<CameraCalibrationProfile>(() => {
    const stored = readCameraCalibrationProfile(auth.currentUser?.uid);
    return stored || {
      profileId: `studio-rig-${auth.currentUser?.uid || 'local'}`,
      rigLabel: 'Studio principale',
      profileStatus: 'uncalibrated',
      views: CAMERA_VIEWS.map(emptyViewProfile),
    };
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices?.enumerateDevices()
      .then((items) => {
        if (!mounted) return;
        setDevices(items.filter((item) => item.kind === 'videoinput'));
      })
      .catch(() => setDevices([]));
    return () => {
      mounted = false;
    };
  }, []);

  const calibratedCount = useMemo(
    () => profile.views.filter((view) => view.isCalibrated).length,
    [profile.views],
  );

  const updateView = (view: CameraView, updater: (current: CameraCalibrationViewProfile) => CameraCalibrationViewProfile) => {
    setSaved(false);
    setProfile((current) => {
      const nextViews = CAMERA_VIEWS.map((candidate) => (
        candidate === view
          ? updater(getViewProfile(current, candidate))
          : getViewProfile(current, candidate)
      ));
      return {
        ...current,
        views: nextViews,
        profileStatus: nextViews.every((item) => item.isCalibrated)
          ? 'calibrated'
          : nextViews.some((item) => item.isCalibrated)
            ? 'partial'
            : 'uncalibrated',
      };
    });
  };

  const saveProfile = () => {
    const nextProfile = {
      ...profile,
      profileId: profile.profileId || `studio-rig-${auth.currentUser?.uid || 'local'}`,
      views: profile.views.map((view) => ({
        ...view,
        capturedAt: new Date().toISOString(),
      })),
    };
    writeCameraCalibrationProfile(nextProfile, auth.currentUser?.uid);
    setProfile(nextProfile);
    setSaved(true);
  };

  return (
    <div className="space-y-5">
      <div className="card-outset p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Studio e camere</h1>
            <p className="text-sm text-gray-600 mt-1">
              Configurazione personale dello studio usata automaticamente durante le scansioni.
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${calibratedCount === 3 ? 'bg-green-100 text-green-700' : calibratedCount > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
            {calibratedCount}/3 viste
          </span>
        </div>

        <label className="block mt-5">
          <span className="text-sm font-medium text-gray-700">Nome configurazione</span>
          <input
            value={profile.rigLabel || ''}
            onChange={(event) => {
              setSaved(false);
              setProfile((current) => ({ ...current, rigLabel: event.target.value }));
            }}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Studio principale"
          />
        </label>
      </div>

      {CAMERA_VIEWS.map((view) => {
        const viewProfile = getViewProfile(profile, view);
        const position = viewProfile.extrinsic?.rigPositionCm || { x: 0, y: 140, z: 220 };
        return (
          <div key={view} className="card-outset p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-light/20 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-brand-blue" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{VIEW_LABELS[view]}</h2>
                  <p className="text-xs text-gray-500">Device, rotazione e posizione nel rig.</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(viewProfile.isCalibrated)}
                  onChange={(event) => updateView(view, (current) => ({ ...current, isCalibrated: event.target.checked }))}
                />
                Attiva
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <label>
                <span className="text-sm font-medium text-gray-700">Camera</span>
                <select
                  value={viewProfile.deviceId || ''}
                  onChange={(event) => updateView(view, (current) => {
                    const device = devices.find((item) => item.deviceId === event.target.value);
                    return { ...current, deviceId: event.target.value || undefined, label: device?.label };
                  })}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Non assegnata</option>
                  {devices.map((device, index) => (
                    <option key={device.deviceId || index} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-sm font-medium text-gray-700">Rotazione</span>
                <select
                  value={viewProfile.rotationDeg || 0}
                  onChange={(event) => updateView(view, (current) => ({ ...current, rotationDeg: Number(event.target.value) }))}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  {ROTATIONS.map((rotation) => (
                    <option key={rotation} value={rotation}>{rotation} gradi</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <label key={axis}>
                  <span className="text-xs font-semibold text-gray-500 uppercase">{axis} cm</span>
                  <input
                    type="number"
                    value={position[axis]}
                    onChange={(event) => updateView(view, (current) => ({
                      ...current,
                      extrinsic: {
                        ...current.extrinsic,
                        rigPositionCm: {
                          x: position.x,
                          y: position.y,
                          z: position.z,
                          [axis]: Number(event.target.value),
                        },
                        floorOffsetCm: current.extrinsic?.floorOffsetCm ?? 0,
                      },
                    }))}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              ))}
              <label>
                <span className="text-xs font-semibold text-gray-500 uppercase">Pavimento cm</span>
                <input
                  type="number"
                  value={viewProfile.extrinsic?.floorOffsetCm ?? 0}
                  onChange={(event) => updateView(view, (current) => ({
                    ...current,
                    extrinsic: {
                      ...current.extrinsic,
                      rigPositionCm: position,
                      floorOffsetCm: Number(event.target.value),
                    },
                  }))}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
            <CheckCircle className="w-4 h-4" /> Salvato
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            setProfile({
              profileId: `studio-rig-${auth.currentUser?.uid || 'local'}`,
              rigLabel: profile.rigLabel || 'Studio principale',
              profileStatus: 'uncalibrated',
              views: CAMERA_VIEWS.map(emptyViewProfile),
            });
            setSaved(false);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded border border-gray-300 text-sm font-medium text-gray-700 bg-white"
        >
          <RotateCw className="w-4 h-4" /> Ripristina
        </button>
        <button
          type="button"
          onClick={saveProfile}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-brand-blue text-white text-sm font-semibold"
        >
          <Save className="w-4 h-4" /> Salva configurazione
        </button>
      </div>
    </div>
  );
};
