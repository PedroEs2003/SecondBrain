import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const PIN_LENGTH = 6;
const MAX_ATTEMPTS = 4;
const LOCKOUT_SECONDS = 30;
const LOCKOUT_KEY = "pin_lockout_until";
const ATTEMPTS_KEY = "pin_attempts";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempts, setAttempts] = useState<number>(() => {
    return parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || "0", 10);
  });
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(() => {
    const until = parseInt(sessionStorage.getItem(LOCKOUT_KEY) || "0", 10);
    const remaining = Math.ceil((until - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  });

  const isLocked = lockoutRemaining > 0;

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const t = setTimeout(() => setLockoutRemaining(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockoutRemaining]);

  const handleDigit = useCallback(async (digit: string) => {
    if (isSubmitting || isLocked) return;

    const next = pin + digit;
    setPin(next);
    setError(false);

    if (next.length === PIN_LENGTH) {
      setIsSubmitting(true);
      try {
        await login(next);
        navigate("/", { replace: true });
      } catch {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        sessionStorage.setItem(ATTEMPTS_KEY, String(newAttempts));
        setError(true);
        setPin("");
        setIsSubmitting(false);
        if (newAttempts >= MAX_ATTEMPTS) {
          const lockoutUntil = Date.now() + LOCKOUT_SECONDS * 1000;
          sessionStorage.setItem(LOCKOUT_KEY, String(lockoutUntil));
          sessionStorage.setItem(ATTEMPTS_KEY, "0");
          setLockoutRemaining(LOCKOUT_SECONDS);
          setAttempts(0);
          setError(false);
        }
      }
    }
  }, [pin, isSubmitting, isLocked, attempts, login, navigate]);

  const handleDelete = useCallback(() => {
    if (isSubmitting || isLocked) return;
    setPin(p => p.slice(0, -1));
    setError(false);
  }, [isSubmitting, isLocked]);

  const buttons = [
    "1", "2", "3",
    "4", "5", "6",
    "7", "8", "9",
    "", "0", "del",
  ];

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: "hsl(228, 12%, 4%)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none opacity-20"
        style={{ background: "radial-gradient(circle, hsl(211,100%,50%), hsl(230,100%,40%), transparent)" }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 px-8 w-full max-w-xs"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Icon + title */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "hsla(211,100%,50%,0.12)", border: "1px solid hsla(211,100%,50%,0.2)" }}
          >
            <Lock size={24} style={{ color: "hsl(211,100%,60%)" }} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Segundo Cerebro</h1>
          <p className="text-sm text-muted-foreground">Ingresá tu PIN de 6 dígitos</p>
        </div>

        {/* Dots */}
        <motion.div
          className="flex gap-3"
          animate={error ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const filled = i < pin.length;
            return (
              <motion.div
                key={i}
                className="w-4 h-4 rounded-full border-2"
                animate={{
                  scale: filled ? 1 : 0.85,
                  backgroundColor: error
                    ? "hsl(0,70%,55%)"
                    : filled
                    ? "hsl(211,100%,55%)"
                    : "transparent",
                  borderColor: error
                    ? "hsl(0,70%,55%)"
                    : filled
                    ? "hsl(211,100%,55%)"
                    : "hsla(0,0%,100%,0.2)",
                }}
                transition={{ duration: 0.15 }}
              />
            );
          })}
        </motion.div>

        {/* Status message slot — altura fija para evitar saltos */}
        <div className="h-5 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isLocked ? (
              <motion.p
                key="locked"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium"
                style={{ color: "hsl(38,100%,60%)" }}
              >
                Bloqueado por {lockoutRemaining}s
              </motion.p>
            ) : error ? (
              <motion.p
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm"
                style={{ color: "hsl(0,70%,55%)" }}
              >
                PIN incorrecto · {MAX_ATTEMPTS - attempts} {MAX_ATTEMPTS - attempts === 1 ? "intento" : "intentos"} restantes
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {buttons.map((btn, i) => {
            if (btn === "") return <div key={i} />;

            if (btn === "del") {
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDelete}
                  disabled={pin.length === 0 || isSubmitting || isLocked}
                  className="h-16 rounded-2xl flex items-center justify-center disabled:opacity-30"
                  style={{ background: "hsla(0,0%,100%,0.06)" }}
                >
                  <Delete size={20} className="text-muted-foreground" />
                </motion.button>
              );
            }

            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.88 }}
                onClick={() => handleDigit(btn)}
                disabled={pin.length >= PIN_LENGTH || isSubmitting || isLocked}
                className="h-16 rounded-2xl text-xl font-semibold text-white disabled:opacity-30"
                style={{ background: "hsla(0,0%,100%,0.07)", border: "1px solid hsla(0,0%,100%,0.06)" }}
              >
                {btn}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
