import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue, animate } from "framer-motion";
import { useFirstVisit } from "@/hooks/useFirstVisit";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, TrendingDown, TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft,
  X, Trash2, Check, CreditCard, HandCoins, Clock, ChevronDown, Minus
} from "lucide-react";
import AnimatedCounter from "@/components/AnimatedCounter";
import { toast } from "@/hooks/use-toast";
import { useDeudas } from "@/hooks/useDeudas";
import { triggerMoodEvent } from "@/hooks/useCompanionMood";

type DebtType = "debo" | "me_deben";

type Payment = {
  id: number;
  amount: number;
  date: string;
};

type Debt = {
  id: number;
  person: string;
  amount: number;
  date: string;
  concept: string;
  type: DebtType;
  paid: boolean;
  payments: Payment[];
};


const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

// Each card gets its own motion value → 1:1 movement with finger, spring snap-back
const SwipeCard = ({ children, onSwipeLeft, onSwipeRight, className }: {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  className?: string;
}) => {
  const x = useMotionValue(0);
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 100) onSwipeRight();
    else if (info.offset.x < -100) onSwipeLeft();
    animate(x, 0, { type: "spring", stiffness: 500, damping: 38 });
  };
  return (
    <motion.div
      drag="x"
      style={{ x }}
      dragElastic={0}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.99 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const DeudasPage = () => {
  const { deudas, isLoading, crear, actualizar, eliminar } = useDeudas();

  // Adaptar Deuda (DB) → Debt (UI)
  const debts: Debt[] = useMemo(() => deudas.map(d => ({
    id: d.id!,
    person: d.persona,
    amount: d.monto,
    date: d.fecha
      ? (() => {
          const parsed = new Date(d.fecha!.includes("T") ? d.fecha! : d.fecha! + "T12:00:00");
          return isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
        })()
      : "",
    concept: d.descripcion ?? "Sin concepto",
    type: d.tipo,
    paid: d.pagada,
    payments: (d.payments ?? []).map(p => ({
      id: typeof p.id === "string" ? parseInt(p.id, 36) || Date.now() : p.id as unknown as number,
      amount: p.monto,
      date: p.fecha,
    })),
  })), [deudas]);

  const [tab, setTab] = useState<"activas" | "pagadas">("activas");
  const [showAdd, setShowAdd] = useState(false);
  const [showPayment, setShowPayment] = useState<number | null>(null);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

  useEffect(() => {
    window.dispatchEvent(new Event(showAdd || showPayment !== null ? 'modal-open' : 'modal-close'))
  }, [showAdd, showPayment])

  // Add form
  const [newPerson, setNewPerson] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newConcept, setNewConcept] = useState("");
  const [newType, setNewType] = useState<DebtType>("debo");

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState("");

  const active = useMemo(() => debts.filter(d => !d.paid), [debts]);
  const paid = useMemo(() => debts.filter(d => d.paid), [debts]);
  const isFirst = useFirstVisit('deudas')

  if (isLoading) {
    return (
      <div className="px-4 pt-12 pb-24 space-y-4">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="flex gap-3">
          <Skeleton className="h-16 flex-1 rounded-xl" />
          <Skeleton className="h-16 flex-1 rounded-xl" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const totalDebo = active.filter(d => d.type === "debo").reduce((s, d) => s + d.amount - d.payments.reduce((ps, p) => ps + p.amount, 0), 0);
  const totalMeDeben = active.filter(d => d.type === "me_deben").reduce((s, d) => s + d.amount - d.payments.reduce((ps, p) => ps + p.amount, 0), 0);
  const balance = totalMeDeben - totalDebo;
  const total = totalDebo + totalMeDeben || 1;
  const deboPercent = (totalDebo / total) * 100;

  const list = tab === "activas" ? active : paid;
  const grouped = list.reduce<Record<string, Debt[]>>((acc, d) => {
    acc[d.person] = acc[d.person] || [];
    acc[d.person].push(d);
    return acc;
  }, {});

  const personTotals = Object.entries(grouped).map(([person, ds]) => {
    const t = ds.reduce((s, d) => {
      const paidAmount = d.payments.reduce((ps, p) => ps + p.amount, 0);
      const remaining = d.amount - paidAmount;
      return s + (d.type === "me_deben" ? remaining : -remaining);
    }, 0);
    return { person, debts: ds, total: t };
  });

  const getRemaining = (d: Debt) => d.amount - d.payments.reduce((s, p) => s + p.amount, 0);
  const getProgress = (d: Debt) => {
    const paidAmt = d.payments.reduce((s, p) => s + p.amount, 0);
    return Math.min((paidAmt / d.amount) * 100, 100);
  };

  const handleAdd = () => {
    if (!newPerson.trim() || !newAmount || Number(newAmount) <= 0) {
      toast({ title: "Completa los campos", description: "Persona y monto son obligatorios", variant: "destructive" });
      return;
    }
    crear.mutate({
      persona: newPerson.trim(),
      monto: Number(newAmount),
      tipo: newType,
      descripcion: newConcept.trim() || undefined,
      fecha: new Date().toISOString().split("T")[0],
      pagada: false,
      payments: [],
    });
    if (newType === "debo") triggerMoodEvent("triste", 5000);
    setNewPerson(""); setNewAmount(""); setNewConcept(""); setNewType("debo");
    setShowAdd(false);
  };

  const handlePayment = (debtId: number) => {
    const amt = Number(paymentAmount);
    const debt = debts.find(d => d.id === debtId);
    if (!debt || !amt || amt <= 0) return;
    const remaining = getRemaining(debt);
    if (amt > remaining) {
      toast({ title: "Monto excede", description: `El restante es $${remaining.toLocaleString()}`, variant: "destructive" });
      return;
    }
    const deudaOriginal = deudas.find(d => d.id === debtId);
    if (!deudaOriginal) return;
    const newPayments = [
      ...(deudaOriginal.payments ?? []),
      { id: crypto.randomUUID(), monto: amt, fecha: new Date().toISOString().split("T")[0] },
    ];
    const newRemaining = remaining - amt;
    actualizar.mutate({ id: debtId, updates: { payments: newPayments, pagada: newRemaining <= 0 } });
    setPaymentAmount("");
    setShowPayment(null);
  };

  const handleMarkPaid = (debtId: number) => {
    actualizar.mutate({ id: debtId, updates: { pagada: true } });
  };

  const handleDelete = (debtId: number) => {
    eliminar.mutate(debtId);
  };

  const handleUnpay = (debtId: number) => {
    actualizar.mutate({ id: debtId, updates: { pagada: false } });
  };


  return (
    <motion.div variants={stagger} initial={isFirst ? "hidden" : "show"} animate="show" className="px-4 pt-14 pb-28">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="icon-container-lg gradient-purple" style={{ boxShadow: '0 4px 20px -4px hsla(270, 70%, 60%, 0.3)' }}>
            <Wallet size={22} className="text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Deudas</h1>
            <p className="text-sm text-muted-foreground">Control financiero</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.85, rotate: 90 }}
          onClick={() => setShowAdd(true)}
          className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center"
          style={{ boxShadow: 'var(--shadow-glow-blue)' }}
        >
          <Plus size={18} className="text-primary-foreground" />
        </motion.button>
      </motion.div>

      {/* Balance Card */}
      <motion.div variants={fadeUp} className="glass-card p-5 mb-5 noise-overlay overflow-hidden relative">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(var(--success)), transparent)' }}
        />
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-destructive/15 flex items-center justify-center">
                <TrendingDown size={16} className="text-destructive" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">Yo debo</p>
                <p className="text-lg font-extrabold text-destructive">
                  $<AnimatedCounter animated={isFirst} target={totalDebo} />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-success/15 flex items-center justify-center">
                <TrendingUp size={16} className="text-success" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">Me deben</p>
                <p className="text-lg font-extrabold text-success">
                  $<AnimatedCounter animated={isFirst} target={totalMeDeben} />
                </p>
              </div>
            </div>
          </div>
          {/* Donut */}
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="13" fill="none" stroke="hsl(var(--success))" strokeWidth="5" opacity="0.8" />
              <motion.circle
                cx="18" cy="18" r="13" fill="none" stroke="hsl(var(--destructive))" strokeWidth="5"
                strokeDasharray={`${deboPercent * 0.817} ${100}`}
                strokeLinecap="round"
                initial={{ strokeDashoffset: 100 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Wallet size={14} className="text-muted-foreground mb-0.5" />
              <span className="text-[9px] text-muted-foreground font-semibold">Balance</span>
            </div>
          </div>
        </div>
        <div className="border-t border-border/30 mt-4 pt-3 flex items-center justify-between relative z-10">
          <span className="text-sm text-muted-foreground">Balance neto</span>
          <span className={`text-xl font-extrabold ${balance >= 0 ? "text-success" : "text-destructive"}`}>
            {balance >= 0 ? "+" : "-"}$<AnimatedCounter animated={isFirst} target={Math.abs(balance)} />
          </span>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2 mb-5">
        <div className="glass-card p-3 text-center">
          <CreditCard size={14} className="text-primary mx-auto mb-1" />
          <p className="text-lg font-extrabold">{active.length}</p>
          <p className="text-[9px] text-muted-foreground font-semibold">Activas</p>
        </div>
        <div className="glass-card p-3 text-center">
          <Check size={14} className="text-success mx-auto mb-1" />
          <p className="text-lg font-extrabold text-success">{paid.length}</p>
          <p className="text-[9px] text-muted-foreground font-semibold">Pagadas</p>
        </div>
        <div className="glass-card p-3 text-center">
          <Clock size={14} className="text-warning mx-auto mb-1" />
          <p className="text-lg font-extrabold text-warning">{active.filter(d => d.payments.length > 0).length}</p>
          <p className="text-[9px] text-muted-foreground font-semibold">Con abonos</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="tab-switcher mb-5">
        <button onClick={() => setTab("activas")} className={`flex-1 py-2.5 text-sm transition-all duration-300 ${tab === "activas" ? "tab-active" : "tab-inactive"}`}>
          Activas ({active.length})
        </button>
        <button onClick={() => setTab("pagadas")} className={`flex-1 py-2.5 text-sm transition-all duration-300 ${tab === "pagadas" ? "tab-active" : "tab-inactive"}`}>
          Pagadas ({paid.length})
        </button>
      </motion.div>

      {/* Swipe hint */}
      {tab === "activas" && active.length > 0 && (
        <motion.p variants={fadeUp} className="text-[10px] text-muted-foreground/60 text-center mb-3 font-medium">
          ← Eliminar · Pagar →
        </motion.p>
      )}
      {tab === "pagadas" && paid.length > 0 && (
        <motion.p variants={fadeUp} className="text-[10px] text-muted-foreground/60 text-center mb-3 font-medium">
          ← Eliminar · Reactivar →
        </motion.p>
      )}

      {/* Debts grouped */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-4"
        >
          {personTotals.length === 0 && (
            <div className="text-center py-12">
              <HandCoins size={40} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-semibold">
                {tab === "activas" ? "Sin deudas activas 🎉" : "Sin deudas pagadas aún"}
              </p>
            </div>
          )}

          {personTotals.map(({ person, debts: ds, total: t }, pi) => {
            const isExpanded = expandedPerson === person;
            return (
              <motion.div
                key={person}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: pi * 0.06 }}
              >
                {/* Person header */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setExpandedPerson(isExpanded ? null : person)}
                  className="flex items-center gap-3 mb-2 w-full"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold ${
                    t >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }`}>
                    {person[0]}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-extrabold">{person}</span>
                    <p className="text-[10px] text-muted-foreground">{ds.length} deuda{ds.length > 1 ? "s" : ""}</p>
                  </div>
                  <span className={`font-extrabold text-lg ${t >= 0 ? "text-success" : "text-destructive"}`}>
                    {t >= 0 ? "+" : "-"}${Math.abs(t).toLocaleString()}
                  </span>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </motion.div>
                </motion.button>

                {/* Debt cards */}
                <AnimatePresence>
                  {isExpanded && ds.map((d) => {
                    const remaining = getRemaining(d);
                    const progress = getProgress(d);
                    return (
                      <motion.div
                        key={d.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {/* iOS-style swipe: background revealed under sliding card */}
                        <div className="relative overflow-hidden rounded-2xl mb-2 ml-4">
                          {/* Action backgrounds — always behind the card */}
                          <div className="absolute inset-0 flex items-stretch">
                            <div className="w-20 bg-success flex flex-col items-center justify-center gap-1 shrink-0">
                              <Check size={18} className="text-white" />
                              <span className="text-[10px] text-white font-bold">
                                {tab === "pagadas" ? "Reactivar" : "Pagar"}
                              </span>
                            </div>
                            <div className="flex-1" />
                            <div className="w-20 bg-destructive flex flex-col items-center justify-center gap-1 shrink-0">
                              <Trash2 size={18} className="text-white" />
                              <span className="text-[10px] text-white font-bold">Eliminar</span>
                            </div>
                          </div>

                          <SwipeCard
                            onSwipeRight={() => tab === "pagadas" ? handleUnpay(d.id) : handleMarkPaid(d.id)}
                            onSwipeLeft={() => handleDelete(d.id)}
                            className="glass-card-hover p-4 relative cursor-grab active:cursor-grabbing"
                          >
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${d.type === "debo" ? "gradient-destructive" : "gradient-success"}`} />
                          <div className="flex items-start justify-between pl-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`text-lg font-extrabold ${d.type === "debo" ? "text-destructive" : "text-success"}`}>
                                  ${d.amount.toLocaleString()}
                                </p>
                                {d.payments.length > 0 && !d.paid && (
                                  <span className="text-[10px] font-bold bg-warning/15 text-warning px-1.5 py-0.5 rounded-md">
                                    Resta ${remaining.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{d.concept}</p>
                              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{d.date}</p>

                              {/* Progress bar for partial payments */}
                              {d.payments.length > 0 && (
                                <div className="mt-2">
                                  <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progress}%` }}
                                      transition={{ duration: 0.8, ease: "easeOut" }}
                                      className={`h-full rounded-full ${d.paid ? "bg-success" : "bg-warning"}`}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-[9px] text-muted-foreground/50">
                                      {d.payments.length} abono{d.payments.length > 1 ? "s" : ""}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground/50">{Math.round(progress)}%</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`stat-badge text-[10px] ${
                                d.type === "debo" ? "bg-destructive/12 text-destructive" : "bg-success/12 text-success"
                              }`}>
                                {d.type === "debo" ? <><ArrowUpRight size={10} /> Debo</> : <><ArrowDownLeft size={10} /> Me deben</>}
                              </span>
                              {tab === "activas" && (
                                <div className="flex gap-1.5 mt-1">
                                  <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={() => { setShowPayment(d.id); setPaymentAmount(""); }}
                                    className="w-7 h-7 rounded-lg bg-warning/15 flex items-center justify-center"
                                  >
                                    <Minus size={12} className="text-warning" />
                                  </motion.button>
                                  <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={() => handleMarkPaid(d.id)}
                                    className="w-7 h-7 rounded-lg bg-success/15 flex items-center justify-center"
                                  >
                                    <Check size={12} className="text-success" />
                                  </motion.button>
                                  <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={() => handleDelete(d.id)}
                                    className="w-7 h-7 rounded-lg bg-destructive/15 flex items-center justify-center"
                                  >
                                    <Trash2 size={12} className="text-destructive" />
                                  </motion.button>
                                </div>
                              )}
                            </div>
                          </div>
                          </SwipeCard>
                        </div>{/* end swipe wrapper */}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Add Debt Sheet */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end" onClick={() => setShowAdd(false)}>
            <div className="absolute inset-0" style={{ background: 'hsla(228, 12%, 6%, 0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bottom-sheet w-full max-w-lg mx-auto p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="flex items-center justify-between mb-6 mt-2">
                <h2 className="text-xl font-extrabold">Nueva Deuda</h2>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowAdd(false)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <X size={16} />
                </motion.button>
              </div>

              {/* Type selector */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setNewType("debo")}
                  className={`py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    newType === "debo"
                      ? "bg-destructive/20 text-destructive ring-2 ring-destructive/30"
                      : "bg-secondary/60 text-muted-foreground"
                  }`}
                >
                  <ArrowUpRight size={14} /> Yo debo
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setNewType("me_deben")}
                  className={`py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    newType === "me_deben"
                      ? "bg-success/20 text-success ring-2 ring-success/30"
                      : "bg-secondary/60 text-muted-foreground"
                  }`}
                >
                  <ArrowDownLeft size={14} /> Me deben
                </motion.button>
              </div>

              <input
                value={newPerson}
                onChange={e => setNewPerson(e.target.value)}
                placeholder="Persona o entidad"
                className="w-full bg-secondary/60 rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground mb-3 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px]"
              />
              <input
                value={newAmount}
                onChange={e => setNewAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="Monto"
                inputMode="decimal"
                className="w-full bg-secondary/60 rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground mb-3 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px]"
              />
              <input
                value={newConcept}
                onChange={e => setNewConcept(e.target.value)}
                placeholder="Concepto (opcional)"
                className="w-full bg-secondary/60 rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground mb-5 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px]"
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAdd}
                className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl"
                style={{ boxShadow: 'var(--shadow-glow-blue)' }}
              >
                Guardar
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Sheet */}
      <AnimatePresence>
        {showPayment !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end" onClick={() => setShowPayment(null)}>
            <div className="absolute inset-0" style={{ background: 'hsla(228, 12%, 6%, 0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bottom-sheet w-full max-w-lg mx-auto p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="flex items-center justify-between mb-4 mt-2">
                <h2 className="text-xl font-extrabold">Registrar Abono</h2>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowPayment(null)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <X size={16} />
                </motion.button>
              </div>
              {(() => {
                const debt = debts.find(d => d.id === showPayment);
                if (!debt) return null;
                const remaining = getRemaining(debt);
                return (
                  <>
                    <div className="glass-card p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold">{debt.person}</p>
                          <p className="text-xs text-muted-foreground">{debt.concept}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Restante</p>
                          <p className="text-lg font-extrabold text-warning">${remaining.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <input
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder={`Monto (máx $${remaining.toLocaleString()})`}
                      inputMode="decimal"
                      className="w-full bg-secondary/60 rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground mb-3 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px]"
                    />
                    <div className="flex gap-2 mb-5">
                      {[0.25, 0.5, 1].map(pct => (
                        <motion.button
                          key={pct}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setPaymentAmount(String(Math.round(remaining * pct)))}
                          className="flex-1 py-2.5 rounded-xl bg-secondary/60 text-sm font-bold text-muted-foreground hover:bg-secondary transition-colors"
                        >
                          {pct === 1 ? "Todo" : `${pct * 100}%`}
                        </motion.button>
                      ))}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handlePayment(showPayment)}
                      className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl"
                      style={{ boxShadow: 'var(--shadow-glow-blue)' }}
                    >
                      Aplicar Abono
                    </motion.button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DeudasPage;
