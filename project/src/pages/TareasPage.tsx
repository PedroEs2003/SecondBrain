import { useState, useMemo } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useTareas } from "@/hooks/useTareas";
import {
  Plus, CheckCircle2, Circle, Target, Calendar, X,
  Bell, Clock, Repeat, Trash2, Flag, Tag, ChevronDown,
  ChevronUp, Sparkles, AlertTriangle, Minus, Home, Briefcase,
  ShoppingCart, Heart, BookOpen, Pin, AlertCircle, Search,
  ArrowUpDown
} from "lucide-react";
import CircularProgress from "@/components/CircularProgress";
import { triggerMoodEvent } from "@/hooks/useCompanionMood";
import AnimatedCounter from "@/components/AnimatedCounter";

// ── Types ──
type Priority = "alta" | "media" | "baja";
type Category = "personal" | "trabajo" | "compras" | "salud" | "estudio" | "otro";

type Subtask = {
  id: number;
  text: string;
  done: boolean;
};

type Task = {
  id: number;
  text: string;
  createdAt: string;
  dueDate?: string;
  done: boolean;
  priority: Priority;
  category: Category;
  subtasks: Subtask[];
};

type Reminder = {
  id: number;
  text: string;
  date: string;
  repeat: "none" | "monthly" | "yearly" | "weekly";
  active: boolean;
};

// ── Config ──
const priorityConfig: Record<Priority, { label: string; color: string; bg: string; icon: typeof Flag }> = {
  alta: { label: "Alta", color: "text-destructive", bg: "bg-destructive/15", icon: AlertTriangle },
  media: { label: "Media", color: "text-warning", bg: "bg-warning/15", icon: Flag },
  baja: { label: "Baja", color: "text-primary", bg: "bg-primary/15", icon: Minus },
};

const categoryConfig: Record<Category, { label: string; icon: typeof Home; color: string }> = {
  personal: { label: "Personal", icon: Home, color: "text-primary" },
  trabajo: { label: "Trabajo", icon: Briefcase, color: "text-warning" },
  compras: { label: "Compras", icon: ShoppingCart, color: "text-success" },
  salud: { label: "Salud", icon: Heart, color: "text-destructive" },
  estudio: { label: "Estudio", icon: BookOpen, color: "text-accent" },
  otro: { label: "Otro", icon: Pin, color: "text-muted-foreground" },
};

const repeatLabels = { none: "Una vez", weekly: "Semanal", monthly: "Mensual", yearly: "Anual" };

// ── Animations ──
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const formatDate = (d: string) => {
  try {
    const date = new Date(d);
    return date.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" });
  } catch {
    return d;
  }
};

const isOverdue = (dueDate?: string) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
};

// Mapeo de prioridades UI ↔ DB
const priorityToNum: Record<Priority, 0 | 1 | 2> = { baja: 0, media: 1, alta: 2 };
const numToPriority: Record<number, Priority> = { 0: "baja", 1: "media", 2: "alta" };

// ── Component ──
const TareasPage = () => {
  const { tareas, isLoading, crear, actualizar, eliminar } = useTareas();

  // Adaptar Tarea (DB) → Task (UI)
  const tasks: Task[] = useMemo(() => tareas.map(t => ({
    id: t.id!,
    text: t.titulo,
    createdAt: t.created_at?.split("T")[0] ?? new Date().toISOString().split("T")[0],
    dueDate: t.fecha_limite ?? undefined,
    done: t.completada,
    priority: numToPriority[t.prioridad] ?? "media",
    category: (t.category as Category) ?? "personal",
    subtasks: (t.subtasks ?? []).map(s => ({
      id: typeof s.id === "string" ? parseInt(s.id, 36) || Date.now() : s.id as unknown as number,
      text: s.texto,
      done: s.completada,
    })),
  })), [tareas]);

  const [activeTab, setActiveTab] = useState<"tareas" | "recordatorios">("tareas");
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: 1, text: "Pagar renta", date: "Día 1 de cada mes", repeat: "monthly", active: true },
    { id: 2, text: "Renovar licencia", date: "10 de marzo 2026", repeat: "none", active: true },
    { id: 3, text: "Pago tarjeta", date: "Día 15 de cada mes", repeat: "monthly", active: true },
    { id: 4, text: "Aniversario", date: "22 de julio", repeat: "yearly", active: true },
  ]);

  // UI state
  const [showAdd, setShowAdd] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "priority" | "date">("default");
  const [showSearch, setShowSearch] = useState(false);
  const [swipedId, setSwipedId] = useState<number | null>(null);

  // New task form
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("media");
  const [newCategory, setNewCategory] = useState<Category>("personal");
  const [newDueDate, setNewDueDate] = useState("");
  const [newSubtasks, setNewSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");

  // New reminder form
  const [newReminder, setNewReminder] = useState("");
  const [newReminderDate, setNewReminderDate] = useState("");
  const [newReminderRepeat, setNewReminderRepeat] = useState<"none" | "monthly" | "yearly" | "weekly">("none");

  // ── Computed ──
  const pending = useMemo(() => {
    let filtered = tasks.filter(t => !t.done);
    if (filterCategory !== "all") filtered = filtered.filter(t => t.category === filterCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.text.toLowerCase().includes(q) || t.subtasks.some(s => s.text.toLowerCase().includes(q)));
    }
    if (sortBy === "priority") {
      const order: Record<Priority, number> = { alta: 0, media: 1, baja: 2 };
      filtered = [...filtered].sort((a, b) => order[a.priority] - order[b.priority]);
    } else if (sortBy === "date") {
      filtered = [...filtered].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }
    return filtered;
  }, [tasks, filterCategory, searchQuery, sortBy]);

  const completed = useMemo(() => {
    if (!searchQuery.trim()) return tasks.filter(t => t.done);
    const q = searchQuery.toLowerCase();
    return tasks.filter(t => t.done && t.text.toLowerCase().includes(q));
  }, [tasks, searchQuery]);
  const progress = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;
  const overdueCount = useMemo(() => pending.filter(t => isOverdue(t.dueDate)).length, [pending]);

  if (isLoading) {
    return (
      <div className="px-4 pt-12 pb-24 space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-3">
          <Skeleton className="h-20 flex-1 rounded-2xl" />
          <Skeleton className="h-20 flex-1 rounded-2xl" />
          <Skeleton className="h-20 flex-1 rounded-2xl" />
        </div>
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  // ── Actions ──
  const toggleTask = (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (task && !task.done) triggerMoodEvent("celebrating", 4000);
    actualizar.mutate({ id, updates: { completada: !task?.done } });
  };

  const deleteTask = (id: number) => {
    eliminar.mutate(id);
    setSwipedId(null);
  };

  const toggleSubtask = (taskId: number, subtaskId: number) => {
    const tarea = tareas.find(t => t.id === taskId);
    if (!tarea) return;
    const updatedSubtasks = (tarea.subtasks ?? []).map(s =>
      (typeof s.id === "string" ? parseInt(s.id, 36) || 0 : s.id as unknown as number) === subtaskId
        ? { ...s, completada: !s.completada }
        : s
    );
    actualizar.mutate({ id: taskId, updates: { subtasks: updatedSubtasks } });
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    const subtasks = newSubtasks.filter(s => s.trim()).map((s, i) => ({
      id: String(Date.now() + i),
      texto: s.trim(),
      completada: false,
    }));
    crear.mutate({
      titulo: newTask.trim(),
      fecha_limite: newDueDate || undefined,
      completada: false,
      prioridad: priorityToNum[newPriority],
      category: newCategory,
      subtasks,
    });
    resetForm();
  };

  const resetForm = () => {
    setNewTask(""); setNewPriority("media"); setNewCategory("personal");
    setNewDueDate(""); setNewSubtasks([]); setSubtaskInput(""); setShowAdd(false);
  };

  const addSubtaskInput = () => {
    if (!subtaskInput.trim()) return;
    setNewSubtasks(prev => [...prev, subtaskInput.trim()]);
    setSubtaskInput("");
  };

  const addReminder = () => {
    if (!newReminder.trim()) return;
    setReminders(prev => [...prev, {
      id: Date.now(), text: newReminder, date: newReminderDate || "Sin fecha",
      repeat: newReminderRepeat, active: true,
    }]);
    setNewReminder(""); setNewReminderDate(""); setNewReminderRepeat("none"); setShowAddReminder(false);
  };

  const deleteReminder = (id: number) => setReminders(prev => prev.filter(r => r.id !== id));
  const toggleReminder = (id: number) => setReminders(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));

  // ── Swipe ──
  const handleDragEnd = (id: number, _: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -100) setSwipedId(id);
    else if (info.offset.x > 100) { toggleTask(id); setSwipedId(null); }
    else setSwipedId(null);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="px-4 pt-12 pb-24">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="icon-container-lg gradient-primary" style={{ boxShadow: 'var(--shadow-glow-blue)' }}>
            <Target size={22} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Tareas</h1>
            <p className="text-sm text-muted-foreground">
              {pending.length} pendientes
              {overdueCount > 0 && <span className="text-destructive font-semibold"> · {overdueCount} vencidas</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSortBy(s => s === "default" ? "priority" : s === "priority" ? "date" : "default")}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
              sortBy !== "default" ? "gradient-primary" : "bg-secondary/80"
            }`}
            title={sortBy === "default" ? "Ordenar" : sortBy === "priority" ? "Por prioridad" : "Por fecha"}
          >
            <ArrowUpDown size={18} className={sortBy !== "default" ? "text-primary-foreground" : "text-foreground"} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setShowSearch(s => !s)}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${showSearch ? 'gradient-primary' : 'bg-secondary/80'}`}
          >
            <Search size={18} className={showSearch ? 'text-primary-foreground' : 'text-foreground'} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85, rotate: 90 }}
            onClick={() => activeTab === "tareas" ? setShowAdd(true) : setShowAddReminder(true)}
            className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center"
            style={{ boxShadow: 'var(--shadow-glow-blue)' }}
          >
            <Plus size={18} className="text-primary-foreground" />
          </motion.button>
        </div>
      </motion.div>

      {/* Tab Switcher */}
      <motion.div variants={fadeUp} className="tab-switcher mb-4">
        {[
          { id: "tareas" as const, label: "Tareas", icon: Target },
          { id: "recordatorios" as const, label: "Recordatorios", icon: Bell },
        ].map(tab => (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm transition-all ${
              activeTab === tab.id ? "tab-active" : "tab-inactive"
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === "tareas" ? (
          <motion.div
            key="tareas"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Stats Card */}
            <motion.div variants={fadeUp} className="glass-card p-5 mb-4 flex items-center gap-5 noise-overlay">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Target size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">Pendientes</p>
                    <p className="text-xl font-extrabold"><AnimatedCounter target={pending.length} duration={0.6} /></p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-success/15 flex items-center justify-center">
                    <CheckCircle2 size={16} className="text-success" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">Completadas</p>
                    <p className="text-xl font-extrabold"><AnimatedCounter target={completed.length} duration={0.6} /></p>
                  </div>
                </div>
              </div>
              <CircularProgress progress={progress} size={96} strokeWidth={6} color="hsl(var(--primary))">
                <div className="text-center">
                  <span className="text-xl font-black">{progress}%</span>
                  <p className="text-[8px] text-muted-foreground font-semibold">completado</p>
                </div>
              </CircularProgress>
            </motion.div>

            {/* Category Filters */}
            <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilterCategory("all")}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterCategory === "all"
                    ? "gradient-primary text-primary-foreground"
                    : "bg-secondary/60 text-muted-foreground"
                }`}
              >
                Todas
              </motion.button>
              {(Object.keys(categoryConfig) as Category[]).map(cat => {
                const CategoryIcon = categoryConfig[cat].icon;
                return (
                  <motion.button
                    key={cat}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFilterCategory(cat)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      filterCategory === cat
                        ? "gradient-primary text-primary-foreground"
                        : "bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <CategoryIcon size={12} /> {categoryConfig[cat].label}
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Search */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mb-3">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar tarea..."
                        className="w-full bg-secondary/60 rounded-xl pl-9 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary transition-all"
                        autoFocus
                      />
                      {searchQuery && (
                        <motion.button
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          whileTap={{ scale: 0.8 }}
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center"
                        >
                          <X size={10} />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pending Tasks */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
              <h2 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                PENDIENTES ({pending.length})
              </h2>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {pending.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8 text-center">
                    <Sparkles size={28} className="text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">
                      {filterCategory === "all" ? "¡Todo listo! No hay tareas pendientes" : "Sin tareas en esta categoría"}
                    </p>
                  </motion.div>
                )}
                {pending.map((task, i) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100, scale: 0.9 }}
                    transition={{ delay: 0.06 * i }}
                    className="relative"
                  >
                    {/* Swipe backgrounds */}
                    <div className="absolute inset-0 rounded-2xl flex items-center">
                      <div className="flex-1 flex items-center justify-start pl-5 bg-success/20 rounded-2xl h-full">
                        <CheckCircle2 size={20} className="text-success" />
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-2xl flex items-center">
                      <div className="flex-1 flex items-center justify-end pr-5 bg-destructive/20 rounded-2xl h-full">
                        <Trash2 size={20} className="text-destructive" />
                      </div>
                    </div>

                    <motion.div
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.3}
                      onDragEnd={(_, info) => handleDragEnd(task.id, _, info)}
                      className="glass-card relative z-10 cursor-grab active:cursor-grabbing"
                    >
                      <div className="p-4 flex items-start gap-3">
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => toggleTask(task.id)}
                          className="mt-0.5 shrink-0"
                        >
                          <Circle size={22} className="text-muted-foreground/30" strokeWidth={1.5} />
                        </motion.button>

                        <div className="flex-1 min-w-0" onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-[15px] truncate">{task.text}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Priority badge */}
                            <span className={`stat-badge ${priorityConfig[task.priority].bg} ${priorityConfig[task.priority].color} text-[9px] py-0.5 px-1.5`}>
                              <Flag size={8} /> {priorityConfig[task.priority].label}
                            </span>
                            {/* Category */}
                            {(() => {
                              const CategoryIcon = categoryConfig[task.category].icon;
                              return (
                                <span className={`text-[10px] flex items-center gap-0.5 ${categoryConfig[task.category].color}`}>
                                  <CategoryIcon size={10} /> {categoryConfig[task.category].label}
                                </span>
                              );
                            })()}
                            {/* Due date */}
                            {task.dueDate && (
                              <span className={`text-[10px] flex items-center gap-0.5 ${
                                isOverdue(task.dueDate) ? "text-destructive font-bold" : "text-muted-foreground"
                              }`}>
                                <Calendar size={9} /> {formatDate(task.dueDate)}
                                {isOverdue(task.dueDate) && <AlertCircle size={10} className="ml-0.5" />}
                              </span>
                            )}
                            {/* Subtask count */}
                            {task.subtasks.length > 0 && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <CheckCircle2 size={9} /> {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}
                              </span>
                            )}
                          </div>

                          {/* Subtask progress bar */}
                          {task.subtasks.length > 0 && (
                            <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
                              <motion.div
                                className="h-full rounded-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${(task.subtasks.filter(s => s.done).length / task.subtasks.length) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Expand arrow */}
                        {task.subtasks.length > 0 && (
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                            className="mt-1 shrink-0"
                          >
                            {expandedTask === task.id ? (
                              <ChevronUp size={16} className="text-muted-foreground" />
                            ) : (
                              <ChevronDown size={16} className="text-muted-foreground" />
                            )}
                          </motion.button>
                        )}

                        {/* Delete on swipe reveal */}
                        {swipedId === task.id && (
                          <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileTap={{ scale: 0.8 }}
                            onClick={() => deleteTask(task.id)}
                            className="w-9 h-9 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0"
                          >
                            <Trash2 size={16} className="text-destructive" />
                          </motion.button>
                        )}
                      </div>

                      {/* Expanded subtasks */}
                      <AnimatePresence>
                        {expandedTask === task.id && task.subtasks.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pl-12 space-y-1.5">
                              {task.subtasks.map(sub => (
                                <motion.button
                                  key={sub.id}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => toggleSubtask(task.id, sub.id)}
                                  className="flex items-center gap-2 w-full text-left py-1"
                                >
                                  {sub.done ? (
                                    <CheckCircle2 size={14} className="text-primary shrink-0" />
                                  ) : (
                                    <Circle size={14} className="text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
                                  )}
                                  <span className={`text-sm ${sub.done ? "line-through text-muted-foreground" : ""}`}>
                                    {sub.text}
                                  </span>
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Completed */}
            {completed.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <h2 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                    COMPLETADAS ({completed.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {completed.map(task => (
                    <motion.div
                      key={task.id}
                      layout
                      className="relative"
                    >
                      <div className="absolute inset-0 rounded-2xl flex items-center">
                        <div className="flex-1 flex items-center justify-end pr-5 bg-destructive/20 rounded-2xl h-full">
                          <Trash2 size={20} className="text-destructive" />
                        </div>
                      </div>
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.3}
                        onDragEnd={(_, info) => {
                          if (info.offset.x < -100) deleteTask(task.id);
                          else if (info.offset.x > 100) toggleTask(task.id);
                        }}
                        className="glass-card p-4 flex items-center gap-3 opacity-40 relative z-10"
                      >
                        <motion.button whileTap={{ scale: 0.8 }} onClick={() => toggleTask(task.id)} className="shrink-0">
                          <CheckCircle2 size={22} className="text-primary" />
                        </motion.button>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[15px] line-through truncate">{task.text}</p>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const CategoryIcon = categoryConfig[task.category].icon;
                              return (
                                <span className={`text-[10px] flex items-center gap-0.5 ${categoryConfig[task.category].color}`}>
                                  <CategoryIcon size={10} /> {categoryConfig[task.category].label}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="recordatorios"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Reminders summary */}
            <motion.div variants={fadeUp} className="glass-card p-4 mb-4 flex items-center gap-4 noise-overlay">
              <div className="w-12 h-12 rounded-2xl bg-warning/15 flex items-center justify-center">
                <Bell size={22} className="text-warning" />
              </div>
              <div>
                <p className="text-lg font-extrabold">
                  <AnimatedCounter target={reminders.filter(r => r.active).length} duration={0.6} /> activos
                </p>
                <p className="text-xs text-muted-foreground">
                  {reminders.filter(r => r.repeat !== "none").length} recurrentes · {reminders.filter(r => r.repeat === "none").length} únicos
                </p>
              </div>
            </motion.div>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-warning animate-pulse-glow" />
              <h2 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                RECORDATORIOS ({reminders.length})
              </h2>
            </div>

            <div className="space-y-2">
              {reminders.map((reminder, i) => (
                <motion.div
                  key={reminder.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i }}
                  className="relative"
                >
                  <div className="absolute inset-0 rounded-2xl flex items-center">
                    <div className="flex-1 flex items-center justify-end pr-5 bg-destructive/20 rounded-2xl h-full">
                      <Trash2 size={20} className="text-destructive" />
                    </div>
                  </div>
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.3}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -100) deleteReminder(reminder.id);
                    }}
                    className={`glass-card p-4 flex items-center gap-3 relative z-10 overflow-hidden transition-opacity ${
                      !reminder.active ? "opacity-40" : ""
                    }`}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full gradient-warning" />
                    <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
                      <Bell size={18} className="text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[15px]">{reminder.text}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={10} /> {reminder.date}
                        </p>
                        {reminder.repeat !== "none" && (
                          <span className="stat-badge bg-warning/10 text-warning text-[9px] py-0.5 px-1.5">
                            <Repeat size={8} /> {repeatLabels[reminder.repeat]}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={() => toggleReminder(reminder.id)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          reminder.active ? "bg-success/15" : "bg-secondary"
                        }`}
                      >
                        {reminder.active ? (
                          <CheckCircle2 size={14} className="text-success" />
                        ) : (
                          <Circle size={14} className="text-muted-foreground" />
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Task Sheet ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end" onClick={() => setShowAdd(false)}>
            <div className="absolute inset-0" style={{ background: 'hsla(228, 12%, 6%, 0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bottom-sheet w-full max-w-lg mx-auto p-6 max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="flex items-center justify-between mb-5 mt-2">
                <h2 className="text-xl font-extrabold">Nueva Tarea</h2>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowAdd(false)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <X size={16} />
                </motion.button>
              </div>

              {/* Task name */}
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                placeholder="¿Qué necesitas hacer?"
                className="w-full bg-secondary/60 rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground mb-4 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px]"
                autoFocus
              />

              {/* Priority */}
              <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase mb-2">
                <Flag size={10} className="inline mr-1" /> Prioridad
              </p>
              <div className="flex gap-2 mb-4">
                {(Object.keys(priorityConfig) as Priority[]).map(p => (
                  <motion.button
                    key={p}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setNewPriority(p)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      newPriority === p
                        ? `${priorityConfig[p].bg} ${priorityConfig[p].color} ring-1 ring-current`
                        : "bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <Flag size={10} /> {priorityConfig[p].label}
                  </motion.button>
                ))}
              </div>

              {/* Category */}
              <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase mb-2">
                <Tag size={10} className="inline mr-1" /> Categoría
              </p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                  {(Object.keys(categoryConfig) as Category[]).map(cat => {
                    const CategoryIcon = categoryConfig[cat].icon;
                    return (
                      <motion.button
                        key={cat}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setNewCategory(cat)}
                        className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          newCategory === cat
                            ? "gradient-primary text-primary-foreground"
                            : "bg-secondary/60 text-muted-foreground"
                        }`}
                      >
                        <CategoryIcon size={12} /> {categoryConfig[cat].label}
                      </motion.button>
                    );
                  })}
              </div>

              {/* Due date */}
              <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase mb-2">
                <Calendar size={10} className="inline mr-1" /> Fecha límite
              </p>
              <input
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                className="w-full bg-secondary/60 rounded-2xl px-4 py-3 text-foreground mb-4 outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
              />

              {/* Subtasks */}
              <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase mb-2">
                <CheckCircle2 size={10} className="inline mr-1" /> Subtareas
              </p>
              {newSubtasks.map((s, i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <Circle size={12} className="text-muted-foreground/40 shrink-0" />
                  <span className="text-sm flex-1">{s}</span>
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => setNewSubtasks(prev => prev.filter((_, j) => j !== i))}
                  >
                    <X size={12} className="text-muted-foreground" />
                  </motion.button>
                </div>
              ))}
              <div className="flex gap-2 mb-5">
                <input
                  value={subtaskInput}
                  onChange={e => setSubtaskInput(e.target.value)}
                  placeholder="Agregar subtarea..."
                  className="flex-1 bg-secondary/60 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary transition-all"
                  onKeyDown={e => e.key === "Enter" && addSubtaskInput()}
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={addSubtaskInput}
                  className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"
                >
                  <Plus size={16} className="text-muted-foreground" />
                </motion.button>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={addTask}
                className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
                style={{ boxShadow: 'var(--shadow-glow-blue)' }}
              >
                <Plus size={18} /> Agregar Tarea
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Reminder Sheet ── */}
      <AnimatePresence>
        {showAddReminder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end" onClick={() => setShowAddReminder(false)}>
            <div className="absolute inset-0" style={{ background: 'hsla(228, 12%, 6%, 0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bottom-sheet w-full max-w-lg mx-auto p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="flex items-center justify-between mb-5 mt-2">
                <h2 className="text-xl font-extrabold">Nuevo Recordatorio</h2>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowAddReminder(false)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <X size={16} />
                </motion.button>
              </div>
              <input
                value={newReminder}
                onChange={e => setNewReminder(e.target.value)}
                placeholder="¿Qué te recuerdo?"
                className="w-full bg-secondary/60 rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground mb-3 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px]"
                autoFocus
              />
              <input
                value={newReminderDate}
                onChange={e => setNewReminderDate(e.target.value)}
                placeholder="Fecha (ej: Día 15 de cada mes)"
                className="w-full bg-secondary/60 rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground mb-4 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px]"
              />

              <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase mb-2">
                <Repeat size={10} className="inline mr-1" /> Frecuencia
              </p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {(["none", "weekly", "monthly", "yearly"] as const).map(r => (
                  <motion.button
                    key={r}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setNewReminderRepeat(r)}
                    className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                      newReminderRepeat === r
                        ? "gradient-primary text-primary-foreground"
                        : "bg-secondary/60 text-muted-foreground"
                    }`}
                    style={newReminderRepeat === r ? { boxShadow: "var(--shadow-glow-blue)" } : {}}
                  >
                    {repeatLabels[r]}
                  </motion.button>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={addReminder}
                className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
                style={{ boxShadow: 'var(--shadow-glow-blue)' }}
              >
                <Bell size={18} /> Guardar Recordatorio
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TareasPage;
