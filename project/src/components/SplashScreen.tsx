import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { renderGlobalAvatar } from "@/lib/avatarHelper";

type SplashAnimStyle = "terminal" | "portal" | "minimal" | "explosion";

// ─── Particle system ───
const NUM_PARTICLES = 40;
const NUM_RINGS = 3;
const NUM_GLYPHS = 12;
const GLYPHS = "⟁⟐⟡◈◇⬡⬢⏣⎔⎕▣▢".split("");

const randomBetween = (a: number, b: number) => Math.random() * (b - a) + a;

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  angle: number;
};

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState<"boot" | "scan" | "avatar" | "greet" | "launch">("boot");
  const animStyle = (localStorage.getItem("splash-anim-style") as SplashAnimStyle) || "terminal";
  const renderAvatar = (size: number) => renderGlobalAvatar(size);

  // Generate particles once
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: NUM_PARTICLES }, (_, i) => ({
      id: i,
      x: randomBetween(5, 95),
      y: randomBetween(5, 95),
      size: randomBetween(2, 5),
      delay: randomBetween(0, 1.5),
      duration: randomBetween(1.5, 3),
      angle: randomBetween(0, 360),
    })), []);

  const glyphs = useMemo(() =>
    Array.from({ length: NUM_GLYPHS }, (_, i) => ({
      id: i,
      char: GLYPHS[i % GLYPHS.length],
      angle: (360 / NUM_GLYPHS) * i,
      radius: randomBetween(120, 160),
      delay: randomBetween(0, 0.8),
    })), []);

  // Explosion shards
  const shards = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      angle: (360 / 20) * i,
      distance: randomBetween(100, 200),
      size: randomBetween(8, 20),
      delay: randomBetween(0, 0.2),
    })), []);

  // Phase timeline - adjust timing based on animation style
  useEffect(() => {
    const speeds: Record<SplashAnimStyle, number[]> = {
      terminal: [600, 1400, 2200, 3400, 4000],
      portal: [400, 1000, 1800, 2800, 3400],
      minimal: [200, 400, 800, 1400, 1800],
      explosion: [100, 500, 1200, 2400, 3000],
    };
    const t = speeds[animStyle];
    const timers = [
      setTimeout(() => setPhase("scan"), t[0]),
      setTimeout(() => setPhase("avatar"), t[1]),
      setTimeout(() => setPhase("greet"), t[2]),
      setTimeout(() => setPhase("launch"), t[3]),
      setTimeout(onComplete, t[4]),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete, animStyle]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  const bootLines = [
    "Iniciando sistemas...",
    "Cargando módulos de IA...",
    "Sincronizando agenda...",
    "¡Todo listo, jefe!",
  ];

  // Style-specific settings
  const showTerminalBoot = animStyle === "terminal";
  const showGlyphs = animStyle === "terminal" || animStyle === "portal";
  const showScanLine = animStyle === "terminal";
  const showHexagon = animStyle === "portal" || animStyle === "terminal";
  const showExplosion = animStyle === "explosion";
  const showMinimal = animStyle === "minimal";
  const showParticles = animStyle !== "minimal";
  const showRings = animStyle !== "minimal";

  // Color themes per style
  const styleColors: Record<SplashAnimStyle, { primary: string; secondary: string; glow: string }> = {
    terminal: { primary: "211, 100%, 50%", secondary: "230, 100%, 40%", glow: "211, 100%, 60%" },
    portal: { primary: "270, 70%, 60%", secondary: "300, 80%, 50%", glow: "280, 80%, 65%" },
    minimal: { primary: "0, 0%, 70%", secondary: "0, 0%, 50%", glow: "0, 0%, 80%" },
    explosion: { primary: "30, 100%, 55%", secondary: "10, 90%, 50%", glow: "40, 100%, 60%" },
  };
  const colors = styleColors[animStyle];

  return (
    <AnimatePresence>
      {phase !== "launch" && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={
            animStyle === "explosion" 
              ? { opacity: 0, scale: 2, filter: "blur(20px)" }
              : animStyle === "minimal"
              ? { opacity: 0 }
              : { opacity: 0, scale: 1.1 }
          }
          transition={{ duration: animStyle === "minimal" ? 0.3 : 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "hsl(228, 12%, 4%)" }}
        >
          {/* Background ambient glow */}
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{
              opacity: phase === "boot" ? 0.15 : phase === "greet" ? 0.35 : 0.25,
              scale: phase === "greet" ? 1.2 : 0.8,
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ background: `radial-gradient(circle, hsl(${colors.primary}), hsl(${colors.secondary}), transparent)` }}
          />

          {/* Secondary glow */}
          {!showMinimal && (
            <motion.div
              className="absolute w-[300px] h-[300px] rounded-full pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{
                opacity: phase === "avatar" || phase === "greet" ? 0.2 : 0,
                rotate: animStyle === "portal" ? 360 : 180,
              }}
              transition={{ duration: animStyle === "portal" ? 3 : 2, repeat: animStyle === "portal" ? Infinity : 0, ease: "linear" }}
              style={{ background: `radial-gradient(circle, hsl(${colors.secondary}), transparent)` }}
            />
          )}

          {/* Floating particles */}
          {showParticles && particles.map(p => (
            <motion.div
              key={p.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                background: `hsl(${parseInt(colors.primary) + p.angle * 0.3}, 80%, ${55 + p.size * 5}%)`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0, 1.5, 0],
                y: showExplosion ? [0, -80 - p.size * 15] : [0, -40 - p.size * 10],
              }}
              transition={{
                delay: p.delay + 0.5,
                duration: showExplosion ? p.duration * 0.6 : p.duration,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}

          {/* Expanding rings */}
          {showRings && Array.from({ length: NUM_RINGS }).map((_, i) => (
            <motion.div
              key={`ring-${i}`}
              className="absolute rounded-full border pointer-events-none"
              style={{ borderColor: `hsla(${colors.glow}, ${0.15 - i * 0.04})` }}
              initial={{ width: 0, height: 0, opacity: 0 }}
              animate={phase !== "boot" ? {
                width: [0, 200 + i * 120],
                height: [0, 200 + i * 120],
                opacity: [0.6, 0],
              } : {}}
              transition={{
                delay: 0.2 + i * 0.3,
                duration: showExplosion ? 0.8 : 1.8,
                ease: "easeOut",
                repeat: phase === "greet" ? Infinity : 0,
                repeatDelay: 2,
              }}
            />
          ))}

          {/* Explosion shards */}
          {showExplosion && phase === "scan" && shards.map(s => (
            <motion.div
              key={`shard-${s.id}`}
              className="absolute pointer-events-none"
              style={{
                width: s.size,
                height: s.size * 0.3,
                background: `linear-gradient(90deg, hsl(${colors.primary}), hsl(${colors.glow}))`,
                borderRadius: 2,
              }}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: s.angle }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0.5],
                x: Math.cos((s.angle * Math.PI) / 180) * s.distance,
                y: Math.sin((s.angle * Math.PI) / 180) * s.distance,
              }}
              transition={{ delay: s.delay, duration: 0.6, ease: "easeOut" }}
            />
          ))}

          {/* Orbiting glyphs */}
          <AnimatePresence>
            {showGlyphs && (phase === "scan" || phase === "avatar") && glyphs.map(g => (
              <motion.span
                key={`glyph-${g.id}`}
                className="absolute font-mono pointer-events-none select-none"
                style={{ fontSize: "14px", color: `hsla(${colors.primary}, 0.3)` }}
                initial={{
                  opacity: 0,
                  x: Math.cos((g.angle * Math.PI) / 180) * 30,
                  y: Math.sin((g.angle * Math.PI) / 180) * 30,
                }}
                animate={{
                  opacity: [0, 0.5, 0],
                  x: Math.cos((g.angle * Math.PI) / 180) * g.radius,
                  y: Math.sin((g.angle * Math.PI) / 180) * g.radius,
                  rotate: animStyle === "portal" ? g.angle + 360 : g.angle + 180,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ delay: g.delay, duration: animStyle === "portal" ? 2 : 1.5, ease: "easeOut" }}
              >
                {g.char}
              </motion.span>
            ))}
          </AnimatePresence>

          {/* Scan line effect */}
          <AnimatePresence>
            {showScanLine && phase === "scan" && (
              <motion.div
                className="absolute left-0 right-0 h-px pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, transparent, hsl(${colors.glow}), transparent)`,
                  boxShadow: `0 0 20px 4px hsla(${colors.glow}, 0.4)`,
                }}
                initial={{ top: "0%", opacity: 0 }}
                animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            )}
          </AnimatePresence>

          {/* Portal spinning rings */}
          {animStyle === "portal" && phase !== "boot" && (
            <>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={`portal-ring-${i}`}
                  className="absolute rounded-full border-2 pointer-events-none"
                  style={{
                    width: 160 + i * 50,
                    height: 160 + i * 50,
                    borderColor: `hsla(${colors.glow}, ${0.4 - i * 0.1})`,
                    borderStyle: "dashed",
                  }}
                  initial={{ opacity: 0, rotate: 0, scale: 0 }}
                  animate={{
                    opacity: 0.5,
                    rotate: i % 2 === 0 ? 360 : -360,
                    scale: 1,
                  }}
                  transition={{
                    rotate: { duration: 8 + i * 2, repeat: Infinity, ease: "linear" },
                    opacity: { duration: 0.5 },
                    scale: { duration: 0.5, delay: i * 0.1 },
                  }}
                />
              ))}
            </>
          )}

          {/* Portal hexagon frame */}
          {showHexagon && (
            <motion.div
              className="absolute pointer-events-none"
              initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
              animate={phase !== "boot" ? {
                opacity: [0, 0.3, 0.15],
                scale: 1,
                rotate: animStyle === "portal" ? 90 : 30,
              } : {}}
              transition={{ duration: 2, ease: "easeOut" }}
            >
              <svg width="280" height="280" viewBox="0 0 280 280" fill="none">
                <polygon
                  points="140,10 260,75 260,205 140,270 20,205 20,75"
                  stroke={`hsl(${colors.primary})`}
                  strokeWidth="1"
                  strokeDasharray="8 4"
                  fill="none"
                  opacity="0.4"
                />
                <polygon
                  points="140,30 240,85 240,195 140,250 40,195 40,85"
                  stroke={`hsl(${colors.secondary})`}
                  strokeWidth="0.5"
                  fill="none"
                  opacity="0.2"
                />
              </svg>
            </motion.div>
          )}

          {/* Boot terminal text */}
          <AnimatePresence>
            {showTerminalBoot && phase === "boot" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute top-1/3 left-0 right-0 px-8"
              >
                {bootLines.slice(0, 2).map((line, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 0.6, x: 0 }}
                    transition={{ delay: i * 0.25, duration: 0.3 }}
                    className="font-mono text-xs mb-1"
                    style={{ color: `hsla(${colors.primary}, 0.6)` }}
                  >
                    <span style={{ color: `hsla(${colors.primary}, 0.4)` }}>›</span> {line}
                  </motion.p>
                ))}
                <motion.div
                  className="w-2 h-4 mt-1"
                  style={{ backgroundColor: `hsla(${colors.primary}, 0.6)` }}
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Avatar entrance */}
          <motion.div
            initial={
              showExplosion 
                ? { scale: 0, opacity: 0, rotate: -180 }
                : showMinimal
                ? { scale: 0.8, opacity: 0 }
                : { scale: 0, opacity: 0 }
            }
            animate={phase !== "boot" ? {
              scale: phase === "greet" ? 1 : 0.8,
              opacity: 1,
              rotate: 0,
            } : {}}
            transition={
              showExplosion
                ? { type: "spring", stiffness: 200, damping: 12 }
                : showMinimal
                ? { duration: 0.4, ease: "easeOut" }
                : { type: "spring", stiffness: 120, damping: 14, mass: 0.8 }
            }
            className="relative z-10"
          >
            {/* Avatar glow ring */}
            <motion.div
              className="absolute -inset-6 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, hsla(${colors.primary}, 0.15), transparent)`,
              }}
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {renderAvatar(phase === "greet" ? 160 : 120)}
          </motion.div>

          {/* Greeting text */}
          <AnimatePresence>
            {phase === "greet" && (
              <motion.div
                initial={
                  showMinimal
                    ? { opacity: 0, y: 10 }
                    : { opacity: 0, y: 30, filter: "blur(10px)" }
                }
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: showMinimal ? 0.3 : 0.6, ease: "easeOut" }}
                className="mt-8 text-center relative z-10"
              >
                <motion.h1
                  className="text-3xl font-extrabold tracking-tight"
                  initial={{ letterSpacing: showMinimal ? "-0.02em" : "0.2em", opacity: 0 }}
                  animate={{ letterSpacing: "-0.02em", opacity: 1 }}
                  transition={{ duration: showMinimal ? 0.3 : 0.8, ease: "easeOut" }}
                >
                  {greeting},{" "}
                  <span className="text-gradient-primary">{localStorage.getItem("user-name") || "Pedro"}</span>
                </motion.h1>

                <motion.div
                  className="flex items-center justify-center gap-2 mt-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: showMinimal ? 0.1 : 0.3, duration: 0.5 }}
                >
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "hsl(145, 63%, 49%)" }}
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <p className="text-sm text-muted-foreground font-medium">
                    Sistemas listos
                  </p>
                </motion.div>

                {/* Status badges - hide for minimal */}
                {!showMinimal && (
                  <motion.div
                    className="flex gap-2 justify-center mt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {[
                      { label: "Agenda", color: colors.primary },
                      { label: "Gym", color: "152, 69%, 40%" },
                      { label: "Tareas", color: colors.secondary },
                    ].map((badge, i) => (
                      <motion.span
                        key={badge.label}
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.6 + i * 0.1, type: "spring", stiffness: 300 }}
                        className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
                        style={{
                          backgroundColor: `hsla(${badge.color}, 0.15)`,
                          color: `hsl(${badge.color})`,
                          border: `1px solid hsla(${badge.color}, 0.2)`,
                        }}
                      >
                        ✓ {badge.label}
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom loading bar */}
          {!showMinimal && (
            <div className="absolute bottom-16 left-8 right-8">
              <motion.div
                className="h-[2px] rounded-full overflow-hidden"
                style={{ backgroundColor: "hsla(225, 10%, 20%, 0.5)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, hsl(${colors.primary}), hsl(${colors.secondary}))` }}
                  initial={{ width: "0%" }}
                  animate={{
                    width: phase === "boot" ? "20%" : phase === "scan" ? "45%" : phase === "avatar" ? "70%" : "100%",
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
