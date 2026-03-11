import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Calendar, SlidersHorizontal, Plus, Dumbbell, Flame, TrendingUp, X, Check } from "lucide-react";
import CircularProgress from "@/components/CircularProgress";
import ActivityGrid from "@/components/gym/ActivityGrid";
import QuickStartButton from "@/components/gym/QuickStartButton";
import { useGym } from "@/hooks/useGym";
import { gymService } from "@/services/supabaseService";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const GymPage = () => {
  const {
    gruposMusculares, ejerciciosConStats, logsDelDia,
    rutinasPersonalizadas, crearLog, crearEjercicio, isLoading,
  } = useGym();

  const [tab, setTab] = useState<"calendar" | "routines">("calendar");
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [showNewRoutine, setShowNewRoutine] = useState(false);
  const [selectedForRoutine, setSelectedForRoutine] = useState<string[]>([]);
  const [logSheet, setLogSheet] = useState<string | null>(null);
  const [logSets, setLogSets] = useState(4);
  const [logReps, setLogReps] = useState(10);
  const [logKg, setLogKg] = useState(60);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExGroup, setNewExGroup] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [addingNewGroup, setAddingNewGroup] = useState(false);

  // Derivar exercisePool desde Supabase
  const exercisePool = useMemo(() => {
    const pool: Record<string, string[]> = {};
    ejerciciosConStats.forEach(e => {
      const grupo = e.grupo_muscular_nombre ?? "Sin grupo";
      if (!pool[grupo]) pool[grupo] = [];
      pool[grupo].push(e.nombre);
    });
    return pool;
  }, [ejerciciosConStats]);

  // Adaptar logs del día al formato UI
  const todayExercises = useMemo(() =>
    logsDelDia.map(l => ({
      name: l.ejercicio_nombre ?? `Ejercicio #${l.ejercicio_id}`,
      detail: `${l.series}×${l.repes} @ ${l.peso_kg}kg`,
      pr: false,
    })), [logsDelDia]);

  // Adaptar rutinas personalizadas al formato UI
  const routines = useMemo(() =>
    rutinasPersonalizadas.map(r => ({
      name: r.nombre,
      color: "primary",
      exercises: (r.ejercicios ?? []).map(e => ({
        name: e.nombre,
        sets: `${e.series_sugeridas ?? 3}×${e.repes_sugeridas ?? 10}`,
      })),
    })), [rutinasPersonalizadas]);

  if (isLoading) {
    return (
      <div className="px-4 pt-12 pb-24 space-y-4">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-xl" />
          <Skeleton className="h-9 flex-1 rounded-xl" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const activeDays = [1, 2, 3, 4, 5, 6];
  const today = 7;
  const daysInMonth = 31;
  const firstDay = 0;

  const handleAddExercise = async () => {
    const grupoNombre = addingNewGroup ? newGroupName.trim() : newExGroup;
    const nombre = newExName.trim();
    if (!grupoNombre || !nombre) return;
    const grupo = gruposMusculares.find(g => g.nombre === grupoNombre);
    if (!grupo) return;
    crearEjercicio.mutate({ nombre, grupo_muscular_id: grupo.id });
    setNewExName("");
    setNewGroupName("");
    setAddingNewGroup(false);
    setShowAddExercise(false);
  };

  const handleDeleteExercise = async (group: string, exName: string) => {
    const ejercicio = ejerciciosConStats.find(
      e => e.nombre === exName && e.grupo_muscular_nombre === group,
    );
    if (!ejercicio) return;
    await gymService.deleteEjercicio(ejercicio.id);
  };

  const handleSaveLog = () => {
    if (!logSheet) return;
    const ejercicio = ejerciciosConStats.find(e => e.nombre === logSheet);
    if (!ejercicio) return;
    crearLog.mutate({
      ejercicio_id: ejercicio.id,
      ejercicio_nombre: ejercicio.nombre,
      series: logSets,
      repes: logReps,
      peso_kg: logKg,
      fecha: new Date().toISOString().split("T")[0],
    });
    setLogSheet(null);
  };

  const toggleExForRoutine = (name: string) => {
    setSelectedForRoutine(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="px-4 pt-14 pb-4">
      {/* Top Stats */}
      <motion.div variants={fadeUp} className="flex gap-3 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { label: "días racha", value: "4", gradient: "gradient-warning" },
          { label: "hoy", value: "2", gradient: "gradient-success" },
          { label: "PRs", value: "1", gradient: "gradient-primary" },
        ].map((s) => (
          <div key={s.label} className={`flex-1 min-w-[100px] ${s.gradient} rounded-2xl p-3 text-center`}>
            <p className="text-xl font-extrabold">{s.value}</p>
            <p className="text-[10px] font-semibold opacity-80 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Tab Switcher */}
      <motion.div variants={fadeUp} className="tab-switcher mb-5">
        {[
          { key: "calendar" as const, icon: Calendar, label: "Calendario" },
          { key: "routines" as const, icon: SlidersHorizontal, label: "Rutinas" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm transition-all duration-300 ${
              tab === t.key ? "tab-active" : "tab-inactive"
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {tab === "calendar" ? (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* Activity Grid */}
            <ActivityGrid />

            {/* Quick Start */}
            <QuickStartButton
              routineName="Pecho"
              exerciseCount={2}
              onStart={() => {}}
            />

            {/* Today's exercises */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title">Hoy</h2>
                <span className="text-sm text-muted-foreground font-medium">{todayExercises.length} ejercicios</span>
              </div>
              <div className="space-y-2">
                {todayExercises.map((ex) => (
                  <motion.button
                    key={ex.name}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedExercise(ex.name)}
                    className="glass-card-hover p-4 flex items-center gap-4 w-full text-left"
                  >
                    <div className="icon-container-lg bg-gym/15">
                      <Dumbbell size={22} className="text-gym" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{ex.name}</p>
                      <p className="text-sm text-muted-foreground">{ex.detail}</p>
                    </div>
                    {ex.pr && (
                      <span className="stat-badge bg-warning/15 text-warning">
                        <Flame size={12} /> PR
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="routines"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="section-title">Mis Rutinas</h2>
              <motion.button
                whileTap={{ scale: 0.85, rotate: 90 }}
                onClick={() => { setShowNewRoutine(true); setSelectedForRoutine([]); }}
                className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center"
                style={{ boxShadow: 'var(--shadow-glow-blue)' }}
              >
                <Plus size={18} className="text-primary-foreground" />
              </motion.button>
            </div>
            {routines.map((routine, ri) => (
              <motion.div
                key={routine.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ri * 0.1 }}
                className="glass-card p-5"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="icon-container-lg bg-primary/15">
                    <Dumbbell size={22} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-extrabold text-[16px]">{routine.name}</p>
                    <p className="text-sm text-muted-foreground">{routine.exercises.length} ejercicios</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {routine.exercises.map((ex, i) => (
                    <motion.div
                      key={ex.name}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setLogSheet(ex.name)}
                      className="flex items-center gap-3 py-3 px-4 bg-secondary/40 rounded-xl cursor-pointer"
                    >
                      <span className="w-7 h-7 rounded-lg gradient-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="flex-1 font-semibold text-sm">{ex.name}</span>
                      <span className="text-sm text-muted-foreground font-medium">{ex.sets}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Pool */}
            <div className="flex items-center justify-between pt-2">
              <h2 className="section-title">Pool de Ejercicios</h2>
              <motion.button
                whileTap={{ scale: 0.85, rotate: 90 }}
                onClick={() => { setShowAddExercise(true); setNewExName(""); setAddingNewGroup(false); }}
                className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center"
                style={{ boxShadow: 'var(--shadow-glow-blue)' }}
              >
                <Plus size={16} className="text-primary-foreground" />
              </motion.button>
            </div>
            {Object.entries(exercisePool).map(([group, exs]) => (
              <div key={group}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setExpandedGroup(expandedGroup === group ? null : group)}
                  className="glass-card-hover p-4 flex items-center gap-4 w-full text-left"
                >
                  <div className="icon-container bg-purple/15">
                    <Dumbbell size={20} className="text-purple" />
                  </div>
                  <span className="flex-1 font-bold">{group}</span>
                  <span className="text-sm text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full font-semibold">{exs.length}</span>
                  <motion.div animate={{ rotate: expandedGroup === group ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </motion.div>
                </motion.button>
                <AnimatePresence>
                  {expandedGroup === group && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 pr-2 py-2 space-y-1.5">
                        {exs.map((ex, i) => (
                          <motion.div
                            key={ex}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-center gap-3 py-2.5 px-3 bg-secondary/30 rounded-xl"
                          >
                            <span className="w-6 h-6 rounded-md bg-purple/20 text-purple text-xs font-bold flex items-center justify-center">{i + 1}</span>
                            <span className="flex-1 text-sm font-semibold">{ex}</span>
                            <motion.button
                              whileTap={{ scale: 0.8 }}
                              onClick={() => handleDeleteExercise(group, ex)}
                              className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center"
                            >
                              <X size={12} className="text-destructive" />
                            </motion.button>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise Detail Sheet */}
      <AnimatePresence>
        {selectedExercise && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end"
            onClick={() => setSelectedExercise(null)}
          >
            <div className="absolute inset-0" style={{ background: 'hsla(228, 12%, 6%, 0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bottom-sheet w-full max-w-lg mx-auto p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="flex items-center justify-between mb-6 mt-2">
                <h2 className="text-xl font-extrabold">{selectedExercise}</h2>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setSelectedExercise(null)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <X size={16} />
                </motion.button>
              </div>

              <div className="flex items-center justify-around mb-6">
                <CircularProgress progress={75} size={72} strokeWidth={5} color="hsl(var(--success))">
                  <TrendingUp size={18} className="text-success" />
                </CircularProgress>
                <div className="text-center">
                  <p className="text-4xl font-black text-warning">80</p>
                  <p className="text-xs text-muted-foreground font-medium">Max (kg)</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-black">4</p>
                  <p className="text-xs text-muted-foreground font-medium">Sesiones</p>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-secondary/30 rounded-2xl p-4 mb-6 h-28 flex items-end relative overflow-hidden">
                <svg viewBox="0 0 200 50" className="w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" />
                    </linearGradient>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M10,45 Q50,40 100,30 T190,8 L190,50 L10,50 Z" fill="url(#areaGrad)" />
                  <path d="M10,45 Q50,40 100,30 T190,8" fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="190" cy="8" r="3" fill="hsl(var(--primary))" />
                </svg>
                <div className="absolute bottom-3 left-0 right-0 flex justify-around text-[10px] text-muted-foreground">
                  <span>3 Mar</span><span>5 Mar</span><span>6 Mar</span>
                </div>
              </div>

              <h3 className="font-bold mb-3">Historial</h3>
              {[
                { sets: "4x10 @ 80kg", date: "2026-03-07", pr: true },
                { sets: "4x12 @ 70kg", date: "2026-03-06", pr: false },
              ].map((h) => (
                <div key={h.date} className="flex items-center gap-3 py-3 border-l-2 border-primary pl-4 mb-2 bg-secondary/20 rounded-r-xl">
                  <div className="flex-1">
                    <p className="font-bold">{h.sets}</p>
                    <p className="text-xs text-muted-foreground">{h.date}</p>
                  </div>
                  {h.pr && <span className="stat-badge bg-warning/15 text-warning">PR</span>}
                </div>
              ))}
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl mt-4 flex items-center justify-center gap-2 text-[15px]"
                style={{ boxShadow: 'var(--shadow-glow-blue)' }}
              >
                <Plus size={18} /> Registrar Serie
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log Exercise Sheet */}
      <AnimatePresence>
        {logSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end"
            onClick={() => setLogSheet(null)}
          >
            <div className="absolute inset-0" style={{ background: 'hsla(228, 12%, 6%, 0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bottom-sheet w-full max-w-lg mx-auto p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="flex items-center justify-between mb-8 mt-2">
                <h2 className="text-xl font-extrabold">{logSheet}</h2>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setLogSheet(null)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <X size={16} />
                </motion.button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Series", value: logSets, set: setLogSets },
                  { label: "Reps", value: logReps, set: setLogReps },
                  { label: "Kg", value: logKg, set: setLogKg },
                ].map((field) => (
                  <div key={field.label} className="text-center">
                    <p className="text-xs text-muted-foreground font-semibold mb-2">{field.label}</p>
                    <div className="glass-card p-4 flex flex-col items-center">
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => field.set(v => v + 1)} className="text-muted-foreground mb-1">▲</motion.button>
                      <span className="text-3xl font-black">{field.value}</span>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => field.set(v => Math.max(0, v - 1))} className="text-muted-foreground mt-1">▼</motion.button>
                    </div>
                  </div>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSaveLog}
                className="w-full gradient-success text-success-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-[15px]"
                style={{ boxShadow: 'var(--shadow-glow-green)' }}
              >
                <Check size={18} /> Guardar
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Routine Sheet */}
      <AnimatePresence>
        {showNewRoutine && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end"
            onClick={() => setShowNewRoutine(false)}
          >
            <div className="absolute inset-0" style={{ background: 'hsla(228, 12%, 6%, 0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bottom-sheet w-full max-w-lg mx-auto p-6 max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="flex items-center justify-between mb-6 mt-2">
                <h2 className="text-xl font-extrabold">Nueva Rutina</h2>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowNewRoutine(false)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <X size={16} />
                </motion.button>
              </div>
              <input
                placeholder="Nombre de la rutina"
                className="w-full bg-secondary/60 rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground mb-5 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px] font-medium"
              />
              <p className="text-sm text-muted-foreground mb-4 font-medium">
                Selecciona ejercicios ({selectedForRoutine.length})
              </p>
              {Object.entries(exercisePool).map(([group, exs]) => (
                <div key={group} className="mb-5">
                  <p className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-2">{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {exs.map((ex) => {
                      const selected = selectedForRoutine.includes(ex);
                      return (
                        <motion.button
                          key={ex}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => toggleExForRoutine(ex)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            selected
                              ? "gradient-primary text-primary-foreground"
                              : "bg-secondary/60 text-secondary-foreground"
                          }`}
                          style={selected ? { boxShadow: 'var(--shadow-glow-blue)' } : {}}
                        >
                          {ex}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {selectedForRoutine.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl mt-2 flex items-center justify-center gap-2"
                  style={{ boxShadow: 'var(--shadow-glow-blue)' }}
                >
                  <Check size={18} /> Crear Rutina
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Exercise Sheet */}
      <AnimatePresence>
        {showAddExercise && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end"
            onClick={() => setShowAddExercise(false)}
          >
            <div className="absolute inset-0" style={{ background: 'hsla(228, 12%, 6%, 0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bottom-sheet w-full max-w-lg mx-auto p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="flex items-center justify-between mb-6 mt-2">
                <h2 className="text-xl font-extrabold">Agregar Ejercicio</h2>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowAddExercise(false)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <X size={16} />
                </motion.button>
              </div>

              <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wider">Grupo muscular</p>
              {!addingNewGroup ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.keys(exercisePool).map((g) => (
                    <motion.button
                      key={g}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setNewExGroup(g)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        newExGroup === g
                          ? "gradient-primary text-primary-foreground"
                          : "bg-secondary/60 text-secondary-foreground"
                      }`}
                      style={newExGroup === g ? { boxShadow: 'var(--shadow-glow-blue)' } : {}}
                    >
                      {g}
                    </motion.button>
                  ))}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setAddingNewGroup(true)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-secondary/60 text-muted-foreground border border-dashed border-muted-foreground/30"
                  >
                    <Plus size={14} className="inline mr-1" />Nuevo
                  </motion.button>
                </div>
              ) : (
                <div className="flex gap-2 mb-4">
                  <input
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="Ej: Hombros"
                    className="flex-1 bg-secondary/60 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setAddingNewGroup(false); setNewGroupName(""); }}
                    className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"
                  >
                    <X size={14} />
                  </motion.button>
                </div>
              )}

              <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wider">Nombre del ejercicio</p>
              <input
                value={newExName}
                onChange={e => setNewExName(e.target.value)}
                placeholder="Ej: Press Militar"
                className="w-full bg-secondary/60 rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground mb-6 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px] font-medium"
                onKeyDown={e => e.key === "Enter" && handleAddExercise()}
              />

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAddExercise}
                disabled={!newExName.trim() || (addingNewGroup && !newGroupName.trim())}
                className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-[15px] disabled:opacity-40"
                style={{ boxShadow: 'var(--shadow-glow-blue)' }}
              >
                <Plus size={18} /> Agregar
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GymPage;
