import type { Session, User } from "@supabase/supabase-js";
import { createContext, type ReactNode, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface SupabaseContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

export const SupabaseContext = createContext<SupabaseContextType>({
  session: null,
  user: null,
  isLoading: true,
});

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SupabaseContext.Provider value={{ session, user: session?.user ?? null, isLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
}
