import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Copy, Check, ChevronLeft, Plus, X, FileText,
  CreditCard, Shield, QrCode, Image, Trash2, Palette, Sparkles, Zap, Rocket, Stars, Settings,
  Bell, BellOff, Camera, Edit3, Upload
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { renderGlobalAvatar } from "@/lib/avatarHelper";
import AvatarShowcase from "@/components/avatars/AvatarShowcase";
import type { AvatarStyle } from "@/components/avatars/AvatarShowcase";

export type SplashAnimStyle = "terminal" | "portal" | "minimal" | "explosion";

const SPLASH_ANIM_OPTIONS: { id: SplashAnimStyle; label: string; desc: string; icon: typeof Zap }[] = [
  { id: "terminal", label: "Terminal", desc: "Arranque estilo hacker", icon: Zap },
  { id: "portal", label: "Portal", desc: "Entrada interdimensional", icon: Sparkles },
  { id: "minimal", label: "Minimal", desc: "Simple y elegante", icon: Stars },
  { id: "explosion", label: "Explosión", desc: "Entrada épica", icon: Rocket },
];

type DataField = {
  id: string;
  label: string;
  value: string;
  icon: typeof CreditCard;
};

type DocItem = {
  id: string;
  name: string;
  type: "qr" | "image" | "doc";
  preview?: string;
};

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
  const [showAddField, setShowAddField] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(() => {
    return (localStorage.getItem("avatar-style") as AvatarStyle) || "orb";
  });
  const [splashAnim, setSplashAnim] = useState<SplashAnimStyle>(() => {
    return (localStorage.getItem("splash-anim-style") as SplashAnimStyle) || "terminal";
  });
  const [showSplashPicker, setShowSplashPicker] = useState(false);

  // Username state
  const [userName, setUserName] = useState(() => localStorage.getItem("user-name") || "Pedro");
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem("notifications-enabled") !== "false";
  });

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
    toast.success("Avatar actualizado");
  };

  const renderCurrentAvatar = (size: number) => renderGlobalAvatar(size);

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
      if (selectedDoc) {
        setDocs(prev => prev.map(d => d.id === selectedDoc.id ? { ...d, preview: dataUrl } : d));
        setSelectedDoc(prev => prev ? { ...prev, preview: dataUrl } : null);
        toast.success("Imagen cargada");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Add new doc with image
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
        const newDoc: DocItem = {
          id: Date.now().toString(),
          name: file.name.split(".")[0] || "Documento",
          type: "image",
          preview: dataUrl,
        };
        setDocs(prev => [...prev, newDoc]);
        toast.success("Documento agregado");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const [fields, setFields] = useState<DataField[]>([
    { id: "1", label: "CURP", value: "GARC901215HPLRRL09", icon: CreditCard },
    { id: "2", label: "RFC", value: "GARC901215AB1", icon: FileText },
    { id: "3", label: "NSS", value: "1234567890", icon: Shield },
    { id: "4", label: "No. Empleado", value: "EMP-2847", icon: User },
  ]);

  const [docs, setDocs] = useState<DocItem[]>([
    { id: "1", name: "QR Entrada", type: "qr" },
    { id: "2", name: "INE Frente", type: "image" },
    { id: "3", name: "INE Reverso", type: "image" },
    { id: "4", name: "Comprobante", type: "doc" },
  ]);

  const copyToClipboard = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      toast.success("Copiado al portapapeles");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const addField = () => {
    if (!newLabel.trim() || !newValue.trim()) return;
    setFields(prev => [...prev, {
      id: Date.now().toString(),
      label: newLabel,
      value: newValue,
      icon: FileText,
    }]);
    setNewLabel("");
    setNewValue("");
    setShowAddField(false);
  };

  const deleteField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const deleteDoc = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
    setSelectedDoc(null);
  };

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

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="px-4 pt-12 pb-4 space-y-5">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => navigate(-1)}
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
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
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

      {/* Editable Username Card */}
      <motion.div variants={fadeUp}>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <User size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase">NOMBRE</p>
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
        <div className="space-y-2">
          {fields.map((field, i) => {
            const isCopied = copiedId === field.id;
            const FieldIcon = field.icon;
            return (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="glass-card p-4 flex items-center gap-3 group"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FieldIcon size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase">{field.label}</p>
                  <p className="text-[15px] font-semibold font-mono truncate">{field.value}</p>
                </div>
                <div className="flex gap-1.5">
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => copyToClipboard(field.id, field.value)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      isCopied ? "bg-success/15" : "bg-secondary/80"
                    }`}
                  >
                    {isCopied ? <Check size={14} className="text-success" /> : <Copy size={14} className="text-muted-foreground" />}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => deleteField(field.id)}
                    className="w-9 h-9 rounded-xl bg-secondary/80 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </motion.button>
                </div>
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
              onClick={handleAddDocWithImage}
              className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center"
              style={{ boxShadow: "var(--shadow-glow-blue)" }}
            >
              <Plus size={14} className="text-primary-foreground" />
            </motion.button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {docs.map((doc, i) => {
            const DocIcon = getDocIcon(doc.type);
            const colors = getDocColor(doc.type);
            return (
              <motion.button
                key={doc.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDoc(doc)}
                className="glass-card p-4 flex flex-col items-center gap-3 min-h-[120px] justify-center text-center overflow-hidden"
              >
                {doc.preview ? (
                  <div className="w-12 h-12 rounded-2xl overflow-hidden">
                    <img src={doc.preview} alt={doc.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center`}>
                    <DocIcon size={22} className={colors.text} />
                  </div>
                )}
                <p className="text-sm font-semibold">{doc.name}</p>
              </motion.button>
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
                className="w-full bg-secondary/60 rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground mb-5 outline-none focus:ring-2 focus:ring-primary transition-all text-[15px]"
                onKeyDown={e => e.key === "Enter" && addField()}
              />
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

      {/* Doc Detail Sheet with Image Upload */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedDoc(null)}>
            <div className="absolute inset-0" style={{ background: 'hsla(228, 12%, 6%, 0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bottom-sheet w-full max-w-lg mx-auto p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="flex items-center justify-between mb-6 mt-2">
                <h2 className="text-xl font-extrabold">{selectedDoc.name}</h2>
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => deleteDoc(selectedDoc.id)} className="w-9 h-9 rounded-full bg-destructive/15 flex items-center justify-center">
                    <Trash2 size={14} className="text-destructive" />
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => setSelectedDoc(null)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                    <X size={16} />
                  </motion.button>
                </div>
              </div>
              {/* Document image area */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => docUploadRef.current?.click()}
                className="w-full aspect-[4/3] rounded-2xl bg-secondary/40 flex items-center justify-center mb-4 overflow-hidden relative"
              >
                {selectedDoc.preview ? (
                  <>
                    <img src={selectedDoc.preview} alt={selectedDoc.name} className="w-full h-full object-contain" />
                    <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-secondary/90 flex items-center justify-center">
                      <Camera size={16} className="text-muted-foreground" />
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Upload size={28} className="text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">Toca para subir imagen</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">Cámara o galería</p>
                  </div>
                )}
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
