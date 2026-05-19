import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence, Reorder } from "framer-motion"
import { X, ChevronLeft, ChevronRight, Check, Dumbbell, SkipForward, Trophy, Play, GripVertical } from "lucide-react"

const REPS_ITEMS = Array.from({ length: 50 },  (_, i) => i + 1)  // 1–50
const KG_ITEMS   = Array.from({ length: 301 }, (_, i) => i)      // 0–300

const SESSION_KEY        = 'workout-session'
const SESSION_EXPIRY_MS  = 4 * 60 * 60 * 1000 // 4 horas

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface WorkoutEjercicio {
  id: number
  nombre: string
  series_sugeridas?: number
  repes_sugeridas?: number
  ultimo_peso?: number
  peso_maximo?: number
}

interface WorkoutRutina {
  id: number
  nombre: string
  ejercicios?: WorkoutEjercicio[]
}

interface WorkoutSessionSheetProps {
  isOpen: boolean
  onClose: () => void
  rutinas: WorkoutRutina[]
  onLogSerie: (ejercicioId: number, ejercicioNombre: string, reps: number, kg: number) => void
  defaultRestSeconds?: number
  resume?: boolean
}

type Step = "rutina" | "ejercicio" | "registro" | "timer" | "completado"
type SessionMode = "completa" | "individual"

interface SavedSession {
  rutinaId: number
  rutinaName: string
  orderedEjercicios: WorkoutEjercicio[]
  completedExIds: number[]
  exIndex: number
  serieActual: number
  reps: number
  kg: number
  step: Extract<Step, "ejercicio" | "registro">
  seriesCompletadas: number
  savedAt: number
}

// ── Helpers localStorage ───────────────────────────────────────────────────────

export function getSavedWorkoutSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session: SavedSession = JSON.parse(raw)
    if (Date.now() - session.savedAt > SESSION_EXPIRY_MS) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function clearWorkoutSession() {
  localStorage.removeItem(SESSION_KEY)
}

function saveWorkoutSession(data: SavedSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data))
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function WorkoutSessionSheet({
  isOpen,
  onClose,
  rutinas,
  onLogSerie,
  defaultRestSeconds = 90,
  resume = false,
}: WorkoutSessionSheetProps) {
  const [step, setStep] = useState<Step>("rutina")
  const [rutina, setRutina] = useState<WorkoutRutina | null>(null)
  const [orderedEjercicios, setOrderedEjercicios] = useState<WorkoutEjercicio[]>([])
  const [completedExIds, setCompletedExIds] = useState<Set<number>>(new Set())
  const [sessionMode, setSessionMode] = useState<SessionMode>("completa")
  const [exIndex, setExIndex] = useState(0)
  const [serieActual, setSerieActual] = useState(1)
  const [reps, setReps] = useState(10)
  const [kg, setKg] = useState(60)
  const [timeLeft, setTimeLeft] = useState(defaultRestSeconds)
  const [seriesCompletadas, setSeriesCompletadas] = useState(0)

  const ejercicioActual = orderedEjercicios[exIndex]
  const totalSeries = ejercicioActual?.series_sugeridas ?? 3
  const totalEjercicios = orderedEjercicios.length

  // Restaurar sesión guardada cuando se abre con resume=true
  useEffect(() => {
    if (!isOpen) return
    if (resume) {
      const saved = getSavedWorkoutSession()
      if (!saved) return
      const savedRutina = rutinas.find(r => r.id === saved.rutinaId)
      if (!savedRutina) return
      setRutina(savedRutina)
      setOrderedEjercicios(saved.orderedEjercicios)
      setCompletedExIds(new Set(saved.completedExIds))
      setExIndex(saved.exIndex)
      setSerieActual(saved.serieActual)
      setReps(saved.reps)
      setKg(saved.kg)
      setStep(saved.step)
      setSeriesCompletadas(saved.seriesCompletadas)
    } else {
      // Inicio nuevo: limpiar estado
      setStep("rutina")
      setRutina(null)
      setOrderedEjercicios([])
      setCompletedExIds(new Set())
      setSessionMode("completa")
      setExIndex(0)
      setSerieActual(1)
      setSeriesCompletadas(0)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Guardar sesión en localStorage mientras está activa (excepto en rutina/completado)
  useEffect(() => {
    if (!isOpen || !rutina) return
    if (step === "rutina" || step === "completado") return
    const stepToSave = step === "timer" ? "registro" : step
    saveWorkoutSession({
      rutinaId: rutina.id,
      rutinaName: rutina.nombre,
      orderedEjercicios,
      completedExIds: Array.from(completedExIds),
      exIndex,
      serieActual,
      reps,
      kg,
      step: stepToSave as SavedSession["step"],
      seriesCompletadas,
      savedAt: Date.now(),
    })
  }, [isOpen, step, rutina, orderedEjercicios, completedExIds, exIndex, serieActual, reps, kg, seriesCompletadas])

  const handleClose = () => {
    if (step === "completado") {
      clearWorkoutSession()
    }
    setStep("rutina")
    setRutina(null)
    setOrderedEjercicios([])
    setCompletedExIds(new Set())
    setSessionMode("completa")
    setExIndex(0)
    setSerieActual(1)
    setSeriesCompletadas(0)
    onClose()
  }

  // Lógica de avance: skipExtra=false → próxima serie, skipExtra=true → salta la próxima
  const handleAdvance = useCallback((skipExtra: boolean = false) => {
    const currentEx = orderedEjercicios[exIndex]
    const currentTotalSeries = currentEx?.series_sugeridas ?? 3
    const increment = skipExtra ? 2 : 1

    if (serieActual + increment <= currentTotalSeries) {
      setSerieActual(s => s + increment)
      setStep("registro")
    } else {
      if (currentEx?.id !== undefined) {
        setCompletedExIds(prev => new Set(prev).add(currentEx.id))
      }
      if (sessionMode === "individual") {
        setSerieActual(1)
        setStep("ejercicio")
      } else {
        const nextIdx = exIndex + 1
        if (nextIdx < orderedEjercicios.length) {
          const nextEx = orderedEjercicios[nextIdx]
          setExIndex(nextIdx)
          setSerieActual(1)
          setReps(Math.min(nextEx.repes_sugeridas ?? 10, 50))
          setKg(Math.min(nextEx.ultimo_peso ?? nextEx.peso_maximo ?? 60, 300))
          setStep("registro")
        } else {
          setStep("completado")
        }
      }
    }
  }, [orderedEjercicios, exIndex, serieActual, sessionMode])

  const handleAdvanceRef = useRef(handleAdvance)
  useEffect(() => { handleAdvanceRef.current = handleAdvance }, [handleAdvance])

  useEffect(() => {
    if (step !== "timer") return
    if (timeLeft <= 0) { handleAdvanceRef.current(false); return }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [step, timeLeft])

  const selectRutina = (r: WorkoutRutina) => {
    setRutina(r)
    setOrderedEjercicios(r.ejercicios ?? [])
    setCompletedExIds(new Set())
    setExIndex(0)
    setSerieActual(1)
    setStep("ejercicio")
  }

  const startEjercicio = (idx: number, mode: SessionMode) => {
    const ej = orderedEjercicios[idx]
    setSessionMode(mode)
    setExIndex(idx)
    setSerieActual(1)
    setReps(Math.min(ej?.repes_sugeridas ?? 10, 50))
    setKg(Math.min(ej?.ultimo_peso ?? ej?.peso_maximo ?? 60, 300))
    setStep("registro")
  }

  const startRutinaCompleta = () => {
    const firstIdx = orderedEjercicios.findIndex(ej => !completedExIds.has(ej.id))
    if (firstIdx === -1) { setStep("completado"); return }
    startEjercicio(firstIdx, "completa")
  }

  const handleRegistrar = () => {
    if (!ejercicioActual) return
    onLogSerie(ejercicioActual.id, ejercicioActual.nombre, reps, kg)
    setSeriesCompletadas(s => s + 1)
    setTimeLeft(defaultRestSeconds)
    setStep("timer")
  }

  const allDone = orderedEjercicios.length > 0 &&
    orderedEjercicios.every(ej => completedExIds.has(ej.id))

  const radius = 60
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - timeLeft / defaultRestSeconds)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end"
      >
        {/* Backdrop — cierra siempre al tocar fuera */}
        <div
          className="absolute inset-0"
          style={{ background: "hsla(228, 12%, 6%, 0.7)", backdropFilter: "blur(8px)" }}
          onClick={handleClose}
        />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bottom-sheet w-full max-w-lg mx-auto p-6 relative"
          onClick={e => e.stopPropagation()}
        >
          <div className="sheet-handle" />

          <AnimatePresence mode="wait">

            {/* ── PASO 1: SELECCIONAR RUTINA ── */}
            {step === "rutina" && (
              <motion.div
                key="rutina"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between mb-6 mt-2">
                  <h2 className="text-xl font-extrabold">Seleccionar Rutina</h2>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={handleClose}
                    className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
                  >
                    <X size={16} />
                  </motion.button>
                </div>
                <div className="space-y-3">
                  {rutinas.map(r => (
                    <motion.button
                      key={r.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => selectRutina(r)}
                      className="glass-card-hover p-4 flex items-center gap-4 w-full text-left"
                    >
                      <div className="icon-container-lg bg-primary/15">
                        <Dumbbell size={22} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-extrabold text-[16px]">{r.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {r.ejercicios?.length ?? 0} ejercicios
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── PASO 2: MENÚ DE EJERCICIOS ── */}
            {step === "ejercicio" && rutina && (
              <motion.div
                key="ejercicio"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-4 mt-2">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setStep("rutina")}
                    className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
                  >
                    <ChevronLeft size={16} />
                  </motion.button>
                  <h2 className="text-xl font-extrabold flex-1">{rutina.nombre}</h2>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={handleClose}
                    className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
                  >
                    <X size={16} />
                  </motion.button>
                </div>

                {/* Barra de progreso global */}
                {completedExIds.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 mb-3 px-1"
                  >
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-success rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(completedExIds.size / totalEjercicios) * 100}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                    <span className="text-xs text-success font-semibold">
                      {completedExIds.size}/{totalEjercicios}
                    </span>
                  </motion.div>
                )}

                {/* Ejecutar rutina completa */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={startRutinaCompleta}
                  disabled={allDone}
                  className="w-full gradient-primary text-primary-foreground font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[15px] mb-3 disabled:opacity-50"
                  style={{ boxShadow: "var(--shadow-glow-blue)" }}
                >
                  <Play size={16} className="fill-current" />
                  {allDone ? "Rutina completada" : "Ejecutar rutina completa"}
                </motion.button>

                {/* Separador */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-secondary/60" />
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    o elige un ejercicio
                  </span>
                  <div className="flex-1 h-px bg-secondary/60" />
                </div>

                {/* Lista drag & drop */}
                <Reorder.Group
                  axis="y"
                  values={orderedEjercicios}
                  onReorder={setOrderedEjercicios}
                  className="space-y-1.5"
                >
                  {orderedEjercicios.map((ej, i) => {
                    const isCompleted = completedExIds.has(ej.id)
                    return (
                      <Reorder.Item
                        key={ej.id}
                        value={ej}
                        whileDrag={{ scale: 1.03, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 10, borderRadius: 12 }}
                        onClick={() => !isCompleted && startEjercicio(i, "individual")}
                        className={`flex items-center gap-3 py-3 px-4 rounded-xl select-none ${
                          isCompleted
                            ? "bg-success/10 border border-success/20"
                            : "bg-secondary/40 cursor-pointer"
                        }`}
                      >
                        {/* Drag handle */}
                        <GripVertical
                          size={14}
                          className="text-muted-foreground/40 flex-shrink-0 cursor-grab active:cursor-grabbing"
                        />

                        {/* Badge número / check */}
                        <motion.div
                          animate={isCompleted ? { scale: [1, 1.2, 1] } : {}}
                          transition={{ duration: 0.3 }}
                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                            isCompleted
                              ? "bg-success/20 text-success"
                              : "gradient-primary text-primary-foreground"
                          }`}
                        >
                          {isCompleted ? <Check size={13} strokeWidth={3} /> : i + 1}
                        </motion.div>

                        {/* Nombre + estado */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${isCompleted ? "text-muted-foreground line-through" : ""}`}>
                            {ej.nombre}
                          </p>
                          <p className={`text-sm font-medium ${isCompleted ? "text-success" : "text-muted-foreground"}`}>
                            {isCompleted
                              ? "Completado"
                              : `${ej.series_sugeridas ?? 3}×${ej.repes_sugeridas ?? 10}`}
                          </p>
                        </div>
                      </Reorder.Item>
                    )
                  })}
                </Reorder.Group>
              </motion.div>
            )}

            {/* ── PASO 3: REGISTRAR SERIE ── */}
            {step === "registro" && ejercicioActual && (
              <motion.div
                key={`registro-${exIndex}-${serieActual}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-3 mt-2 mb-2">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setStep("ejercicio")}
                    className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
                  >
                    <ChevronLeft size={16} />
                  </motion.button>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-[16px] truncate">{ejercicioActual.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      Ejercicio {exIndex + 1} de {totalEjercicios}
                      {sessionMode === "individual" && " · Individual"}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={handleClose}
                    className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
                  >
                    <X size={16} />
                  </motion.button>
                </div>

                {/* Progreso de series */}
                <div className="flex items-center justify-center gap-2 mb-4 pt-1">
                  {Array.from({ length: totalSeries }).map((_, i) => (
                    <motion.div
                      key={i}
                      layout
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i < serieActual - 1
                          ? "w-6 bg-success"
                          : i === serieActual - 1
                          ? "w-8 gradient-primary"
                          : "w-2 bg-secondary"
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-sm text-muted-foreground font-semibold">
                    {serieActual}/{totalSeries}
                  </span>
                </div>

                {/* Selectores */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: "Reps", value: reps, onChange: setReps, items: REPS_ITEMS },
                    { label: "Kg",   value: kg,   onChange: setKg,   items: KG_ITEMS  },
                  ].map(field => (
                    <div key={field.label} className="text-center">
                      <p className="text-xs text-muted-foreground font-semibold mb-2">{field.label}</p>
                      <div className="glass-card p-4 flex flex-col items-center">
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => field.onChange(Math.min(field.value + 1, field.items[field.items.length - 1]))} className="text-muted-foreground mb-1">▲</motion.button>
                        <select
                          value={field.value}
                          onChange={e => field.onChange(Number(e.target.value))}
                          className="text-3xl font-black bg-transparent text-foreground outline-none appearance-none cursor-pointer w-full"
                          style={{ textAlign: "center", textAlignLast: "center" }}
                        >
                          {field.items.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => field.onChange(Math.max(field.value - 1, field.items[0]))} className="text-muted-foreground mt-1">▼</motion.button>
                      </div>
                    </div>
                  ))}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleRegistrar}
                  className="w-full gradient-success text-success-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-[15px] mb-3"
                  style={{ boxShadow: "var(--shadow-glow-green)" }}
                >
                  <Check size={18} /> Registrar Serie
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAdvance(false)}
                  className="w-full text-muted-foreground text-sm font-semibold py-2 text-center"
                >
                  Saltar serie
                </motion.button>
              </motion.div>
            )}

            {/* ── PASO 4: TIMER DE DESCANSO ── */}
            {step === "timer" && (
              <motion.div
                key="timer"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center justify-between mt-2 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">
                      Descanso
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ejercicioActual?.nombre} · Serie {serieActual}/{totalSeries}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={handleClose}
                    className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
                  >
                    <X size={16} />
                  </motion.button>
                </div>

                <div className="flex flex-col items-center py-2">
                  <svg width="160" height="160" className="mb-6">
                    <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                    <motion.circle
                      cx="80" cy="80" r={radius}
                      fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      transform="rotate(-90 80 80)"
                      transition={{ duration: 1, ease: "linear" }}
                    />
                    <text x="80" y="74" textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize="38" fontWeight="900" fontFamily="-apple-system, sans-serif">
                      {timeLeft}
                    </text>
                    <text x="80" y="100" textAnchor="middle" dominantBaseline="middle"
                      fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="600"
                      fontFamily="-apple-system, sans-serif">
                      segundos
                    </text>
                  </svg>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAdvance(false)}
                  className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-[15px] mb-3"
                  style={{ boxShadow: "var(--shadow-glow-blue)" }}
                >
                  <SkipForward size={18} /> Saltar descanso
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAdvance(true)}
                  className="w-full text-muted-foreground text-sm font-semibold py-2 text-center"
                >
                  Saltar serie
                </motion.button>
              </motion.div>
            )}

            {/* ── PASO 5: COMPLETADO ── */}
            {step === "completado" && (
              <motion.div
                key="completado"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-4 text-center relative overflow-hidden"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 0, x: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      y: [0, -60 - i * 15],
                      x: [(i - 4) * 18, (i - 4) * 35],
                      scale: [0, 1.2, 1, 0],
                    }}
                    transition={{ delay: 0.15 + i * 0.08, duration: 1.4, ease: "easeOut" }}
                    className={`absolute w-3 h-3 rounded-full pointer-events-none ${
                      i % 3 === 0 ? "bg-primary" : i % 3 === 1 ? "bg-success" : "bg-warning"
                    }`}
                    style={{ left: "50%", top: "20%" }}
                  />
                ))}

                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.1 }}
                  className="w-24 h-24 rounded-full gradient-success mx-auto mb-5 flex items-center justify-center"
                  style={{ boxShadow: "var(--shadow-glow-green)" }}
                >
                  <Trophy size={40} className="text-success-foreground" />
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-black mb-1"
                >
                  ¡Entrenamiento completado!
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground mb-8"
                >
                  {seriesCompletadas} series · {rutina?.nombre}
                </motion.p>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleClose}
                  className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-[15px]"
                  style={{ boxShadow: "var(--shadow-glow-blue)" }}
                >
                  <Check size={18} /> ¡Genial!
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
