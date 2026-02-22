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

    // Phase 1: Fly out to the right (hero exit)
    const exitStart = 0.10;
    const exitEnd = 0.18;
    const exitT = THREE.MathUtils.clamp((scrollProgress - exitStart) / (exitEnd - exitStart), 0, 1);
    const exitEased = exitT * exitT * (3 - 2 * exitT);

    // Phase 2: Re-enter from right for section 2
    const enterStart = 0.18;
    const enterEnd = 0.28;
    const enterT = THREE.MathUtils.clamp((scrollProgress - enterStart) / (enterEnd - enterStart), 0, 1);
    const enterEased = enterT * enterT * (3 - 2 * enterT);

    let posX: number, posY: number, scale: number;

    if (scrollProgress < exitStart) {
      // Static hero position
      posX = 2.2;
      posY = -1 + floatY;
      scale = 1;
    } else if (scrollProgress < enterStart) {
      // Flying out to the right
      posX = 2.2 + exitEased * 8; // fly far right off-screen
      posY = -1 + exitEased * 2 + floatY;
      scale = 1 - exitEased * 0.5;
    } else {
      // Re-entering from the right as buddy
      const offScreenX = 8;
      const buddyX = 4.2;
      const buddyY = 1.5;
      posX = offScreenX - (offScreenX - buddyX) * enterEased;
      posY = buddyY + floatY;
      scale = 0.4 + enterEased * 0.05;
    }

    if (meshARef.current) {
      meshARef.current.position.set(posX, posY, 3);
      meshARef.current.scale.setScalar(scale);
    }
    if (meshBRef.current) {
      meshBRef.current.position.set(posX, posY, 3);
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
