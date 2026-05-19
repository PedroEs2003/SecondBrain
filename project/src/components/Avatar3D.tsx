import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, Suspense } from "react";
import * as THREE from "three";

type AvatarMeshProps = {
  scale?: number;
  speed?: number;
  color?: string;
  glowColor?: string;
};

const AvatarMesh = ({ scale = 1, speed = 1, color = "#0088ff", glowColor = "#00aaff" }: AvatarMeshProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Floating particles
  const particleCount = 20;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 3;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 3;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 3;
  }

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.3;
    }

    if (coreRef.current) {
      coreRef.current.rotation.x = Math.sin(t * 0.5) * 0.2;
      coreRef.current.rotation.z = Math.cos(t * 0.3) * 0.1;
      const s = 1 + Math.sin(t * 2) * 0.05;
      coreRef.current.scale.set(s, s, s);
    }

    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * 0.8;
      ring1Ref.current.rotation.z = t * 0.4;
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = t * 0.6;
      ring2Ref.current.rotation.x = Math.PI / 3 + Math.sin(t * 0.3) * 0.2;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.1;
      particlesRef.current.rotation.x = Math.sin(t * 0.2) * 0.1;
    }
  });

  return (
    <group ref={groupRef} scale={scale}>
      {/* Core sphere - glass-like */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.6, 2]} />
        <meshPhysicalMaterial
          color={color}
          metalness={0.9}
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          emissive={glowColor}
          emissiveIntensity={0.3}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Inner glow sphere */}
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.15} />
      </mesh>

      {/* Ring 1 */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[0.9, 0.02, 16, 64]} />
        <meshPhysicalMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.8}
          metalness={1}
          roughness={0}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Ring 2 */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[1.1, 0.015, 16, 64]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          metalness={1}
          roughness={0}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Floating particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={glowColor}
          size={0.04}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>

      {/* Ambient light inside */}
      <pointLight color={glowColor} intensity={2} distance={4} decay={2} />
    </group>
  );
};

type Avatar3DProps = {
  size?: number;
  className?: string;
  speed?: number;
  color?: string;
  glowColor?: string;
  meshScale?: number;
};

const Avatar3D = ({
  size = 48,
  className = "",
  speed = 1,
  color = "#0088ff",
  glowColor = "#00aaff",
  meshScale = 1,
}: Avatar3DProps) => {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={0.5} />
          <AvatarMesh scale={meshScale} speed={speed} color={color} glowColor={glowColor} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Avatar3D;
