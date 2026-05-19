import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const AnimatedCounter = ({ target, duration = 1.2, animated = true }: { target: number; duration?: number; animated?: boolean }) => {
  const [count, setCount] = useState(animated ? 0 : target);

  useEffect(() => {
    if (!animated) {
      setCount(target);
      return;
    }
    let start = 0;
    const increment = target / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [target, duration, animated]);

  return <span>{count.toLocaleString()}</span>;
};

export default AnimatedCounter;
