import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import moonImg from '@/assets/landing/moon-3d.png';
import cosmonautImg from '@/assets/landing/cosmonaut-moon.png';

/* ── Scroll-driven camera ── */
function CameraRig({ scrollProgress }: { scrollProgress: number }) {
  const { camera } = useThree();

  useFrame(() => {
    // Fly forward and slightly right toward the moon
    const targetZ = 6 - scrollProgress * 5;
    const targetX = scrollProgress * 0.8;
    const targetY = scrollProgress * -0.3;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.08);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.08);
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, scrollProgress * -0.05, 0.08);
  });

  return null;
}

/* ── Floating space particles ── */
function SpaceParticles({ count = 350 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 3;
    }
    return pos;
  }, [count]);

  useFrame((_, delta) => {
    if (points.current) {
      points.current.rotation.y += delta * 0.008;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#99FFCC" size={0.025} transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/* ── Moon — positioned right, rotates slowly ── */
function Moon({ scrollProgress }: { scrollProgress: number }) {
  const texture = useLoader(THREE.TextureLoader, moonImg);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Slow rotation
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.03;
      // Subtle breathing scale
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 0.3) * 0.008;
      meshRef.current.scale.setScalar(breathe);
    }
  });

  return (
    <mesh ref={meshRef} position={[2.5, -0.5, -2]}>
      <planeGeometry args={[7, 7]} />
      <meshBasicMaterial map={texture} transparent opacity={0.95} />
    </mesh>
  );
}

/* ── Cosmonaut — sitting on the moon, floating gently ── */
function Cosmonaut({ scrollProgress }: { scrollProgress: number }) {
  const texture = useLoader(THREE.TextureLoader, cosmonautImg);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle float
      meshRef.current.position.y = -0.8 + Math.sin(state.clock.elapsedTime * 0.4) * 0.08;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.25) * 0.02;
    }
  });

  return (
    <mesh ref={meshRef} position={[2, -0.8, -0.5]}>
      <planeGeometry args={[4.5, 4.5]} />
      <meshBasicMaterial map={texture} transparent opacity={1} />
    </mesh>
  );
}

/* ── Ambient glow orbs ── */
function GlowOrbs() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.015;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[3, 0, -3]}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshBasicMaterial color="#99FFCC" transparent opacity={0.025} />
      </mesh>
      <mesh position={[5, 2, -4]}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#00bcd4" transparent opacity={0.02} />
      </mesh>
      <mesh position={[0, -2, -3]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial color="#3366ff" transparent opacity={0.015} />
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
        camera={{ position: [0, 0, 6], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <CameraRig scrollProgress={scrollProgress} />
        <ambientLight intensity={0.4} />
        <Moon scrollProgress={scrollProgress} />
        <Cosmonaut scrollProgress={scrollProgress} />
        <SpaceParticles count={400} />
        <GlowOrbs />
        <Stars radius={18} depth={35} count={2000} factor={3} saturation={0.1} fade speed={0.4} />
      </Canvas>
    </div>
  );
}
