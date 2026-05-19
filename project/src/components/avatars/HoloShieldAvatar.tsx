import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, Suspense } from "react";
import * as THREE from "three";
import type { Mood } from "@/hooks/useCompanionMood";

export type HoloCustomization = { coreColor?: string; ringColor?: string };

const getHoloCustom = (): HoloCustomization => {
  try { const s = localStorage.getItem("avatar-custom-holo"); return s ? JSON.parse(s) : {}; } catch { return {}; }
};

type MoodColors = { coreColor: string; ringColor: string; speed: number; pulseSpeed: number };

const MOOD_HOLO: Record<string, MoodColors> = {
  chill:       { coreColor: "#00bbff", ringColor: "#00aaff", speed: 1.0, pulseSpeed: 3 },
  happy:       { coreColor: "#ffdd44", ringColor: "#ffcc00", speed: 1.5, pulseSpeed: 4 },
  sleepy:      { coreColor: "#9988cc", ringColor: "#aaaaff", speed: 0.3, pulseSpeed: 1 },
  excited:     { coreColor: "#ff88ff", ringColor: "#cc44ff", speed: 2.5, pulseSpeed: 6 },
  celebrating: { coreColor: "#00ffcc", ringColor: "#00ccaa", speed: 3.0, pulseSpeed: 7 },
  worried:     { coreColor: "#ffaa44", ringColor: "#ff8822", speed: 0.6, pulseSpeed: 2 },
  rain:        { coreColor: "#7daaff", ringColor: "#4488cc", speed: 0.5, pulseSpeed: 2 },
  sunny:       { coreColor: "#ffee55", ringColor: "#ffcc00", speed: 1.2, pulseSpeed: 3 },
  frio:        { coreColor: "#88ccff", ringColor: "#aaddff", speed: 0.5, pulseSpeed: 2 },
  calor:       { coreColor: "#ff6622", ringColor: "#ff4400", speed: 2.0, pulseSpeed: 5 },
  triste:      { coreColor: "#7788aa", ringColor: "#aabbcc", speed: 0.3, pulseSpeed: 1 },
};

const HoloShieldMesh = ({ mood = "chill", coreColor, ringColor }: {
  mood?: string; coreColor?: string; ringColor?: string;
}) => {
  const mc = MOOD_HOLO[mood] ?? MOOD_HOLO.chill;
  const effectiveCore = coreColor ?? mc.coreColor;
  const effectiveRing = ringColor ?? mc.ringColor;
  const speed = mc.speed;
  const pulseSpeed = mc.pulseSpeed;

  const groupRef = useRef<THREE.Group>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const hexRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;
    if (groupRef.current) groupRef.current.rotation.y = t * 0.15;
    if (ring1.current) ring1.current.rotation.z = t * 0.6;
    if (ring2.current) { ring2.current.rotation.z = -t * 0.4; ring2.current.rotation.x = Math.PI / 6; }
    if (ring3.current) { ring3.current.rotation.z = t * 0.3; ring3.current.rotation.y = Math.PI / 4; }
    if (coreRef.current) {
      const p = 0.8 + Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.2;
      (coreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = p;
    }
    if (hexRef.current) hexRef.current.rotation.z = -t * 0.2;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}>
        <circleGeometry args={[0.25, 6]} />
        <meshStandardMaterial color={effectiveCore} emissive={effectiveCore} emissiveIntensity={1} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={hexRef}>
        <ringGeometry args={[0.28, 0.35, 6]} />
        <meshStandardMaterial color={effectiveCore} emissive={effectiveCore} emissiveIntensity={0.6} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring1}>
        <torusGeometry args={[0.8, 0.03, 16, 64]} />
        <meshPhysicalMaterial color={effectiveRing} emissive={effectiveRing} emissiveIntensity={0.8} metalness={1} roughness={0} transparent opacity={0.7} />
      </mesh>
      <mesh ref={ring2}>
        <torusGeometry args={[0.6, 0.025, 16, 64]} />
        <meshPhysicalMaterial color={effectiveCore} emissive={effectiveCore} emissiveIntensity={0.6} metalness={1} roughness={0} transparent opacity={0.5} />
      </mesh>
      <mesh ref={ring3}>
        <torusGeometry args={[1.0, 0.02, 16, 64]} />
        <meshPhysicalMaterial color={effectiveRing} emissive={effectiveRing} emissiveIntensity={0.4} metalness={1} roughness={0} transparent opacity={0.3} />
      </mesh>
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.8, Math.sin(angle) * 0.8, 0]} rotation={[0, 0, angle + Math.PI / 2]}>
            <boxGeometry args={[0.02, 0.08, 0.01]} />
            <meshStandardMaterial color={effectiveRing} emissive={effectiveRing} emissiveIntensity={0.6} />
          </mesh>
        );
      })}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, y], i) => (
        <group key={i} position={[x * 0.55, y * 0.55, 0]}>
          <mesh position={[x * 0.08, 0, 0]}>
            <boxGeometry args={[0.12, 0.015, 0.01]} />
            <meshStandardMaterial color={effectiveRing} emissive={effectiveRing} emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, y * 0.08, 0]}>
            <boxGeometry args={[0.015, 0.12, 0.01]} />
            <meshStandardMaterial color={effectiveRing} emissive={effectiveRing} emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
      <pointLight color={effectiveCore} intensity={1.5} distance={4} decay={2} />
    </group>
  );
};

const HoloShieldAvatar = ({ size = 120, className = "", mood = "chill", customization }: { size?: number; className?: string; mood?: Mood | string; customization?: HoloCustomization }) => {
  const c = customization || getHoloCustom();
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }} gl={{ alpha: true, antialias: true }} style={{ background: "transparent", width: "100%", height: "100%" }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.2} />
          <directionalLight position={[5, 5, 5]} intensity={0.3} />
          <HoloShieldMesh mood={mood} coreColor={c.coreColor} ringColor={c.ringColor} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default HoloShieldAvatar;
