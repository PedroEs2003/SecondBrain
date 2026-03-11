import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useRutinas } from "@/hooks/useRutinas";
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, Copy, Trash2,
  Sun, Moon, Dumbbell, Droplets, Car, BookOpen, Coffee, Utensils,
  Briefcase, Code, Pencil, Sparkles, RotateCcw, Calendar, Check,
  Bell, BellOff, GripVertical, CalendarDays
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { toast } from "@/hooks/use-toast";

// ─── Types ───
type TimeBlock = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  icon: string;
  color: string;
  reminder?: number; // minutes before
};

type WeekTemplate = Record<number, TimeBlock[]>;

type DayOverride = {
  added: TimeBlock[];
  removed: string[];
  modified: TimeBlock[];
};

type Overrides = Record<string, DayOverride>;

// ─── Constants ───
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const ICONS: Record<string, React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  sun: Sun, moon: Moon, dumbbell: Dumbbell, droplets: Droplets, car: Car,
  book: BookOpen, coffee: Coffee, utensils: Utensils, briefcase: Briefcase,
  code: Code, pencil: Pencil, sparkles: Sparkles, clock: Clock,
};

const ICON_OPTIONS = Object.keys(ICONS);

const COLORS: { name: string; token: string; hsl: string }[] = [
  { name: "Azul", token: "primary", hsl: "211 100% 50%" },
  { name: "Verde", token: "success", hsl: "145 63% 49%" },
  { name: "Rojo", token: "destructive", hsl: "0 84% 60%" },
  { name: "Amarillo", token: "warning", hsl: "43 96% 56%" },
  { name: "Gym", token: "gym", hsl: "152 69% 40%" },
  { name: "Morado", token: "purple", hsl: "270 70% 60%" },
  { name: "Rosa", token: "pink", hsl: "330 80% 60%" },
  { name: "Cyan", token: "cyan", hsl: "190 90% 50%" },
  { name: "Índigo", token: "indigo", hsl: "240 70% 60%" },
  { name: "Teal", token: "teal", hsl: "170 70% 42%" },
  { name: "Naranja", token: "orange", hsl: "25 95% 53%" },
  { name: "Coral", token: "rose", hsl: "350 80% 55%" },
  { name: "Lima", token: "lime", hsl: "85 70% 46%" },
];

const REMINDER_OPTIONS = [
  { label: "Sin recordatorio", value: 0 },
  { label: "5 min antes", value: 5 },
  { label: "10 min antes", value: 10 },
  { label: "15 min antes", value: 15 },
  { label: "30 min antes", value: 30 },
  { label: "1 hora antes", value: 60 },
];

const getColorHsl = (token: string) => {
  const found = COLORS.find(c => c.token === token);
  return found ? found.hsl : "211 100% 50%";
};

const colorBg = (token: string, opacity = 1) =>
  opacity < 1 ? `hsla(${getColorHsl(token)} / ${opacity})` : `hsl(${getColorHsl(token)})`;

const DEFAULT_TEMPLATE: WeekTemplate = {
  0: [],
  1: [
    { id: "t1", name: "Despertar", startTime: "08:00", endTime: "08:30", icon: "sun", color: "success" },
    { id: "t2", name: "Gym", startTime: "17:00", endTime: "18:30", icon: "dumbbell", color: "gym" },
  ],
  2: [
    { id: "t3", name: "Despertar", startTime: "08:00", endTime: "08:30", icon: "sun", color: "success" },
    { id: "t4", name: "Estudiar", startTime: "10:00", endTime: "12:00", icon: "book", color: "primary" },
  ],
  3: [
    { id: "t5", name: "Despertar", startTime: "08:00", endTime: "08:30", icon: "sun", color: "success" },
    { id: "t6", name: "Gym", startTime: "17:00", endTime: "18:30", icon: "dumbbell", color: "gym" },
  ],
  4: [
    { id: "t7", name: "Despertar", startTime: "08:00", endTime: "08:30", icon: "sun", color: "success" },
    { id: "t8", name: "Estudiar", startTime: "10:00", endTime: "12:00", icon: "book", color: "primary" },
  ],
  5: [
    { id: "t9", name: "Despertar", startTime: "08:00", endTime: "08:30", icon: "sun", color: "success" },
    { id: "t10", name: "Gym", startTime: "17:00", endTime: "18:30", icon: "dumbbell", color: "gym" },
  ],
  6: [],
};

const genId = () => Math.random().toString(36).slice(2, 9);
const formatDate = (d: Date) => d.toISOString().split("T")[0];
const parseTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// ─── Component ───
const AgendaPage = () => {
  const navigate = useNavigate();
  const { rutinas, isLoading, crearRutina, eliminarRutina, saltarRutina, agregarExcepcion } = useRutinas();

  const [template, setTemplate] = useState<WeekTemplate>(() => {
    const saved = localStorage.getItem("agenda-template");
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATE;
  });

  // Sincronizar rutinas de Supabase al template cuando no haya datos locales
  useEffect(() => {
    if (rutinas.length === 0) return;
    const saved = localStorage.getItem("agenda-template");
    if (saved && JSON.parse(saved) !== DEFAULT_TEMPLATE) return; // Ya hay datos locales

    const newTemplate: WeekTemplate = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    rutinas.forEach(r => {
      r.dias_semana.forEach(dia => {
        // DB: 1=Lun…7=Dom → JS getDay: 0=Dom…6=Sáb
        const jsDow = dia === 7 ? 0 : dia;
        if (!newTemplate[jsDow]) newTemplate[jsDow] = [];
        newTemplate[jsDow].push({
          id: String(r.id ?? genId()),
          name: r.actividad,
          startTime: r.hora_inicio,
          endTime: r.hora_fin,
          icon: Object.keys(ICONS).find(k => r.icono?.includes(k)) ?? "clock",
          color: r.color ?? "primary",
        });
      });
    });
    setTemplate(newTemplate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutinas]);

  const [overrides, setOverrides] = useState<Overrides>(() => {
    const saved = localStorage.getItem("agenda-overrides");
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [blockDrawerOpen, setBlockDrawerOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [editTarget, setEditTarget] = useState<"template" | "override">("template");
  const [showMonthCalendar, setShowMonthCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Persist
  useEffect(() => { localStorage.setItem("agenda-template", JSON.stringify(template)); }, [template]);
  useEffect(() => { localStorage.setItem("agenda-overrides", JSON.stringify(overrides)); }, [overrides]);

  // Reminders system
  const firedReminders = useRef<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      // Check if notifications are enabled
      if (localStorage.getItem("notifications-enabled") === "false") return;
      const now = new Date();
      const todayKey = formatDate(now);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const todayDow = now.getDay();

      // Get today's blocks
      const templateBlocks = template[todayDow] || [];
      const override = overrides[todayKey];
      let blocks = templateBlocks;
      if (override) {
        blocks = templateBlocks
          .filter(b => !override.removed.includes(b.id))
          .map(b => { const mod = override.modified.find(m => m.id === b.id); return mod || b; });
        blocks = [...blocks, ...override.added];
      }

      blocks.forEach(block => {
        if (!block.reminder || block.reminder === 0) return;
        const blockStart = parseTime(block.startTime);
        const reminderTime = blockStart - block.reminder;
        const reminderKey = `${todayKey}-${block.id}`;

        if (currentMinutes >= reminderTime && currentMinutes < blockStart && !firedReminders.current.has(reminderKey)) {
          firedReminders.current.add(reminderKey);
          toast({
            title: `⏰ ${block.name}`,
            description: `Comienza en ${blockStart - currentMinutes} minutos (${block.startTime})`,
          });
        }
      });
    }, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [template, overrides]);

  // Computed
  const selectedDayOfWeek = selectedDate.getDay();
  const dateKey = formatDate(selectedDate);
  const isToday = formatDate(new Date()) === dateKey;

  const resolvedBlocks = useMemo(() => {
    const templateBlocks = template[selectedDayOfWeek] || [];
    const override = overrides[dateKey];
    if (!override) return templateBlocks;
    let blocks = templateBlocks
      .filter(b => !override.removed.includes(b.id))
      .map(b => { const mod = override.modified.find(m => m.id === b.id); return mod || b; });
    blocks = [...blocks, ...override.added];
    blocks.sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
    return blocks;
  }, [template, overrides, selectedDayOfWeek, dateKey]);

  const hasOverride = !!overrides[dateKey];

  // Week navigation
  const weekDays = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const goWeek = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir * 7);
    setSelectedDate(d);
  };

  // Monthly calendar
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const days: (Date | null)[] = [];

    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [calendarMonth]);

  const getBlockColorsForDate = useCallback((date: Date) => {
    const dow = date.getDay();
    const dk = formatDate(date);
    const templateBlocks = template[dow] || [];
    const override = overrides[dk];
    let blocks = templateBlocks;
    if (override) {
      blocks = templateBlocks
        .filter(b => !override.removed.includes(b.id))
        .map(b => { const mod = override.modified.find(m => m.id === b.id); return mod || b; });
      blocks = [...blocks, ...override.added];
    }
    const uniqueColors = [...new Set(blocks.map(b => b.color))];
    return uniqueColors.slice(0, 3);
  }, [template, overrides]);

  // Block CRUD
  const saveBlock = useCallback((block: TimeBlock) => {
    if (editTarget === "template") {
      const day = editingDay ?? selectedDayOfWeek;
      setTemplate(prev => {
        const dayBlocks = [...(prev[day] || [])];
        const idx = dayBlocks.findIndex(b => b.id === block.id);
        if (idx >= 0) dayBlocks[idx] = block;
        else dayBlocks.push(block);
        dayBlocks.sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
        return { ...prev, [day]: dayBlocks };
      });
    } else {
      setOverrides(prev => {
        const existing = prev[dateKey] || { added: [], removed: [], modified: [] };
        const isTemplateBlock = (template[selectedDayOfWeek] || []).some(b => b.id === block.id);
        if (isTemplateBlock) {
          const mods = [...existing.modified];
          const idx = mods.findIndex(m => m.id === block.id);
          if (idx >= 0) mods[idx] = block; else mods.push(block);
          return { ...prev, [dateKey]: { ...existing, modified: mods } };
        } else {
          const added = [...existing.added];
          const idx = added.findIndex(a => a.id === block.id);
          if (idx >= 0) added[idx] = block; else added.push(block);
          return { ...prev, [dateKey]: { ...existing, added } };
        }
      });
    }
    setBlockDrawerOpen(false);
    setEditingBlock(null);
  }, [editTarget, editingDay, selectedDayOfWeek, dateKey, template]);

  const removeBlock = useCallback((blockId: string) => {
    if (editTarget === "template") {
      const day = editingDay ?? selectedDayOfWeek;
      setTemplate(prev => ({
        ...prev,
        [day]: (prev[day] || []).filter(b => b.id !== blockId),
      }));
    } else {
      const isTemplateBlock = (template[selectedDayOfWeek] || []).some(b => b.id === blockId);
      setOverrides(prev => {
        const existing = prev[dateKey] || { added: [], removed: [], modified: [] };
        if (isTemplateBlock) {
          return { ...prev, [dateKey]: { ...existing, removed: [...existing.removed, blockId] } };
        } else {
          return { ...prev, [dateKey]: { ...existing, added: existing.added.filter(a => a.id !== blockId) } };
        }
      });
    }
  }, [editTarget, editingDay, selectedDayOfWeek, dateKey, template]);

  const resetDayOverride = () => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[dateKey];
      return next;
    });
  };

  // Drag reorder for day view
  const handleReorder = (newOrder: TimeBlock[]) => {
    // Update the order in override/template
    if (hasOverride || editTarget === "override") {
      setOverrides(prev => {
        const existing = prev[dateKey] || { added: [], removed: [], modified: [] };
        // Re-assign start times based on new order, keeping durations
        const reordered = newOrder.map((block, i) => {
          if (i === 0) return block;
          const prevBlock = newOrder[i - 1];
          const prevEnd = parseTime(prevBlock.endTime);
          const duration = parseTime(block.endTime) - parseTime(block.startTime);
          const newStart = prevEnd + 15; // 15 min gap
          const startH = Math.floor(newStart / 60).toString().padStart(2, '0');
          const startM = (newStart % 60).toString().padStart(2, '0');
          const endMin = newStart + duration;
          const endH = Math.floor(endMin / 60).toString().padStart(2, '0');
          const endM = (endMin % 60).toString().padStart(2, '0');
          return { ...block, startTime: `${startH}:${startM}`, endTime: `${endH}:${endM}` };
        });

        const templateBlockIds = (template[selectedDayOfWeek] || []).map(b => b.id);
        const modified = reordered.filter(b => templateBlockIds.includes(b.id));
        const added = reordered.filter(b => !templateBlockIds.includes(b.id));

        return {
          ...prev,
          [dateKey]: {
            ...existing,
            modified: [...existing.modified.filter(m => !modified.some(rm => rm.id === m.id)), ...modified],
            added: [...existing.added.filter(a => !added.some(ra => ra.id === a.id)), ...added],
          }
        };
      });
    }
  };

  // Block editor form state
  const [formName, setFormName] = useState("");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("10:00");
  const [formIcon, setFormIcon] = useState("clock");
  const [formColor, setFormColor] = useState("primary");
  const [formReminder, setFormReminder] = useState(0);

  if (isLoading) {
    return (
      <div className="px-4 pt-12 pb-24 space-y-4">
        <Skeleton className="h-8 w-36" />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {["L","M","X","J","V","S","D"].map(d => (
            <Skeleton key={d} className="h-10 w-10 rounded-xl flex-shrink-0" />
          ))}
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex gap-3 items-center">
            <Skeleton className="h-10 w-14 rounded-lg" />
            <Skeleton className="h-14 flex-1 rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  const openBlockEditor = (block: TimeBlock | null, target: "template" | "override") => {
    setEditTarget(target);
    if (block) {
      setEditingBlock(block);
      setFormName(block.name);
      setFormStart(block.startTime);
      setFormEnd(block.endTime);
      setFormIcon(block.icon);
      setFormColor(block.color);
      setFormReminder(block.reminder || 0);
    } else {
      setEditingBlock(null);
      setFormName("");
      setFormStart("09:00");
      setFormEnd("10:00");
      setFormIcon("clock");
      setFormColor("primary");
      setFormReminder(0);
    }
    setBlockDrawerOpen(true);
  };

  const handleSaveForm = () => {
    if (!formName.trim()) return;
    saveBlock({
      id: editingBlock?.id || genId(),
      name: formName.trim(),
      startTime: formStart,
      endTime: formEnd,
      icon: formIcon,
      color: formColor,
      reminder: formReminder,
    });
  };

  const templateDayBlocks = editingDay !== null ? (template[editingDay] || []) : [];

  const renderIcon = (iconName: string, size: number, className: string, colorToken?: string) => {
    const Icon = ICONS[iconName] || Clock;
    const style = colorToken ? { color: `hsl(${getColorHsl(colorToken)})` } : {};
    return <Icon size={size} className={className} style={style} />;
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 glass px-4 py-3 safe-top">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate("/")} className="w-10 h-10 rounded-xl bg-secondary/60 flex items-center justify-center">
            <ChevronLeft size={20} className="text-muted-foreground" />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold tracking-tight">Mi Agenda</h1>
            <p className="text-[11px] text-muted-foreground font-medium">Plantilla semanal + ajustes por día</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowMonthCalendar(!showMonthCalendar)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              showMonthCalendar ? "gradient-primary" : "bg-secondary/60"
            }`}
            style={showMonthCalendar ? { boxShadow: "var(--shadow-glow-blue)" } : {}}
          >
            <CalendarDays size={18} className={showMonthCalendar ? "text-primary-foreground" : "text-muted-foreground"} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setEditingTemplate(!editingTemplate)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
              editingTemplate ? "gradient-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
            }`}
            style={editingTemplate ? { boxShadow: "var(--shadow-glow-blue)" } : {}}
          >
            {editingTemplate ? "✓ Listo" : "Plantilla"}
          </motion.button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Monthly Calendar */}
        <AnimatePresence>
          {showMonthCalendar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                    className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center">
                    <ChevronLeft size={16} className="text-muted-foreground" />
                  </motion.button>
                  <span className="text-sm font-bold">
                    {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </span>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                    className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center">
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </motion.button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DAY_NAMES.map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} />;
                    const dk = formatDate(day);
                    const isSel = dk === dateKey;
                    const isT = dk === formatDate(new Date());
                    const blockColors = getBlockColorsForDate(day);

                    return (
                      <motion.button
                        key={dk}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setSelectedDate(day); setShowMonthCalendar(false); }}
                        className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all ${
                          isSel ? "gradient-primary" : isT ? "bg-primary/10" : "hover:bg-secondary/40"
                        }`}
                      >
                        <span className={`text-xs font-bold ${isSel ? "text-primary-foreground" : isT ? "text-primary" : ""}`}>
                          {day.getDate()}
                        </span>
                        <div className="flex gap-0.5 h-2">
                          {blockColors.map((color, ci) => (
                            <div
                              key={ci}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: isSel ? 'hsla(0,0%,100%,0.7)' : colorBg(color) }}
                            />
                          ))}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Template Editor Mode */}
        <AnimatePresence>
          {editingTemplate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-card p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Copy size={14} className="text-primary" />
                  <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                    PLANTILLA SEMANAL
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Define tu rutina base para cada día. Se repite automáticamente cada semana.
                </p>

                <div className="grid grid-cols-7 gap-1">
                  {DAY_NAMES.map((name, i) => {
                    const count = (template[i] || []).length;
                    return (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setEditingDay(editingDay === i ? null : i)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-colors ${
                          editingDay === i ? "gradient-primary" : "bg-secondary/40"
                        }`}
                        style={editingDay === i ? { boxShadow: "var(--shadow-glow-blue)" } : {}}
                      >
                        <span className={`text-[10px] font-bold ${editingDay === i ? "text-primary-foreground" : "text-muted-foreground"}`}>
                          {name}
                        </span>
                        <span className={`text-lg font-extrabold ${editingDay === i ? "text-primary-foreground" : ""}`}>
                          {count}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait">
                  {editingDay !== null && (
                    <motion.div
                      key={editingDay}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-2 pt-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{DAY_NAMES_FULL[editingDay]}</span>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => openBlockEditor(null, "template")}
                          className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center"
                          style={{ boxShadow: "var(--shadow-glow-blue)" }}
                        >
                          <Plus size={14} className="text-primary-foreground" />
                        </motion.button>
                      </div>

                      {templateDayBlocks.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Sin actividades — toca + para agregar</p>
                      ) : (
                        templateDayBlocks.map((block) => (
                          <motion.div
                            key={block.id}
                            layout
                            className="glass-card-hover flex items-center gap-3 p-3 relative overflow-hidden"
                          >
                            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: colorBg(block.color) }} />
                            <div className="icon-container" style={{ backgroundColor: colorBg(block.color, 0.15) }}>
                              {renderIcon(block.icon, 18, "", block.color)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">{block.name}</p>
                              <p className="text-[11px] text-muted-foreground">{block.startTime} - {block.endTime}</p>
                            </div>
                            <div className="flex gap-1">
                              <motion.button whileTap={{ scale: 0.85 }} onClick={() => openBlockEditor(block, "template")}
                                className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center">
                                <Pencil size={12} className="text-muted-foreground" />
                              </motion.button>
                              <motion.button whileTap={{ scale: 0.85 }} onClick={() => { setEditTarget("template"); removeBlock(block.id); }}
                                className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center">
                                <Trash2 size={12} className="text-destructive" />
                              </motion.button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Week Navigation */}
        <div className="glass-card p-3">
          <div className="flex items-center justify-between mb-3">
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => goWeek(-1)} className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center">
              <ChevronLeft size={16} className="text-muted-foreground" />
            </motion.button>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-primary" />
              <span className="text-sm font-bold">
                {selectedDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
              </span>
            </div>
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => goWeek(1)} className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center">
              <ChevronRight size={16} className="text-muted-foreground" />
            </motion.button>
          </div>

          <div className="flex gap-1.5">
            {weekDays.map((d) => {
              const dk = formatDate(d);
              const isSel = dk === dateKey;
              const isT = dk === formatDate(new Date());
              const hasOvr = !!overrides[dk];
              const dayBlocks = template[d.getDay()] || [];

              return (
                <motion.button
                  key={dk}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedDate(d)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all ${
                    isSel ? "gradient-primary" : isT ? "bg-primary/10" : "bg-secondary/30"
                  }`}
                  style={isSel ? { boxShadow: "var(--shadow-glow-blue)" } : {}}
                >
                  <span className={`text-[9px] font-bold ${isSel ? "text-primary-foreground" : "text-muted-foreground"}`}>
                    {DAY_NAMES[d.getDay()]}
                  </span>
                  <span className={`text-base font-extrabold ${isSel ? "text-primary-foreground" : ""}`}>
                    {d.getDate()}
                  </span>
                  <div className="flex gap-0.5">
                    {dayBlocks.length > 0 && (
                      <div className={`w-1.5 h-1.5 rounded-full ${isSel ? "bg-primary-foreground/70" : "bg-primary/50"}`} />
                    )}
                    {hasOvr && (
                      <div className={`w-1.5 h-1.5 rounded-full ${isSel ? "bg-primary-foreground/50" : "bg-warning/60"}`} />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Day View */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">
                {isToday ? "Hoy" : DAY_NAMES_FULL[selectedDayOfWeek]}, {selectedDate.getDate()}
              </h2>
              <p className="text-xs text-muted-foreground">
                {resolvedBlocks.length} bloques
                {hasOverride && (
                  <span className="text-warning ml-1">• modificado</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {hasOverride && (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={resetDayOverride}
                  className="px-3 py-2 rounded-xl bg-warning/15 text-warning text-[11px] font-bold flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Restaurar
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => openBlockEditor(null, "override")}
                className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center"
                style={{ boxShadow: "var(--shadow-glow-blue)" }}
              >
                <Plus size={16} className="text-primary-foreground" />
              </motion.button>
            </div>
          </div>

          {/* Timeline with Drag & Drop */}
          {resolvedBlocks.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Moon size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground font-medium">Día libre</p>
              <p className="text-xs text-muted-foreground mt-1">No hay actividades programadas</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[22px] top-4 bottom-4 w-px bg-border/50" />

              <Reorder.Group
                axis="y"
                values={resolvedBlocks}
                onReorder={handleReorder}
                className="space-y-2"
              >
                {resolvedBlocks.map((block, i) => {
                  const isFromTemplate = (template[selectedDayOfWeek] || []).some(b => b.id === block.id);
                  const isModified = hasOverride && overrides[dateKey]?.modified?.some(m => m.id === block.id);

                  return (
                    <Reorder.Item
                      key={block.id}
                      value={block}
                      className="flex gap-3 items-start relative cursor-grab active:cursor-grabbing"
                    >
                      {/* Timeline dot */}
                      <div className="relative z-10 mt-4">
                        <div className="w-[10px] h-[10px] rounded-full ring-4 ring-background" style={{ backgroundColor: colorBg(block.color) }} />
                      </div>

                      {/* Block card */}
                      <motion.div
                        whileTap={{ scale: 0.97 }}
                        className="glass-card-hover flex-1 p-4 relative overflow-hidden text-left"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full" style={{ backgroundColor: colorBg(block.color) }} />
                        <div className="flex items-center gap-3">
                          <GripVertical size={14} className="text-muted-foreground/30 shrink-0 -ml-1" />
                          <div className="icon-container" style={{ backgroundColor: colorBg(block.color, 0.15) }}>
                            {renderIcon(block.icon, 20, "", block.color)}
                          </div>
                          <div className="flex-1 min-w-0" onClick={() => openBlockEditor(block, "override")}>
                            <div className="flex items-center gap-2">
                              <p className="text-[15px] font-bold truncate">{block.name}</p>
                              {!isFromTemplate && (
                                <span className="stat-badge bg-primary/15 text-primary text-[9px] py-0.5">Extra</span>
                              )}
                              {isModified && (
                                <span className="stat-badge bg-warning/15 text-warning text-[9px] py-0.5">Editado</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground font-medium">{block.startTime} - {block.endTime}</p>
                              {block.reminder && block.reminder > 0 && (
                                <Bell size={10} className="text-primary" />
                              )}
                            </div>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={(e) => { e.stopPropagation(); setEditTarget("override"); removeBlock(block.id); }}
                            className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0"
                          >
                            <X size={14} className="text-destructive/70" />
                          </motion.button>
                        </div>
                      </motion.div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>

              <p className="text-[10px] text-muted-foreground/40 text-center mt-3 font-medium">
                ⬍ Arrastra para reordenar bloques
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Block Editor Drawer */}
      <Drawer open={blockDrawerOpen} onOpenChange={setBlockDrawerOpen}>
        <DrawerContent className="px-4 pb-8 max-h-[85vh] overflow-y-auto">
          <div className="sheet-handle" />
          <h3 className="text-lg font-extrabold mb-4">
            {editingBlock ? "Editar bloque" : "Nuevo bloque"}
          </h3>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-1.5 block">Nombre</label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Ej: Gym, Estudiar, Comer..."
                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-1.5 block">Inicio</label>
                <input
                  type="time"
                  value={formStart}
                  onChange={e => setFormStart(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-1.5 block">Fin</label>
                <input
                  type="time"
                  value={formEnd}
                  onChange={e => setFormEnd(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Reminder */}
            <div>
              <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-1.5 block flex items-center gap-1.5">
                <Bell size={12} /> Recordatorio
              </label>
              <div className="flex gap-2 flex-wrap">
                {REMINDER_OPTIONS.map(opt => (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setFormReminder(opt.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      formReminder === opt.value
                        ? "gradient-primary text-primary-foreground"
                        : "bg-secondary/50 text-muted-foreground"
                    }`}
                    style={formReminder === opt.value ? { boxShadow: "var(--shadow-glow-blue)" } : {}}
                  >
                    {opt.value === 0 ? <BellOff size={11} /> : <Bell size={11} />}
                    {opt.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-1.5 block">Ícono</label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(ico => (
                  <motion.button
                    key={ico}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setFormIcon(ico)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      formIcon === ico ? "gradient-primary" : "bg-secondary/50"
                    }`}
                    style={formIcon === ico ? { boxShadow: "var(--shadow-glow-blue)" } : {}}
                  >
                    {renderIcon(ico, 18, formIcon === ico ? "text-primary-foreground" : "text-muted-foreground")}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-1.5 block">Color</label>
              <div className="grid grid-cols-7 gap-2">
                {COLORS.map(c => {
                  const selected = formColor === c.token;
                  return (
                    <motion.button
                      key={c.token}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setFormColor(c.token)}
                      className="flex flex-col items-center gap-1"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${selected ? "ring-2 ring-offset-2 ring-offset-background" : ""}`}
                        style={{
                          backgroundColor: colorBg(c.token),
                          ...(selected ? { boxShadow: `0 0 12px ${colorBg(c.token, 0.5)}`, ringColor: colorBg(c.token) } : {}),
                        }}
                      >
                        {selected && <Check size={14} className="text-foreground" />}
                      </div>
                      <span className="text-[9px] text-muted-foreground font-medium">{c.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Save */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveForm}
              disabled={!formName.trim()}
              className="w-full gradient-primary text-primary-foreground py-3.5 rounded-2xl font-bold text-sm disabled:opacity-40"
              style={{ boxShadow: "var(--shadow-glow-blue)" }}
            >
              {editingBlock ? "Guardar cambios" : "Agregar bloque"}
            </motion.button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default AgendaPage;
