import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

// Pose images in scroll order
import cosmonautLeft from '@/assets/landing/cosmonaut-left.png';
import cosmonautRising from '@/assets/landing/cosmonaut-rising.png';
import cosmonautUpright from '@/assets/landing/cosmonaut-upright.png';
import cosmonautFly from '@/assets/landing/cosmonaut-fly.png';
import cosmonautDescend from '@/assets/landing/cosmonaut-descend.png';

/* ── Per-pose hand anchor positions (where the balloon strings attach) ── */
const POSE_ANCHORS: [number, number, number][] = [
  [2.1, -0.6, 2.15],   // left (reclined)
  [1.8, 0.0, 2.15],    // rising
  [1.5, 0.4, 2.15],    // upright
  [2.0, 0.0, 2.15],    // fly
  [2.1, -0.4, 2.15],   // descend
];

/* ── Per-pose position offsets (cosmonaut position on screen) ── */
const POSE_POSITIONS: [number, number, number][] = [
  [2.2, -1, 3],     // left
  [2.2, -0.6, 3],   // rising
  [2.2, -0.2, 3],   // upright
  [2.2, -1.5, 3],   // fly
  [2.2, -2.5, 3],   // descend
];

/* ── Chroma-key shader with opacity uniform for cross-fading ── */
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D map;
  uniform float opacity;
  varying vec2 vUv;
  void main() {
    vec4 texColor = texture2D(map, vUv);
    float brightness = (texColor.r + texColor.g + texColor.b) / 3.0;
    float alpha = smoothstep(0.05, 0.15, brightness) * opacity;
    gl_FragColor = vec4(texColor.rgb, alpha);
  }
`;

function lerp3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

interface AnimatedCosmonautProps {
  scrollProgress: number;
  onHandAnchorUpdate?: (anchor: [number, number, number]) => void;
}

export default function AnimatedCosmonaut({ scrollProgress, onHandAnchorUpdate }: AnimatedCosmonautProps) {
  const textures = useLoader(THREE.TextureLoader, [
    cosmonautLeft,
    cosmonautRising,
    cosmonautUpright,
    cosmonautFly,
    cosmonautDescend,
  ]);

  const meshARef = useRef<THREE.Mesh>(null);
  const meshBRef = useRef<THREE.Mesh>(null);

  const poseCount = textures.length;

  const materialA = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { map: { value: textures[0] }, opacity: { value: 1 } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  }), [textures]);

  const materialB = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { map: { value: textures[0] }, opacity: { value: 0 } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  }), [textures]);

  useFrame((state) => {
    // Map scrollProgress (0-1) to pose index range
    const totalProgress = scrollProgress * (poseCount - 1);
    const indexA = Math.min(Math.floor(totalProgress), poseCount - 2);
    const indexB = indexA + 1;
    const blend = totalProgress - indexA;

    // Update textures
    materialA.uniforms.map.value = textures[indexA];
    materialA.uniforms.opacity.value = 1 - blend;
    materialB.uniforms.map.value = textures[indexB];
    materialB.uniforms.opacity.value = blend;

    // Interpolate position
    const posA = POSE_POSITIONS[indexA];
    const posB = POSE_POSITIONS[indexB];
    const pos = lerp3(posA, posB, blend);

    // Add gentle float
    const floatY = Math.sin(state.clock.elapsedTime * 0.35) * 0.05;

    if (meshARef.current) {
      meshARef.current.position.set(pos[0], pos[1] + floatY, pos[2]);
    }
    if (meshBRef.current) {
      meshBRef.current.position.set(pos[0], pos[1] + floatY, pos[2]);
    }

    // Interpolate hand anchor and notify parent
    const anchorA = POSE_ANCHORS[indexA];
    const anchorB = POSE_ANCHORS[indexB];
    const anchor = lerp3(anchorA, anchorB, blend);
    onHandAnchorUpdate?.(anchor);
  });

  return (
    <>
      <mesh ref={meshARef} position={[2.2, -1, 3]} material={materialA} renderOrder={10}>
        <planeGeometry args={[4.5, 4.5]} />
      </mesh>
      <mesh ref={meshBRef} position={[2.2, -1, 3]} material={materialB} renderOrder={10}>
        <planeGeometry args={[4.5, 4.5]} />
      </mesh>
    </>
  );
}

export { POSE_ANCHORS };
