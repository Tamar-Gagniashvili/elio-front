import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

import cosmonautSitting from '@/assets/landing/cosmonaut-left.png';
import cosmonautStanding from '@/assets/landing/cosmonaut-standing.png';

/* ── Per-pose hand anchor positions ── */
export const POSE_ANCHORS: [number, number, number][] = [
  [2.1, -0.6, 2.15],   // sitting
  [1.6, 0.6, 2.15],    // standing
];

/* ── Chroma-key shader with opacity for cross-fade ── */
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

interface AnimatedCosmonautProps {
  scrollProgress: number;
  onHandAnchorUpdate?: (anchor: [number, number, number]) => void;
}

export default function AnimatedCosmonaut({ scrollProgress, onHandAnchorUpdate }: AnimatedCosmonautProps) {
  const textures = useLoader(THREE.TextureLoader, [cosmonautSitting, cosmonautStanding]);

  const meshARef = useRef<THREE.Mesh>(null);
  const meshBRef = useRef<THREE.Mesh>(null);

  const materialA = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { map: { value: textures[0] }, opacity: { value: 1 } },
    vertexShader, fragmentShader, transparent: true, depthWrite: false,
  }), [textures]);

  const materialB = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { map: { value: textures[1] }, opacity: { value: 0 } },
    vertexShader, fragmentShader, transparent: true, depthWrite: false,
  }), [textures]);

  useFrame((state) => {
    // Instant swap — no cross-fade, just switch at threshold
    const showStanding = scrollProgress > 0.04;

    materialA.uniforms.opacity.value = showStanding ? 0 : 1;
    materialB.uniforms.opacity.value = showStanding ? 1 : 0;

    const floatY = Math.sin(state.clock.elapsedTime * 0.35) * 0.05;

    // Fly away to the right instead of fading
    const flyStart = 0.08;
    const flyEnd = 0.18;
    const flyT = THREE.MathUtils.clamp((scrollProgress - flyStart) / (flyEnd - flyStart), 0, 1);
    const flyEased = flyT * flyT * (3 - 2 * flyT);

    // Move right and slightly up
    const posX = 2.2 + flyEased * 12;
    const posY = -1 + floatY + flyEased * 1.5;

    if (meshARef.current) meshARef.current.position.set(posX, posY, 3);
    if (meshBRef.current) meshBRef.current.position.set(posX, posY, 3);

    // Snap hand anchor
    const anchor = showStanding ? POSE_ANCHORS[1] : POSE_ANCHORS[0];
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
