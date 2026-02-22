import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import cosmonautImg from '@/assets/landing/cosmonaut-left.png';

/* ── Anchor = cosmonaut's raised hand (upper-left of sprite) ── */
const HAND_ANCHOR: [number, number, number] = [2.1, -0.6, 2.15];

const SOCIAL_ICONS = [
  {
    name: 'WhatsApp',
    color: '#25D366',
    offset: [-1.8, 1.2, 0.3] as [number, number, number],
    svg: `<svg viewBox="0 0 24 24" fill="#25D366" width="32" height="32"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  },
  {
    name: 'Telegram',
    color: '#26A5E4',
    offset: [0.3, 2.2, 0.1] as [number, number, number],
    svg: `<svg viewBox="0 0 24 24" fill="#26A5E4" width="32" height="32"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
  },
  {
    name: 'Instagram',
    color: '#E4405F',
    offset: [2.2, 1.5, -0.2] as [number, number, number],
    svg: `<svg viewBox="0 0 24 24" fill="#E4405F" width="32" height="32"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z"/></svg>`,
  },
  {
    name: 'Messenger',
    color: '#0084FF',
    offset: [-0.8, 0.4, 0.4] as [number, number, number],
    svg: `<svg viewBox="0 0 24 24" fill="#0084FF" width="28" height="28"><path d="M.001 11.639C.001 4.949 5.241 0 12.001 0S24 4.95 24 11.639c0 6.689-5.24 11.638-12 11.638-1.21 0-2.38-.16-3.47-.46a.96.96 0 00-.64.05l-2.39 1.05a.96.96 0 01-1.35-.85l-.07-2.14a.97.97 0 00-.32-.68A11.39 11.389 0 01.002 11.64zm8.32-2.19l-3.52 5.6c-.35.53.32 1.139.82.75l3.79-2.87c.26-.2.6-.2.87 0l2.8 2.1c.84.63 2.04.4 2.6-.48l3.52-5.6c.35-.53-.32-1.13-.82-.75l-3.79 2.87c-.25.2-.6.2-.86 0l-2.8-2.1a1.8 1.8 0 00-2.61.48z"/></svg>`,
  },
  {
    name: 'Email',
    color: '#99FFCC',
    offset: [1.4, 2.8, 0] as [number, number, number],
    svg: `<svg viewBox="0 0 24 24" fill="#99FFCC" width="28" height="28"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`,
  },
  {
    name: 'Phone',
    color: '#99FFCC',
    offset: [-2.2, 2.0, 0.2] as [number, number, number],
    svg: `<svg viewBox="0 0 24 24" fill="#99FFCC" width="26" height="26"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`,
  },
];

/* ── Scroll-driven camera ── */
function CameraRig({ scrollProgress }: { scrollProgress: number }) {
  const { camera } = useThree();

  useFrame(() => {
    const targetZ = 8 - scrollProgress * 6;
    const targetX = scrollProgress * 1.5;
    const targetY = scrollProgress * -0.5;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.06);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.06);
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, scrollProgress * -0.04, 0.06);
  });

  return null;
}

/* ── Custom shader material to make black bg transparent ── */
const chromaKeyVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const chromaKeyFragmentShader = `
  uniform sampler2D map;
  varying vec2 vUv;
  void main() {
    vec4 texColor = texture2D(map, vUv);
    float brightness = (texColor.r + texColor.g + texColor.b) / 3.0;
    float alpha = smoothstep(0.05, 0.15, brightness);
    gl_FragColor = vec4(texColor.rgb, alpha);
  }
`;

/* ── Cosmonaut ── */
function Cosmonaut() {
  const texture = useLoader(THREE.TextureLoader, cosmonautImg);
  const meshRef = useRef<THREE.Mesh>(null);

  const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { map: { value: texture } },
    vertexShader: chromaKeyVertexShader,
    fragmentShader: chromaKeyFragmentShader,
    transparent: true,
    depthWrite: false,
  }), [texture]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = -1 + Math.sin(state.clock.elapsedTime * 0.35) * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} position={[2.2, -1, 3]} material={shaderMaterial} renderOrder={10}>
      <planeGeometry args={[4.5, 4.5]} />
    </mesh>
  );
}

/* ── Glowing neon string (from icon to hand) with animated glow ── */
const neonStringVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function makeNeonStringFragmentShader(color: string) {
  // Parse hex to RGB
  const r = parseInt(color.slice(1, 3), 16) / 255;
  const g = parseInt(color.slice(3, 5), 16) / 255;
  const b = parseInt(color.slice(5, 7), 16) / 255;
  return `
    uniform float time;
    varying vec2 vUv;
    void main() {
      float pulse = 0.5 + 0.5 * sin(time * 2.0 + vUv.x * 6.28);
      float glow = 0.6 + 0.4 * pulse;
      gl_FragColor = vec4(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}, glow * 0.7);
    }
  `;
}

function NeonString({ from, to, color }: { from: [number, number, number]; to: [number, number, number]; color: string }) {
  const lineRef = useRef<THREE.Line>(null);

  const { geometry, material } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 16;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = from[0] + (to[0] - from[0]) * t;
      const y = from[1] + (to[1] - from[1]) * t;
      const z = from[2] + (to[2] - from[2]) * t;
      // Slight catenary sag
      const sag = Math.sin(t * Math.PI) * -0.08;
      pts.push(new THREE.Vector3(x + sag * 0.2, y + sag, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: neonStringVertexShader,
      fragmentShader: makeNeonStringFragmentShader(color),
      transparent: true,
      depthWrite: false,
    });
    return { geometry: geo, material: mat };
  }, [from, to, color]);

  useFrame((state) => {
    if (material) {
      (material as THREE.ShaderMaterial).uniforms.time.value = state.clock.elapsedTime;
    }
  });

  const lineObj = useMemo(() => {
    const line = new THREE.Line(geometry, material);
    return line;
  }, [geometry, material]);

  return <primitive ref={lineRef} object={lineObj} />;
}

/* ── Spark particles around each node ── */
function NodeSparks({ position, color, count = 8 }: { position: [number, number, number]; color: string; count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions: sparkPositions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.15 + Math.random() * 0.15;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = Math.sin(angle) * radius;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
      vel[i * 3] = (Math.random() - 0.5) * 0.3;
      vel[i * 3 + 1] = Math.random() * 0.4 + 0.1;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame((state) => {
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position;
      const t = state.clock.elapsedTime;
      for (let i = 0; i < count; i++) {
        const phase = (t * 0.8 + i * 0.7) % 2.0;
        const life = phase / 2.0; // 0→1
        const sparkX = velocities[i * 3] * life * 0.5;
        const sparkY = velocities[i * 3 + 1] * life * 0.4;
        const sparkZ = velocities[i * 3 + 2] * life * 0.3;
        posAttr.setXYZ(
          i,
          sparkX + Math.sin(t * 1.5 + i) * 0.03,
          sparkY + Math.cos(t * 1.2 + i) * 0.03,
          sparkZ
        );
      }
      posAttr.needsUpdate = true;
      // Pulsing opacity
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      mat.opacity = 0.5 + Math.sin(t * 3) * 0.3;
    }
  });

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={sparkPositions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.04} transparent opacity={0.7} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ── Balloon bouquet held by cosmonaut ── */
function BalloonBouquet() {
  const groupRef = useRef<THREE.Group>(null);
  const iconRefs = useRef<(THREE.Group | null)[]>([]);
  const [iconPositions, setIconPositions] = useState<[number, number, number][]>(
    SOCIAL_ICONS.map(icon => [
      HAND_ANCHOR[0] + icon.offset[0],
      HAND_ANCHOR[1] + icon.offset[1],
      HAND_ANCHOR[2] + icon.offset[2],
    ])
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.025;
    }
    const newPositions: [number, number, number][] = [];
    iconRefs.current.forEach((ref, i) => {
      if (ref) {
        const offset = i * 1.1;
        const bx = HAND_ANCHOR[0] + SOCIAL_ICONS[i].offset[0] + Math.sin(t * 0.4 + offset) * 0.06;
        const by = HAND_ANCHOR[1] + SOCIAL_ICONS[i].offset[1] + Math.sin(t * 0.6 + offset) * 0.08;
        const bz = HAND_ANCHOR[2] + SOCIAL_ICONS[i].offset[2] + Math.cos(t * 0.35 + offset) * 0.04;
        ref.position.set(bx, by, bz);
        ref.rotation.z = Math.sin(t * 0.5 + offset) * 0.04;
        newPositions[i] = [bx, by, bz];
      }
    });
    if (newPositions.length === SOCIAL_ICONS.length) {
      setIconPositions(newPositions);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Neon strings */}
      {SOCIAL_ICONS.map((icon, i) => (
        <NeonString
          key={`string-${icon.name}`}
          from={iconPositions[i] || [HAND_ANCHOR[0] + icon.offset[0], HAND_ANCHOR[1] + icon.offset[1], HAND_ANCHOR[2] + icon.offset[2]]}
          to={HAND_ANCHOR}
          color={icon.color}
        />
      ))}
      {/* Balloon icons with sparks */}
      {SOCIAL_ICONS.map((icon, i) => {
        const pos: [number, number, number] = [
          HAND_ANCHOR[0] + icon.offset[0],
          HAND_ANCHOR[1] + icon.offset[1],
          HAND_ANCHOR[2] + icon.offset[2],
        ];
        return (
          <group key={icon.name}>
            <group
              ref={(el) => { iconRefs.current[i] = el; }}
              position={pos}
            >
              <Html
                center
                distanceFactor={6}
                style={{
                  pointerEvents: 'none',
                  filter: `drop-shadow(0 0 16px ${icon.color}aa)`,
                }}
              >
                <div
                  className="rounded-full p-3 backdrop-blur-md"
                  style={{
                    background: `${icon.color}22`,
                    border: `1.5px solid ${icon.color}50`,
                    boxShadow: `0 0 28px ${icon.color}40, 0 0 8px ${icon.color}20, inset 0 0 14px ${icon.color}15`,
                  }}
                  dangerouslySetInnerHTML={{ __html: icon.svg }}
                />
              </Html>
            </group>
            {/* Sparks around the node */}
            <NodeSparks
              position={iconPositions[i] || pos}
              color={icon.color}
              count={10}
            />
          </group>
        );
      })}
    </group>
  );
}

/* ── Glowing energy rings ── */
function EnergyRing() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.12;
      ringRef.current.rotation.x = Math.PI * 0.4 + Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
    }
  });

  return (
    <mesh ref={ringRef} position={[2.2, 1.2, 1.5]} rotation={[Math.PI * 0.4, 0, 0]}>
      <torusGeometry args={[2.5, 0.012, 16, 120]} />
      <meshBasicMaterial color="#99FFCC" transparent opacity={0.35} />
    </mesh>
  );
}

function EnergyRing2() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = -state.clock.elapsedTime * 0.08;
      ringRef.current.rotation.x = Math.PI * 0.5 + Math.sin(state.clock.elapsedTime * 0.15) * 0.06;
    }
  });

  return (
    <mesh ref={ringRef} position={[2.2, 1.2, 1.5]} rotation={[Math.PI * 0.5, 0, 0]}>
      <torusGeometry args={[3, 0.006, 16, 120]} />
      <meshBasicMaterial color="#00bcd4" transparent opacity={0.2} />
    </mesh>
  );
}

/* ── Space particles ── */
function SpaceParticles({ count = 300 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
    }
    return pos;
  }, [count]);

  useFrame((_, delta) => {
    if (points.current) {
      points.current.rotation.y += delta * 0.005;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#99FFCC" size={0.02} transparent opacity={0.4} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/* ── Main export ── */
interface HeroScene3DProps {
  scrollProgress: number;
  className?: string;
}

export default function HeroScene3D({ scrollProgress, className }: HeroScene3DProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <CameraRig scrollProgress={scrollProgress} />
        
        <ambientLight intensity={0.15} />
        <directionalLight position={[-5, 5, 8]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[3, 2, 5]} intensity={0.3} color="#99FFCC" />
        <pointLight position={[2, 0, 3]} intensity={0.6} color="#99FFCC" distance={12} />

        <Cosmonaut />
        <EnergyRing />
        <EnergyRing2 />
        <BalloonBouquet />

        <SpaceParticles count={400} />
        <Stars radius={20} depth={40} count={2500} factor={3} saturation={0.1} fade speed={0.3} />
      </Canvas>
    </div>
  );
}
