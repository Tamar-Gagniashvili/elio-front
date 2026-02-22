import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import heroBg from '@/assets/landing/hero-bg.png';

/* ── Scroll-driven camera that flies forward ── */
function CameraRig({ scrollProgress }: { scrollProgress: number }) {
  const { camera } = useThree();

  useFrame(() => {
    // Fly camera from z=5 toward z=1 as user scrolls
    const targetZ = 5 - scrollProgress * 4.2;
    const targetY = scrollProgress * -0.5;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.1);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.1);
    // Slight tilt down as we approach
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, scrollProgress * -0.08, 0.1);
  });

  return null;
}

/* ── Floating space particles for depth ── */
function SpaceParticles({ count = 300 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15 - 2;
    }
    return pos;
  }, [count]);

  const sizes = useMemo(() => {
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      s[i] = Math.random() * 0.03 + 0.005;
    }
    return s;
  }, [count]);

  useFrame((_, delta) => {
    if (points.current) {
      points.current.rotation.y += delta * 0.01;
      points.current.rotation.x += delta * 0.005;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#99FFCC"
        size={0.03}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* ── The hero image on a 3D plane ── */
function HeroPlane() {
  const texture = useLoader(THREE.TextureLoader, heroBg);
  const meshRef = useRef<THREE.Mesh>(null);

  // Subtle floating animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.02;
      meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.08) * 0.01;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -2]}>
      <planeGeometry args={[12, 7]} />
      <meshBasicMaterial map={texture} transparent opacity={0.95} />
    </mesh>
  );
}

/* ── Ambient glow orbs in 3D space ── */
function GlowOrbs() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main mint glow */}
      <mesh position={[0, 0, -1]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial color="#99FFCC" transparent opacity={0.03} />
      </mesh>
      {/* Side glow */}
      <mesh position={[3, 1.5, -3]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#00bcd4" transparent opacity={0.02} />
      </mesh>
      {/* Bottom glow */}
      <mesh position={[-2, -2, -2.5]}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#3366ff" transparent opacity={0.02} />
      </mesh>
    </group>
  );
}

/* ── Main exported component ── */
interface HeroScene3DProps {
  scrollProgress: number;
  className?: string;
}

export default function HeroScene3D({ scrollProgress, className }: HeroScene3DProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <CameraRig scrollProgress={scrollProgress} />
        <ambientLight intensity={0.3} />
        <HeroPlane />
        <SpaceParticles count={400} />
        <GlowOrbs />
        <Stars
          radius={15}
          depth={30}
          count={1500}
          factor={3}
          saturation={0.1}
          fade
          speed={0.5}
        />
      </Canvas>
    </div>
  );
}
