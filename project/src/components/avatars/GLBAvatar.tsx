import { useRef, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Float, Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Mood } from "@/hooks/useCompanionMood";

const MODEL_URL = "/avatar/avatar.glb";

const MOOD_CONFIG: Record<
  string,
  { headTilt: number; swaySpeed: number; swayAmt: number; sparkle: string; env: string; floatSpeed: number }
> = {
  happy:       { headTilt:  0.10, swaySpeed: 1.2, swayAmt: 0.04, sparkle: "#ffdd00", env: "dawn",      floatSpeed: 1.5 },
  excited:     { headTilt:  0.00, swaySpeed: 2.0, swayAmt: 0.06, sparkle: "#ff88ff", env: "sunset",    floatSpeed: 2.5 },
  celebrating: { headTilt: -0.10, swaySpeed: 2.5, swayAmt: 0.08, sparkle: "#00ffcc", env: "sunset",    floatSpeed: 3.0 },
  sleepy:      { headTilt:  0.30, swaySpeed: 0.4, swayAmt: 0.02, sparkle: "#aaaaff", env: "night",     floatSpeed: 0.5 },
  worried:     { headTilt:  0.20, swaySpeed: 0.6, swayAmt: 0.02, sparkle: "#ffaa44", env: "warehouse", floatSpeed: 0.8 },
  rain:        { headTilt:  0.15, swaySpeed: 0.5, swayAmt: 0.02, sparkle: "#88ccff", env: "night",     floatSpeed: 0.6 },
  chill:       { headTilt:  0.00, swaySpeed: 0.7, swayAmt: 0.03, sparkle: "#88ffdd", env: "warehouse", floatSpeed: 1.0 },
  sunny:       { headTilt: -0.05, swaySpeed: 1.0, swayAmt: 0.03, sparkle: "#ffee55", env: "dawn",      floatSpeed: 1.2 },
  frio:        { headTilt:  0.05, swaySpeed: 0.3,  swayAmt: 0.01, sparkle: "#aaddff", env: "night",     floatSpeed: 0.4 },
  calor:       { headTilt: -0.03, swaySpeed: 0.45, swayAmt: 0.02, sparkle: "#ff6622", env: "sunset",    floatSpeed: 0.6 },
  triste:      { headTilt:  0.35, swaySpeed: 0.25, swayAmt: 0.01, sparkle: "#9999bb", env: "night",     floatSpeed: 0.3 },
};

const DEFAULT_MOOD = MOOD_CONFIG.chill;

// Layout cacheado a nivel de módulo — se calcula UNA vez en bind pose y no varía en remounts
let _layoutCache: { offsetY: number; modelScale: number } | null = null;

function computeLayout(scene: THREE.Group): { offsetY: number; modelScale: number } {
  if (_layoutCache) return _layoutCache;

  scene.updateMatrixWorld(true);

  const headBone = scene.getObjectByName("mixamorigHead");
  const footBone = scene.getObjectByName("mixamorigLeftFoot") ?? scene.getObjectByName("mixamorigRightFoot");

  if (!headBone) {
    _layoutCache = { offsetY: -0.2, modelScale: 0.9 };
    return _layoutCache;
  }

  const headPos = new THREE.Vector3();
  const footPos = new THREE.Vector3();
  headBone.getWorldPosition(headPos);
  footBone ? footBone.getWorldPosition(footPos) : footPos.set(0, headPos.y - 1.55, 0);

  const bodyHeight = Math.abs(headPos.y - footPos.y) || 1.55;

  // Solo cachear si los valores son coherentes (headPos válido)
  if (headPos.y < 0.1) {
    // Scene aún no tiene matrices listas — valores de fallback sin cachear
    return { offsetY: -0.2, modelScale: 0.9 };
  }

  const scale = 1.4 / bodyHeight;
  const offsetY = -(headPos.y * scale) + 0.5;
  _layoutCache = { offsetY, modelScale: scale };
  return _layoutCache;
}

function AvatarModel({ mood = "chill" }: { mood?: string }) {
  const { scene } = useGLTF(MODEL_URL);
  const cfg = MOOD_CONFIG[mood] ?? DEFAULT_MOOD;

  // SkeletonUtils.clone correctly rebinds skeleton for SkinnedMesh
  const clonedScene = useMemo(() => cloneSkeleton(scene) as THREE.Group, [scene]);

  // Layout calculado una sola vez y cacheado — evita acumulación en remounts
  const { offsetY, modelScale } = useMemo(() => computeLayout(scene as THREE.Group), [scene]);

  // Bone refs for procedural animation
  const spineRef  = useRef<THREE.Object3D | null>(null);
  const spine1Ref = useRef<THREE.Object3D | null>(null);
  const spine2Ref = useRef<THREE.Object3D | null>(null);
  const headRef   = useRef<THREE.Object3D | null>(null);
  const leftArmRef  = useRef<THREE.Object3D | null>(null);
  const rightArmRef = useRef<THREE.Object3D | null>(null);
  const leftForeArmRef  = useRef<THREE.Object3D | null>(null);
  const rightForeArmRef = useRef<THREE.Object3D | null>(null);
  const hipsRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    clonedScene.traverse((obj) => {
      switch (obj.name) {
        case "mixamorigHips":        hipsRef.current = obj; break;
        case "mixamorigSpine":       spineRef.current = obj; break;
        case "mixamorigSpine1":      spine1Ref.current = obj; break;
        case "mixamorigSpine2":      spine2Ref.current = obj; break;
        case "mixamorigHead":        headRef.current = obj; break;
        case "mixamorigLeftArm":     leftArmRef.current = obj; break;
        case "mixamorigRightArm":    rightArmRef.current = obj; break;
        case "mixamorigLeftForeArm": leftForeArmRef.current = obj; break;
        case "mixamorigRightForeArm":rightForeArmRef.current = obj; break;
      }
    });
  }, [clonedScene]);

  const initRots = useRef<Map<string, THREE.Euler>>(new Map());
  useEffect(() => {
    [spineRef, spine1Ref, spine2Ref, headRef,
     leftArmRef, rightArmRef, leftForeArmRef, rightForeArmRef, hipsRef].forEach((r) => {
      if (r.current) initRots.current.set(r.current.name, r.current.rotation.clone());
    });
  }, [clonedScene]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const { swaySpeed, swayAmt, headTilt } = cfg;
    const s = t * swaySpeed;

    const get = (ref: React.MutableRefObject<THREE.Object3D | null>) =>
      ref.current ? initRots.current.get(ref.current.name) : undefined;

    if (spineRef.current) {
      const i = get(spineRef);
      spineRef.current.rotation.x = (i?.x ?? 0) + Math.sin(s * 0.8) * 0.015;
      spineRef.current.rotation.z = (i?.z ?? 0) + Math.sin(s * 0.5) * swayAmt;
    }
    if (spine1Ref.current) {
      const i = get(spine1Ref);
      spine1Ref.current.rotation.z = (i?.z ?? 0) + Math.sin(s * 0.5 + 0.3) * swayAmt * 0.6;
    }
    if (spine2Ref.current) {
      const i = get(spine2Ref);
      spine2Ref.current.rotation.z = (i?.z ?? 0) + Math.sin(s * 0.5 + 0.6) * swayAmt * 0.4;
    }
    if (headRef.current) {
      const i = get(headRef);
      headRef.current.rotation.x = (i?.x ?? 0) + headTilt + Math.sin(s * 0.4) * 0.05;
      headRef.current.rotation.y = (i?.y ?? 0) + Math.sin(s * 0.3) * 0.08;
      headRef.current.rotation.z = (i?.z ?? 0) + Math.sin(s * 0.25) * 0.03;
    }
    if (leftArmRef.current) {
      const i = get(leftArmRef);
      leftArmRef.current.rotation.z = (i?.z ?? 0) + Math.sin(s * 0.5) * 0.04;
    }
    if (rightArmRef.current) {
      const i = get(rightArmRef);
      rightArmRef.current.rotation.z = (i?.z ?? 0) - Math.sin(s * 0.5) * 0.04;
    }
    if (hipsRef.current) {
      const i = get(hipsRef);
      hipsRef.current.rotation.z = (i?.z ?? 0) + Math.sin(s * 0.5) * swayAmt * 0.5;
    }

    if (mood === "excited" || mood === "celebrating") {
      if (rightArmRef.current) {
        rightArmRef.current.rotation.z = -1.2 + Math.sin(t * 3) * 0.4;
        rightArmRef.current.rotation.x = -0.3;
      }
      if (rightForeArmRef.current) {
        rightForeArmRef.current.rotation.z = -0.5 + Math.sin(t * 3 + 0.5) * 0.3;
      }
    }

    if (mood === "frio") {
      // Shivering micro-jitter on spine
      if (spineRef.current) {
        spineRef.current.rotation.z += Math.sin(t * 16) * 0.025;
      }
      if (hipsRef.current) {
        hipsRef.current.rotation.z += Math.sin(t * 16 + 0.5) * 0.015;
      }
    }

    if (mood === "triste") {
      // Arms hanging down at sides
      if (leftArmRef.current) {
        const i = get(leftArmRef);
        leftArmRef.current.rotation.z = (i?.z ?? 0) + 0.7 + Math.sin(s * 0.2) * 0.02;
      }
      if (rightArmRef.current) {
        const i = get(rightArmRef);
        rightArmRef.current.rotation.z = (i?.z ?? 0) - 0.7 - Math.sin(s * 0.2) * 0.02;
      }
    }
  });

  return (
    <primitive
      object={clonedScene}
      scale={modelScale}
      position={[0, offsetY, 0]}
      rotation={[0, 0.1, 0]}
    />
  );
}

useGLTF.preload(MODEL_URL);

type GLBAvatarProps = {
  size?: number;
  className?: string;
  mood?: Mood | string;
};

const GLBAvatar = ({ size = 120, className = "", mood = "chill" }: GLBAvatarProps) => {
  const cfg = MOOD_CONFIG[mood] ?? DEFAULT_MOOD;

  return (
    <div className={className} style={{ width: size, height: size, overflow: "hidden", borderRadius: "inherit" }}>
      <Canvas
        camera={{ position: [0, -0.2, 4], fov: 42 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        style={{ background: "transparent", width: size, height: size, display: "block" }}
        resize={{ offsetSize: true, scroll: false }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <Environment preset={cfg.env as "dawn" | "night" | "warehouse" | "sunset"} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 5, 3]} intensity={1.2} />
          <directionalLight position={[-3, 2, -1]} intensity={0.3} color="#8888ff" />

          <Float speed={cfg.floatSpeed} rotationIntensity={0.05} floatIntensity={0.06} floatingRange={[-0.01, 0.01]}>
            <AvatarModel mood={mood} />
          </Float>

          {(mood === "celebrating" || mood === "excited" || mood === "happy" || mood === "frio" || mood === "calor") && (
            <Sparkles count={mood === "frio" ? 8 : mood === "calor" ? 10 : 12} scale={1.5} size={mood === "frio" ? 1.5 : 2} speed={mood === "frio" ? 0.2 : 0.4} color={cfg.sparkle} opacity={mood === "frio" || mood === "calor" ? 0.5 : 0.8} />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
};

// Preload the GLB model as soon as this module is imported so it's ready
// before the user opens AvatarShowcase or navigates to a page with the avatar.
useGLTF.preload(MODEL_URL);

export default GLBAvatar;
