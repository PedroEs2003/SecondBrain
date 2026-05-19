import { ReactNode, useEffect } from "react";
import BottomNav from "./BottomNav";
import { useLocation } from "react-router-dom";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse at center, hsla(211, 100%, 50%, 0.04) 0%, transparent 70%)",
        }}
      />
      {/* key fuerza remount cuando cambia la ruta, sin animación de transición */}
      <main key={location.pathname} className="pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
