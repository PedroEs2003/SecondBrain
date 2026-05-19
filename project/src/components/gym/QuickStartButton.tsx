import { motion } from "framer-motion";
import { Play, Dumbbell } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

interface QuickStartButtonProps {
  routineName: string;
  exerciseCount: number;
  onStart: () => void;
}

const QuickStartButton = ({ routineName, exerciseCount, onStart }: QuickStartButtonProps) => {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show">
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        className="w-full glass-card p-5 flex items-center gap-4 relative overflow-hidden group"
      >
        {/* Animated gradient bg */}
        <div className="absolute inset-0 gradient-primary opacity-10 group-active:opacity-20 transition-opacity" />
        
        <div className="relative flex items-center gap-4 w-full">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shrink-0"
            style={{ boxShadow: 'var(--shadow-glow-blue)' }}
          >
            <Play size={24} className="text-primary-foreground ml-0.5" />
          </motion.div>
          
          <div className="flex-1 text-left">
            <p className="font-extrabold text-[15px]">Iniciar Entrenamiento</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Dumbbell size={12} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-medium">
                {routineName} · {exerciseCount} ejercicios
              </p>
            </div>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
};

export default QuickStartButton;
