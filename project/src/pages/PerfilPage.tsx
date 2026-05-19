import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useFirstVisit } from "@/hooks/useFirstVisit";
import {
  User, Copy, Check, ChevronLeft, Plus, X, FileText,
  CreditCard, Shield, QrCode, Image, Trash2, Palette, Sparkles, Zap, Rocket, Stars, Settings,
  Bell, BellOff, Camera, Edit3, Upload, Phone, Mail, Home, Briefcase, Hash, Key, Car, Heart,
  Building2, GraduationCap, Globe, LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { renderGlobalAvatar } from "@/lib/avatarHelper";
import AvatarShowcase from "@/components/avatars/AvatarShowcase";
import type { AvatarStyle } from "@/components/avatars/AvatarShowcase";
import { perfilService } from "@/services/supabaseService";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import type { DatoPersonal, Documento } from "@/types";

const ICON_OPTIONS: { name: string; icon: LucideIcon }[] = [
  { name: "CreditCard", icon: CreditCard },
  { name: "FileText",   icon: FileText   },
  { name: "Shield",     icon: Shield     },
  { name: "User",       icon: User       },
  { name: "Phone",      icon: Phone      },
  { name: "Mail",       icon: Mail       },
  { name: "Home",       icon: Home       },
  { name: "Briefcase",  icon: Briefcase  },
  { name: "Hash",       icon: Hash       },
  { name: "Key",        icon: Key        },
  { name: "Car",        icon: Car        },
  { name: "Heart",      icon: Heart      },
  { name: "Building2",  icon: Building2  },
  { name: "GraduationCap", icon: GraduationCap },
  { name: "Globe",      icon: Globe      },
  { name: "QrCode",     icon: QrCode     },
];

const getIconComponent = (name: string): LucideIcon => {
  return ICON_OPTIONS.find(o => o.name === name)?.icon ?? FileText;
};

export type SplashAnimStyle = "terminal" | "portal" | "minimal" | "explosion";

const SPLASH_ANIM_OPTIONS: { id: SplashAnimStyle; label: string; desc: string; icon: typeof Zap }[] = [
  { id: "terminal", label: "Terminal", desc: "Arranque estilo hacker", icon: Zap },
  { id: "portal", label: "Portal", desc: "Entrada interdimensional", icon: Sparkles },
  { id: "minimal", label: "Minimal", desc: "Simple y elegante", icon: Stars },
  { id: "explosion", label: "Explosión", desc: "Entrada épica", icon: Rocket },
];


const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const PerfilPage = () => {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [swipedFieldId, setSwipedFieldId] = useState<string | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newIcon, setNewIcon] = useState("FileText");
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null);
  const [flippedDocId, setFlippedDocId] = useState<number | null>(null);
  const [longPressDocId, setLongPressDocId] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docSwipeStartX = useRef<number | null>(null);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState<"qr" | "image" | "doc">("doc");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(() => {
    return (localStorage.getItem("avatar-style") as AvatarStyle) || "orb";
  });
  const [splashAnim, setSplashAnim] = useState<SplashAnimStyle>(() => {
    return (localStorage.getItem("splash-anim-style") as SplashAnimStyle) || "terminal";
  });
  const [showSplashPicker, setShowSplashPicker] = useState(false);

  useEffect(() => {
    const open = showAddField || showAddDoc || !!selectedDoc || showAvatarPicker || showSplashPicker
    window.dispatchEvent(new Event(open ? 'modal-open' : 'modal-close'))
  }, [showAddField, showAddDoc, selectedDoc, showAvatarPicker, showSplashPicker])

  // Username state
  const [userName, setUserName] = useState(() => localStorage.getItem("user-name") || "Pedro");
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem("notifications-enabled") !== "false";
  });

  // Push notifications (recordatorios)
  const { isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushSubscription();

  // Doc upload ref
  const docUploadRef = useRef<HTMLInputElement>(null);

  const handleSplashAnimSelect = (style: SplashAnimStyle) => {
    setSplashAnim(style);
    localStorage.setItem("splash-anim-style", style);
    toast.success("Animación de inicio actualizada");
    setShowSplashPicker(false);
  };

  const handleAvatarSelect = (style: AvatarStyle) => {
    setAvatarStyle(style);
    localStorage.setItem("avatar-style", style);
    window.dispatchEvent(new CustomEvent("avatar-changed"));
    toast.success("Avatar actualizado");
  };

  const renderCurrentAvatar = (size: number) => renderGlobalAvatar(size, undefined, avatarStyle);

  // Name editing
  const startEditingName = () => {
    setTempName(userName);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };
  const saveName = () => {
    const name = tempName.trim() || "Pedro";
    setUserName(name);
    localStorage.setItem("user-name", name);
    setEditingName(false);
    toast.success("Nombre actualizado");
  };

  // Notifications toggle
  const toggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    localStorage.setItem("notifications-enabled", String(next));
    toast.success(next ? "Notificaciones activadas" : "Notificaciones desactivadas");
  };

  // Doc image upload
  const handleDocImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (selectedDoc?.id) {
        actualizarDocumento.mutate({ id: selectedDoc.id, updates: { preview: dataUrl } });
        setSelectedDoc(prev => prev ? { ...prev, preview: dataUrl } : null);
        toast.success("Imagen cargada");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAddDocWithImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        crearDocumento.mutate({ name: file.name.split(".")[0] || "Documento", type: "image", preview: dataUrl });
        toast.success("Documento agregado");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const queryClient = useQueryClient();

  const { data: fields = [] } = useQuery({
    queryKey: ['datos_personales'],
    queryFn: perfilService.getDatosPersonales,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ['documentos'],
    queryFn: perfilService.getDocumentos,
  });

  const crearDato = useMutation({
    mutationFn: perfilService.createDatoPersonal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datos_personales'] }),
    onError: () => toast.error('Error al guardar dato'),
  });

  const eliminarDato = useMutation({
    mutationFn: perfilService.deleteDatoPersonal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datos_personales'] }),
    onError: () => toast.error('Error al eliminar dato'),
  });

  const crearDocumento = useMutation({
    mutationFn: perfilService.createDocumento,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documentos'] }),
    onError: () => toast.error('Error al guardar documento'),
  });

  const actualizarDocumento = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Documento> }) =>
      perfilService.updateDocumento(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documentos'] }),
  });

  const eliminarDocumento = useMutation({
    mutationFn: perfilService.deleteDocumento,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documentos'] }); setSelectedDoc(null); },
    onError: () => toast.error('Error al eliminar documento'),
  });

  const copyToClipboard = async (id: string, value: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = value;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedId(id);
      toast.success("Copiado al portapapeles");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const addField = () => {
    if (!newLabel.trim() || !newValue.trim()) return;
    crearDato.mutate({ label: newLabel.trim(), value: newValue.trim(), icon: newIcon, orden: fields.length });
    setNewLabel(""); setNewValue(""); setNewIcon("FileText"); setShowAddField(false);
  };

  const deleteField = (id: number) => {
    eliminarDato.mutate(id);
    setSwipedFieldId(null);
  };

  const handleFieldDragEnd = (id: string, info: PanInfo) => {
    const isSwipeLeft = info.offset.x < -60 || (info.offset.x < -20 && info.velocity.x < -300);
    if (isSwipeLeft) setSwipedFieldId(id);
    else setSwipedFieldId(null);
  };

  const deleteDoc = (id: number) => {
    eliminarDocumento.mutate(id);
    setLongPressDocId(null);
    setFlippedDocId(null);
  };

  const openAddDoc = () => {
    setEditingDocId(null);
    setNewDocName("");
    setNewDocType("doc");
    setShowAddDoc(true);
  };

  const openEditDoc = (doc: Documento) => {
    setEditingDocId(doc.id!);
    setNewDocName(doc.name);
    setNewDocType(doc.type);
    setLongPressDocId(null);
    setShowAddDoc(true);
  };

  const saveDoc = () => {
    if (!newDocName.trim()) return;
    if (editingDocId) {
      actualizarDocumento.mutate({ id: editingDocId, updates: { name: newDocName.trim(), type: newDocType } });
    } else {
      crearDocumento.mutate({ name: newDocName.trim(), type: newDocType });
    }
    setShowAddDoc(false);
    setEditingDocId(null);
  };

  const handleDocPointerDown = useCallback((id: number) => {
    longPressTimer.current = setTimeout(() => setLongPressDocId(id), 500);
  }, []);

  const handleDocPointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const getDocIcon = (type: string) => {
    switch (type) {
      case "qr": return QrCode;
      case "image": return Image;
      default: return FileText;
    }
  };

  const getDocColor = (type: string) => {
    switch (type) {
      case "qr": return { bg: "bg-primary/15", text: "text-primary" };
      case "image": return { bg: "bg-purple/15", text: "text-purple" };
      default: return { bg: "bg-warning/15", text: "text-warning" };
    }
  };

  const isFirst = useFirstVisit('perfil')

  return (
    <motion.div variants={stagger} initial={isFirst ? "hidden" : "show"} animate="show" className="px-4 pt-12 pb-4 space-y-5">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-2xl bg-secondary/80 flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Mi Perfil</h1>
          <p className="text-sm text-muted-foreground">Datos y documentos</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setShowSplashPicker(true)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.25, type: "spring" }}
          className="w-10 h-10 rounded-xl bg-secondary/80 flex items-center justify-center"
        >
          <Settings size={18} className="text-muted-foreground" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAvatarPicker(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="w-14 h-14 rounded-2xl overflow-hidden relative group"
          style={{
            boxShadow: "0 0 30px hsla(211, 100%, 50%, 0.3)",
            background: "radial-gradient(circle, hsla(225, 10%, 15%, 0.9), hsla(225, 10%, 8%, 0.95))",
          }}
        >
          {renderCurrentAvatar(56)}
          <div className="absolute inset-0 bg-black/0 group-active:bg-black/30 transition-colors flex items-center justify-center">
            <Palette size={14} className="text-white opacity-0 group-active:opacity-100 transition-opacity" />
          </div>
        </motion.button>
      </motion.div>

      {/* Data Fields */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard size={14} className="text-primary" />
            <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">DATOS PERSONALES</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.85, rotate: 90 }}
            onClick={() => setShowAddField(true)}
            className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center"
            style={{ boxShadow: "var(--shadow-glow-blue)" }}
          >
            <Plus size={14} className="text-primary-foreground" />
          </motion.button>
        </div>
        {swipedFieldId !== null && (
          <div className="fixed inset-0 z-[9]" onClick={() => setSwipedFieldId(null)} />
        )}
        <div className="space-y-2">
          {fields.map((field, i) => {
            const fieldIdStr = String(field.id);
            const isCopied = copiedId === fieldIdStr;
            const FieldIcon = getIconComponent(field.icon);
            return (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="relative"
              >
                {draggingFieldId === fieldIdStr && (
                  <div className="absolute inset-0 rounded-[calc(var(--radius)+4px)] bg-destructive/20 flex items-center justify-end pr-4">
                    <Trash2 size={16} className="text-destructive" />
                  </div>
                )}
                <motion.div
                  drag="x"
                  dragSnapToOrigin
                  dragElastic={0.3}
                  dragMomentum={false}
                  onDragStart={() => setDraggingFieldId(fieldIdStr)}
                  onDragEnd={(_, info) => { setDraggingFieldId(null); handleFieldDragEnd(fieldIdStr, info); }}
                  className="glass-card p-4 flex items-center gap-3 relative z-10"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FieldIcon size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase">{field.label}</p>
                    <p className="text-[15px] font-semibold font-mono truncate">{field.value}</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => copyToClipboard(fieldIdStr, field.value)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isCopied ? "bg-success/15" : "bg-secondary/80"
                    }`}
                  >
                    {isCopied ? <Check size={15} className="text-success" /> : <Copy size={15} className="text-muted-foreground" />}
                  </motion.button>
                </motion.div>
                <AnimatePresence>
                  {swipedFieldId === fieldIdStr && (
                    <motion.button
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => deleteField(field.id!)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-destructive flex items-center justify-center"
                      style={{ boxShadow: 'var(--shadow-glow-red)' }}
                    >
                      <Trash2 size={15} className="text-destructive-foreground" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Documents Grid */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <QrCode size={14} className="text-primary" />
            <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">DOCUMENTOS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">{docs.length} archivos</span>
            <motion.button
              whileTap={{ scale: 0.85, rotate: 90 }}
              onClick={openAddDoc}
              className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center"
              style={{ boxShadow: "var(--shadow-glow-blue)" }}
            >
              <Plus size={14} className="text-primary-foreground" />
            </motion.button>
          </div>
        </div>
        {longPressDocId !== null && (
          <div className="fixed inset-0 z-[9]" onClick={() => setLongPressDocId(null)} />
        )}
        <div className="grid grid-cols-2 gap-3">
          {docs.map((doc, i) => {
            const DocIcon = getDocIcon(doc.type);
            const colors = getDocColor(doc.type);
            const isFlipped = flippedDocId === doc.id;
            const isLongPressed = longPressDocId === doc.id;
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="relative h-[140px]"
                style={{ perspective: 1000, zIndex: isLongPressed ? 20 : undefined }}
              >
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  style={{ transformStyle: "preserve-3d", position: "relative", width: "100%", height: "100%" }}
                >
                  {/* ── Frente ── */}
                  <div
                    className="glass-card p-4 flex flex-col items-center gap-3 justify-center text-center cursor-pointer absolute inset-0 rounded-[calc(var(--radius))] select-none"
                    style={{ backfaceVisibility: "hidden" }}
                    onClick={() => { if (!isLongPressed) setFlippedDocId(isFlipped ? null : doc.id!); }}
                    onPointerDown={() => handleDocPointerDown(doc.id!)}
                    onPointerUp={handleDocPointerUp}
                    onPointerLeave={handleDocPointerUp}
                    onTouchStart={e => { docSwipeStartX.current = e.touches[0].clientX; }}
                    onTouchEnd={e => {
                      if (docSwipeStartX.current !== null) {
                        const delta = Math.abs(e.changedTouches[0].clientX - docSwipeStartX.current);
                        if (delta > 50) setFlippedDocId(doc.id!);
                        docSwipeStartX.current = null;
                      }
                    }}
                  >
                    <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center`}>
                      <DocIcon size={22} className={colors.text} />
                    </div>
                    <p className="text-sm font-semibold">{doc.name}</p>

                    {/* Long press menu */}
                    <AnimatePresence>
                      {isLongPressed && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          className="absolute inset-0 rounded-[calc(var(--radius))] bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10"
                          onClick={e => e.stopPropagation()}
                        >
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => openEditDoc(doc)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/15 text-primary font-semibold text-sm"
                          >
                            <Edit3 size={14} /> Editar
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => deleteDoc(doc.id!)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/15 text-destructive font-semibold text-sm"
                          >
                            <Trash2 size={14} /> Eliminar
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ── Reverso ── */}
                  <div
                    className="glass-card absolute inset-0 rounded-[calc(var(--radius))] overflow-hidden flex flex-col"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    {/* Preview con swipe nativo para voltear */}
                    <div
                      className="flex-1 flex items-center justify-center bg-secondary/30 cursor-pointer"
                      onTouchStart={e => { docSwipeStartX.current = e.touches[0].clientX; }}
                      onTouchEnd={e => {
                        if (docSwipeStartX.current !== null) {
                          const delta = Math.abs(e.changedTouches[0].clientX - docSwipeStartX.current);
                          if (delta > 50) setFlippedDocId(null);
                          docSwipeStartX.current = null;
                        }
                      }}
                      onClick={() => { setSelectedDoc(doc); docUploadRef.current?.click(); }}
                    >
                      {doc.preview ? (
                        <img src={doc.preview} alt={doc.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <Upload size={20} className="text-muted-foreground/40 mx-auto mb-1" />
                          <p className="text-[10px] text-muted-foreground/50">Subir imagen</p>
                        </div>
                      )}
                    </div>
                    {/* Barra inferior */}
                    <div className="flex items-center justify-between px-3 py-2 bg-secondary/20">
                      <motion.button whileTap={{ scale: 0.85 }} onClick={() => setFlippedDocId(null)} className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center">
                        <X size={12} className="text-muted-foreground" />
                      </motion.button>
                      <p className="text-[10px] font-semibold text-muted-foreground truncate mx-2 flex-1 text-center">{doc.name}</p>
                      <motion.button whileTap={{ scale: 0.85 }} onClick={() => deleteDoc(doc.id!)} className="w-7 h-7 rounded-lg bg-destructive/15 flex items-center justify-center">
                        <Trash2 size={12} className="text-destructive" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Hidden file input for doc uploads */}
      <input
        ref={docUploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleDocImageUpload}
      />

      {/* Add / Edit Doc Sheet */}
      <AnimatePresence>
        {showAddDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end" onClick={() => setShowAddDoc(false)}>
            <div className="absolute inset-0" style={{ background: 'hsla(228, 12%, 6%, 0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bottom-sheet w-full max-w-lg mx-auto p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="flex items-center justify-between mb-5 mt-2">
                <h2 className="text-xl font-extrabold">{editingDocId ? "Editar Documento" : "Nuevo Documento"}</h2>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowAddDoc(false)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <X size={16} />
                </motion.button>
              </div>
              <input
                value={newDocName}
                onChange={e => setNewDocName(e.target.value)}
                placeholder="Nombre del documento (ej: INE Frente)"
                className="w-full bg-secondary/60 rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground mb-4 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px] font-bold"
                autoFocus
                onKeyDown={e => e.key === "Enter" && saveDoc()}
              />
              <p className="text-[11px] text-muted-foreground font-bold tracking-wider uppercase mb-3">Tipo</p>
              <div className="flex gap-3 mb-5">
                {([
                  { type: "qr" as const,    label: "QR",        Icon: QrCode,   bg: "bg-primary/15",    text: "text-primary"  },
                  { type: "image" as const, label: "Imagen",    Icon: Image,    bg: "bg-purple/15",     text: "text-purple"   },
                  { type: "doc" as const,   label: "Documento", Icon: FileText, bg: "bg-warning/15",    text: "text-warning"  },
                ] as const).map(({ type, label, Icon, bg, text }) => (
                  <motion.button
                    key={type}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setNewDocType(type)}
                    className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl transition-all ${
                      newDocType === type ? "ring-2 ring-primary bg-primary/5" : "bg-secondary/40"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                      <Icon size={18} className={text} />
                    </div>
                    <span className="text-xs font-semibold">{label}</span>
                  </motion.button>
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={saveDoc}
                disabled={!newDocName.trim()}
                className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ boxShadow: 'var(--shadow-glow-blue)' }}
              >
                <Check size={18} /> {editingDocId ? "Guardar Cambios" : "Crear Documento"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Field Sheet */}
      <AnimatePresence>
        {showAddField && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end" onClick={() => setShowAddField(false)}>
            <div className="absolute inset-0" style={{ background: 'hsla(228, 12%, 6%, 0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bottom-sheet w-full max-w-lg mx-auto p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="flex items-center justify-between mb-6 mt-2">
                <h2 className="text-xl font-extrabold">Nuevo Campo</h2>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowAddField(false)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <X size={16} />
                </motion.button>
              </div>
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Nombre del campo (ej: CURP)"
                className="w-full bg-secondary/60 rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground mb-3 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px] font-bold"
                autoFocus
              />
              <input
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                placeholder="Valor"
                className="w-full bg-secondary/60 rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground mb-4 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px]"
                onKeyDown={e => e.key === "Enter" && addField()}
              />
              <p className="text-[11px] text-muted-foreground font-bold tracking-wider uppercase mb-3">Ícono</p>
              <div className="grid grid-cols-8 gap-2 mb-5">
                {ICON_OPTIONS.map(({ name, icon: Icon }) => (
                  <motion.button
                    key={name}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setNewIcon(name)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      newIcon === name ? "gradient-primary" : "bg-secondary/60"
                    }`}
                    style={newIcon === name ? { boxShadow: 'var(--shadow-glow-blue)' } : {}}
                  >
                    <Icon size={16} className={newIcon === name ? "text-primary-foreground" : "text-muted-foreground"} />
                  </motion.button>
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={addField}
                className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
                style={{ boxShadow: 'var(--shadow-glow-blue)' }}
              >
                <Plus size={18} /> Guardar
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Avatar Picker */}
      <AvatarShowcase
        open={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        onSelect={handleAvatarSelect}
        currentStyle={avatarStyle}
      />

      {/* Settings Sheet (Splash Anim + Notifications) */}
      <AnimatePresence>
        {showSplashPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end" onClick={() => setShowSplashPicker(false)}>
            <div className="absolute inset-0" style={{ background: 'hsla(228, 12%, 6%, 0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bottom-sheet w-full max-w-lg mx-auto p-6 max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="flex items-center justify-between mb-5 mt-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Settings size={18} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold">Configuración</h2>
                    <p className="text-xs text-muted-foreground">Personaliza tu experiencia</p>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowSplashPicker(false)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <X size={16} />
                </motion.button>
              </div>

              {/* Nombre */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <User size={14} className="text-primary" />
                  <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">NOMBRE</span>
                </div>
                <div className="glass-card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <User size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingName ? (
                      <input
                        ref={nameInputRef}
                        value={tempName}
                        onChange={e => setTempName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                        onBlur={saveName}
                        className="text-lg font-extrabold bg-transparent outline-none border-b-2 border-primary w-full"
                      />
                    ) : (
                      <p className="text-lg font-extrabold">{userName}</p>
                    )}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={editingName ? saveName : startEditingName}
                    className="w-9 h-9 rounded-xl bg-secondary/80 flex items-center justify-center"
                  >
                    {editingName ? <Check size={14} className="text-success" /> : <Edit3 size={14} className="text-muted-foreground" />}
                  </motion.button>
                </div>
              </div>

              {/* Notifications Toggle */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Bell size={14} className="text-primary" />
                  <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">NOTIFICACIONES</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={toggleNotifications}
                  className={`glass-card p-4 flex items-center gap-3 w-full transition-all ${
                    notificationsEnabled ? "ring-1 ring-primary/30" : ""
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    notificationsEnabled ? "bg-primary/15" : "bg-secondary/60"
                  }`}>
                    {notificationsEnabled ? (
                      <Bell size={18} className="text-primary" />
                    ) : (
                      <BellOff size={18} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold">Recordatorios de Agenda</p>
                    <p className="text-[11px] text-muted-foreground">
                      {notificationsEnabled ? "Recibirás alertas antes de tus eventos" : "Las alertas están desactivadas"}
                    </p>
                  </div>
                  <div className={`w-12 h-7 rounded-full relative transition-colors ${
                    notificationsEnabled ? "bg-primary" : "bg-secondary"
                  }`}>
                    <motion.div
                      className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md"
                      animate={{ left: notificationsEnabled ? 22 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                </motion.button>

                {/* Push notifications toggle — solo visible si el navegador lo soporta */}
                {'PushManager' in window && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => pushSubscribed ? unsubscribePush() : subscribePush()}
                  disabled={pushLoading}
                  className={`glass-card p-4 flex items-center gap-3 w-full mt-3 transition-all ${
                    pushSubscribed ? "ring-1 ring-primary/30" : ""
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    pushSubscribed ? "bg-primary/15" : "bg-secondary/60"
                  }`}>
                    {pushSubscribed ? (
                      <Bell size={18} className="text-primary" />
                    ) : (
                      <BellOff size={18} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold">Recordatorios Push</p>
                    <p className="text-[11px] text-muted-foreground">
                      {pushLoading ? "Procesando..." : pushSubscribed ? "Recibirás notificaciones aunque la app esté cerrada" : "Activar notificaciones en segundo plano"}
                    </p>
                  </div>
                  <div className={`w-12 h-7 rounded-full relative transition-colors ${
                    pushSubscribed ? "bg-primary" : "bg-secondary"
                  }`}>
                    <motion.div
                      className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md"
                      animate={{ left: pushSubscribed ? 22 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                </motion.button>
                )}
              </div>

              {/* Splash Animation */}
              <div className="flex items-center gap-2 mb-3">
                <Rocket size={14} className="text-primary" />
                <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">ANIMACIÓN DE INICIO</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SPLASH_ANIM_OPTIONS.map((opt) => {
                  const isSelected = splashAnim === opt.id;
                  const Icon = opt.icon;
                  return (
                    <motion.button
                      key={opt.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSplashAnimSelect(opt.id)}
                      className={`glass-card p-4 flex flex-col items-center gap-3 relative transition-all ${
                        isSelected ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      {isSelected && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                          <Check size={10} className="text-primary-foreground" />
                        </motion.div>
                      )}
                      <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                        <Icon size={24} className="text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold">{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-4">
                Abre la app en modo incógnito para ver el cambio
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PerfilPage;
