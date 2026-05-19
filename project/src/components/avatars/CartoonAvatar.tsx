import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, Suspense, useMemo } from "react";
import * as THREE from "three";
import type { Mood } from "@/hooks/useCompanionMood";

// Expression configs per mood
const moodExpressions: Record<Mood, {
  mouthType: "smile" | "open" | "small" | "yawn" | "wow" | "frown";
  eyeScale: number;
  eyeY: number;
  blinkSpeed: number;
  bodyBounce: number;
  headTilt: number;
  accessory?: "umbrella" | "sunglasses" | "zzz" | "sparkles" | "confetti" | "snowflake" | "sweat" | "tear";
}> = {
  happy:       { mouthType: "smile", eyeScale: 1, eyeY: 0, blinkSpeed: 2.5, bodyBounce: 0.04, headTilt: 0, accessory: undefined },
  sleepy:      { mouthType: "yawn", eyeScale: 0.4, eyeY: -0.02, blinkSpeed: 0.8, bodyBounce: 0.02, headTilt: 0.15, accessory: "zzz" },
  excited:     { mouthType: "open", eyeScale: 1.2, eyeY: 0, blinkSpeed: 3, bodyBounce: 0.08, headTilt: -0.05, accessory: "sparkles" },
  worried:     { mouthType: "small", eyeScale: 1.1, eyeY: 0.02, blinkSpeed: 4, bodyBounce: 0.01, headTilt: 0.1, accessory: undefined },
  chill:       { mouthType: "smile", eyeScale: 0.9, eyeY: 0, blinkSpeed: 2, bodyBounce: 0.03, headTilt: 0, accessory: undefined },
  rain:        { mouthType: "small", eyeScale: 0.85, eyeY: 0.01, blinkSpeed: 2, bodyBounce: 0.02, headTilt: 0.08, accessory: "umbrella" },
  sunny:       { mouthType: "open", eyeScale: 0.7, eyeY: 0, blinkSpeed: 1.5, bodyBounce: 0.05, headTilt: -0.08, accessory: "sunglasses" },
  celebrating: { mouthType: "wow", eyeScale: 1.3, eyeY: 0, blinkSpeed: 5, bodyBounce: 0.12, headTilt: 0, accessory: "confetti" },
  frio:        { mouthType: "small", eyeScale: 0.9, eyeY: 0.01, blinkSpeed: 3, bodyBounce: 0.01, headTilt: 0.05, accessory: "snowflake" },
  calor:       { mouthType: "open", eyeScale: 0.65, eyeY: 0.03, blinkSpeed: 1.5, bodyBounce: 0.01, headTilt: -0.03, accessory: "sweat" },
  triste:      { mouthType: "frown", eyeScale: 0.85, eyeY: 0.03, blinkSpeed: 1.5, bodyBounce: 0.01, headTilt: 0.2, accessory: "tear" },
};

export type HairstyleType = "short" | "spiky" | "long" | "curly" | "mohawk" | "bald";
export type AccessoryType = "none" | "glasses" | "sunglasses_acc" | "headphones" | "cap" | "beanie" | "mask";

export type CartoonCustomization = {
  hairColor?: string;
  shirtColor?: string;
  skinTone?: string;
  eyeColor?: string;
  defaultMouth?: "smile" | "open" | "small" | "smirk";
  hairstyle?: HairstyleType;
  accessory?: AccessoryType;
};

/* ===== HAIR MESHES ===== */
const HairMesh = ({ style, color }: { style: HairstyleType; color: string }) => {
  switch (style) {
    case "short":
      return (
        <group>
          <mesh position={[0, 0.45, -0.1]}>
            <sphereGeometry args={[0.52, 32, 32]} />
            <meshPhysicalMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.55, 0.2]}>
            <sphereGeometry args={[0.38, 32, 16]} />
            <meshPhysicalMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[-0.35, 0.35, 0.05]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshPhysicalMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0.35, 0.35, 0.05]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshPhysicalMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
      );
    case "spiky":
      return (
        <group>
          <mesh position={[0, 0.45, -0.1]}>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshPhysicalMaterial color={color} roughness={0.8} />
          </mesh>
          {/* Spikes */}
          {[
            [0, 0.82, 0], [-0.2, 0.78, 0.1], [0.2, 0.78, 0.1],
            [-0.15, 0.75, -0.15], [0.15, 0.75, -0.15], [0, 0.72, 0.2],
          ].map((pos, i) => (
            <mesh key={i} position={pos as [number, number, number]} rotation={[(Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.3]}>
              <coneGeometry args={[0.08, 0.25, 6]} />
              <meshPhysicalMaterial color={color} roughness={0.7} />
            </mesh>
          ))}
        </group>
      );
    case "long":
      return (
        <group>
          <mesh position={[0, 0.45, -0.1]}>
            <sphereGeometry args={[0.54, 32, 32]} />
            <meshPhysicalMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.55, 0.2]}>
            <sphereGeometry args={[0.38, 32, 16]} />
            <meshPhysicalMaterial color={color} roughness={0.8} />
          </mesh>
          {/* Long side strands */}
          {[-1, 1].map(side => (
            <mesh key={side} position={[side * 0.42, -0.1, 0.05]}>
              <capsuleGeometry args={[0.14, 0.5, 8, 16]} />
              <meshPhysicalMaterial color={color} roughness={0.8} />
            </mesh>
          ))}
          {/* Back hair */}
          <mesh position={[0, -0.05, -0.2]}>
            <capsuleGeometry args={[0.32, 0.4, 8, 16]} />
            <meshPhysicalMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
      );
    case "curly":
      return (
        <group>
          {/* Curly puffs */}
          {[
            [0, 0.6, 0.15], [-0.3, 0.5, 0.05], [0.3, 0.5, 0.05],
            [-0.2, 0.65, -0.1], [0.2, 0.65, -0.1], [0, 0.55, -0.25],
            [-0.35, 0.4, -0.1], [0.35, 0.4, -0.1], [0, 0.7, 0],
          ].map((pos, i) => (
            <mesh key={i} position={pos as [number, number, number]}>
              <sphereGeometry args={[0.16 + Math.random() * 0.04, 12, 12]} />
              <meshPhysicalMaterial color={color} roughness={0.9} />
            </mesh>
          ))}
        </group>
      );
    case "mohawk":
      return (
        <group>
          <mesh position={[0, 0.45, -0.15]}>
            <sphereGeometry args={[0.48, 32, 32]} />
            <meshPhysicalMaterial color={color} roughness={0.8} />
          </mesh>
          {/* Mohawk strip */}
          {[0.5, 0.62, 0.74, 0.86, 0.95].map((y, i) => (
            <mesh key={i} position={[0, y, -0.05 + i * 0.02]}>
              <boxGeometry args={[0.08, 0.12, 0.22]} />
              <meshPhysicalMaterial color={color} roughness={0.7} />
            </mesh>
          ))}
        </group>
      );
    case "bald":
      return null;
    default:
      return null;
  }
};

/* ===== ACCESSORY MESHES ===== */
const AccessoryMesh = ({ type }: { type: AccessoryType }) => {
  switch (type) {
    case "glasses":
      return (
        <group position={[0, 0.25, 0.52]}>
          {/* Frames */}
          {[-0.17, 0.17].map((x, i) => (
            <mesh key={i} position={[x, 0, 0.05]}>
              <torusGeometry args={[0.09, 0.012, 8, 16]} />
              <meshPhysicalMaterial color="#333333" metalness={0.8} roughness={0.2} />
            </mesh>
          ))}
          {/* Lenses */}
          {[-0.17, 0.17].map((x, i) => (
            <mesh key={`lens-${i}`} position={[x, 0, 0.05]}>
              <circleGeometry args={[0.075, 16]} />
              <meshPhysicalMaterial color="#aaddff" transparent opacity={0.3} metalness={0.1} roughness={0.1} />
            </mesh>
          ))}
          {/* Bridge */}
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[0.06, 0.015, 0.015]} />
            <meshPhysicalMaterial color="#333333" metalness={0.8} />
          </mesh>
          {/* Arms */}
          {[-1, 1].map(side => (
            <mesh key={`arm-${side}`} position={[side * 0.28, 0, -0.02]} rotation={[0, side * 0.3, 0]}>
              <boxGeometry args={[0.12, 0.01, 0.01]} />
              <meshPhysicalMaterial color="#333333" metalness={0.8} />
            </mesh>
          ))}
        </group>
      );
    case "sunglasses_acc":
      return (
        <group position={[0, 0.25, 0.52]}>
          {[-0.17, 0.17].map((x, i) => (
            <mesh key={i} position={[x, 0, 0.05]}>
              <boxGeometry args={[0.16, 0.09, 0.02]} />
              <meshPhysicalMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[0.06, 0.02, 0.02]} />
            <meshPhysicalMaterial color="#444" metalness={0.9} />
          </mesh>
        </group>
      );
    case "headphones":
      return (
        <group>
          {/* Band */}
          <mesh position={[0, 0.6, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.42, 0.025, 8, 32, Math.PI]} />
            <meshPhysicalMaterial color="#2a2a2a" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Ear cups */}
          {[-1, 1].map(side => (
            <group key={side}>
              <mesh position={[side * 0.52, 0.2, 0.05]}>
                <cylinderGeometry args={[0.1, 0.1, 0.06, 16]} />
                <meshPhysicalMaterial color="#1a1a1a" roughness={0.4} />
              </mesh>
              <mesh position={[side * 0.52, 0.2, 0.05]}>
                <cylinderGeometry args={[0.08, 0.08, 0.07, 16]} />
                <meshPhysicalMaterial color="#333" roughness={0.5} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "cap":
      return (
        <group position={[0, 0.5, 0.05]} rotation={[0.1, 0, 0]}>
          {/* Crown */}
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.46, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshPhysicalMaterial color="#2563eb" roughness={0.6} />
          </mesh>
          {/* Brim */}
          <mesh position={[0, 0.02, 0.3]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.5, 0.03, 0.3]} />
            <meshPhysicalMaterial color="#2563eb" roughness={0.6} />
          </mesh>
        </group>
      );
    case "beanie":
      return (
        <group position={[0, 0.5, -0.02]}>
          <mesh position={[0, 0.15, 0]}>
            <sphereGeometry args={[0.48, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshPhysicalMaterial color="#dc2626" roughness={0.8} />
          </mesh>
          {/* Fold */}
          <mesh position={[0, 0.02, 0]}>
            <torusGeometry args={[0.45, 0.04, 8, 32]} />
            <meshPhysicalMaterial color="#b91c1c" roughness={0.8} />
          </mesh>
          {/* Pom */}
          <mesh position={[0, 0.38, 0]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshPhysicalMaterial color="#fbbf24" roughness={0.9} />
          </mesh>
        </group>
      );
    case "mask":
      return (
        <group position={[0, 0.1, 0.5]}>
          <mesh>
            <boxGeometry args={[0.38, 0.15, 0.06]} />
            <meshPhysicalMaterial color="#1a1a1a" roughness={0.5} />
          </mesh>
          {/* Straps */}
          {[-1, 1].map(side => (
            <mesh key={side} position={[side * 0.22, 0, -0.08]} rotation={[0, side * 0.5, 0]}>
              <boxGeometry args={[0.12, 0.02, 0.01]} />
              <meshPhysicalMaterial color="#333" />
            </mesh>
          ))}
        </group>
      );
    default:
      return null;
  }
};

/* ===== SCENE PROPS based on mood/time/weather ===== */
const SceneProps = ({ mood }: { mood: Mood }) => {
  const rainRef = useRef<THREE.Group>(null);
  const starRef = useRef<THREE.Group>(null);

  const rainDrops = useMemo(() => 
    Array.from({ length: 20 }, () => ({
      x: (Math.random() - 0.5) * 2.5,
      y: Math.random() * 2,
      z: (Math.random() - 0.5) * 1,
      speed: 0.5 + Math.random() * 0.5,
    })), []
  );

  const stars = useMemo(() =>
    Array.from({ length: 12 }, () => ({
      x: (Math.random() - 0.5) * 3,
      y: 0.5 + Math.random() * 1.5,
      z: -0.5 - Math.random() * 1,
      size: 0.015 + Math.random() * 0.02,
    })), []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (rainRef.current) {
      rainRef.current.children.forEach((child, i) => {
        const drop = rainDrops[i];
        if (drop) {
          child.position.y = ((drop.y - t * drop.speed) % 2.5) + 1.2;
        }
      });
    }
    if (starRef.current) {
      starRef.current.children.forEach((child, i) => {
        child.scale.setScalar(0.8 + Math.sin(t * 2 + i) * 0.3);
      });
    }
  });

  switch (mood) {
    case "sleepy":
      return (
        <group>
          {/* Bed frame */}
          <mesh position={[0, -1.05, 0]}>
            <boxGeometry args={[1.4, 0.12, 0.9]} />
            <meshPhysicalMaterial color="#5c3a1e" roughness={0.8} />
          </mesh>
          {/* Mattress */}
          <mesh position={[0, -0.95, 0]}>
            <boxGeometry args={[1.3, 0.1, 0.8]} />
            <meshPhysicalMaterial color="#e8e0d8" roughness={0.9} />
          </mesh>
          {/* Blanket */}
          <mesh position={[0, -0.85, 0.05]} rotation={[0.05, 0, 0]}>
            <boxGeometry args={[1.2, 0.08, 0.7]} />
            <meshPhysicalMaterial color="#3b5998" roughness={0.7} clearcoat={0.1} />
          </mesh>
          {/* Pillow */}
          <mesh position={[-0.35, -0.82, 0.05]}>
            <boxGeometry args={[0.35, 0.1, 0.3]} />
            <meshPhysicalMaterial color="#f0ebe3" roughness={0.9} />
          </mesh>
          {/* Nightstand */}
          <mesh position={[0.85, -0.85, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshPhysicalMaterial color="#4a2f1a" roughness={0.8} />
          </mesh>
          {/* Lamp on nightstand */}
          <mesh position={[0.85, -0.6, 0]}>
            <cylinderGeometry args={[0.03, 0.05, 0.12, 8]} />
            <meshPhysicalMaterial color="#c9a96e" metalness={0.5} />
          </mesh>
          <mesh position={[0.85, -0.5, 0]}>
            <coneGeometry args={[0.08, 0.1, 8]} />
            <meshBasicMaterial color="#ffeeaa" transparent opacity={0.6} />
          </mesh>
          {/* Stars in background */}
          <group ref={starRef}>
            {stars.map((s, i) => (
              <mesh key={i} position={[s.x, s.y, s.z]}>
                <octahedronGeometry args={[s.size, 0]} />
                <meshBasicMaterial color="#ffffcc" transparent opacity={0.5} />
              </mesh>
            ))}
          </group>
          {/* Moon */}
          <mesh position={[1, 1.3, -1]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color="#f5f0c1" transparent opacity={0.7} />
          </mesh>
        </group>
      );

    case "rain":
      return (
        <group>
          {/* Rain drops */}
          <group ref={rainRef}>
            {rainDrops.map((drop, i) => (
              <mesh key={i} position={[drop.x, drop.y, drop.z]}>
                <capsuleGeometry args={[0.008, 0.06, 4, 8]} />
                <meshBasicMaterial color="#7daaff" transparent opacity={0.5} />
              </mesh>
            ))}
          </group>
          {/* Puddle */}
          <mesh position={[0, -1.08, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.4, 16]} />
            <meshPhysicalMaterial color="#4488cc" transparent opacity={0.3} roughness={0.1} metalness={0.3} />
          </mesh>
          {/* Dark clouds */}
          {[[-0.6, 1.3, -0.5], [0.4, 1.4, -0.6], [-0.1, 1.5, -0.4]].map((pos, i) => (
            <mesh key={i} position={pos as [number, number, number]}>
              <sphereGeometry args={[0.2 + i * 0.05, 12, 12]} />
              <meshPhysicalMaterial color="#556677" transparent opacity={0.5} roughness={0.9} />
            </mesh>
          ))}
        </group>
      );

    case "sunny":
      return (
        <group>
          {/* Sun */}
          <mesh position={[1, 1.3, -0.8]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color="#ffdd44" />
          </mesh>
          {/* Sun rays */}
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            return (
              <mesh key={i} position={[1 + Math.cos(angle) * 0.35, 1.3 + Math.sin(angle) * 0.35, -0.8]} rotation={[0, 0, angle]}>
                <boxGeometry args={[0.15, 0.02, 0.01]} />
                <meshBasicMaterial color="#ffcc00" transparent opacity={0.6} />
              </mesh>
            );
          })}
          {/* Small flower */}
          <group position={[-0.7, -1.0, 0.2]}>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.2, 6]} />
              <meshStandardMaterial color="#3a8f3a" />
            </mesh>
            {[0, 1, 2, 3, 4].map(i => {
              const a = (i / 5) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.04, 0.22, Math.sin(a) * 0.04]}>
                  <sphereGeometry args={[0.025, 8, 8]} />
                  <meshBasicMaterial color="#ff6699" />
                </mesh>
              );
            })}
            <mesh position={[0, 0.22, 0]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshBasicMaterial color="#ffcc00" />
            </mesh>
          </group>
          {/* Grass tufts */}
          {[-0.9, -0.4, 0.3, 0.8].map((x, i) => (
            <mesh key={i} position={[x, -1.05, 0.3]}>
              <coneGeometry args={[0.04, 0.12, 4]} />
              <meshStandardMaterial color="#4a9f4a" />
            </mesh>
          ))}
        </group>
      );

    case "excited":
      return (
        <group>
          {/* Energy lightning bolts */}
          {[[-0.7, 0.8, -0.2], [0.8, 0.6, -0.3]].map((pos, i) => (
            <group key={i} position={pos as [number, number, number]}>
              <mesh rotation={[0, 0, i === 0 ? 0.2 : -0.3]}>
                <coneGeometry args={[0.05, 0.2, 3]} />
                <meshBasicMaterial color="#ffdd00" transparent opacity={0.8} />
              </mesh>
              <mesh position={[0, -0.12, 0]} rotation={[0, 0, Math.PI + (i === 0 ? -0.3 : 0.2)]}>
                <coneGeometry args={[0.04, 0.15, 3]} />
                <meshBasicMaterial color="#ffaa00" transparent opacity={0.7} />
              </mesh>
            </group>
          ))}
          {/* Exclamation marks */}
          <group position={[0.6, 1.0, 0]}>
            <mesh>
              <boxGeometry args={[0.03, 0.12, 0.01]} />
              <meshBasicMaterial color="#ff4444" />
            </mesh>
            <mesh position={[0, -0.1, 0]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshBasicMaterial color="#ff4444" />
            </mesh>
          </group>
        </group>
      );

    case "celebrating":
      return (
        <group>
          {/* Party hat overlay glow */}
          <mesh position={[0, 1.0, 0]}>
            <coneGeometry args={[0.15, 0.35, 12]} />
            <meshPhysicalMaterial color="#ff3388" roughness={0.3} metalness={0.4} />
          </mesh>
          {/* Streamers */}
          {[[-0.8, 0.5], [0.9, 0.7], [-0.5, 1.0], [0.6, 1.2]].map(([x, y], i) => (
            <mesh key={i} position={[x, y, -0.2]} rotation={[0, 0, Math.random() * 2]}>
              <boxGeometry args={[0.2, 0.015, 0.01]} />
              <meshBasicMaterial color={["#ff3366", "#33ff66", "#3366ff", "#ffcc00"][i]} transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
      );

    case "frio":
      return (
        <group>
          {/* Snowflakes */}
          {Array.from({ length: 16 }, (_, i) => ({
            x: (Math.random() - 0.5) * 2.5,
            y: Math.random() * 2.5,
            z: (Math.random() - 0.5) * 0.5,
            speed: 0.2 + Math.random() * 0.3,
          })).map((flake, i) => (
            <mesh key={i} position={[flake.x, ((flake.y - (i * 0.3)) % 2.5) + 1, flake.z]}>
              <octahedronGeometry args={[0.025, 0]} />
              <meshBasicMaterial color="#cceeff" transparent opacity={0.7} />
            </mesh>
          ))}
          {/* Ice crystals on ground */}
          {[-0.8, -0.3, 0.2, 0.7].map((x, i) => (
            <mesh key={i} position={[x, -1.05, 0.2]}>
              <octahedronGeometry args={[0.04 + i * 0.01, 0]} />
              <meshPhysicalMaterial color="#aaddff" metalness={0.8} roughness={0} transparent opacity={0.6} />
            </mesh>
          ))}
          {/* Cold breath cloud */}
          <mesh position={[0.3, -0.05, 0.6]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="#eef5ff" transparent opacity={0.35} />
          </mesh>
          <mesh position={[0.45, -0.1, 0.6]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshBasicMaterial color="#eef5ff" transparent opacity={0.25} />
          </mesh>
        </group>
      );

    case "calor":
      return (
        <group>
          {/* Sun */}
          <mesh position={[1.1, 1.2, -0.8]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshBasicMaterial color="#ff9900" />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            return (
              <mesh key={i} position={[1.1 + Math.cos(angle) * 0.38, 1.2 + Math.sin(angle) * 0.38, -0.8]} rotation={[0, 0, angle]}>
                <boxGeometry args={[0.18, 0.025, 0.01]} />
                <meshBasicMaterial color="#ffcc00" transparent opacity={0.6} />
              </mesh>
            );
          })}
          {/* Heat shimmer lines */}
          {[-0.4, 0, 0.4].map((x, i) => (
            <mesh key={i} position={[x, -0.6, 0.5]} rotation={[0.1, 0, 0]}>
              <boxGeometry args={[0.015, 0.5, 0.01]} />
              <meshBasicMaterial color="#ff8844" transparent opacity={0.2} />
            </mesh>
          ))}
          {/* Sweat drops on forehead */}
          <mesh position={[-0.2, 0.5, 0.55]}>
            <capsuleGeometry args={[0.018, 0.04, 4, 8]} />
            <meshBasicMaterial color="#88ccff" transparent opacity={0.8} />
          </mesh>
          <mesh position={[0.3, 0.45, 0.55]}>
            <capsuleGeometry args={[0.014, 0.03, 4, 8]} />
            <meshBasicMaterial color="#88ccff" transparent opacity={0.7} />
          </mesh>
        </group>
      );

    case "triste":
      return (
        <group>
          {/* Sad rain cloud above head */}
          {[[-0.15, 1.35, -0.3], [0.15, 1.4, -0.35], [0, 1.45, -0.25]].map((pos, i) => (
            <mesh key={i} position={pos as [number, number, number]}>
              <sphereGeometry args={[0.15 + i * 0.03, 12, 12]} />
              <meshPhysicalMaterial color="#667788" transparent opacity={0.55} roughness={0.9} />
            </mesh>
          ))}
          {/* Teardrops */}
          <mesh position={[-0.15, 0.1, 0.56]}>
            <capsuleGeometry args={[0.018, 0.04, 4, 8]} />
            <meshBasicMaterial color="#88aacc" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0.15, 0.08, 0.56]}>
            <capsuleGeometry args={[0.018, 0.04, 4, 8]} />
            <meshBasicMaterial color="#88aacc" transparent opacity={0.75} />
          </mesh>
          {/* Small rain drops from cloud */}
          {[[-0.2, 1.15, -0.3], [0, 1.1, -0.3], [0.2, 1.12, -0.3]].map((pos, i) => (
            <mesh key={i} position={pos as [number, number, number]}>
              <capsuleGeometry args={[0.01, 0.06, 4, 8]} />
              <meshBasicMaterial color="#7daaff" transparent opacity={0.5} />
            </mesh>
          ))}
        </group>
      );

    default:
      return null;
  }
};

const CartoonMesh = ({ speed = 1, mood = "chill", customization }: { speed?: number; mood?: Mood; customization?: CartoonCustomization }) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const accessoryGroupRef = useRef<THREE.Group>(null);

  const expr = moodExpressions[mood] || moodExpressions.chill;

  const confettiPositions = useMemo(() => {
    const arr = new Float32Array(30 * 3);
    for (let i = 0; i < 30; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 2;
      arr[i * 3 + 1] = Math.random() * 2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 1;
    }
    return arr;
  }, []);

  const confettiColors = useMemo(() => {
    const colors = new Float32Array(30 * 3);
    const palette = [[1,0.3,0.3],[0.3,1,0.3],[0.3,0.5,1],[1,1,0.3],[1,0.5,1]];
    for (let i = 0; i < 30; i++) {
      const c = palette[i % palette.length];
      colors[i*3] = c[0]; colors[i*3+1] = c[1]; colors[i*3+2] = c[2];
    }
    return colors;
  }, []);

  // Sleepy mode: character leans/lies down
  const isSleepy = mood === "sleepy";

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;
    if (groupRef.current) {
      if (isSleepy) {
        // Lying down position - gentle breathing
        groupRef.current.rotation.z = -0.3;
        groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.05;
        groupRef.current.position.y = -0.3 + Math.sin(t * 0.4) * 0.015;
        groupRef.current.position.x = -0.15;
      } else if (mood === "frio") {
        // Shivering
        groupRef.current.rotation.z = Math.sin(t * 18) * 0.04;
        groupRef.current.position.x = Math.sin(t * 20) * 0.02;
        groupRef.current.position.y = Math.sin(t * 0.6) * 0.01;
      } else if (mood === "triste") {
        // Slumped down, slow sway
        groupRef.current.rotation.z = Math.sin(t * 0.2) * 0.05;
        groupRef.current.rotation.y = Math.sin(t * 0.25) * 0.08;
        groupRef.current.position.y = -0.08 + Math.sin(t * 0.3) * 0.01;
        groupRef.current.position.x = 0;
      } else {
        groupRef.current.rotation.z = Math.sin(t * 0.3) * expr.headTilt;
        groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.2;
        groupRef.current.position.y = Math.sin(t * 0.6) * expr.bodyBounce;
        groupRef.current.position.x = 0;
      }
    }
    const blink = Math.sin(t * expr.blinkSpeed) > 0.97 ? 0.05 : expr.eyeScale;
    if (leftEyeRef.current) leftEyeRef.current.scale.y = blink;
    if (rightEyeRef.current) rightEyeRef.current.scale.y = blink;
    if (accessoryGroupRef.current) {
      accessoryGroupRef.current.position.y = Math.sin(t * 1.5) * 0.03;
    }
  });

  // Strip alpha from 8-digit hex (#rrggbbaa) — THREE.Color only accepts 6-digit hex
  const stripAlpha = (hex: string) => hex.length === 9 && hex[0] === "#" ? hex.slice(0, 7) : hex;
  const skinColor = stripAlpha(customization?.skinTone || "#ffe0c0");
  const hairColor = stripAlpha(customization?.hairColor || "#6b4226");
  const shirtColor = stripAlpha(customization?.shirtColor || "#2563eb");
  const eyeColor = stripAlpha(customization?.eyeColor || "#3a2a1a");
  const hairstyle = customization?.hairstyle || "short";
  const userAccessory = customization?.accessory || "none";

  const effectiveMouth = (mood === "chill" || mood === "happy") && customization?.defaultMouth
    ? customization.defaultMouth
    : expr.mouthType;

  // Mood-based accessories override user accessories in certain moods  
  const showMoodAccessory = expr.accessory && mood !== "chill" && mood !== "happy";
  // Don't show user sunglasses if mood is already showing sunglasses
  const showUserAccessory = !showMoodAccessory || (expr.accessory !== "sunglasses" && userAccessory !== "sunglasses_acc");

  return (
    <group ref={groupRef} scale={0.85} position={[0, -0.1, 0]}>
      {/* Head */}
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshPhysicalMaterial color={skinColor} roughness={0.6} clearcoat={0.2} />
      </mesh>

      {/* Hair */}
      <HairMesh style={hairstyle} color={hairColor} />

      {/* Left eye white */}
      <mesh position={[-0.17, 0.25, 0.48]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh ref={leftEyeRef} position={[-0.17, 0.25 + expr.eyeY, 0.56]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={eyeColor} />
      </mesh>
      <mesh position={[-0.14, 0.28, 0.6]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>

      {/* Right eye white */}
      <mesh position={[0.17, 0.25, 0.48]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.17, 0.25 + expr.eyeY, 0.56]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={eyeColor} />
      </mesh>
      <mesh position={[0.2, 0.28, 0.6]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 0.15, 0.55]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshPhysicalMaterial color="#f0c8a0" roughness={0.6} />
      </mesh>

      {/* Dynamic Mouth */}
      {effectiveMouth === "smile" && (
        <mesh position={[0, 0.04, 0.52]} rotation={[0.2, 0, 0]}>
          <torusGeometry args={[0.08, 0.015, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#d4766a" />
        </mesh>
      )}
      {effectiveMouth === "smirk" && (
        <mesh position={[0.04, 0.04, 0.52]} rotation={[0.2, 0, -0.3]}>
          <torusGeometry args={[0.06, 0.015, 8, 16, Math.PI * 0.6]} />
          <meshStandardMaterial color="#d4766a" />
        </mesh>
      )}
      {effectiveMouth === "open" && (
        <mesh position={[0, 0.02, 0.52]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#c44040" />
        </mesh>
      )}
      {effectiveMouth === "small" && (
        <mesh position={[0, 0.04, 0.54]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshStandardMaterial color="#d4766a" />
        </mesh>
      )}
      {effectiveMouth === "yawn" && (
        <mesh position={[0, 0.01, 0.52]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color="#8b3030" />
        </mesh>
      )}
      {effectiveMouth === "wow" && (
        <mesh position={[0, 0.01, 0.52]}>
          <capsuleGeometry args={[0.04, 0.04, 8, 16]} />
          <meshStandardMaterial color="#c44040" />
        </mesh>
      )}
      {effectiveMouth === "frown" && (
        <mesh position={[0, 0.01, 0.52]} rotation={[0.2, 0, Math.PI]}>
          <torusGeometry args={[0.07, 0.015, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#d4766a" />
        </mesh>
      )}

      {/* Eyebrows */}
      <mesh position={[-0.17, 0.38, 0.48]} rotation={[0, 0, mood === "worried" || mood === "triste" ? -0.35 : 0.15]}>
        <boxGeometry args={[0.14, 0.025, 0.02]} />
        <meshPhysicalMaterial color={hairColor} roughness={0.8} />
      </mesh>
      <mesh position={[0.17, 0.38, 0.48]} rotation={[0, 0, mood === "worried" || mood === "triste" ? 0.35 : -0.15]}>
        <boxGeometry args={[0.14, 0.025, 0.02]} />
        <meshPhysicalMaterial color={hairColor} roughness={0.8} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.2, 16]} />
        <meshPhysicalMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Body / shirt */}
      <mesh position={[0, -0.55, 0]}>
        <capsuleGeometry args={[0.3, 0.3, 8, 16]} />
        <meshPhysicalMaterial color={shirtColor} roughness={0.5} clearcoat={0.2} />
      </mesh>

      {/* Ears */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.52, 0.2, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshPhysicalMaterial color={skinColor} roughness={0.6} />
        </mesh>
      ))}

      {/* User accessory */}
      {showUserAccessory && userAccessory !== "none" && (
        <AccessoryMesh type={userAccessory} />
      )}

      {/* === MOOD ACCESSORIES === */}
      <group ref={accessoryGroupRef}>
        {showMoodAccessory && expr.accessory === "sunglasses" && (
          <group position={[0, 0.25, 0.52]}>
            <mesh position={[-0.17, 0, 0.05]}>
              <boxGeometry args={[0.15, 0.08, 0.02]} />
              <meshPhysicalMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0.17, 0, 0.05]}>
              <boxGeometry args={[0.15, 0.08, 0.02]} />
              <meshPhysicalMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0, 0.04]}>
              <boxGeometry args={[0.06, 0.02, 0.02]} />
              <meshPhysicalMaterial color="#333333" metalness={0.9} />
            </mesh>
          </group>
        )}

        {expr.accessory === "umbrella" && (
          <group position={[0.5, 0.6, 0]}>
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.5, 8]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <coneGeometry args={[0.35, 0.2, 16, 1, true]} />
              <meshPhysicalMaterial color="#2563eb" side={THREE.DoubleSide} roughness={0.4} />
            </mesh>
          </group>
        )}

        {expr.accessory === "zzz" && (
          <group position={[0.4, 0.6, 0.2]}>
            <mesh><boxGeometry args={[0.12, 0.08, 0.01]} /><meshBasicMaterial color="#8888ff" transparent opacity={0.6} /></mesh>
            <mesh position={[0.1, 0.12, 0]}><boxGeometry args={[0.09, 0.06, 0.01]} /><meshBasicMaterial color="#8888ff" transparent opacity={0.4} /></mesh>
            <mesh position={[0.18, 0.22, 0]}><boxGeometry args={[0.07, 0.05, 0.01]} /><meshBasicMaterial color="#8888ff" transparent opacity={0.25} /></mesh>
          </group>
        )}

        {expr.accessory === "sparkles" && (
          <group>
            {[[0.5, 0.5, 0.2], [-0.5, 0.6, 0.1], [0.3, 0.8, -0.1], [-0.3, 0.4, 0.3]].map((pos, i) => (
              <mesh key={i} position={pos as [number, number, number]}>
                <octahedronGeometry args={[0.04, 0]} />
                <meshBasicMaterial color="#FFD700" transparent opacity={0.8} />
              </mesh>
            ))}
          </group>
        )}

        {expr.accessory === "confetti" && (
          <points>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" count={30} array={confettiPositions} itemSize={3} />
              <bufferAttribute attach="attributes-color" count={30} array={confettiColors} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.06} vertexColors transparent opacity={0.9} sizeAttenuation />
          </points>
        )}

        {expr.accessory === "snowflake" && (
          <group position={[0.5, 0.3, 0.1]}>
            {[0, 1, 2].map(i => (
              <mesh key={i} position={[0, 0, 0]} rotation={[0, 0, (i / 3) * Math.PI]}>
                <boxGeometry args={[0.18, 0.018, 0.01]} />
                <meshBasicMaterial color="#cceeff" transparent opacity={0.85} />
              </mesh>
            ))}
            <mesh position={[0, 0, 0]}>
              <octahedronGeometry args={[0.05, 0]} />
              <meshBasicMaterial color="#aaddff" transparent opacity={0.9} />
            </mesh>
          </group>
        )}

        {expr.accessory === "sweat" && (
          <group>
            <mesh position={[-0.25, 0.5, 0.55]}>
              <capsuleGeometry args={[0.02, 0.05, 4, 8]} />
              <meshBasicMaterial color="#88ccff" transparent opacity={0.85} />
            </mesh>
            <mesh position={[0.35, 0.42, 0.55]}>
              <capsuleGeometry args={[0.016, 0.04, 4, 8]} />
              <meshBasicMaterial color="#88ccff" transparent opacity={0.75} />
            </mesh>
          </group>
        )}

        {expr.accessory === "tear" && (
          <group>
            <mesh position={[-0.17, 0.12, 0.57]}>
              <capsuleGeometry args={[0.018, 0.04, 4, 8]} />
              <meshBasicMaterial color="#88aacc" transparent opacity={0.85} />
            </mesh>
            <mesh position={[0.17, 0.10, 0.57]}>
              <capsuleGeometry args={[0.018, 0.04, 4, 8]} />
              <meshBasicMaterial color="#88aacc" transparent opacity={0.8} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
};

const CartoonAvatar = ({ size = 120, className = "", mood = "chill", customization }: { size?: number; className?: string; mood?: Mood; customization?: CartoonCustomization }) => {
  const custom = customization || (() => {
    try {
      const saved = localStorage.getItem("avatar-customization");
      if (saved) return JSON.parse(saved) as CartoonCustomization;
    } catch {}
    return undefined;
  })();

  return (
    <div className={className} style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }} gl={{ alpha: true, antialias: true }} style={{ background: "transparent", width: "100%", height: "100%" }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={mood === "sleepy" || mood === "triste" ? 0.3 : mood === "rain" || mood === "frio" ? 0.4 : 0.6} />
          <directionalLight position={[3, 5, 5]} intensity={mood === "sleepy" || mood === "triste" ? 0.3 : 0.7} />
          <directionalLight position={[-2, 2, 3]} intensity={0.3} color={mood === "sleepy" || mood === "triste" ? "#8888cc" : mood === "frio" ? "#aaccff" : mood === "calor" ? "#ff8844" : "#ffe0c0"} />
          {mood === "sleepy" && <pointLight position={[0.85, -0.5, 0.5]} intensity={0.4} color="#ffeeaa" distance={2} />}
          {mood === "frio" && <pointLight position={[0, 0, 1]} intensity={0.3} color="#aaddff" distance={3} />}
          {mood === "calor" && <pointLight position={[1, 1, 0.5]} intensity={0.5} color="#ff6622" distance={4} />}
          <SceneProps mood={mood} />
          <CartoonMesh mood={mood} customization={custom} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default CartoonAvatar;
