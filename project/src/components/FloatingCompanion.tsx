import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Zap, MessageSquare, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { renderGlobalAvatar } from "@/lib/avatarHelper";
import { useCompanionMood } from "@/hooks/useCompanionMood";
import { useAI } from "@/hooks/useAI";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };
type Mode = "actions" | "consult";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jarvis-chat`;

const SUGGESTIONS: Record<Mode, string[]> = {
  actions: [
    "Press banca 4x10 80kg",
    "Marca como pagada la deuda de Juan",
    "Completa la tarea de comprar leche",
  ],
  consult: [
    "¿Cómo mejorar mi rutina de gym?",
    "Dame tips de productividad",
    "¿Qué debería priorizar hoy?",
  ],
};

// Mood → glow color mapping
const MOOD_GLOWS: Record<string, string> = {
  happy: "hsla(45, 100%, 55%, 0.5)",
  excited: "hsla(280, 100%, 60%, 0.5)",
  celebrating: "hsla(45, 100%, 60%, 0.6)",
  worried: "hsla(30, 100%, 50%, 0.4)",
  sleepy: "hsla(240, 40%, 50%, 0.3)",
  rain: "hsla(210, 60%, 50%, 0.3)",
  sunny: "hsla(45, 100%, 60%, 0.45)",
  chill: "hsla(211, 100%, 50%, 0.35)",
};

// Mood → animation variants
const MOOD_ANIMATIONS: Record<string, { scale: number[]; rotate: number[] }> = {
  celebrating: { scale: [1, 1.2, 0.95, 1.15, 1], rotate: [0, -8, 8, -4, 0] },
  excited: { scale: [1, 1.1, 0.97, 1.05, 1], rotate: [0, -5, 5, 0, 0] },
  happy: { scale: [1, 1.05, 1], rotate: [0, 3, 0] },
  worried: { scale: [1, 0.95, 1], rotate: [0, -2, 2, 0] },
  sleepy: { scale: [1, 0.97, 1], rotate: [0, 2, 0] },
};

async function streamChat({
  messages, mode, onDelta, onDone, onError,
}: {
  messages: Msg[]; mode: Mode;
  onDelta: (text: string) => void; onDone: () => void; onError: (msg: string) => void;
}) {
  const { data: { session } } = await supabase.auth.getSession()
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ messages, mode }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || "Error al conectar con Jarvis");
    return;
  }
  if (!resp.body) { onError("Sin respuesta"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { done: streamDone, value } = await reader.read();
    if (streamDone) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }

  if (buf.trim()) {
    for (const raw of buf.split("\n")) {
      if (!raw || !raw.startsWith("data: ")) continue;
      const json = raw.slice(6).trim();
      if (json === "[DONE]") continue;
      try {
        const p = JSON.parse(json);
        const c = p.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch { /* noop */ }
    }
  }
  onDone();
}

/* Particle burst effect */
const ParticleBurst = ({ color }: { color: string }) => {
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    return { x: Math.cos(angle) * 30, y: Math.sin(angle) * 30, delay: i * 0.03 };
  });

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color, left: "50%", top: "50%", marginLeft: -3, marginTop: -3 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
          transition={{ duration: 0.6, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

const FloatingCompanion = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("actions");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mood, isTemporary } = useCompanionMood();
  const { procesarMensaje, procesando } = useAI();
  const prevMoodRef = useRef(mood);
  const [avatarKey, setAvatarKey] = useState(0);

  useEffect(() => {
    const handler = () => setAvatarKey(k => k + 1);
    window.addEventListener("avatar-changed", handler);
    return () => window.removeEventListener("avatar-changed", handler);
  }, []);

  // Trigger particle burst when mood changes temporarily
  useEffect(() => {
    if (isTemporary && mood !== prevMoodRef.current) {
      setShowBurst(true);
      const t = setTimeout(() => setShowBurst(false), 800);
      prevMoodRef.current = mood;
      return () => clearTimeout(t);
    }
    prevMoodRef.current = mood;
  }, [mood, isTemporary]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  useEffect(() => {
    let count = 0;
    const onOpen = () => { count++; setIsModalOpen(true); };
    const onClose = () => { count = Math.max(0, count - 1); if (count === 0) setIsModalOpen(false); };
    window.addEventListener('modal-open', onOpen);
    window.addEventListener('modal-close', onClose);
    return () => {
      window.removeEventListener('modal-open', onOpen);
      window.removeEventListener('modal-close', onClose);
    };
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      if (mode === "actions") {
        // Modo acciones: usar Gemini con intents
        const respuesta = await procesarMensaje(text.trim());
        setMessages(prev => [...prev, { role: "assistant", content: respuesta }]);
        setIsLoading(false);
      } else {
        // Modo consulta: streaming via Supabase Edge Function
        await streamChat({
          messages: newMessages, mode,
          onDelta: upsert,
          onDone: () => setIsLoading(false),
          onError: (msg) => {
            setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
            setIsLoading(false);
          },
        });
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Error de conexión" }]);
      setIsLoading(false);
    }
  }, [messages, mode, isLoading, procesarMensaje]);

  const switchMode = (m: Mode) => { setMode(m); setMessages([]); };

  const glowColor = MOOD_GLOWS[mood] || MOOD_GLOWS.chill;
  const moodAnim = MOOD_ANIMATIONS[mood];

  return (
    <>
      {/* FAB — always mounted to keep Three.js Canvas alive */}
      <motion.button
        animate={!open && !isModalOpen
          ? (moodAnim ? { scale: moodAnim.scale, rotate: moodAnim.rotate, opacity: 1 } : { scale: 1, opacity: 1 })
          : { scale: 0, opacity: 0 }
        }
        transition={moodAnim && !open && !isModalOpen ? {
          duration: mood === "celebrating" ? 0.8 : 0.6,
          repeat: isTemporary ? 2 : 0,
          ease: "easeInOut",
        } : { duration: 0.2 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className="fixed right-4 z-50 w-14 h-14 rounded-full overflow-hidden"
        style={{
          bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 1rem)',
          pointerEvents: !open && !isModalOpen ? 'auto' : 'none',
          boxShadow: `0 0 24px ${glowColor}, 0 0 50px hsla(211, 100%, 50%, 0.12)`,
          background: "radial-gradient(circle, hsla(225, 10%, 15%, 0.9), hsla(225, 10%, 8%, 0.95))",
        }}
      >
        {renderGlobalAvatar(56, mood, undefined, avatarKey)}

        {/* Pulse ring on temporary mood */}
        {isTemporary && (
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: glowColor }}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 1, repeat: 3, ease: "easeOut" }}
          />
        )}

        {/* Particle burst */}
        {showBurst && <ParticleBurst color={glowColor.replace(/[\d.]+\)$/, "1)")} />}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col"
            style={{ height: "75vh", maxHeight: "600px" }}
          >
            <div
              className="flex-1 flex flex-col rounded-t-3xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, hsl(225, 12%, 10%) 0%, hsl(228, 12%, 6%) 100%)",
                borderTop: "1px solid hsla(225, 15%, 22%, 0.3)",
                boxShadow: "0 -10px 60px -10px hsla(0, 0%, 0%, 0.6)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="sheet-handle mx-0" />
                <div className="flex items-center gap-2 flex-1 ml-3">
                  <Zap size={16} className="text-primary" />
                  <span className="text-sm font-bold">Jarvis</span>
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "hsl(145, 63%, 49%)" }}
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setOpen(false)} className="w-8 h-8 rounded-xl bg-secondary/60 flex items-center justify-center">
                  <X size={16} className="text-muted-foreground" />
                </motion.button>
              </div>

              {/* Mode tabs */}
              <div className="px-4 pb-2">
                <div className="tab-switcher">
                  {([
                    { key: "actions" as Mode, label: "Acciones", icon: Zap },
                    { key: "consult" as Mode, label: "Consultar", icon: MessageSquare },
                  ]).map(tab => (
                    <motion.button
                      key={tab.key}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => switchMode(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all ${
                        mode === tab.key ? "tab-active" : "tab-inactive"
                      }`}
                    >
                      <tab.icon size={13} />
                      {tab.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-3 pb-2">
                {messages.length === 0 && (
                  <div className="pt-6 space-y-3">
                    <p className="text-xs text-muted-foreground text-center mb-4">
                      {mode === "actions" ? "Dime qué hacer y lo ejecuto ⚡" : "Pregúntame lo que quieras 💬"}
                    </p>
                    {SUGGESTIONS[mode].map((s, i) => (
                      <motion.button
                        key={s}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => send(s)}
                        className="glass-card-hover w-full text-left p-3 text-sm font-medium"
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                )}

                {messages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.role === "user" ? "gradient-primary text-primary-foreground rounded-br-md" : "glass-card rounded-bl-md"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-1 [&_p]:last:mb-0 [&_ul]:mb-1 [&_li]:mb-0">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>
                  </motion.div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
                      <Loader2 size={16} className="text-primary animate-spin" />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Input */}
              <div className="px-4 pb-4 pt-2 safe-bottom">
                <div className="flex items-center gap-2 rounded-2xl px-4 py-2" style={{ background: "hsla(225, 10%, 14%, 0.8)", border: "1px solid hsla(225, 15%, 22%, 0.3)" }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && send(input)}
                    placeholder={mode === "actions" ? "Ej: press 4x10 80kg, elimina tarea..." : "Pregunta lo que quieras..."}
                    className="flex-1 bg-transparent text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => send(input)}
                    disabled={!input.trim() || isLoading}
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-30"
                    style={{ background: "linear-gradient(135deg, hsl(211, 100%, 50%), hsl(230, 100%, 65%))" }}
                  >
                    <Send size={16} className="text-foreground" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingCompanion;
