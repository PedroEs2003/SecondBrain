import { motion } from "framer-motion";

type Props = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  animated?: boolean;
};

const CircularProgress = ({
  progress,
  size = 80,
  strokeWidth = 4,
  color = "hsl(var(--primary))",
  trackColor = "hsl(var(--secondary))",
  children,
  animated = true,
}: Props) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: animated ? circumference : offset }}
          animate={{ strokeDashoffset: offset }}
          transition={animated ? { duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 } : { duration: 0 }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};

export default CircularProgress;
