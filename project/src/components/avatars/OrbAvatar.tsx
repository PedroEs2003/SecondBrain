import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, Suspense } from "react";
import * as THREE from "three";
import type { Mood } from "@/hooks/useCompanionMood";

export type OrbCustomization = { color?: string; glowColor?: string };

const getOrbCustom = (): OrbCustomization => {
  try { const s = localStorage.getItem("avatar-custom-orb"); return s ? JSON.parse(s) : {}; } catch { return {}; }
};

type OrbMoodCfg = { color: string; glowColor: string; speed: number };

const MOOD_ORB: Record<string, OrbMoodCfg> = {
  chill:       { color: "#0088ff", glowColor: "#00aaff", speed: 1.0 },
  happy:       { color: "#ffcc00", glowColor: "#ffdd44", speed: 1.5 },
  sleepy:      { color: "#6655aa", glowColor: "#9988cc", speed: 0.4 },
  excited:     { color: "#cc44ff", glowColor: "#ff88ff", speed: 2.5 },
  celebrating: { color: "#00cc88", glowColor: "#00ffcc", speed: 3.0 },
  worried:     { color: "#cc8833", glowColor: "#ffaa44", speed: 0.7 },
  rain:        { color: "#2255aa", glowColor: "#7daaff", speed: 0.5 },
  sunny:       { color: "#ccaa00", glowColor: "#ffee55", speed: 1.2 },
  frio:        { color: "#1144aa", glowColor: "#88ccff", speed: 0.5 },
  calor:       { color: "#cc3311", glowColor: "#ff6622", speed: 2.0 },
  triste:      { color: "#334455", glowColor: "#7788aa", speed: 0.4 },
};

const OrbMesh = ({ mood = "chill", color: customColor, glowColor: customGlow }: { mood?: string; color?: string; glowColor?: string }) => {
  const mc = MOOD_ORB[mood] ?? MOOD_ORB.chill;
  const color = customColor ?? mc.color;
  const glowColor = customGlow ?? mc.glowColor;
  const speed = mc.speed;

  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const particleCount = 20;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 3;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 3;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 3;
  }

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;
    if (groupRef.current) groupRef.current.rotation.y = t * 0.3;
    if (coreRef.current) {
      coreRef.current.rotation.x = Math.sin(t * 0.5) * 0.2;
      const s = 1 + Math.sin(t * 2) * 0.05;
      coreRef.current.scale.set(s, s, s);
    }
    if (ring1Ref.current) { ring1Ref.current.rotation.x = t * 0.8; ring1Ref.current.rotation.z = t * 0.4; }
    if (ring2Ref.current) { ring2Ref.current.rotation.y = t * 0.6; ring2Ref.current.rotation.x = Math.PI / 3 + Math.sin(t * 0.3) * 0.2; }
    if (particlesRef.current) { particlesRef.current.rotation.y = t * 0.1; }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.6, 2]} />
        <meshPhysicalMaterial color={color} metalness={0.9} roughness={0.1} clearcoat={1} emissive={glowColor} emissiveIntensity={0.3} transparent opacity={0.85} />
      </mesh>
      <mesh><sphereGeometry args={[0.4, 16, 16]} /><meshBasicMaterial color={glowColor} transparent opacity={0.15} /></mesh>
      <mesh ref={ring1Ref}><torusGeometry args={[0.9, 0.02, 16, 64]} /><meshPhysicalMaterial color={glowColor} emissive={glowColor} emissiveIntensity={0.8} metalness={1} roughness={0} transparent opacity={0.6} /></mesh>
      <mesh ref={ring2Ref}><torusGeometry args={[1.1, 0.015, 16, 64]} /><meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.5} metalness={1} roughness={0} transparent opacity={0.4} /></mesh>
      <points ref={particlesRef}>
        <bufferGeometry><bufferAttribute attach="attributes-position" count={particleCount} array={particlePositions} itemSize={3} /></bufferGeometry>
        <pointsMaterial color={glowColor} size={0.04} transparent opacity={0.6} sizeAttenuation />
      </points>
      <pointLight color={glowColor} intensity={2} distance={4} decay={2} />
    </group>
  );
};

const OrbAvatar = ({ size = 120, className = "", mood = "chill", customization }: { size?: number; className?: string; mood?: Mood | string; customization?: OrbCustomization }) => {
  const c = customization || getOrbCustom();
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }} gl={{ alpha: true, antialias: true }} style={{ background: "transparent", width: "100%", height: "100%" }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={0.5} />
          <OrbMesh mood={mood} color={c.color} glowColor={c.glowColor} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default OrbAvatar;
