
import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { LimbResult, ScanStep } from '../../types';

// Map landmarks to specific ScanSteps
const LANDMARK_TO_STEP: Record<string, ScanStep> = {
    'left_shoulder': 'ARM_LEFT',
    'left_elbow': 'ARM_LEFT',
    'left_wrist': 'ARM_LEFT',
    'left_pinky': 'ARM_LEFT',
    'left_index': 'ARM_LEFT',
    'left_thumb': 'ARM_LEFT',

    'right_shoulder': 'ARM_RIGHT',
    'right_elbow': 'ARM_RIGHT',
    'right_wrist': 'ARM_RIGHT',
    'right_pinky': 'ARM_RIGHT',
    'right_index': 'ARM_RIGHT',
    'right_thumb': 'ARM_RIGHT',

    'left_hip': 'LEG_LEFT',
    'left_knee': 'LEG_LEFT',
    'left_ankle': 'LEG_LEFT',
    'left_heel': 'LEG_LEFT',
    'left_foot_index': 'LEG_LEFT',

    'right_hip': 'LEG_RIGHT',
    'right_knee': 'LEG_RIGHT',
    'right_ankle': 'LEG_RIGHT',
    'right_heel': 'LEG_RIGHT',
    'right_foot_index': 'LEG_RIGHT',
};

const parseOBJ = (objString: string): THREE.BufferGeometry | null => {
    try {
        const lines = objString.split('\n');
        const vertices: number[] = [];
        const indices: number[] = [];

        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts[0] === 'v') {
                vertices.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
            } else if (parts[0] === 'f') {
                const face = parts
                    .slice(1)
                    .map((part) => parseInt(part.split('/')[0], 10) - 1)
                    .filter((index) => Number.isFinite(index) && index >= 0);
                for (let i = 1; i < face.length - 1; i += 1) {
                    indices.push(face[0], face[i], face[i + 1]);
                }
            }
        }

        if (vertices.length === 0 || indices.length === 0) {
            return null;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        const boundingBox = geometry.boundingBox;
        if (boundingBox) {
            const center = boundingBox.getCenter(new THREE.Vector3());
            const size = boundingBox.getSize(new THREE.Vector3());
            const scale = 3 / Math.max(size.x, size.y, size.z, 1);
            geometry.translate(-center.x, -boundingBox.min.y, -center.z);
            geometry.scale(scale, scale, scale);
            geometry.computeVertexNormals();
        }
        return geometry;
    } catch (e) {
        console.error("Error parsing OBJ:", e);
        return null;
    }
};

interface SmplViewerProps {
    exercises: LimbResult[];
    showControls?: boolean;
}

const getScoreColor = (score: number) => {
    if (score === 1) return '#ef4444'; // Red
    if (score === 2) return '#eab308'; // Yellow
    if (score >= 3) return '#22c55e';  // Green
    return '#cccccc';
};

const getLandmarkNameByIndex = (idx: number): string => {
    const names = [
        "nose", "left_eye_inner", "left_eye", "left_eye_outer", "right_eye_inner",
        "right_eye", "right_eye_outer", "left_ear", "right_ear", "mouth_left",
        "mouth_right", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
        "left_wrist", "right_wrist", "left_pinky", "right_pinky", "left_index",
        "right_index", "left_thumb", "right_thumb", "left_hip", "right_hip",
        "left_knee", "right_knee", "left_ankle", "right_ankle", "left_heel",
        "right_heel", "left_foot_index", "right_foot_index"
    ];
    return names[idx] || '';
};

const CartoonBodySegment = ({ position, scale, color, rotation }: {
    position: [number, number, number];
    scale: [number, number, number];
    color: string;
    rotation?: [number, number, number];
}) => (
    <mesh position={position} rotation={rotation || [0, 0, 0]} scale={scale}>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshStandardMaterial color={color} roughness={0.72} metalness={0.02} />
    </mesh>
);

const HumanizedFallbackModel: React.FC<{ stepResults: Record<string, LimbResult> }> = ({ stepResults }) => (
    <group>
        <CartoonBodySegment position={[0, 2.25, 0]} scale={[0.38, 0.44, 0.36]} color="#bbf7d0" />
        <CartoonBodySegment position={[0, 1.28, 0]} scale={[0.62, 1.0, 0.36]} color="#86efac" />
        <CartoonBodySegment position={[0, 0.28, 0]} scale={[0.55, 0.34, 0.34]} color="#74d99f" />
        <CartoonBodySegment position={[-0.72, 1.32, 0]} scale={[0.16, 0.72, 0.16]} color={getScoreColor(stepResults.ARM_RIGHT?.score || 3)} rotation={[0, 0, -0.18]} />
        <CartoonBodySegment position={[0.72, 1.32, 0]} scale={[0.16, 0.72, 0.16]} color={getScoreColor(stepResults.ARM_LEFT?.score || 3)} rotation={[0, 0, 0.18]} />
        <CartoonBodySegment position={[-0.34, -0.58, 0]} scale={[0.18, 0.88, 0.18]} color={getScoreColor(stepResults.LEG_RIGHT?.score || 3)} rotation={[0, 0, -0.06]} />
        <CartoonBodySegment position={[0.34, -0.58, 0]} scale={[0.18, 0.88, 0.18]} color={getScoreColor(stepResults.LEG_LEFT?.score || 3)} rotation={[0, 0, 0.06]} />
    </group>
);

// Internal component for the mesh logic
const SmplMesh: React.FC<{ stepResults: Record<string, LimbResult> }> = ({ stepResults }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Combine data - find best mesh if multiple exist, usually take the last successful one or merge?
    // The current backend returns ONE full mesh per scan step IF we run full SMPL.
    // Ideally we have a unified mesh.
    // The `stepResults` might contain multiple `smpl_mesh` entries if run sequentially.
    // We'll pick the first valid mesh we find to render the shape, and color it using ALL results.

    // Find a valid mesh
    const validMeshStr = Object.values(stepResults).find(r => r.smpl_mesh)?.smpl_mesh;

    // Find valid landmarks (from any step, preferably one that has them)
    // We need landmarks to map vertices to body parts for coloring
    const validLandmarks = Object.values(stepResults).find(r => r.landmarks && r.landmarks.length > 0)?.landmarks;

    const geometry = useMemo(() => {
        if (validMeshStr) {
            return parseOBJ(validMeshStr);
        }
        return null;
    }, [validMeshStr]);

    const colors = useMemo(() => {
        if (!geometry || !validLandmarks) return null;

        const count = geometry.attributes.position.count;
        const colorArray = new Float32Array(count * 3);
        const posAttr = geometry.attributes.position as THREE.BufferAttribute;
        const vertex = new THREE.Vector3();

        // Prepare landmarks
        const namedLandmarks = validLandmarks.map((l: any, idx: number) => ({
            x: l.x, y: l.y, z: l.z, name: getLandmarkNameByIndex(idx)
        })).filter((l: any) => l.name && LANDMARK_TO_STEP[l.name]);

        for (let i = 0; i < count; i++) {
            vertex.fromBufferAttribute(posAttr, i);

            let minDist = Infinity;
            let closestStep: ScanStep | null = null;

            for (const lm of namedLandmarks) {
                // simple distance (assuming somewhat aligned spaces)
                const d = vertex.distanceToSquared(new THREE.Vector3(lm.x, lm.y, lm.z));

                if (d < minDist) {
                    minDist = d;
                    closestStep = LANDMARK_TO_STEP[lm.name];
                }
            }

            let color = [0.8, 0.8, 0.8]; // default
            if (closestStep && stepResults[closestStep]) {
                const hex = getScoreColor(stepResults[closestStep].score);
                const c = new THREE.Color(hex);
                color = [c.r, c.g, c.b];
            }

            colorArray[i * 3] = color[0];
            colorArray[i * 3 + 1] = color[1];
            colorArray[i * 3 + 2] = color[2];
        }

        return new THREE.BufferAttribute(colorArray, 3);
    }, [geometry, validLandmarks, stepResults]);

    const displayGeometry = useMemo(() => {
        if (!geometry) return null;
        const clonedGeometry = geometry.clone();
        if (colors) {
            clonedGeometry.setAttribute('color', colors);
        }
        return clonedGeometry;
    }, [geometry, colors]);

    if (!displayGeometry) {
        // Fallback or empty
        return <HumanizedFallbackModel stepResults={stepResults} />;
    }

    return (
        <group>
            <mesh ref={meshRef} geometry={displayGeometry} position={[0, 0, 0]} castShadow receiveShadow>
                <meshStandardMaterial color={colors ? '#ffffff' : '#bbf7d0'} vertexColors={Boolean(colors)} roughness={0.68} metalness={0.02} />
            </mesh>
        </group>
    );
};

export const SmplViewer: React.FC<SmplViewerProps> = ({ exercises, showControls = true }) => {
    const stepResults = useMemo(() => {
        const map: Record<string, LimbResult> = {};
        exercises.forEach(e => {
            if (e.step) map[e.step] = e;
        });
        return map;
    }, [exercises]);

    return (
        <div className="w-full h-full min-h-[400px] bg-gray-50 rounded-lg overflow-hidden relative">
            <Canvas gl={{ preserveDrawingBuffer: true }} camera={{ position: [0, 1, 4], fov: 50 }} shadows>
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                <React.Suspense fallback={null}>
                    <Environment preset="city" />

                    <group position={[0, -1, 0]}>
                        <SmplMesh stepResults={stepResults} />
                        <ContactShadows resolution={512} scale={50} blur={1} opacity={0.5} far={10} color="#000000" />
                    </group>
                </React.Suspense>

                {showControls && <OrbitControls minPolarAngle={0} maxPolarAngle={Math.PI / 2} />}
                <gridHelper args={[10, 10, 0xdddddd, 0xeeeeee]} position={[0, -1, 0]} />
            </Canvas>
            <div className="absolute bottom-4 right-4 bg-white/80 p-2 rounded text-xs text-gray-500 pointer-events-none">
                Interact to Rotate/Zoom
            </div>
        </div>
    );
};
