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
  const textures = useLoader(THREE.TextureLoader, [cosmonautSitting]);

  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { map: { value: textures[0] }, opacity: { value: 1 } },
    vertexShader, fragmentShader, transparent: true, depthWrite: false,
  }), [textures]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const floatY = Math.sin(t * 0.35) * 0.05;

    // Responsive base position: move cosmonaut more centered on smaller viewports
    const vw = state.gl.domElement.clientWidth;
    const baseX = vw < 768 ? 0.5 : 2.2;
    const baseY = vw < 768 ? -1.5 : -1;
    const planeSize = vw < 768 ? 3.5 : 4.5;

    // Entrance animation: slide in from off-screen right over 2.5 seconds
    const entranceDuration = 2.5;
    const entranceT = THREE.MathUtils.clamp(t / entranceDuration, 0, 1);
    const entranceEased = 1 - Math.pow(1 - entranceT, 3);
    const entranceOffsetX = (1 - entranceEased) * 8;
    const entranceOffsetY = (1 - entranceEased) * -2;
    const entranceOpacity = entranceEased;

    // Slide to the right on scroll
    const flyStart = 0.10;
    const flyEnd = 0.22;
    const flyT = THREE.MathUtils.clamp((scrollProgress - flyStart) / (flyEnd - flyStart), 0, 1);
    const flyEased = flyT * flyT * (3 - 2 * flyT);

    const posX = baseX + entranceOffsetX + flyEased * 12;
    const posY = baseY + entranceOffsetY + floatY + flyEased * 1.5;

    if (meshRef.current) {
      meshRef.current.position.set(posX, posY, 3);
      material.uniforms.opacity.value = entranceOpacity;
      // Update plane size for mobile
      const geo = meshRef.current.geometry as THREE.PlaneGeometry;
      if (geo.parameters.width !== planeSize) {
        meshRef.current.geometry = new THREE.PlaneGeometry(planeSize, planeSize);
      }
    }

    if (meshRef.current) {
      meshRef.current.position.set(posX, posY, 3);
      material.uniforms.opacity.value = entranceOpacity;
    }

    onHandAnchorUpdate?.(POSE_ANCHORS[0]);
  });

  return (
    <mesh ref={meshRef} position={[2.2, -1, 3]} material={material} renderOrder={10}>
      <planeGeometry args={[4.5, 4.5]} />
    </mesh>
  );
}
