import { useState, useMemo } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotas } from "@/hooks/useNotas";
import {
  Plus, Search, FileText, PenTool, Clock, X, Trash2, Pin,
  Home, Briefcase, Heart, BookOpen, Lightbulb, MoreHorizontal,
  ArrowUpDown, ChevronDown, Edit3, Tag, CheckSquare, Square, ListChecks, Palette
} from "lucide-react";
import AnimatedCounter from "@/components/AnimatedCounter";

// ── Types ──
type NoteCategory = "personal" | "trabajo" | "salud" | "estudio" | "ideas" | "otro";

type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
};

type Note = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  category: NoteCategory;
  colorClass: string;
  noteColor: string; // HSL-based bg color token
  pinned: boolean;
  checklist: ChecklistItem[];
};

// ── Config ──
const categoryConfig: Record<NoteCategory, { label: string; icon: typeof Home; color: string; bg: string }> = {
  personal: { label: "Personal", icon: Home, color: "text-primary", bg: "bg-primary/15" },
  trabajo: { label: "Trabajo", icon: Briefcase, color: "text-warning", bg: "bg-warning/15" },
  salud: { label: "Salud", icon: Heart, color: "text-destructive", bg: "bg-destructive/15" },
  estudio: { label: "Estudio", icon: BookOpen, color: "text-cyan", bg: "bg-cyan/15" },
  ideas: { label: "Ideas", icon: Lightbulb, color: "text-purple", bg: "bg-purple/15" },
  otro: { label: "Otro", icon: Tag, color: "text-muted-foreground", bg: "bg-secondary" },
};

const NOTE_COLORS: { name: string; hsl: string; light: string }[] = [
  { name: "Default", hsl: "", light: "" },
  { name: "Amarillo", hsl: "43 96% 56%", light: "43 96% 56% / 0.12" },
  { name: "Rosa", hsl: "330 80% 60%", light: "330 80% 60% / 0.12" },
  { name: "Morado", hsl: "270 70% 60%", light: "270 70% 60% / 0.12" },
  { name: "Azul", hsl: "211 100% 50%", light: "211 100% 50% / 0.12" },
  { name: "Verde", hsl: "145 63% 49%", light: "145 63% 49% / 0.12" },
  { name: "Naranja", hsl: "25 95% 53%", light: "25 95% 53% / 0.12" },
  { name: "Cyan", hsl: "190 90% 50%", light: "190 90% 50% / 0.12" },
];

const colorOptions = [
  "bg-purple/15", "bg-warning/15", "bg-destructive/15", "bg-primary/15",
  "bg-success/15", "bg-cyan/15", "bg-pink/15", "bg-orange/15",
];


// ── Animations ──
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const formatTimeAgo = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "Justo ahora";
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
};

const genId = () => Math.random().toString(36).slice(2, 9);

// ── Component ──
const NotasPage = () => {
  const { notas, isLoading, crear, actualizar, eliminar } = useNotas();

  // Adaptar Nota (DB) → Note (UI)
  const notes: Note[] = useMemo(() => notas.map(n => {
    const cat = (n.etiquetas[0] ?? "personal") as NoteCategory;
    let checklist: ChecklistItem[] = [];
    if (n.checklist && n.contenido) {
      try { checklist = JSON.parse(n.contenido); } catch { checklist = []; }
    }
    return {
      id: n.id!,
      title: n.titulo,
      body: n.checklist ? "" : (n.contenido ?? ""),
      createdAt: n.created_at ?? new Date().toISOString(),
      category: Object.keys(categoryConfig).includes(cat) ? cat : "personal",
      colorClass: n.color_class ?? colorOptions[0],
      noteColor: n.note_color ?? "",
      pinned: n.pinned ?? false,
      checklist,
    };
  }), [notas]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filterCategory, setFilterCategory] = useState<NoteCategory | "all">("all");
  const [sortBy, setSortBy] = useState<"recent" | "alpha">("recent");
  const [swipedId, setSwipedId] = useState<number | null>(null);

  // New note form
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState<NoteCategory>("personal");
  const [newNoteColor, setNewNoteColor] = useState("");
  const [newChecklist, setNewChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");

  // ── Computed ──
  const totalWords = useMemo(() => notes.reduce((s, n) => s + n.body.split(" ").length + n.title.split(" ").length, 0), [notes]);
  const pinnedCount = useMemo(() => notes.filter(n => n.pinned).length, [notes]);

  const filteredNotes = useMemo(() => {
    let result = [...notes];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
      );
    }
    if (filterCategory !== "all") {
      result = result.filter(n => n.category === filterCategory);
    }
    result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sortBy === "alpha") return a.title.localeCompare(b.title);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [notes, searchQuery, filterCategory, sortBy]);

  if (isLoading) {
    return (
      <div className="px-4 pt-12 pb-24 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className={`rounded-2xl ${i % 3 === 0 ? "h-36" : "h-28"}`} />
          ))}
        </div>
      </div>
    );
  }

  // ── Actions ──
  const addNote = () => {
    if (!newTitle.trim()) return;
    const esChecklist = newChecklist.length > 0;
    crear.mutate({
      titulo: newTitle.trim(),
      contenido: esChecklist ? JSON.stringify(newChecklist) : newBody.trim(),
      etiquetas: [newCategory],
      color_class: colorOptions[Math.floor(Math.random() * colorOptions.length)],
      note_color: newNoteColor || undefined,
      pinned: false,
      checklist: esChecklist,
    });
    setNewTitle(""); setNewBody(""); setNewCategory("personal"); setNewNoteColor(""); setNewChecklist([]); setNewChecklistText(""); setShowAdd(false);
  };

  const deleteNote = (id: number) => {
    eliminar.mutate(id);
    setSelectedNote(null);
    setSwipedId(null);
  };

  const togglePin = (id: number) => {
    const nota = notas.find(n => n.id === id);
    if (!nota) return;
    actualizar.mutate({ id, updates: { pinned: !nota.pinned } });
    if (selectedNote?.id === id) setSelectedNote(prev => prev ? { ...prev, pinned: !prev.pinned } : null);
  };

  const toggleChecklistItem = (noteId: number, itemId: string) => {
    const nota = notas.find(n => n.id === noteId);
    if (!nota) return;
    let items: ChecklistItem[] = [];
    try { items = JSON.parse(nota.contenido ?? "[]"); } catch { items = []; }
    const updated = items.map(c => c.id === itemId ? { ...c, checked: !c.checked } : c);
    actualizar.mutate({ id: noteId, updates: { contenido: JSON.stringify(updated) } });
    if (selectedNote?.id === noteId) {
      setSelectedNote(prev => prev ? {
        ...prev,
        checklist: prev.checklist.map(c => c.id === itemId ? { ...c, checked: !c.checked } : c)
      } : null);
    }
  };

  const addChecklistToForm = () => {
    if (!newChecklistText.trim()) return;
    setNewChecklist(prev => [...prev, { id: genId(), text: newChecklistText.trim(), checked: false }]);
    setNewChecklistText("");
  };

  const removeChecklistFromForm = (id: string) => {
    setNewChecklist(prev => prev.filter(c => c.id !== id));
  };

  // ── Swipe ──
  const handleDragEnd = (id: number, _: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -80) setSwipedId(id);
    else if (info.offset.x > 80) { togglePin(id); setSwipedId(null); }
    else setSwipedId(null);
  };

  const getNoteStyle = (noteColor: string) => {
    if (!noteColor) return {};
    return { backgroundColor: `hsla(${noteColor})` };
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="px-4 pt-12 pb-24">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="icon-container-lg" style={{ background: 'linear-gradient(135deg, hsl(var(--pink)), hsl(var(--purple)))', boxShadow: '0 4px 20px -4px hsla(330, 80%, 60%, 0.3)' }}>
            <PenTool size={22} className="text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Notas</h1>
            <p className="text-sm text-muted-foreground">{notes.length} notas · {pinnedCount} fijadas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setShowSearch(s => !s)}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${showSearch ? 'gradient-primary' : 'bg-secondary/80'}`}
          >
            <Search size={18} className={showSearch ? 'text-primary-foreground' : 'text-foreground'} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85, rotate: 90 }}
            onClick={() => setShowAdd(true)}
            className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center"
            style={{ boxShadow: 'var(--shadow-glow-blue)' }}
          >
            <Plus size={18} className="text-primary-foreground" />
          </motion.button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <motion.div variants={fadeUp} className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar en notas..."
                  className="w-full bg-secondary/60 rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary transition-all"
                  autoFocus
                />
                {searchQuery && (
                  <motion.button
                    initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.8 }}
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center"
                  >
                    <X size={10} />
                  </motion.button>
                )}
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSortBy(s => s === "recent" ? "alpha" : "recent")}
                className={`shrink-0 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  sortBy !== "recent" ? "gradient-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
                }`}
              >
                <ArrowUpDown size={13} />
                {sortBy === "recent" ? "Recientes" : "A-Z"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 mb-4">
        <div className="glass-card p-3.5 text-center">
          <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center mb-1.5 mx-auto">
            <FileText size={14} className="text-primary" />
          </div>
          <p className="text-lg font-extrabold"><AnimatedCounter target={notes.length} /></p>
          <p className="text-[10px] text-muted-foreground font-medium">Notas</p>
        </div>
        <div className="glass-card p-3.5 text-center">
          <div className="w-8 h-8 rounded-xl bg-warning/15 flex items-center justify-center mb-1.5 mx-auto">
            <PenTool size={14} className="text-warning" />
          </div>
          <p className="text-lg font-extrabold"><AnimatedCounter target={totalWords} /></p>
          <p className="text-[10px] text-muted-foreground font-medium">Palabras</p>
        </div>
        <div className="glass-card p-3.5 text-center">
          <div className="w-8 h-8 rounded-xl bg-purple/15 flex items-center justify-center mb-1.5 mx-auto">
            <Pin size={14} className="text-purple" />
          </div>
          <p className="text-lg font-extrabold"><AnimatedCounter target={pinnedCount} /></p>
          <p className="text-[10px] text-muted-foreground font-medium">Fijadas</p>
        </div>
      </motion.div>

      {/* Category Filters */}
      <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setFilterCategory("all")}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterCategory === "all" ? "gradient-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
          }`}
        >
          Todas
        </motion.button>
        {(Object.keys(categoryConfig) as NoteCategory[]).map(cat => {
          const CatIcon = categoryConfig[cat].icon;
          return (
            <motion.button
              key={cat}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterCategory === cat ? "gradient-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
              }`}
            >
              <CatIcon size={12} /> {categoryConfig[cat].label}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Swipe Hint */}
      <motion.p variants={fadeUp} className="text-[10px] text-muted-foreground/50 text-center mb-3 font-medium">
        ← Desliza para eliminar · Desliza para fijar →
      </motion.p>

      {/* Notes Masonry */}
      <motion.div variants={fadeUp} className="columns-2 gap-3">
        <AnimatePresence>
          {filteredNotes.map((note, i) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="mb-3 break-inside-avoid relative"
            >
              {/* Delete background */}
              <div className="absolute inset-0 rounded-[calc(var(--radius)+4px)] bg-destructive/20 flex items-center justify-end pr-4">
                <Trash2 size={18} className="text-destructive" />
              </div>
              {/* Pin background */}
              <div className="absolute inset-0 rounded-[calc(var(--radius)+4px)] bg-purple/20 flex items-center pl-4">
                <Pin size={18} className="text-purple" />
              </div>

              <motion.button
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.4}
                onDragEnd={(_, info) => handleDragEnd(note.id, _, info)}
                whileTap={{ scale: 0.97 }}
                onClick={() => { if (!swipedId) setSelectedNote(note); }}
                className={`glass-card-hover p-4 w-full text-left relative z-10 ${
                  i % 3 === 0 ? "min-h-[170px]" : "min-h-[130px]"
                }`}
                style={getNoteStyle(note.noteColor)}
              >
                {/* Pin indicator */}
                {note.pinned && (
                  <div className="absolute top-2.5 right-2.5">
                    <Pin size={12} className="text-purple" />
                  </div>
                )}

                {/* Category icon */}
                <div className={`w-8 h-8 rounded-xl ${categoryConfig[note.category].bg} flex items-center justify-center mb-2.5`}>
                  {(() => {
                    const CatIcon = categoryConfig[note.category].icon;
                    return <CatIcon size={14} className={categoryConfig[note.category].color} />;
                  })()}
                </div>

                <h3 className="font-bold text-[14px] mb-1 leading-tight">{note.title}</h3>
                <p className="text-[12px] text-muted-foreground line-clamp-3 leading-relaxed">{note.body}</p>

                {/* Checklist preview */}
                {note.checklist.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {note.checklist.slice(0, 3).map(item => (
                      <div key={item.id} className="flex items-center gap-1.5">
                        {item.checked ? (
                          <CheckSquare size={10} className="text-primary shrink-0" />
                        ) : (
                          <Square size={10} className="text-muted-foreground/50 shrink-0" />
                        )}
                        <span className={`text-[10px] truncate ${item.checked ? "line-through text-muted-foreground/50" : "text-muted-foreground"}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                    {note.checklist.length > 3 && (
                      <p className="text-[9px] text-muted-foreground/40 pl-4">+{note.checklist.length - 3} más</p>
                    )}
                  </div>
                )}

                <div className="mt-2.5 flex items-center justify-between">
                  <p className="text-[9px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Clock size={9} /> {formatTimeAgo(note.createdAt)}
                  </p>
                  <span className={`text-[9px] font-bold ${categoryConfig[note.category].color}`}>
                    {categoryConfig[note.category].label}
                  </span>
                </div>
              </motion.button>

              {/* Swiped delete action */}
              <AnimatePresence>
                {swipedId === note.id && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex gap-2"
                  >
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => deleteNote(note.id)}
                      className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center"
                      style={{ boxShadow: 'var(--shadow-glow-red)' }}
                    >
                      <Trash2 size={16} className="text-destructive-foreground" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setSwipedId(null)}
                      className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
                    >
                      <X size={14} />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty state */}
      {filteredNotes.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground font-medium text-sm">No se encontraron notas</p>
          <p className="text-muted-foreground/50 text-xs mt-1">Intenta con otra búsqueda o categoría</p>
        </motion.div>
      )}

      {/* Note Detail - Fullscreen like iOS Notes */}
      <AnimatePresence>
        {selectedNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 bg-background flex flex-col"
              style={selectedNote.noteColor ? { backgroundColor: `hsla(${selectedNote.noteColor})` } : {}}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 pt-14 pb-3 border-b border-border/30">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedNote(null)}
                  className="flex items-center gap-1 text-primary text-sm font-semibold"
                >
                  <ChevronDown size={18} className="rotate-90" />
                  Notas
                </motion.button>
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => togglePin(selectedNote.id)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${selectedNote.pinned ? 'bg-purple/20' : 'bg-secondary'}`}>
                    <Pin size={14} className={selectedNote.pinned ? "text-purple" : "text-muted-foreground"} />
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => deleteNote(selectedNote.id)}
                    className="w-9 h-9 rounded-full bg-destructive/15 flex items-center justify-center">
                    <Trash2 size={14} className="text-destructive" />
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 pt-5 pb-10">
                {/* Category badge */}
                <div className="flex items-center gap-2 mb-4">
                  <div className={`px-2.5 py-1 rounded-lg ${categoryConfig[selectedNote.category].bg} flex items-center gap-1.5`}>
                    {(() => {
                      const CatIcon = categoryConfig[selectedNote.category].icon;
                      return <CatIcon size={12} className={categoryConfig[selectedNote.category].color} />;
                    })()}
                    <span className={`text-[11px] font-bold ${categoryConfig[selectedNote.category].color}`}>
                      {categoryConfig[selectedNote.category].label}
                    </span>
                  </div>
                  {selectedNote.pinned && (
                    <div className="px-2.5 py-1 rounded-lg bg-purple/15 flex items-center gap-1">
                      <Pin size={11} className="text-purple" />
                      <span className="text-[11px] font-bold text-purple">Fijada</span>
                    </div>
                  )}
                </div>

                <h1 className="text-2xl font-extrabold mb-2 leading-tight">{selectedNote.title}</h1>

                <p className="text-xs text-muted-foreground mb-6 flex items-center gap-1">
                  <Clock size={11} /> {formatTimeAgo(selectedNote.createdAt)}
                </p>

                {selectedNote.body && (
                  <p className="text-foreground leading-relaxed text-[16px] whitespace-pre-wrap mb-6">{selectedNote.body}</p>
                )}

                {/* Checklist in detail view */}
                {selectedNote.checklist.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-3">
                      <ListChecks size={16} className="text-primary" />
                      <span className="text-sm font-bold">Lista de verificación</span>
                      <span className="text-xs text-muted-foreground">
                        {selectedNote.checklist.filter(c => c.checked).length}/{selectedNote.checklist.length}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-secondary mb-4 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full gradient-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${(selectedNote.checklist.filter(c => c.checked).length / selectedNote.checklist.length) * 100}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                    {selectedNote.checklist.map(item => (
                      <motion.button
                        key={item.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleChecklistItem(selectedNote.id, item.id)}
                        className="w-full flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-secondary/30 transition-colors text-left"
                      >
                        {item.checked ? (
                          <CheckSquare size={18} className="text-primary shrink-0" />
                        ) : (
                          <Square size={18} className="text-muted-foreground/40 shrink-0" />
                        )}
                        <span className={`text-[15px] ${item.checked ? "line-through text-muted-foreground/50" : "text-foreground"}`}>
                          {item.text}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Note Sheet */}
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
                <h2 className="text-xl font-extrabold">Nueva Nota</h2>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowAdd(false)}
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <X size={16} />
                </motion.button>
              </div>

              {/* Category Selector */}
              <div className="mb-4">
                <p className="text-[11px] text-muted-foreground font-bold tracking-wider uppercase mb-2">Categoría</p>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(categoryConfig) as NoteCategory[]).map(cat => {
                    const CatIcon = categoryConfig[cat].icon;
                    return (
                      <motion.button
                        key={cat}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setNewCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          newCategory === cat ? "gradient-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
                        }`}
                      >
                        <CatIcon size={12} /> {categoryConfig[cat].label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selector */}
              <div className="mb-4">
                <p className="text-[11px] text-muted-foreground font-bold tracking-wider uppercase mb-2 flex items-center gap-1.5">
                  <Palette size={12} /> Color de nota
                </p>
                <div className="flex gap-2">
                  {NOTE_COLORS.map((c, idx) => (
                    <motion.button
                      key={idx}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setNewNoteColor(c.light)}
                      className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                        newNoteColor === c.light ? "border-primary scale-110" : "border-border/30"
                      }`}
                      style={c.hsl ? { backgroundColor: `hsl(${c.hsl})` } : { backgroundColor: 'hsl(var(--secondary))' }}
                    >
                      {newNoteColor === c.light && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2 h-2 rounded-full bg-foreground" />
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Título"
                className="w-full bg-secondary/60 rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground mb-3 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px] font-bold"
                autoFocus
              />
              <textarea
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                placeholder="Escribe tu nota..."
                rows={3}
                className="w-full bg-secondary/60 rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground mb-4 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px] resize-none"
              />

              {/* Checklist Builder */}
              <div className="mb-5">
                <p className="text-[11px] text-muted-foreground font-bold tracking-wider uppercase mb-2 flex items-center gap-1.5">
                  <ListChecks size={12} /> Lista de verificación
                </p>
                {newChecklist.map(item => (
                  <div key={item.id} className="flex items-center gap-2 mb-1.5">
                    <Square size={14} className="text-muted-foreground/40 shrink-0" />
                    <span className="text-sm text-foreground flex-1">{item.text}</span>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => removeChecklistFromForm(item.id)}>
                      <X size={12} className="text-muted-foreground" />
                    </motion.button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={newChecklistText}
                    onChange={e => setNewChecklistText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChecklistToForm(); } }}
                    placeholder="Agregar elemento..."
                    className="flex-1 bg-secondary/40 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={addChecklistToForm}
                    className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center"
                  >
                    <Plus size={14} className="text-primary" />
                  </motion.button>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={addNote}
                className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
                style={{ boxShadow: 'var(--shadow-glow-blue)' }}
              >
                <Plus size={18} /> Guardar Nota
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default NotasPage;
