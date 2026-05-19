import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Flame, Check, ChevronLeft, ChevronRight, CalendarDays, Grid3X3 } from "lucide-react";
import { gymService } from "@/services/supabaseService";

const dayLabels = ["D", "L", "M", "M", "J", "V", "S"];

const intensityClasses = [
  "bg-secondary/30",
  "bg-success/25",
  "bg-success/50",
  "bg-success/80",
];

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface ActivityGridProps {
  onDayClick?: (dateStr: string) => void;
}

const ActivityGrid = ({ onDayClick }: ActivityGridProps) => {
  const now = new Date();
  const todayDow = now.getDay();
  const todayDate = now.getDate();
  const [view, setView] = useState<"grid" | "month">("grid");
  const [monthOffset, setMonthOffset] = useState(0);

  const viewMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const viewYear = viewMonth.getFullYear();
  const viewMonthIdx = viewMonth.getMonth();
  const daysInMonth = new Date(viewYear, viewMonthIdx + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonthIdx, 1).getDay();
  const isCurrentMonth = monthOffset === 0;

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Queries para datos reales
  const { data: diasCurrentMonth = [] } = useQuery({
    queryKey: ['dias_entrenamiento', now.getFullYear(), now.getMonth()],
    queryFn: () => gymService.getDiasConEntrenamiento(now),
    staleTime: 5 * 60 * 1000,
  });
  const { data: diasPrevMonth = [] } = useQuery({
    queryKey: ['dias_entrenamiento', prevMonthDate.getFullYear(), prevMonthDate.getMonth()],
    queryFn: () => gymService.getDiasConEntrenamiento(prevMonthDate),
    staleTime: 60 * 60 * 1000,
  });
  const { data: diasViewedMonth = [] } = useQuery({
    queryKey: ['dias_entrenamiento', viewYear, viewMonthIdx],
    queryFn: () => gymService.getDiasConEntrenamiento(viewMonth),
    staleTime: 5 * 60 * 1000,
  });

  // Todos los días conocidos (mes actual + mes anterior) para el grid de semanas
  const allDias = useMemo(
    () => [...new Set([...diasCurrentMonth, ...diasPrevMonth])],
    [diasCurrentMonth, diasPrevMonth],
  );

  // Grid de las últimas 6 semanas (antes de la semana actual)
  const pastWeeks = useMemo(() => {
    const weeks: number[][] = [];
    for (let w = 6; w >= 1; w--) {
      const week: number[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date();
        date.setDate(date.getDate() - todayDow - (w - 1) * 7 + d);
        week.push(allDias.includes(date.toISOString().split('T')[0]) ? 2 : 0);
      }
      weeks.push(week);
    }
    return weeks;
  }, [allDias, todayDow]);

  // Semana actual con actividad real
  const currentWeek = useMemo(() => dayLabels.map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - todayDow + i);
    const dateStr = date.toISOString().split('T')[0];
    const isToday = i === todayDow;
    const isPast = i < todayDow;
    const intensity = isPast ? (diasCurrentMonth.includes(dateStr) ? 2 : 0) : isToday ? 0 : -1;
    return { date: date.getDate(), isToday, isPast, intensity, dayIndex: i };
  }), [diasCurrentMonth, todayDow]);

  // Días activos del mes visto (para vista mensual)
  const monthWorkouts = useMemo((): Record<number, number> => {
    const workouts: Record<number, number> = {};
    diasViewedMonth.forEach(dateStr => {
      const d = new Date(dateStr + 'T12:00:00');
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonthIdx) {
        workouts[d.getDate()] = 2;
      }
    });
    return workouts;
  }, [diasViewedMonth, viewYear, viewMonthIdx]);

  const completedDays = Object.keys(monthWorkouts).length;
  const totalDaysElapsed = isCurrentMonth ? todayDate : daysInMonth;
  const complianceRate = Math.round((completedDays / (totalDaysElapsed || 1)) * 100);

  const totalSessions = pastWeeks.flat().filter(v => v > 0).length +
    currentWeek.filter(d => d.intensity > 0).length;

  // Build month calendar grid
  const monthGrid: (number | null)[][] = [];
  let week: (number | null)[] = new Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      monthGrid.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    monthGrid.push(week);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold">Actividad</h2>
        <div className="flex items-center gap-2">
          <span className="stat-badge bg-success/15 text-success">
            <Flame size={12} /> {totalSessions} sesiones
          </span>
          <button
            onClick={() => setView(view === "grid" ? "month" : "grid")}
            className="p-1.5 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors"
          >
            {view === "grid" ? (
              <CalendarDays size={14} className="text-muted-foreground" />
            ) : (
              <Grid3X3 size={14} className="text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Day column labels */}
            <div className="flex gap-1 mb-1.5">
              {dayLabels.map((d, i) => (
                <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground font-semibold">
                  {d}
                </div>
              ))}
            </div>

            {/* Past weeks */}
            <div className="flex flex-col gap-1 mb-1">
              {pastWeeks.map((week, wi) => (
                <div key={wi} className="flex gap-1">
                  {week.map((intensity, di) => (
                    <motion.div
                      key={`${wi}-${di}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: wi * 0.02 + di * 0.01, duration: 0.2 }}
                      className={`flex-1 aspect-square rounded-md ${intensityClasses[intensity]}`}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Current week */}
            <div className="flex gap-1.5 mt-2">
              {currentWeek.map((day) => {
                const isFuture = day.intensity === -1;
                const completed = day.isPast && day.intensity > 0;
                return (
                  <motion.div
                    key={day.dayIndex}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15 + day.dayIndex * 0.03, duration: 0.25 }}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${
                      day.isToday
                        ? "gradient-primary ring-2 ring-primary/30"
                        : completed
                          ? "bg-success/15"
                          : isFuture
                            ? "bg-secondary/20"
                            : "bg-secondary/40"
                    }`}
                    style={day.isToday ? { boxShadow: 'var(--shadow-glow-blue)' } : {}}
                  >
                    <span className={`text-[11px] font-bold ${day.isToday ? "text-primary-foreground" : "text-muted-foreground"}`}>
                      {dayLabels[day.dayIndex]}
                    </span>
                    <span className={`text-sm font-extrabold ${day.isToday ? "text-primary-foreground" : isFuture ? "text-muted-foreground/40" : "text-foreground"}`}>
                      {day.date > 0 ? day.date : ""}
                    </span>
                    {completed && (
                      <div className="w-4 h-4 rounded-full bg-success/80 flex items-center justify-center">
                        <Check size={10} className="text-success-foreground" />
                      </div>
                    )}
                    {day.isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground/80" />}
                    {isFuture && <div className="w-4 h-4" />}
                    {day.isPast && !completed && <div className="w-4 h-4" />}
                  </motion.div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-4">
              <span className="text-[10px] text-muted-foreground font-medium">Últimas 7 semanas</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Menos</span>
                {intensityClasses.map((cls, i) => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
                ))}
                <span className="text-[10px] text-muted-foreground">Más</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="month"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-1 rounded-lg hover:bg-secondary/40 transition-colors">
                <ChevronLeft size={16} className="text-muted-foreground" />
              </button>
              <span className="text-sm font-bold text-foreground">
                {monthNames[viewMonthIdx]} {viewYear}
              </span>
              <button
                onClick={() => setMonthOffset(Math.min(0, monthOffset + 1))}
                disabled={monthOffset >= 0}
                className="p-1 rounded-lg hover:bg-secondary/40 transition-colors disabled:opacity-30"
              >
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* Compliance badge */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="text-center">
                <span className="text-2xl font-extrabold text-foreground">{complianceRate}%</span>
                <p className="text-[10px] text-muted-foreground font-medium">cumplimiento</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <span className="text-2xl font-extrabold text-success">{completedDays}</span>
                <p className="text-[10px] text-muted-foreground font-medium">días activos</p>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayLabels.map((d, i) => (
                <div key={i} className="text-center text-[10px] text-muted-foreground font-semibold py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="flex flex-col gap-1">
              {monthGrid.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((day, di) => {
                    if (day === null) return <div key={di} />;
                    const isToday = isCurrentMonth && day === todayDate;
                    const isFuture = isCurrentMonth && day > todayDate;
                    const workout = monthWorkouts[day];
                    const hasWorkout = workout !== undefined;
                    const dateStr = `${viewYear}-${String(viewMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                    return (
                      <motion.div
                        key={di}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: wi * 0.03 + di * 0.01, duration: 0.2 }}
                        onClick={() => hasWorkout && !isFuture && onDayClick?.(dateStr)}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center relative ${
                          isToday
                            ? "gradient-primary ring-2 ring-primary/30"
                            : hasWorkout
                              ? `${intensityClasses[workout]} cursor-pointer active:scale-95`
                              : isFuture
                                ? "bg-secondary/15"
                                : "bg-secondary/30"
                        }`}
                        style={isToday ? { boxShadow: 'var(--shadow-glow-blue)' } : {}}
                      >
                        <span className={`text-[11px] font-bold ${
                          isToday
                            ? "text-primary-foreground"
                            : isFuture
                              ? "text-muted-foreground/30"
                              : "text-foreground"
                        }`}>
                          {day}
                        </span>
                        {hasWorkout && !isToday && (
                          <div className="absolute bottom-0.5">
                            <div className="w-1 h-1 rounded-full bg-success" />
                          </div>
                        )}
                        {isToday && (
                          <div className="absolute bottom-0.5">
                            <div className="w-1 h-1 rounded-full bg-primary-foreground/80" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-muted-foreground font-medium">Vista mensual</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Menos</span>
                {intensityClasses.map((cls, i) => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
                ))}
                <span className="text-[10px] text-muted-foreground">Más</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ActivityGrid;
