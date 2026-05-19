import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, Suspense } from "react";
import * as THREE from "three";
import type { Mood } from "@/hooks/useCompanionMood";

export type RobotCustomization = { bodyColor?: string; eyeColor?: string; accentColor?: string };

const getRobotCustom = (): RobotCustomization => {
  try { const s = localStorage.getItem("avatar-custom-robot"); return s ? JSON.parse(s) : {}; } catch { return {}; }
};

type RobotMoodCfg = { eyeColor: string; antennaColor: string; speed: number; blinkRate: number; headTiltAmt: number };

const MOOD_ROBOT: Record<string, RobotMoodCfg> = {
  chill:       { eyeColor: "#00ddff", antennaColor: "#00ff88", speed: 1.0, blinkRate: 3,  headTiltAmt: 0.3 },
  happy:       { eyeColor: "#ffdd44", antennaColor: "#ffcc00", speed: 1.5, blinkRate: 4,  headTiltAmt: 0.4 },
  sleepy:      { eyeColor: "#555577", antennaColor: "#7777aa", speed: 0.4, blinkRate: 1,  headTiltAmt: 0.1 },
  excited:     { eyeColor: "#ff88ff", antennaColor: "#cc44ff", speed: 2.5, blinkRate: 5,  headTiltAmt: 0.5 },
  celebrating: { eyeColor: "#00ffcc", antennaColor: "#00ccaa", speed: 3.0, blinkRate: 6,  headTiltAmt: 0.6 },
  worried:     { eyeColor: "#ffaa44", antennaColor: "#ff8822", speed: 0.8, blinkRate: 5,  headTiltAmt: 0.2 },
  rain:        { eyeColor: "#7daaff", antennaColor: "#4488cc", speed: 0.5, blinkRate: 2,  headTiltAmt: 0.2 },
  sunny:       { eyeColor: "#ffee55", antennaColor: "#ffcc00", speed: 1.2, blinkRate: 3,  headTiltAmt: 0.35 },
  frio:        { eyeColor: "#88aaff", antennaColor: "#aaccff", speed: 0.6, blinkRate: 2,  headTiltAmt: 0.15 },
  calor:       { eyeColor: "#ff6622", antennaColor: "#ff4400", speed: 1.8, blinkRate: 4,  headTiltAmt: 0.4 },
  triste:      { eyeColor: "#668899", antennaColor: "#446677", speed: 0.4, blinkRate: 1,  headTiltAmt: 0.1 },
};

const RobotMesh = ({ mood = "chill", bodyColor = "#2a3040", eyeColor: customEye, accentColor = "#0088ff" }: {
  mood?: string; bodyColor?: string; eyeColor?: string; accentColor?: string;
}) => {
  const mc = MOOD_ROBOT[mood] ?? MOOD_ROBOT.chill;
  const eyeColor = customEye ?? mc.eyeColor;
  const speed = mc.speed;

  const groupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const antennaRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.5) * mc.headTiltAmt;
      if (mood === "triste") {
        groupRef.current.rotation.x = 0.15; // head drooped forward
        groupRef.current.position.y = -0.05 + Math.sin(t * 0.4) * 0.02;
      } else if (mood === "frio") {
        groupRef.current.position.x = Math.sin(t * 18) * 0.015; // shiver
        groupRef.current.position.y = Math.sin(t * 0.8) * 0.05;
        groupRef.current.rotation.x = 0;
      } else {
        groupRef.current.position.x = 0;
        groupRef.current.position.y = Math.sin(t * 0.8) * 0.05;
        groupRef.current.rotation.x = 0;
      }
    }
    const blink = Math.sin(t * mc.blinkRate) > 0.95 ? 0.1 : 1;
    if (leftEyeRef.current) {
      leftEyeRef.current.scale.y = blink;
      if (mood === "sleepy" || mood === "triste") leftEyeRef.current.scale.y = Math.min(blink, 0.5);
    }
    if (rightEyeRef.current) {
      rightEyeRef.current.scale.y = blink;
      if (mood === "sleepy" || mood === "triste") rightEyeRef.current.scale.y = Math.min(blink, 0.5);
    }
    if (antennaRef.current) {
      antennaRef.current.position.y = 0.85 + Math.sin(state.clock.elapsedTime * (speed * 2)) * 0.03;
      const glow = 0.5 + Math.sin(state.clock.elapsedTime * (speed * 4)) * 0.5;
      (antennaRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = glow;
    }
  });

  return (
    <group ref={groupRef} scale={0.9}>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.9, 0.8, 0.75]} />
        <meshPhysicalMaterial color={bodyColor} metalness={0.7} roughness={0.2} clearcoat={0.5} />
      </mesh>
      <mesh position={[0, 0.15, 0.38]}>
        <boxGeometry args={[0.7, 0.55, 0.02]} />
        <meshPhysicalMaterial color="#1a1f2e" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh ref={leftEyeRef} position={[-0.18, 0.2, 0.4]}>
        <boxGeometry args={[0.15, 0.12, 0.02]} />
        <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={1.5} />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.18, 0.2, 0.4]}>
        <boxGeometry args={[0.15, 0.12, 0.02]} />
        <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0, 0.02, 0.4]}>
        <boxGeometry args={[0.25, 0.03, 0.02]} />
        <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial color="#3a4050" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh ref={antennaRef} position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={mc.antennaColor} emissive={mc.antennaColor} emissiveIntensity={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.52, 0.15, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.15, 8]} />
          <meshPhysicalMaterial color="#3a4050" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.15, 8]} />
        <meshPhysicalMaterial color={bodyColor} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[0.6, 0.35, 0.45]} />
        <meshPhysicalMaterial color={bodyColor} metalness={0.7} roughness={0.2} clearcoat={0.3} />
      </mesh>
      <mesh position={[0, -0.5, 0.235]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.2} />
      </mesh>
      <pointLight color={eyeColor} intensity={1} distance={3} decay={2} position={[0, 0.2, 0.5]} />
    </group>
  );
};

const RobotAvatar = ({ size = 120, className = "", mood = "chill", customization }: { size?: number; className?: string; mood?: Mood | string; customization?: RobotCustomization }) => {
  const c = customization || getRobotCustom();
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 2.8], fov: 45 }} gl={{ alpha: true, antialias: true }} style={{ background: "transparent", width: "100%", height: "100%" }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[3, 5, 5]} intensity={0.6} />
          <directionalLight position={[-3, 2, 3]} intensity={0.2} color={c.accentColor || "#0088ff"} />
          <RobotMesh mood={mood} bodyColor={c.bodyColor} eyeColor={c.eyeColor} accentColor={c.accentColor} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default RobotAvatar;
