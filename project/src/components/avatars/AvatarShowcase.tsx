import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Palette, Eye, Smile, Upload, ImagePlus, Sparkles, Loader2, Scissors } from "lucide-react";
import OrbAvatar from "./OrbAvatar";
import RobotAvatar from "./RobotAvatar";
import HoloShieldAvatar from "./HoloShieldAvatar";
import CartoonAvatar from "./CartoonAvatar";
import GLBAvatar from "./GLBAvatar";
import type { OrbCustomization } from "./OrbAvatar";
import type { RobotCustomization } from "./RobotAvatar";
import type { HoloCustomization } from "./HoloShieldAvatar";
import type { CartoonCustomization, HairstyleType, AccessoryType } from "./CartoonAvatar";
import { supabase } from "@/integrations/supabase/client";

// Pre-made image avatars
import astronautImg from "@/assets/avatars/astronaut.png";
import spartanImg from "@/assets/avatars/spartan.png";
import wolfImg from "@/assets/avatars/wolf.png";
import dragonImg from "@/assets/avatars/dragon.png";
import calaveraImg from "@/assets/avatars/calavera.png";
import catImg from "@/assets/avatars/cat.png";

type AvatarStyle = "orb" | "robot" | "holo" | "cartoon" | "glb" | "image";

const avatarOptions3D: { id: AvatarStyle; label: string; desc: string }[] = [
  { id: "glb",     label: "Humano",  desc: "Personaje 3D realista" },
  { id: "orb",     label: "Orbe",    desc: "Esfera energética sci-fi" },
  { id: "robot",   label: "Robot",   desc: "Cabeza robótica con LEDs" },
  { id: "holo",    label: "Holo",    desc: "HUD estilo Iron Man" },
  { id: "cartoon", label: "Pedro",   desc: "Tu versión animada" },
];

const presetImages: { id: string; label: string; src: string }[] = [
  { id: "astronaut", label: "Astronauta", src: astronautImg },
  { id: "spartan", label: "Spartan", src: spartanImg },
  { id: "wolf", label: "Lobo", src: wolfImg },
  { id: "dragon", label: "Dragón", src: dragonImg },
  { id: "calavera", label: "Calavera", src: calaveraImg },
  { id: "cat", label: "Gato", src: catImg },
];

// Color palettes
const THEME_COLORS = [
  { label: "Azul", value: "#0088ff", glow: "#00aaff" },
  { label: "Rojo", value: "#ff3344", glow: "#ff6666" },
  { label: "Verde", value: "#00cc66", glow: "#44ff99" },
  { label: "Morado", value: "#8844ff", glow: "#aa77ff" },
  { label: "Naranja", value: "#ff8800", glow: "#ffaa44" },
  { label: "Rosa", value: "#ff44aa", glow: "#ff77cc" },
  { label: "Cyan", value: "#00ddff", glow: "#66eeff" },
];

const HAIR_COLORS = [
  { label: "Castaño", value: "#6b4226" },
  { label: "Negro", value: "#1a1a1a" },
  { label: "Rubio", value: "#d4a843" },
  { label: "Pelirrojo", value: "#8b3a1a" },
  { label: "Gris", value: "#888888" },
  { label: "Azul", value: "#2563eb" },
  { label: "Rosa", value: "#e84393" },
];

const SHIRT_COLORS = [
  { label: "Azul", value: "#2563eb" },
  { label: "Negro", value: "#1a1a1a" },
  { label: "Rojo", value: "#dc2626" },
  { label: "Verde", value: "#16a34a" },
  { label: "Morado", value: "#7c3aed" },
  { label: "Blanco", value: "#e8e8e8" },
];

const SKIN_TONES = [
  { label: "Claro", value: "#ffe0c0" },
  { label: "Medio", value: "#dbb896" },
  { label: "Moreno", value: "#c49a6c" },
  { label: "Oscuro", value: "#8d5e3c" },
];

const EYE_COLORS = [
  { label: "Café", value: "#3a2a1a" },
  { label: "Verde", value: "#2d6b3f" },
  { label: "Azul", value: "#2255aa" },
  { label: "Miel", value: "#8b6914" },
  { label: "Gris", value: "#556666" },
  { label: "Negro", value: "#111111" },
];

const MOUTH_OPTIONS: { label: string; value: "smile" | "open" | "small" | "smirk" }[] = [
  { label: "😊", value: "smile" },
  { label: "😃", value: "open" },
  { label: "😐", value: "small" },
  { label: "😏", value: "smirk" },
];

const HAIRSTYLE_OPTIONS: { label: string; value: HairstyleType; emoji: string }[] = [
  { label: "Corto", value: "short", emoji: "💇‍♂️" },
  { label: "Puntas", value: "spiky", emoji: "🦔" },
  { label: "Largo", value: "long", emoji: "💇‍♀️" },
  { label: "Rizado", value: "curly", emoji: "🌀" },
  { label: "Mohawk", value: "mohawk", emoji: "🔥" },
  { label: "Calvo", value: "bald", emoji: "🥚" },
];

const ACCESSORY_OPTIONS: { label: string; value: AccessoryType; emoji: string }[] = [
  { label: "Nada", value: "none", emoji: "❌" },
  { label: "Lentes", value: "glasses", emoji: "👓" },
  { label: "Soles", value: "sunglasses_acc", emoji: "🕶️" },
  { label: "Audífonos", value: "headphones", emoji: "🎧" },
  { label: "Gorra", value: "cap", emoji: "🧢" },
  { label: "Gorro", value: "beanie", emoji: "🧶" },
  { label: "Máscara", value: "mask", emoji: "😷" },
];

const ROBOT_BODY_COLORS = [
  { label: "Grafito", value: "#2a3040" },
  { label: "Plata", value: "#556070" },
  { label: "Negro", value: "#151520" },
  { label: "Rojo oscuro", value: "#4a1a1a" },
  { label: "Azul marino", value: "#1a2a4a" },
  { label: "Dorado", value: "#5a4a2a" },
];

const loadCustom = <T,>(key: string): T | undefined => {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : undefined; } catch { return undefined; }
};
const saveCustom = (key: string, val: unknown) => localStorage.setItem(key, JSON.stringify(val));

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (style: string) => void;
  currentStyle: string;
};

const ColorRow = ({ colors, selected, onSelect, size = 38 }: {
  colors: { label: string; value: string }[];
  selected: string | undefined;
  onSelect: (v: string) => void;
  size?: number;
}) => (
  <div className="flex gap-2 flex-wrap">
    {colors.map(c => (
      <motion.button
        key={c.value}
        whileTap={{ scale: 0.85 }}
        onClick={() => onSelect(c.value)}
        className={`rounded-xl border-2 transition-all ${
          selected === c.value ? "border-primary ring-1 ring-primary/50 scale-110" : "border-border"
        }`}
        style={{ background: c.value, width: size, height: size }}
        title={c.label}
      />
    ))}
  </div>
);

const OptionRow = ({ options, selected, onSelect }: {
  options: { label: string; value: string; emoji: string }[];
  selected: string | undefined;
  onSelect: (v: string) => void;
}) => (
  <div className="flex gap-2 flex-wrap">
    {options.map(o => (
      <motion.button
        key={o.value}
        whileTap={{ scale: 0.85 }}
        onClick={() => onSelect(o.value)}
        className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 border-2 transition-all ${
          selected === o.value ? "border-primary bg-primary/15 scale-105" : "border-border bg-secondary/40"
        }`}
      >
        <span className="text-lg">{o.emoji}</span>
        <span className="text-[8px] font-bold text-muted-foreground">{o.label}</span>
      </motion.button>
    ))}
  </div>
);

const SectionLabel = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-primary">{icon}</span>
    <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{label}</span>
  </div>
);

const AvatarShowcase = ({ open, onClose, onSelect, currentStyle }: Props) => {
  const [selected, setSelected] = useState<string>(currentStyle);
  const [tab, setTab] = useState<"3d" | "gallery" | "custom" | "ai">("3d");
  const [selectedImage, setSelectedImage] = useState<string>(() => localStorage.getItem("avatar-image-url") || "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // AI generation state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);

  // Customizations per avatar
  const [orbCustom, setOrbCustom] = useState<OrbCustomization>(() => loadCustom("avatar-custom-orb") || {});
  const [robotCustom, setRobotCustom] = useState<RobotCustomization>(() => loadCustom("avatar-custom-robot") || {});
  const [holoCustom, setHoloCustom] = useState<HoloCustomization>(() => loadCustom("avatar-custom-holo") || {});
  const [cartoonCustom, setCartoonCustom] = useState<CartoonCustomization>(() => loadCustom("avatar-customization") || {});

  const updateOrb = (partial: Partial<OrbCustomization>) => {
    const n = { ...orbCustom, ...partial }; setOrbCustom(n); saveCustom("avatar-custom-orb", n);
  };
  const updateRobot = (partial: Partial<RobotCustomization>) => {
    const n = { ...robotCustom, ...partial }; setRobotCustom(n); saveCustom("avatar-custom-robot", n);
  };
  const updateHolo = (partial: Partial<HoloCustomization>) => {
    const n = { ...holoCustom, ...partial }; setHoloCustom(n); saveCustom("avatar-custom-holo", n);
  };
  const updateCartoon = (partial: Partial<CartoonCustomization>) => {
    const n = { ...cartoonCustom, ...partial }; setCartoonCustom(n); saveCustom("avatar-customization", n);
  };

  const render3DAvatar = (style: string, size: number) => {
    switch (style) {
      case "orb": return <OrbAvatar size={size} customization={orbCustom} />;
      case "robot": return <RobotAvatar size={size} customization={robotCustom} />;
      case "holo": return <HoloShieldAvatar size={size} customization={holoCustom} />;
      case "cartoon": return <CartoonAvatar size={size} customization={cartoonCustom} />;
      case "glb": return <GLBAvatar size={size} />;
      default: return null;
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      console.error("Tipo de archivo no permitido:", file.type);
      return;
    }
    const mimeToExt: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    setUploading(true);
    try {
      const ext = mimeToExt[file.type];
      const path = `custom/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setSelectedImage(urlData.publicUrl);
      localStorage.setItem("avatar-image-url", urlData.publicUrl);
      setSelected("image");
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const selectPreset = (src: string) => {
    setSelectedImage(src);
    localStorage.setItem("avatar-image-url", src);
    setSelected("image");
  };

  const generateAiAvatar = async () => {
    if (!aiPrompt.trim() || aiGenerating) return;
    setAiGenerating(true);
    setAiPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-avatar", {
        body: { prompt: aiPrompt.trim() },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        setAiPreview(data.imageUrl);
        setSelectedImage(data.imageUrl);
        localStorage.setItem("avatar-image-url", data.imageUrl);
        setSelected("image");
      }
    } catch (err) {
      console.error("AI generation error:", err);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  const renderPreview = () => {
    if (selected === "image" && selectedImage) {
      return (
        <img src={selectedImage} alt="Avatar" className="w-full h-full object-cover" style={{ width: 140, height: 140 }} />
      );
    }
    return render3DAvatar(selected, 140);
  };

  const renderCartoonCustomization = () => (
    <div className="space-y-4">
      <SectionLabel icon={<Scissors size={14} />} label="PEINADO" />
      <OptionRow options={HAIRSTYLE_OPTIONS} selected={cartoonCustom.hairstyle || "short"} onSelect={v => updateCartoon({ hairstyle: v as HairstyleType })} />

      <SectionLabel icon={<Palette size={14} />} label="COLOR PELO" />
      <ColorRow colors={HAIR_COLORS} selected={cartoonCustom.hairColor || "#6b4226"} onSelect={v => updateCartoon({ hairColor: v })} />

      <SectionLabel icon={<Sparkles size={14} />} label="ACCESORIO" />
      <OptionRow options={ACCESSORY_OPTIONS} selected={cartoonCustom.accessory || "none"} onSelect={v => updateCartoon({ accessory: v as AccessoryType })} />

      <SectionLabel icon={<Palette size={14} />} label="CAMISA" />
      <ColorRow colors={SHIRT_COLORS} selected={cartoonCustom.shirtColor || "#2563eb"} onSelect={v => updateCartoon({ shirtColor: v })} />

      <SectionLabel icon={<Palette size={14} />} label="PIEL" />
      <ColorRow colors={SKIN_TONES} selected={cartoonCustom.skinTone || "#ffe0c0"} onSelect={v => updateCartoon({ skinTone: v })} />

      <SectionLabel icon={<Eye size={14} />} label="OJOS" />
      <ColorRow colors={EYE_COLORS} selected={cartoonCustom.eyeColor || "#3a2a1a"} onSelect={v => updateCartoon({ eyeColor: v })} />

      <SectionLabel icon={<Smile size={14} />} label="EXPRESIÓN" />
      <div className="flex gap-2">
        {MOUTH_OPTIONS.map(m => (
          <motion.button
            key={m.value}
            whileTap={{ scale: 0.85 }}
            onClick={() => updateCartoon({ defaultMouth: m.value })}
            className={`w-12 h-12 rounded-xl text-xl flex items-center justify-center border-2 transition-all ${
              (cartoonCustom.defaultMouth || "smile") === m.value ? "border-primary bg-primary/15 scale-110" : "border-border bg-secondary/40"
            }`}
          >
            {m.label}
          </motion.button>
        ))}
      </div>
    </div>
  );

  const renderCustomization = () => {
    switch (selected) {
      case "orb":
        return (
          <div className="space-y-4">
            <SectionLabel icon={<Palette size={14} />} label="COLOR PRINCIPAL" />
            <ColorRow colors={THEME_COLORS.map(c => ({ label: c.label, value: c.value }))} selected={orbCustom.color} onSelect={v => {
              const theme = THEME_COLORS.find(t => t.value === v);
              updateOrb({ color: v, glowColor: theme?.glow || v });
            }} />
          </div>
        );
      case "robot":
        return (
          <div className="space-y-4">
            <SectionLabel icon={<Palette size={14} />} label="COLOR DE CUERPO" />
            <ColorRow colors={ROBOT_BODY_COLORS} selected={robotCustom.bodyColor} onSelect={v => updateRobot({ bodyColor: v })} />
            <SectionLabel icon={<Eye size={14} />} label="COLOR DE OJOS / LED" />
            <ColorRow colors={THEME_COLORS.map(c => ({ label: c.label, value: c.value }))} selected={robotCustom.eyeColor} onSelect={v => updateRobot({ eyeColor: v })} />
            <SectionLabel icon={<Palette size={14} />} label="COLOR ACENTO" />
            <ColorRow colors={THEME_COLORS.map(c => ({ label: c.label, value: c.value }))} selected={robotCustom.accentColor} onSelect={v => updateRobot({ accentColor: v })} />
          </div>
        );
      case "holo":
        return (
          <div className="space-y-4">
            <SectionLabel icon={<Palette size={14} />} label="COLOR NÚCLEO" />
            <ColorRow colors={THEME_COLORS.map(c => ({ label: c.label, value: c.value }))} selected={holoCustom.coreColor} onSelect={v => updateHolo({ coreColor: v })} />
            <SectionLabel icon={<Palette size={14} />} label="COLOR ANILLOS" />
            <ColorRow colors={THEME_COLORS.map(c => ({ label: c.label, value: c.value }))} selected={holoCustom.ringColor} onSelect={v => updateHolo({ ringColor: v })} />
          </div>
        );
      case "cartoon":
        return renderCartoonCustomization();
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end"
          onClick={onClose}
        >
          <div className="absolute inset-0" style={{ background: "hsla(228, 12%, 6%, 0.7)", backdropFilter: "blur(8px)" }} />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bottom-sheet w-full max-w-lg mx-auto p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="flex items-center justify-between mb-4 mt-2">
              <h2 className="text-xl font-extrabold">Elige tu avatar</h2>
              <motion.button whileTap={{ scale: 0.85 }} onClick={onClose} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                <X size={16} />
              </motion.button>
            </div>

            {/* Tab Switcher */}
            <div className="tab-switcher mb-5">
              {[
                { id: "3d" as const, label: "3D", icon: null },
                { id: "gallery" as const, label: "Galería", icon: ImagePlus },
                { id: "ai" as const, label: "IA", icon: Sparkles },
                { id: "custom" as const, label: "Subir", icon: Upload },
              ].map(t => (
                <motion.button
                  key={t.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-semibold transition-all ${
                    tab === t.id ? "tab-active" : "tab-inactive"
                  }`}
                >
                  {t.icon && <t.icon size={12} />}
                  {t.label}
                </motion.button>
              ))}
            </div>

            {/* Preview */}
            <motion.div
              key={`${selected}-${selectedImage}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="flex justify-center mb-5"
            >
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  width: 140, height: 140,
                  boxShadow: "0 0 40px hsla(211, 100%, 50%, 0.25)",
                  background: "radial-gradient(circle, hsla(225, 10%, 15%, 0.9), hsla(225, 10%, 8%, 0.95))",
                }}
              >
                {renderPreview()}
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {tab === "3d" && (
                <motion.div key="3d" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {avatarOptions3D.map((opt) => (
                      <motion.button
                        key={opt.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelected(opt.id as string)}
                        className={`glass-card p-3 flex flex-col items-center gap-2 relative transition-all ${
                          selected === opt.id ? "ring-2 ring-primary" : ""
                        }`}
                      >
                        {selected === opt.id && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                            <Check size={10} className="text-primary-foreground" />
                          </motion.div>
                        )}
                        <div className="rounded-2xl overflow-hidden" style={{ background: "radial-gradient(circle, hsla(225, 10%, 15%, 0.9), hsla(225, 10%, 8%, 0.95))" }}>
                          {render3DAvatar(opt.id, 72)}
                        </div>
                        <p className="text-xs font-bold">{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                      </motion.button>
                    ))}
                  </div>

                  {selected !== "image" && (
                    <div className="glass-card p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Palette size={14} className="text-primary" />
                        <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">PERSONALIZAR</span>
                      </div>
                      {renderCustomization()}
                    </div>
                  )}
                </motion.div>
              )}

              {tab === "gallery" && (
                <motion.div key="gallery" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <div className="grid grid-cols-3 gap-3">
                    {presetImages.map((img) => (
                      <motion.button
                        key={img.id}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => selectPreset(img.src)}
                        className={`glass-card p-2 flex flex-col items-center gap-2 relative transition-all ${
                          selected === "image" && selectedImage === img.src ? "ring-2 ring-primary" : ""
                        }`}
                      >
                        {selected === "image" && selectedImage === img.src && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full gradient-primary flex items-center justify-center z-10">
                            <Check size={10} className="text-primary-foreground" />
                          </motion.div>
                        )}
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary/40">
                          <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-[10px] font-bold">{img.label}</p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {tab === "ai" && (
                <motion.div key="ai" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="glass-card p-5">
                    <Sparkles size={24} className="text-primary mx-auto mb-3" />
                    <p className="text-sm font-bold text-center mb-1">Genera tu avatar con IA</p>
                    <p className="text-xs text-muted-foreground text-center mb-4">
                      Describe cómo quieres tu avatar y la IA lo creará
                    </p>
                    <textarea
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="Ej: Un guerrero espartano con casco dorado, estilo cartoon..."
                      className="w-full bg-secondary/60 rounded-xl px-4 py-3 text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none h-20"
                    />
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={generateAiAvatar}
                      disabled={!aiPrompt.trim() || aiGenerating}
                      className="w-full gradient-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-sm mt-3 disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ boxShadow: "var(--shadow-glow-blue)" }}
                    >
                      {aiGenerating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Generar Avatar
                        </>
                      )}
                    </motion.button>
                  </div>

                  {aiPreview && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                      <p className="text-xs text-success font-medium">✓ Avatar generado y seleccionado</p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {tab === "custom" && (
                <motion.div key="custom" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="glass-card p-6 text-center">
                    <Upload size={32} className="text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-bold mb-1">Sube tu avatar</p>
                    <p className="text-xs text-muted-foreground mb-4">JPG, PNG o WebP · Máx 5MB</p>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="gradient-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                      style={{ boxShadow: "var(--shadow-glow-blue)" }}
                    >
                      {uploading ? "Subiendo..." : "Elegir imagen"}
                    </motion.button>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
                  </div>

                  {selected === "image" && selectedImage && (
                    <div className="text-center">
                      <p className="text-xs text-success font-medium">✓ Avatar personalizado seleccionado</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleConfirm}
              className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl mt-4"
              style={{ boxShadow: "var(--shadow-glow-blue)" }}
            >
              Usar este avatar
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AvatarShowcase;
export type { AvatarStyle };
