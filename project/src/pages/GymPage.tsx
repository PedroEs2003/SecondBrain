import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useFirstVisit } from "@/hooks/useFirstVisit";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Calendar, SlidersHorizontal, Plus, Dumbbell, Flame, TrendingUp, X, Check, Pencil, Trash2, RotateCcw } from "lucide-react";
import { localDateStr } from "@/lib/utils";
import CircularProgress from "@/components/CircularProgress";
import ActivityGrid from "@/components/gym/ActivityGrid";
import QuickStartButton from "@/components/gym/QuickStartButton";
import WorkoutSessionSheet, { getSavedWorkoutSession, clearWorkoutSession } from "@/components/gym/WorkoutSessionSheet";
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
    gruposMusculares, ejerciciosConStats, logsDelDia, diasConEntrenamiento,
    rutinasPersonalizadas, crearLog, crearEjercicio, isLoading,
    getHistorialEjercicio, crearRutinaPersonalizada, actualizarRutinaPersonalizada, eliminarRutinaPersonalizada,
  } = useGym();

  const [tab, setTab] = useState<"calendar" | "routines">("calendar");
  const [resumeWorkout, setResumeWorkout] = useState(false);
  const [savedSession, setSavedSession] = useState(() => getSavedWorkoutSession());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const { data: logsDiaSeleccionado = [] } = useQuery({
    queryKey: ['logs_fecha', selectedCalendarDate],
    queryFn: () => gymService.getLogsPorFecha(new Date(selectedCalendarDate + 'T12:00:00')),
    enabled: !!selectedCalendarDate,
  });
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  // Rutina sheet (crear / editar)
  const [showRoutineSheet, setShowRoutineSheet] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<number | null>(null);
  const [routineName, setRoutineName] = useState("");
  const [routineExercises, setRoutineExercises] = useState<{ id: number; nombre: string; series: number; reps: number }[]>([]);
  // Swipe rutinas
  const [swipedRoutineId, setSwipedRoutineId] = useState<number | null>(null);
  const [draggingRoutineId, setDraggingRoutineId] = useState<number | null>(null);
  // Swipe ejercicios dentro del sheet
  const [swipedSheetExId, setSwipedSheetExId] = useState<number | null>(null);
  const [draggingSheetExId, setDraggingSheetExId] = useState<number | null>(null);
  const [logSheet, setLogSheet] = useState<string | null>(null);
  const [logSets, setLogSets] = useState(4);
  const [logReps, setLogReps] = useState(10);
  const [logKg, setLogKg] = useState(60);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showWorkout, setShowWorkout] = useState(false);

  useEffect(() => {
    const open = showRoutineSheet || !!logSheet || showAddExercise || showWorkout || resumeWorkout
    window.dispatchEvent(new Event(open ? 'modal-open' : 'modal-close'))
  }, [showRoutineSheet, logSheet, showAddExercise, showWorkout, resumeWorkout])

  // Re-check saved session when sheet closes
  useEffect(() => {
    if (!showWorkout) setSavedSession(getSavedWorkoutSession());
  }, [showWorkout]);
  const [newExName, setNewExName] = useState("");
  const [newExGroup, setNewExGroup] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [addingNewGroup, setAddingNewGroup] = useState(false);

  // Derivar exercisePool desde Supabase
  const exercisePool = useMemo(() => {
    const pool: Record<string, string[]> = {};
    ejerciciosConStats.forEach(e => {
      const grupo = e.grupo_muscular_nombre
        ?? gruposMusculares.find(g => g.id === e.grupo_muscular_id)?.nombre
        ?? "Sin grupo";
      if (!pool[grupo]) pool[grupo] = [];
      pool[grupo].push(e.nombre);
    });
    return pool;
  }, [ejerciciosConStats, gruposMusculares]);

  // Adaptar logs del día al formato UI
  const todayExercises = useMemo(() =>
    logsDelDia.map(l => ({
      name: l.ejercicio_nombre ?? `Ejercicio #${l.ejercicio_id}`,
      detail: `${l.series}×${l.repes} ${l.peso_kg}kg`,
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

  // Racha actual (días consecutivos hacia atrás dentro del mes vigente)
  const rachaActual = useMemo(() => {
    if (diasConEntrenamiento.length === 0) return 0;
    let streak = 0;
    for (let i = 0; ; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (dateStr < dateStr.slice(0, 7) + '-01') break;
      if (diasConEntrenamiento.includes(dateStr)) { streak++; }
      else if (i === 0) { break; }
      else { break; }
    }
    return streak;
  }, [diasConEntrenamiento]);

  // PRs hoy: logs donde el peso iguala el máximo registrado del ejercicio
  const prsHoy = useMemo(() =>
    logsDelDia.filter(log => {
      const ej = ejerciciosConStats.find(e => e.id === log.ejercicio_id);
      return ej && (ej.peso_maximo ?? 0) > 0 && log.peso_kg >= (ej.peso_maximo ?? 0);
    }).length,
  [logsDelDia, ejerciciosConStats]);

  // Stats del ejercicio seleccionado en el sheet de detalle
  const selectedEjercicioStats = useMemo(
    () => ejerciciosConStats.find(e => e.nombre === selectedExercise),
    [ejerciciosConStats, selectedExercise],
  );

  const { data: historial = [] } = useQuery({
    queryKey: ['historial_ejercicio', selectedEjercicioStats?.id],
    queryFn: () => getHistorialEjercicio(selectedEjercicioStats!.id, 10),
    enabled: !!selectedEjercicioStats,
  });

  const chartData = useMemo(() => {
    if (historial.length === 0) return null;
    const sorted = [...historial].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-8);
    const weights = sorted.map(l => l.peso_kg);
    const maxW = Math.max(...weights);
    const minW = Math.min(...weights);
    const range = maxW - minW || 1;
    const n = sorted.length;
    const points = sorted.map((l, i) => ({
      x: n === 1 ? 100 : 10 + (i / (n - 1)) * 180,
      y: 45 - ((l.peso_kg - minW) / range) * 37,
      fecha: l.fecha.slice(0, 10).slice(5).replace('-', '/'),
    }));
    const last = points[points.length - 1];
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${last.x.toFixed(1)},50 L10,50 Z`;
    return { points, linePath, areaPath, last };
  }, [historial]);
  const isFirst = useFirstVisit('gym')

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
      fecha: localDateStr(),
    });
    setLogSheet(null);
  };

  const openCreateRoutine = () => {
    setEditingRoutineId(null);
    setRoutineName("");
    setRoutineExercises([]);
    setShowRoutineSheet(true);
  };

  const openEditRoutine = (rutinaId: number) => {
    const rutina = rutinasPersonalizadas.find(r => r.id === rutinaId);
    if (!rutina) return;
    setEditingRoutineId(rutinaId);
    setRoutineName(rutina.nombre);
    setRoutineExercises(
      (rutina.ejercicios ?? []).map(e => ({
        id: e.id,
        nombre: e.nombre,
        series: e.series_sugeridas ?? 3,
        reps: e.repes_sugeridas ?? 10,
      }))
    );
    setShowRoutineSheet(true);
  };

  const toggleRoutineExercise = (ejercicio: { id: number; nombre: string; series_sugeridas?: number; repes_sugeridas?: number }) => {
    setRoutineExercises(prev => {
      const exists = prev.find(e => e.id === ejercicio.id);
      if (exists) return prev.filter(e => e.id !== ejercicio.id);
      return [...prev, { id: ejercicio.id, nombre: ejercicio.nombre, series: ejercicio.series_sugeridas ?? 3, reps: ejercicio.repes_sugeridas ?? 10 }];
    });
  };

  const updateRoutineExerciseSets = (id: number, field: "series" | "reps", delta: number) => {
    setRoutineExercises(prev => prev.map(e =>
      e.id === id ? { ...e, [field]: Math.max(1, Math.min(field === "series" ? 20 : 50, e[field] + delta)) } : e
    ));
  };

  const handleSaveRoutine = () => {
    if (!routineName.trim() || routineExercises.length === 0) return;
    const payload = { nombre: routineName.trim(), ejercicios: routineExercises.map(e => ({ id: e.id, series: e.series, reps: e.reps })) };
    if (editingRoutineId !== null) {
      actualizarRutinaPersonalizada.mutate({ id: editingRoutineId, ...payload });
    } else {
      crearRutinaPersonalizada.mutate(payload);
    }
    setShowRoutineSheet(false);
  };

  const handleRoutineDragEnd = (id: number, info: PanInfo) => {
    const isSwipeLeft = info.offset.x < -60 || (info.offset.x < -20 && info.velocity.x < -300);
    if (isSwipeLeft) setSwipedRoutineId(id);
    else setSwipedRoutineId(null);
  };

  return (
    <motion.div variants={stagger} initial={isFirst ? "hidden" : "show"} animate="show" className="px-4 pt-14 pb-4">
      {/* Top Stats */}
      <motion.div variants={fadeUp} className="flex gap-3 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { label: "días racha", value: String(rachaActual), gradient: "gradient-warning" },
          { label: "hoy", value: String(logsDelDia.length), gradient: "gradient-success" },
          { label: "PRs", value: String(prsHoy), gradient: "gradient-primary" },
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
            <ActivityGrid onDayClick={setSelectedCalendarDate} />

            {/* Quick Start */}
            <QuickStartButton
              routineName={rutinasPersonalizadas[0]?.nombre ?? "Entrenamiento libre"}
              exerciseCount={rutinasPersonalizadas[0]?.ejercicios?.length ?? 0}
              onStart={() => { clearWorkoutSession(); setSavedSession(null); setResumeWorkout(false); setShowWorkout(true); }}
            />

            {/* Continuar entrenamiento (si hay sesión guardada válida) */}
            {savedSession && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setResumeWorkout(true); setShowWorkout(true); }}
                  className="w-full glass-card p-4 flex items-center gap-4 relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-2xl bg-warning/15 flex items-center justify-center shrink-0">
                    <RotateCcw size={20} className="text-warning" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-[14px]">Continuar entrenamiento</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {savedSession.rutinaName} · {savedSession.completedExIds.length}/{savedSession.orderedEjercicios.length} ejercicios
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={e => { e.stopPropagation(); clearWorkoutSession(); setSavedSession(null); }}
                    className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center shrink-0"
                  >
                    <X size={14} className="text-muted-foreground" />
                  </motion.button>
                </motion.button>
              </motion.div>
            )}

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
                onClick={openCreateRoutine}
                className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center"
                style={{ boxShadow: 'var(--shadow-glow-blue)' }}
              >
                <Plus size={18} className="text-primary-foreground" />
              </motion.button>
            </div>

            {/* Dismiss swipe overlay */}
            {swipedRoutineId !== null && (
              <div className="fixed inset-0 z-[9]" onClick={() => setSwipedRoutineId(null)} />
            )}

            {rutinasPersonalizadas.map((rutina, ri) => (
              <motion.div
                key={rutina.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ri * 0.1 }}
                className="relative"
              >
                {/* Swipe background */}
                {draggingRoutineId === rutina.id && (
                  <div className="absolute inset-0 rounded-[calc(var(--radius)+4px)] bg-destructive/20 flex items-center justify-end pr-5">
                    <Trash2 size={18} className="text-destructive" />
                  </div>
                )}

                <motion.div
                  drag="x"
                  dragSnapToOrigin
                  dragElastic={0.3}
                  dragMomentum={false}
                  onDragStart={() => setDraggingRoutineId(rutina.id)}
                  onDragEnd={(_, info) => { setDraggingRoutineId(null); handleRoutineDragEnd(rutina.id, info); }}
                  className="glass-card p-5 relative z-10"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="icon-container-lg bg-primary/15">
                      <Dumbbell size={22} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-extrabold text-[16px]">{rutina.nombre}</p>
                      <p className="text-sm text-muted-foreground">{(rutina.ejercicios ?? []).length} ejercicios</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => openEditRoutine(rutina.id)}
                      className="w-9 h-9 rounded-xl bg-secondary/60 flex items-center justify-center"
                    >
                      <Pencil size={15} className="text-muted-foreground" />
                    </motion.button>
                  </div>
                  <div className="space-y-1.5">
                    {(rutina.ejercicios ?? []).map((ex, i) => (
                      <motion.div
                        key={ex.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setLogSheet(ex.nombre); setLogSets(ex.series_sugeridas ?? 3); setLogReps(ex.repes_sugeridas ?? 10); }}
                        className="flex items-center gap-3 py-3 px-4 bg-secondary/40 rounded-xl cursor-pointer"
                      >
                        <span className="w-7 h-7 rounded-lg gradient-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="flex-1 font-semibold text-sm">{ex.nombre}</span>
                        <span className="text-sm text-muted-foreground font-medium">{ex.series_sugeridas ?? 3}×{ex.repes_sugeridas ?? 10}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Delete button after swipe */}
                <AnimatePresence>
                  {swipedRoutineId === rutina.id && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="absolute right-2 top-5 z-20 flex gap-2"
                    >
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => { eliminarRutinaPersonalizada.mutate(rutina.id); setSwipedRoutineId(null); }}
                        className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center"
                        style={{ boxShadow: 'var(--shadow-glow-red)' }}
                      >
                        <Trash2 size={16} className="text-destructive-foreground" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => setSwipedRoutineId(null)}
                        className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
                      >
                        <X size={14} />
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                            key={`${ex}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedExercise(ex)}
                            className="flex items-center gap-3 py-2.5 px-3 bg-secondary/30 rounded-xl cursor-pointer"
                          >
                            <span className="w-6 h-6 rounded-md bg-purple/20 text-purple text-xs font-bold flex items-center justify-center">{i + 1}</span>
                            <span className="flex-1 text-sm font-semibold">{ex}</span>
                            <motion.button
                              whileTap={{ scale: 0.8 }}
                              onClick={e => { e.stopPropagation(); handleDeleteExercise(group, ex); }}
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
                <CircularProgress animated={isFirst} progress={Math.min(100, Math.round(((selectedEjercicioStats?.total_entrenamientos ?? 0) / 20) * 100))} size={72} strokeWidth={5} color="hsl(var(--success))">
                  <TrendingUp size={18} className="text-success" />
                </CircularProgress>
                <div className="text-center">
                  <p className="text-4xl font-black text-warning">{selectedEjercicioStats?.peso_maximo ?? 0}</p>
                  <p className="text-xs text-muted-foreground font-medium">Max (kg)</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-black">{selectedEjercicioStats?.total_entrenamientos ?? 0}</p>
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
                  {chartData ? (
                    <>
                      <path d={chartData.areaPath} fill="url(#areaGrad)" />
                      <path d={chartData.linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx={chartData.last.x} cy={chartData.last.y} r="3" fill="hsl(var(--primary))" />
                    </>
                  ) : (
                    <line x1="10" y1="25" x2="190" y2="25" stroke="hsl(var(--primary))" strokeWidth="2" strokeOpacity="0.3" strokeDasharray="4 4" />
                  )}
                </svg>
                <div className="absolute bottom-3 left-0 right-0 flex justify-around text-[10px] text-muted-foreground">
                  {chartData && chartData.points.length > 0 ? (
                    <>
                      <span>{chartData.points[0].fecha}</span>
                      {chartData.points.length > 2 && <span>{chartData.points[Math.floor(chartData.points.length / 2)].fecha}</span>}
                      <span>{chartData.points[chartData.points.length - 1].fecha}</span>
                    </>
                  ) : <span className="mx-auto">Sin historial</span>}
                </div>
              </div>

              <h3 className="font-bold mb-3">Historial</h3>
              {historial.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">Sin registros aún</p>
              ) : historial.slice(0, 5).map((h) => {
                const isPR = (selectedEjercicioStats?.peso_maximo ?? 0) > 0 && h.peso_kg >= (selectedEjercicioStats?.peso_maximo ?? 0);
                return (
                  <div key={`${h.fecha}-${h.id}`} className="flex items-center gap-3 py-3 border-l-2 border-primary pl-4 mb-2 bg-secondary/20 rounded-r-xl">
                    <div className="flex-1">
                      <p className="font-bold">{h.series}x{h.repes} {h.peso_kg}kg</p>
                      <p className="text-xs text-muted-foreground">{h.fecha.slice(0, 10)}</p>
                    </div>
                    {isPR && <span className="stat-badge bg-warning/15 text-warning">PR</span>}
                  </div>
                );
              })}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { setLogSheet(selectedExercise); setLogSets(selectedEjercicioStats?.series_sugeridas ?? 3); setLogReps(selectedEjercicioStats?.repes_sugeridas ?? 10); setSelectedExercise(null); }}
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
                  { label: "Series", value: logSets, set: setLogSets, items: Array.from({ length: 20  }, (_, i) => i + 1) },
                  { label: "Reps",   value: logReps, set: setLogReps, items: Array.from({ length: 50  }, (_, i) => i + 1) },
                  { label: "Kg",     value: logKg,   set: setLogKg,   items: Array.from({ length: 301 }, (_, i) => i)     },
                ].map((field) => (
                  <div key={field.label} className="text-center">
                    <p className="text-xs text-muted-foreground font-semibold mb-2">{field.label}</p>
                    <div className="glass-card p-4 flex flex-col items-center">
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => field.set(v => Math.min(v + 1, field.items[field.items.length - 1]))} className="text-muted-foreground mb-1">▲</motion.button>
                      <select
                        value={field.value}
                        onChange={e => field.set(Number(e.target.value))}
                        className="text-3xl font-black bg-transparent text-foreground outline-none appearance-none cursor-pointer w-full"
                        style={{ textAlign: "center", textAlignLast: "center" }}
                      >
                        {field.items.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => field.set(v => Math.max(v - 1, field.items[0]))} className="text-muted-foreground mt-1">▼</motion.button>
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

      {/* Routine Sheet (crear / editar) */}
      <AnimatePresence>
        {showRoutineSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end"
            onClick={() => setShowRoutineSheet(false)}
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
              <div className="flex items-center justify-between mb-5 mt-2">
                <h2 className="text-xl font-extrabold">{editingRoutineId ? "Editar Rutina" : "Nueva Rutina"}</h2>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowRoutineSheet(false)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <X size={16} />
                </motion.button>
              </div>

              {/* Nombre */}
              <input
                value={routineName}
                onChange={e => setRoutineName(e.target.value)}
                placeholder="Nombre de la rutina"
                className="w-full bg-secondary/60 rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground mb-5 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px] font-medium"
              />

              {/* Ejercicios seleccionados con steppers + swipe to delete */}
              {routineExercises.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-3">Ejercicios ({routineExercises.length})</p>
                  {swipedSheetExId !== null && (
                    <div className="fixed inset-0 z-[51]" onClick={() => setSwipedSheetExId(null)} />
                  )}
                  <div className="space-y-2">
                    {routineExercises.map((ex, i) => (
                      <div key={ex.id} className="relative">
                        {/* Swipe background */}
                        {draggingSheetExId === ex.id && (
                          <div className="absolute inset-0 rounded-xl bg-destructive/20 flex items-center justify-end pr-4">
                            <Trash2 size={15} className="text-destructive" />
                          </div>
                        )}
                        <motion.div
                          drag="x"
                          dragSnapToOrigin
                          dragElastic={0.3}
                          dragMomentum={false}
                          onDragStart={() => setDraggingSheetExId(ex.id)}
                          onDragEnd={(_, info) => {
                            setDraggingSheetExId(null);
                            const isSwipeLeft = info.offset.x < -60 || (info.offset.x < -20 && info.velocity.x < -300);
                            if (isSwipeLeft) setSwipedSheetExId(ex.id);
                            else setSwipedSheetExId(null);
                          }}
                          className="flex items-center gap-3 bg-secondary/40 rounded-xl px-3 py-3 relative z-10"
                        >
                          <span className="w-7 h-7 rounded-md gradient-primary text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <span className="flex-1 text-sm font-semibold truncate">{ex.nombre}</span>
                          {/* Stepper Series */}
                          <div className="flex items-center gap-1.5">
                            <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateRoutineExerciseSets(ex.id, "series", -1)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground font-bold">−</motion.button>
                            <span className="w-6 text-center font-extrabold">{ex.series}</span>
                            <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateRoutineExerciseSets(ex.id, "series", +1)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground font-bold">+</motion.button>
                          </div>
                          <span className="text-muted-foreground/50 text-xs font-bold">×</span>
                          {/* Stepper Reps */}
                          <div className="flex items-center gap-1.5">
                            <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateRoutineExerciseSets(ex.id, "reps", -1)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground font-bold">−</motion.button>
                            <span className="w-6 text-center font-extrabold">{ex.reps}</span>
                            <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateRoutineExerciseSets(ex.id, "reps", +1)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground font-bold">+</motion.button>
                          </div>
                        </motion.div>
                        {/* Delete button after swipe */}
                        <AnimatePresence>
                          {swipedSheetExId === ex.id && (
                            <motion.button
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              whileTap={{ scale: 0.85 }}
                              onClick={() => { setRoutineExercises(prev => prev.filter(e => e.id !== ex.id)); setSwipedSheetExId(null); }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-destructive flex items-center justify-center"
                              style={{ boxShadow: 'var(--shadow-glow-red)' }}
                            >
                              <Trash2 size={15} className="text-destructive-foreground" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pool de ejercicios */}
              <p className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-3">Agregar ejercicios</p>
              {Object.entries(exercisePool).map(([group, exNames]) => (
                <div key={group} className="mb-4">
                  <p className="text-[11px] font-bold text-muted-foreground/60 tracking-wider uppercase mb-2">{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {exNames.map((exName, i) => {
                      const ejercicio = ejerciciosConStats.find(e => e.nombre === exName);
                      if (!ejercicio) return null;
                      const selected = routineExercises.some(e => e.id === ejercicio.id);
                      return (
                        <motion.button
                          key={`${exName}-${i}`}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => toggleRoutineExercise(ejercicio)}
                          className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            selected ? "gradient-primary text-primary-foreground" : "bg-secondary/60 text-secondary-foreground"
                          }`}
                          style={selected ? { boxShadow: 'var(--shadow-glow-blue)' } : {}}
                        >
                          {selected && <Check size={11} className="inline mr-1" />}{exName}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSaveRoutine}
                disabled={!routineName.trim() || routineExercises.length === 0}
                className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl mt-2 flex items-center justify-center gap-2 text-[15px] disabled:opacity-40"
                style={{ boxShadow: 'var(--shadow-glow-blue)' }}
              >
                <Check size={18} /> {editingRoutineId ? "Guardar Cambios" : "Crear Rutina"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day Exercises Sheet */}
      <AnimatePresence>
        {selectedCalendarDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end"
            onClick={() => setSelectedCalendarDate(null)}
          >
            <div className="absolute inset-0" style={{ background: 'hsla(228, 12%, 6%, 0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bottom-sheet w-full max-w-lg mx-auto p-6 max-h-[70vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="flex items-center justify-between mb-5 mt-2">
                <div>
                  <h2 className="text-xl font-extrabold">Entrenamiento</h2>
                  <p className="text-sm text-muted-foreground">{selectedCalendarDate}</p>
                </div>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setSelectedCalendarDate(null)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <X size={16} />
                </motion.button>
              </div>
              {logsDiaSeleccionado.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin registros para este día</p>
              ) : (
                <div className="space-y-2">
                  {logsDiaSeleccionado.map((log) => (
                    <motion.div
                      key={log.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { if (log.ejercicio_nombre) { setSelectedCalendarDate(null); setSelectedExercise(log.ejercicio_nombre); } }}
                      className="flex items-center gap-4 p-4 bg-secondary/40 rounded-xl cursor-pointer"
                    >
                      <div className="icon-container bg-gym/15">
                        <Dumbbell size={18} className="text-gym" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{log.ejercicio_nombre ?? `Ejercicio #${log.ejercicio_id}`}</p>
                        <p className="text-xs text-muted-foreground">{log.series}×{log.repes} {log.peso_kg}kg</p>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workout Session Sheet */}
      <WorkoutSessionSheet
        isOpen={showWorkout}
        onClose={() => { setShowWorkout(false); setResumeWorkout(false); }}
        resume={resumeWorkout}
        rutinas={rutinasPersonalizadas}
        onLogSerie={(ejercicioId, ejercicioNombre, reps, kg) => {
          crearLog.mutate({
            ejercicio_id: ejercicioId,
            ejercicio_nombre: ejercicioNombre,
            series: 1,
            repes: reps,
            peso_kg: kg,
            fecha: localDateStr(),
          })
        }}
      />

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
