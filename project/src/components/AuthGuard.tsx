import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const AuthGuard = ({ children }: { children: ReactNode }) => {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "hsl(228, 12%, 4%)" }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "hsl(211,100%,55%) transparent transparent transparent" }}
        />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
