import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AUTH_EMAIL = import.meta.env.VITE_AUTH_EMAIL as string;

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (pin: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: AUTH_EMAIL,
      password: pin,
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return { session, isLoading, login, logout };
};
