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

    // After standing, shrink and reposition to become the flying buddy
    const shrinkStart = 0.12;
    const shrinkEnd = 0.25;
    const shrinkT = THREE.MathUtils.clamp((scrollProgress - shrinkStart) / (shrinkEnd - shrinkStart), 0, 1);
    const eased = shrinkT * shrinkT * (3 - 2 * shrinkT); // smoothstep

    // Scale from full size (1) down to buddy size (0.35)
    const scale = 1 - eased * 0.65;

    // Position: move from hero position toward top-right corner as buddy
    const baseX = 2.2;
    const baseY = -1;
    const buddyX = 4.5;
    const buddyY = 2.5;
    const posX = baseX + (buddyX - baseX) * eased;
    const posY = baseY + (buddyY - baseY) * eased + floatY;

    if (meshARef.current) {
      meshARef.current.position.set(posX, posY + floatY, 3);
      meshARef.current.scale.setScalar(scale);
    }
    if (meshBRef.current) {
      meshBRef.current.position.set(posX, posY + floatY, 3);
      meshBRef.current.scale.setScalar(scale);
    }

    // Snap hand anchor (only relevant before shrink)
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
