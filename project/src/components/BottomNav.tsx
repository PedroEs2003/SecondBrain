import { Home, Dumbbell, CreditCard, CheckCircle2, FileText } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const tabs = [
  { path: "/", icon: Home, label: "Inicio" },
  { path: "/gym", icon: Dumbbell, label: "Gym" },
  { path: "/deudas", icon: CreditCard, label: "Deudas" },
  { path: "/tareas", icon: CheckCircle2, label: "Tareas" },
  { path: "/notas", icon: FileText, label: "Notas" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeIndex = tabs.findIndex(t => t.path === location.pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40" style={{
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      background: 'linear-gradient(to top, hsla(228, 12%, 6%, 0.97), hsla(228, 12%, 6%, 0.85))',
      backdropFilter: 'blur(40px) saturate(200%)',
      WebkitBackdropFilter: 'blur(40px) saturate(200%)',
    }}>
      <div className="glass" style={{
        borderRadius: 0,
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        background: 'transparent',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }}>
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto relative px-2">
          {tabs.map((tab, i) => {
            const isActive = i === activeIndex;
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="relative flex flex-col items-center gap-0.5 py-1.5 px-4 z-10"
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1 w-5 h-1 rounded-full gradient-primary"
                    style={{ boxShadow: 'var(--shadow-glow-blue)' }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={{ 
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -2 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 1.6}
                    className={isActive ? "text-primary" : "text-muted-foreground"}
                  />
                </motion.div>
                <span className={`text-[10px] font-semibold transition-colors duration-200 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
