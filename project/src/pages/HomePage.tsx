import { useState, useEffect, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { triggerMoodEvent } from "@/hooks/useCompanionMood";
import { useTareas } from "@/hooks/useTareas";
import { useDeudas } from "@/hooks/useDeudas";
import { useGym } from "@/hooks/useGym";
import { useRutinas } from "@/hooks/useRutinas";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Flame, Target, Zap, Sun, Moon, Sunset, ChevronRight, Plus, Dumbbell, Wallet,
  CheckCircle2, Sparkles, TrendingUp, Bell, User, GripVertical,
  Eye, EyeOff, Calendar, AlertTriangle, FileText, Car, Droplets
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnimatedCounter from "@/components/AnimatedCounter";
import CircularProgress from "@/components/CircularProgress";
import { renderGlobalAvatar } from "@/lib/avatarHelper";

// Smart priority engine
const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "night";
};

const getUserName = () => localStorage.getItem("user-name") || "Pedro";

const jarvisPhrases = {
  morning: [
    () => `Buenos días, ${getUserName()} ☀️`,
    () => "¿Listo para dominar el día?",
    () => "Arriba, jefe — el día no espera",
    () => "Buen día, comandante 🫡",
  ],
  afternoon: [
    () => `Buenas tardes, ${getUserName()}`,
    () => "¿Cómo va la misión de hoy?",
    () => "Media jornada, jefe — vas bien",
    () => `Reportándome, ${getUserName()} 🎯`,
  ],
  night: [
    () => `Buenas noches, ${getUserName()} 🌙`,
    () => "Hora de cerrar el día, jefe",
    () => "Resumen listo, comandante",
    () => `Descansa bien, ${getUserName()}`,
  ],
};

const getGreeting = () => {
  const tod = getTimeOfDay();
  const phrases = jarvisPhrases[tod];
  // Rotate daily so it feels fresh
  const dayIndex = new Date().getDate() % phrases.length;
  const text = phrases[dayIndex]();

  if (tod === "morning") return { text, icon: Sun, gradient: "from-amber-500/20 to-orange-500/10" };
  if (tod === "afternoon") return { text, icon: Sunset, gradient: "from-orange-500/20 to-rose-500/10" };
  return { text, icon: Moon, gradient: "from-indigo-500/20 to-purple-500/10" };
};

type WidgetId = "priority" | "week" | "gym" | "balance" | "progress" | "tasks" | "agenda";

type WidgetSize = "compact" | "normal" | "expanded";

type WidgetConfig = {
  id: WidgetId;
  visible: boolean;
  size: WidgetSize;
};

const defaultWidgets: WidgetConfig[] = [
  { id: "priority", visible: true, size: "normal" },
  { id: "week", visible: true, size: "normal" },
  { id: "gym", visible: true, size: "normal" },
  { id: "balance", visible: true, size: "normal" },
  { id: "progress", visible: true, size: "normal" },
  { id: "tasks", visible: true, size: "normal" },
  { id: "agenda", visible: true, size: "normal" },
];

// Jarvis smart ordering: reorders widgets by time-of-day relevance
const getSmartOrder = (widgets: WidgetConfig[]): WidgetConfig[] => {
  const tod = getTimeOfDay();
  const priorityMap: Record<string, Record<WidgetId, number>> = {
    morning: { priority: 1, gym: 2, agenda: 3, week: 4, tasks: 5, progress: 6, balance: 7 },
    afternoon: { tasks: 1, progress: 2, priority: 3, agenda: 4, balance: 5, gym: 6, week: 7 },
    night: { progress: 1, agenda: 2, tasks: 3, balance: 4, priority: 5, gym: 6, week: 7 },
  };
  const order = priorityMap[tod];
  return [...widgets].sort((a, b) => (order[a.id] || 99) - (order[b.id] || 99));
};

const widgetLabels: Record<WidgetId, string> = {
  priority: "Prioridad del día",
  week: "Semana",
  gym: "Gym & Balance",
  balance: "Balance",
  progress: "Progreso",
  tasks: "Tareas rápidas",
  agenda: "Agenda",
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const HomePage = () => {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem("dashboard-widgets");
    return saved ? JSON.parse(saved) : defaultWidgets;
  });

  const renderAvatar = (size: number) => renderGlobalAvatar(size);

  // Hooks de datos reales
  const { tareasPendientes, porcentajeCompletado, actualizar: actualizarTarea, isLoading: loadingTareas } = useTareas();
  const { totalDebo, totalMeDeben, balance, deudasActivas, isLoading: loadingDeudas } = useDeudas();
  const { logsDelDia, isLoading: loadingGym } = useGym();
  const { rutinasDelDia, isLoading: loadingRutinas } = useRutinas();

  const isLoading = loadingTareas || loadingDeudas || loadingGym || loadingRutinas;

  if (isLoading) {
    return (
      <div className="px-4 pt-12 pb-24 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-36 rounded-2xl col-span-2" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  // quickTasks: primeras 3 tareas urgentes/pendientes para el widget
  const quickTasks = useMemo(() =>
    tareasPendientes.slice(0, 5).map(t => ({
      id: t.id!,
      text: t.titulo,
      done: t.completada,
      urgent: t.prioridad === 2,
    })), [tareasPendientes]);

  useEffect(() => {
    localStorage.setItem("dashboard-widgets", JSON.stringify(widgets));
  }, [widgets]);

  const toggleTask = (id: number) => {
    const task = quickTasks.find(t => t.id === id);
    if (task && !task.done) {
      triggerMoodEvent("celebrating", 4000);
    }
    actualizarTarea.mutate({ id, updates: { completada: !task?.done } });
  };

  const [jarvisMode, setJarvisMode] = useState(() => {
    return localStorage.getItem("jarvis-mode") !== "false";
  });

  const toggleWidgetVisibility = (id: WidgetId) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };

  const cycleWidgetSize = (id: WidgetId) => {
    const sizes: WidgetSize[] = ["compact", "normal", "expanded"];
    setWidgets(prev => prev.map(w => {
      if (w.id !== id) return w;
      const idx = sizes.indexOf(w.size);
      return { ...w, size: sizes[(idx + 1) % sizes.length] };
    }));
  };

  useEffect(() => {
    localStorage.setItem("jarvis-mode", String(jarvisMode));
  }, [jarvisMode]);

  const date = new Date();
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const dayNamesFull = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // Generate week days
  const weekDays = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = -1; i < 6; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push({
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
        isToday: i === 0,
        hasActivity: [0, 2, 4].includes(i),
        hasPriority: i === 0 || i === 1,
      });
    }
    return days;
  }, []);

  // Smart priority items
  const priorityItems = useMemo(() => {
    const tod = getTimeOfDay();
    const items = [];

    // Urgent tasks
    items.push({
      id: "debt",
      type: "debt" as const,
      title: "Pago pendiente",
      subtitle: "Debes $450 a Carlos — vence mañana",
      icon: AlertTriangle,
      gradient: "gradient-destructive",
      glow: "var(--shadow-glow-red)",
      iconBg: "bg-destructive/15",
      iconColor: "text-destructive",
      action: () => navigate("/deudas"),
    });

    if (tod === "morning") {
      items.push({
        id: "gym",
        type: "gym" as const,
        title: "Día de pierna",
        subtitle: "4 días de racha — no la rompas",
        icon: Dumbbell,
        gradient: "gradient-success",
        glow: "var(--shadow-glow-green)",
        iconBg: "bg-gym/15",
        iconColor: "text-gym",
        action: () => navigate("/gym"),
      });
    }

    items.push({
      id: "reminder",
      type: "reminder" as const,
      title: "Recordatorio",
      subtitle: "Renovar licencia — 10 de marzo",
      icon: Bell,
      gradient: "gradient-warning",
      glow: "var(--shadow-glow-warning)",
      iconBg: "bg-warning/15",
      iconColor: "text-warning",
      action: () => navigate("/tareas"),
    });

    if (tod === "night") {
      items.push({
        id: "summary",
        type: "summary" as const,
        title: "Resumen del día",
        subtitle: "Completaste 3 de 4 tareas hoy",
        icon: Target,
        gradient: "gradient-primary",
        glow: "var(--shadow-glow-blue)",
        iconBg: "bg-primary/15",
        iconColor: "text-primary",
        action: () => navigate("/tareas"),
      });
    }

    return items;
  }, [navigate]);

  // Agenda: rutinas del día desde Supabase
  const agenda = useMemo(() =>
    rutinasDelDia.slice(0, 4).map(r => ({
      name: r.actividad,
      time: `${r.hora_inicio} - ${r.hora_fin}`,
      icon: Dumbbell, // fallback icon
      accent: r.color ?? "primary",
      iconBg: `bg-primary/15`,
      iconColor: `text-primary`,
    })), [rutinasDelDia]);

  const visibleWidgets = jarvisMode ? getSmartOrder(widgets.filter(w => w.visible)) : widgets.filter(w => w.visible);

  const sizeLabels: Record<WidgetSize, string> = { compact: "S", normal: "M", expanded: "L" };

  // Get widget size config
  const getWidgetSize = (id: WidgetId): WidgetSize => {
    return widgets.find(w => w.id === id)?.size || "normal";
  };

  // Jarvis status lines
  const jarvisStatusLines = useMemo(() => {
    const tod = getTimeOfDay();
    const lines: Record<string, string[]> = {
      morning: [
        "Sistemas activos • Todo en orden, jefe",
        "Escaneando tu día • 3 eventos detectados",
        "Energía al máximo • Hora de conquistar",
      ],
      afternoon: [
        "Mitad de misión • Vas al 25% de tareas",
        "Alerta: pago pendiente mañana",
        "Rendimiento estable • Sigue así",
      ],
      night: [
        "Cerrando operaciones del día",
        "Resumen: 1/4 objetivos completados",
        "Preparando briefing de mañana",
      ],
    };
    return lines[tod];
  }, []);

  const [statusIndex, setStatusIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIndex(prev => (prev + 1) % jarvisStatusLines.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [jarvisStatusLines]);

  const moveWidget = (id: WidgetId, direction: "up" | "down") => {
    setWidgets(prev => {
      const idx = prev.findIndex(w => w.id === id);
      if (direction === "up" && idx > 0) {
        const next = [...prev];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        return next;
      }
      if (direction === "down" && idx < prev.length - 1) {
        const next = [...prev];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return next;
      }
      return prev;
    });
  };

  const renderWidget = (widgetId: WidgetId) => {
    const size = getWidgetSize(widgetId);

    switch (widgetId) {
      case "priority": {
        const items = size === "compact" ? priorityItems.slice(0, 1) : priorityItems;
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-primary" />
              <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">PRIORIDAD HOY</span>
              {size === "compact" && priorityItems.length > 1 && (
                <span className="text-[10px] text-muted-foreground ml-auto">+{priorityItems.length - 1} más</span>
              )}
            </div>
            {items.map((item, i) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 300 }}
                whileTap={{ scale: 0.97 }}
                onClick={item.action}
                className={`glass-card flex items-center gap-4 w-full text-left relative overflow-hidden group ${
                  size === "compact" ? "p-3" : size === "expanded" ? "p-5" : "p-4"
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-full ${item.gradient}`} />
                <div className={`icon-container ${item.iconBg}`}>
                  <item.icon size={size === "expanded" ? 24 : 20} className={item.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold ${size === "expanded" ? "text-[17px]" : "text-[15px]"}`}>{item.title}</p>
                  <p className={`text-muted-foreground truncate ${size === "compact" ? "text-[10px]" : "text-xs"}`}>{item.subtitle}</p>
                  {size === "expanded" && (
                    <p className="text-[11px] text-primary mt-1 font-medium">Toca para ver detalles →</p>
                  )}
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-active:translate-x-1 transition-transform" />
              </motion.button>
            ))}
          </div>
        );
      }

      case "week":
        return (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} className="text-primary" />
              <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">ESTA SEMANA</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {weekDays.map((day, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl min-w-[52px] transition-all ${
                    size === "compact" ? "py-2 px-2" : size === "expanded" ? "py-4 px-4 min-w-[60px]" : "py-3 px-3"
                  } ${day.isToday ? "gradient-primary" : "bg-secondary/40"}`}
                  style={day.isToday ? { boxShadow: "var(--shadow-glow-blue)" } : {}}
                >
                  <span className={`font-bold ${day.isToday ? "text-primary-foreground" : "text-muted-foreground"} ${
                    size === "compact" ? "text-[9px]" : "text-[10px]"
                  }`}>
                    {day.dayName}
                  </span>
                  <span className={`font-extrabold ${day.isToday ? "text-primary-foreground" : ""} ${
                    size === "compact" ? "text-base" : size === "expanded" ? "text-xl" : "text-lg"
                  }`}>
                    {day.dayNum}
                  </span>
                  {size !== "compact" && (
                    <div className="flex gap-0.5">
                      {day.hasActivity && <div className={`w-1.5 h-1.5 rounded-full ${day.isToday ? "bg-primary-foreground/80" : "bg-gym"}`} />}
                      {day.hasPriority && <div className={`w-1.5 h-1.5 rounded-full ${day.isToday ? "bg-primary-foreground/60" : "bg-destructive"}`} />}
                    </div>
                  )}
                  {size === "expanded" && day.isToday && (
                    <span className="text-[8px] text-primary-foreground/80 font-bold">HOY</span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        );

      case "gym":
        if (size === "compact") {
          return (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/gym")} className="glass-card p-3 flex items-center gap-3 w-full text-left">
              <div className="icon-container bg-gym/15">
                <Dumbbell size={18} className="text-gym" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-bold">GYM HOY</p>
                <p className="text-lg font-extrabold">2 ejercicios</p>
              </div>
              <div className="icon-container bg-destructive/15">
                <Wallet size={18} className="text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold">BALANCE</p>
                <p className="text-lg font-extrabold text-destructive">-$2,055</p>
              </div>
            </motion.button>
          );
        }
        return (
          <div className={`grid grid-cols-2 gap-3`}>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate("/gym")} className="glass-card p-4 relative overflow-hidden text-left">
              <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-10 pointer-events-none"
                style={{ background: 'radial-gradient(circle, hsl(var(--gym)), transparent)' }}
              />
              <div className="flex items-center justify-between mb-3">
                <div className="icon-container bg-gym/15">
                  <Dumbbell size={20} className="text-gym" />
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
              <p className="text-[9px] text-muted-foreground font-bold tracking-widest">GYM HOY</p>
              <p className={`font-extrabold mt-0.5 ${size === "expanded" ? "text-4xl" : "text-3xl"}`}><AnimatedCounter target={2} /></p>
              <p className="text-xs text-muted-foreground mt-0.5">ejercicios</p>
              <div className="mt-3">
                <span className="stat-badge bg-gym/15 text-gym"><TrendingUp size={11} /> 1 PR!</span>
              </div>
              {size === "expanded" && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground">Racha actual</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4].map(d => (
                      <div key={d} className="w-6 h-6 rounded-md bg-gym/20 flex items-center justify-center">
                        <Flame size={12} className="text-gym" />
                      </div>
                    ))}
                    <div className="w-6 h-6 rounded-md bg-secondary/50 flex items-center justify-center">
                      <span className="text-[9px] text-muted-foreground">5</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.button>

            <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate("/deudas")} className="glass-card p-4 relative overflow-hidden text-left">
              <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-10 pointer-events-none"
                style={{ background: 'radial-gradient(circle, hsl(var(--destructive)), transparent)' }}
              />
              <div className="flex items-center justify-between mb-3">
                <div className="icon-container bg-destructive/15">
                  <Wallet size={20} className="text-destructive" />
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
              <p className="text-[9px] text-muted-foreground font-bold tracking-widest">BALANCE</p>
              <p className={`font-extrabold text-destructive mt-0.5 ${size === "expanded" ? "text-4xl" : "text-3xl"}`}>$<AnimatedCounter target={2055} /></p>
              <p className="text-xs text-muted-foreground mt-0.5">en contra</p>
              {size === "expanded" && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground">Próximo vencimiento</p>
                  <p className="text-xs font-bold text-destructive mt-0.5">$450 a Carlos — mañana</p>
                </div>
              )}
            </motion.button>
          </div>
        );

      case "progress": {
        if (size === "compact") {
          return (
            <motion.div whileTap={{ scale: 0.98 }} className="glass-card p-3 flex items-center gap-3">
              <CircularProgress progress={25} size={40} strokeWidth={4} color="hsl(var(--primary))">
                <span className="text-[10px] font-extrabold text-primary">25%</span>
              </CircularProgress>
              <div className="flex-1">
                <p className="font-bold text-sm">Progreso del día</p>
                <div className="h-1 bg-secondary rounded-full mt-1 overflow-hidden">
                  <motion.div className="h-full rounded-full gradient-primary"
                    initial={{ width: 0 }} animate={{ width: "25%" }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">1/4</span>
            </motion.div>
          );
        }
        return (
          <motion.div whileTap={{ scale: 0.98 }} className={`glass-card flex items-center gap-5 ${size === "expanded" ? "p-6" : "p-5"}`}>
            <CircularProgress progress={25} size={size === "expanded" ? 80 : 64} strokeWidth={5} color="hsl(var(--primary))">
              <CheckCircle2 size={size === "expanded" ? 24 : 18} className="text-primary" />
            </CircularProgress>
            <div className="flex-1">
              <p className={`font-bold ${size === "expanded" ? "text-[17px]" : "text-[15px]"}`}>Progreso del día</p>
              <p className="text-sm text-muted-foreground">1 de 4 tareas</p>
              <div className="h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
                <motion.div className="h-full rounded-full gradient-primary"
                  initial={{ width: 0 }} animate={{ width: "25%" }}
                  transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                />
              </div>
              {size === "expanded" && (
                <div className="flex gap-2 mt-3">
                  {["Compras", "Gym", "Docs", "Licencia"].map((t, i) => (
                    <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      i === 0 ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
                    }`}>{i === 0 ? "✓ " : ""}{t}</span>
                  ))}
                </div>
              )}
            </div>
            <span className={`font-extrabold text-primary ${size === "expanded" ? "text-3xl" : "text-2xl"}`}>25%</span>
          </motion.div>
        );
      }

      case "tasks": {
        const visibleTasks = size === "compact" ? quickTasks.filter(t => !t.done).slice(0, 2) : quickTasks;
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-primary" />
                <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">TAREAS RÁPIDAS</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.85, rotate: 90 }}
                className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center"
                style={{ boxShadow: 'var(--shadow-glow-blue)' }}
              >
                <Plus size={14} className="text-primary-foreground" />
              </motion.button>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {visibleTasks.map((task, i) => (
                  <motion.button
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    onClick={() => toggleTask(task.id)}
                    className={`glass-card-hover flex items-center gap-3 w-full text-left ${
                      size === "compact" ? "p-2.5" : size === "expanded" ? "p-4" : "p-3.5"
                    }`}
                  >
                    <motion.div
                      animate={{ scale: task.done ? [1, 1.3, 1] : 1 }}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                        task.done ? "gradient-primary border-transparent" : "border-muted-foreground/30"
                      }`}
                    >
                      {task.done && <CheckCircle2 size={12} className="text-primary-foreground" />}
                    </motion.div>
                    <span className={`font-medium flex-1 transition-all duration-300 ${
                      size === "compact" ? "text-[13px]" : "text-[14px]"
                    } ${task.done ? "line-through text-muted-foreground" : ""}`}>
                      {task.text}
                    </span>
                    {task.urgent && !task.done && (
                      <span className="stat-badge bg-destructive/15 text-destructive text-[10px]">Urgente</span>
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
            {size === "compact" && quickTasks.filter(t => !t.done).length > 2 && (
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                +{quickTasks.filter(t => !t.done).length - 2} tareas más
              </p>
            )}
            {size === "expanded" && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/tareas")}
                className="w-full text-center text-primary text-sm font-bold mt-3 py-2"
              >
                Ver todas las tareas →
              </motion.button>
            )}
          </div>
        );
      }

      case "agenda": {
        const visibleAgenda = size === "compact" ? agenda.slice(0, 1) : agenda;
        if (agenda.length === 0) {
          return (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title">Agenda de hoy</h2>
                <span className="text-sm text-muted-foreground font-medium">0 bloques</span>
              </div>
              <div className="glass-card p-4 text-center text-muted-foreground text-sm">
                No hay rutinas para hoy
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/agenda")}
                className={`w-full text-center text-primary font-bold py-2.5 ${
                  size === "compact" ? "text-xs mt-2" : "text-sm mt-4"
                }`}
              >
                Ver agenda completa →
              </motion.button>
            </div>
          );
        }
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Agenda de hoy</h2>
              <span className="text-sm text-muted-foreground font-medium">{agenda.length} bloques</span>
            </div>
            {/* Next up - highlight */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              className={`glass-card flex items-center gap-4 relative overflow-hidden ${
                size === "compact" ? "p-3" : size === "expanded" ? "p-5" : "p-4"
              } ${visibleAgenda.length > 1 ? "mb-3" : ""}`}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full gradient-success" />
              <div className={`${size === "expanded" ? "icon-container-lg" : "icon-container"} bg-success/15`}>
                <Sun size={size === "expanded" ? 24 : 20} className="text-success" />
              </div>
              <div className="flex-1">
                <p className={`font-bold ${size === "expanded" ? "text-[17px]" : "text-[15px]"}`}>{agenda[0].name}</p>
                <p className={`text-success font-medium ${size === "compact" ? "text-xs" : "text-sm"}`}>{agenda[0].time}</p>
                {size === "expanded" && (
                  <p className="text-[11px] text-muted-foreground mt-1">Siguiente en tu agenda</p>
                )}
              </div>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="stat-badge bg-success/15 text-success"
              >
                Pronto
              </motion.span>
            </motion.div>
            {visibleAgenda.length > 1 && (
              <div className="space-y-2">
                {visibleAgenda.slice(1).map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className={`glass-card-hover flex items-center gap-3 relative overflow-hidden ${
                      size === "expanded" ? "p-5" : "p-4"
                    }`}
                  >
                    <div className={`w-1 h-10 rounded-full bg-${item.accent}`} />
                    <div className={`icon-container ${item.iconBg}`}>
                      <item.icon size={20} className={item.iconColor} />
                    </div>
                    <div>
                      <p className="font-bold text-[15px]">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {size === "compact" && agenda.length > 1 && (
              <p className="text-[11px] text-muted-foreground text-center mt-2">+{agenda.length - 1} bloques más</p>
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/agenda")}
              className={`w-full text-center text-primary font-bold py-2.5 ${
                size === "compact" ? "text-xs mt-2" : "text-sm mt-4"
              }`}
            >
              Ver agenda completa →
            </motion.button>
          </div>
        );
      }

      default:
        return null;
    }
  };

  

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="px-4 pt-14 pb-4 space-y-6">
      {/* Hero Header */}
      <motion.div variants={fadeUp} className="glass-card p-6 noise-overlay overflow-hidden relative">
        {/* Ambient gradient */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent)' }}
        />

        <div className="flex items-start justify-between mb-4 relative z-10">
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              {dayNamesFull[date.getDay()]}, {date.getDate()} de {monthNames[date.getMonth()]}
            </p>
            <h1 className="text-3xl font-extrabold mt-1 tracking-tight">{greeting.text}</h1>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => setEditing(!editing)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                editing ? "gradient-primary" : "bg-secondary/60"
              }`}
              style={editing ? { boxShadow: "var(--shadow-glow-blue)" } : {}}
            >
              <GripVertical size={20} className={editing ? "text-primary-foreground" : "text-muted-foreground"} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9, rotate: 15 }}
              onClick={() => navigate("/perfil")}
              className="w-12 h-12 rounded-2xl overflow-hidden"
              style={{
                boxShadow: "0 0 20px hsla(211, 100%, 50%, 0.3)",
                background: "radial-gradient(circle, hsla(225, 10%, 15%, 0.9), hsla(225, 10%, 8%, 0.95))",
              }}
            >
              {renderAvatar(48)}
            </motion.button>
          </div>
        </div>

        {/* Jarvis Status Line */}
        <div className="flex items-center gap-2 mb-5 relative z-10">
          <Sparkles size={12} className="text-primary shrink-0" />
          <AnimatePresence mode="wait">
            <motion.p
              key={statusIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-[12px] text-muted-foreground font-medium flex-1"
            >
              {jarvisStatusLines[statusIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-3 gap-3 relative z-10">
          {[
            { icon: Flame, value: 4, label: "RACHA", gradient: "gradient-warning", glow: "var(--shadow-glow-warning)" },
            { icon: Target, value: 3, label: "PENDIENTES", gradient: "gradient-success", glow: "var(--shadow-glow-green)" },
            { icon: Zap, value: 6, label: "BLOQUES", gradient: "gradient-primary", glow: "var(--shadow-glow-blue)" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.4, type: "spring" }}
              className="bg-secondary/50 rounded-2xl p-3 flex flex-col items-center gap-2"
            >
              <div className={`w-11 h-11 rounded-xl ${stat.gradient} flex items-center justify-center`}
                style={{ boxShadow: stat.glow }}
              >
                <stat.icon size={20} className="text-foreground" />
              </div>
              <span className="text-2xl font-extrabold">
                <AnimatedCounter target={stat.value} duration={0.8 + i * 0.2} />
              </span>
              <span className="text-[9px] text-muted-foreground font-bold tracking-widest">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Edit Mode Widget List */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 overflow-hidden"
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setJarvisMode(!jarvisMode)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl mb-4 transition-colors ${jarvisMode ? "bg-primary/15" : "bg-secondary/50"}`}
            >
              <Sparkles size={16} className={jarvisMode ? "text-primary" : "text-muted-foreground"} />
              <div className="flex-1 text-left">
                <p className={`text-sm font-bold ${jarvisMode ? "text-primary" : ""}`}>Modo Jarvis</p>
                <p className="text-[11px] text-muted-foreground">La IA ordena tus widgets según la hora y actividad</p>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors relative ${jarvisMode ? "bg-primary" : "bg-secondary"}`}>
                <motion.div
                  className="w-4 h-4 rounded-full bg-foreground absolute top-1"
                  animate={{ left: jarvisMode ? 22 : 4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </div>
            </motion.button>

            <p className="text-xs font-bold text-muted-foreground mb-3 tracking-wider uppercase">Widgets — arrastra para reordenar</p>
            <Reorder.Group
              axis="y"
              values={widgets}
              onReorder={(newOrder) => {
                setWidgets(newOrder);
                // Auto-disable Jarvis mode when manually reordering
                if (jarvisMode) {
                  setJarvisMode(false);
                  localStorage.setItem("jarvis-mode", "false");
                }
              }}
              className="space-y-1"
              layoutScroll
            >
              {widgets.map((w) => (
                <Reorder.Item
                  key={w.id}
                  value={w}
                  id={w.id}
                  className="flex items-center gap-2 w-full py-2.5 px-2 rounded-xl bg-background/50 cursor-grab active:cursor-grabbing transition-colors touch-none"
                  style={{ position: "relative" }}
                  whileDrag={{
                    scale: 1.04,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                    backgroundColor: "hsla(225, 10%, 12%, 0.95)",
                    zIndex: 50,
                  }}
                >
                  <div className="w-6 h-8 flex items-center justify-center shrink-0 text-muted-foreground/50">
                    <GripVertical size={16} />
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleWidgetVisibility(w.id)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${w.visible ? "bg-primary/15" : "bg-secondary"}`}
                  >
                    {w.visible ? <Eye size={14} className="text-primary" /> : <EyeOff size={14} className="text-muted-foreground" />}
                  </motion.button>
                  <span className={`text-sm font-semibold flex-1 select-none ${w.visible ? "" : "text-muted-foreground"}`}>
                    {widgetLabels[w.id]}
                  </span>
                  {w.visible && (
                    <div className="flex items-center gap-1">
                      {(["compact", "normal", "expanded"] as WidgetSize[]).map((s) => (
                        <motion.button
                          key={s}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => setWidgets(prev => prev.map(ww => ww.id === w.id ? { ...ww, size: s } : ww))}
                          className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-extrabold transition-colors ${
                            w.size === s ? "bg-primary/20 text-primary" : "bg-secondary/60 text-muted-foreground"
                          }`}
                        >
                          {sizeLabels[s]}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widgets */}
      {visibleWidgets.map((w) => (
        <motion.div
          key={w.id}
          variants={fadeUp}
          layout
        >
          {renderWidget(w.id)}
        </motion.div>
      ))}
    </motion.div>
  );
};

export default HomePage;
