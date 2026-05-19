import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import AuthGuard from "./components/AuthGuard";
import HomePage from "./pages/HomePage";
import GymPage from "./pages/GymPage";
import DeudasPage from "./pages/DeudasPage";
import TareasPage from "./pages/TareasPage";
import NotasPage from "./pages/NotasPage";
import PerfilPage from "./pages/PerfilPage";
import NotFound from "./pages/NotFound";
import AgendaPage from "./pages/AgendaPage";
import LoginPage from "./pages/LoginPage";
import SplashScreen from "./components/SplashScreen";
import FloatingCompanion from "./components/FloatingCompanion";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useRealtimeSync } from "./hooks/useRealtimeSync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — serve cache instantly on remount
      refetchOnMount: false,
      refetchOnWindowFocus: true, // fallback si el canal realtime falla
    },
  },
});

// Monta el canal realtime único dentro del QueryClientProvider
const RealtimeSyncInit = () => { useRealtimeSync(); return null; }

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    // Show splash only once per session
    const shown = sessionStorage.getItem("splash-shown");
    // Fresh open (no session): redirect to home so iOS PWA doesn't restore last URL
    if (!shown && window.location.pathname !== "/") {
      window.history.replaceState(null, "", "/");
    }
    return !shown;
  });

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    sessionStorage.setItem("splash-shown", "true");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeSyncInit />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <AuthGuard>
                  <AppLayout>
                    <ErrorBoundary>
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/gym" element={<GymPage />} />
                        <Route path="/deudas" element={<DeudasPage />} />
                        <Route path="/tareas" element={<TareasPage />} />
                        <Route path="/notas" element={<NotasPage />} />
                        <Route path="/perfil" element={<PerfilPage />} />
                        <Route path="/agenda" element={<AgendaPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </ErrorBoundary>
                  </AppLayout>
                  <FloatingCompanion />
                </AuthGuard>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
