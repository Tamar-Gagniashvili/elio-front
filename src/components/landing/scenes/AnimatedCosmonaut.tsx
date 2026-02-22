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
    // Instant swap at ~5% scroll, with a very quick cross-fade over 5% range
    const swapStart = 0.03;
    const swapEnd = 0.08;
    const blend = THREE.MathUtils.clamp((scrollProgress - swapStart) / (swapEnd - swapStart), 0, 1);

    materialA.uniforms.opacity.value = 1 - blend;
    materialB.uniforms.opacity.value = blend;

    // After swap, fade out the whole cosmonaut as it "leaves" the 3D scene (shrinks into flying companion)
    const fadeStart = 0.15;
    const fadeEnd = 0.35;
    const sceneFade = 1 - THREE.MathUtils.clamp((scrollProgress - fadeStart) / (fadeEnd - fadeStart), 0, 1);

    if (scrollProgress > fadeStart) {
      materialA.uniforms.opacity.value *= sceneFade;
      materialB.uniforms.opacity.value *= sceneFade;
    }

    const floatY = Math.sin(state.clock.elapsedTime * 0.35) * 0.05;
    const pos: [number, number, number] = [2.2, -1 + floatY, 3];

    if (meshARef.current) meshARef.current.position.set(...pos);
    if (meshBRef.current) meshBRef.current.position.set(...pos);

    // Interpolate hand anchor
    const anchor: [number, number, number] = [
      POSE_ANCHORS[0][0] + (POSE_ANCHORS[1][0] - POSE_ANCHORS[0][0]) * blend,
      POSE_ANCHORS[0][1] + (POSE_ANCHORS[1][1] - POSE_ANCHORS[0][1]) * blend,
      POSE_ANCHORS[0][2] + (POSE_ANCHORS[1][2] - POSE_ANCHORS[0][2]) * blend,
    ];
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
