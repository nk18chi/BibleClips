"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

type UserRole = "USER" | "CONTRIBUTOR" | "ADMIN";

type SupabaseContext = {
  supabase: SupabaseClient;
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
  canAccessWorkspace: boolean;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createBrowserClient());
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch user role from users table
  const fetchUserRole = useCallback(
    async (userId: string): Promise<UserRole | null> => {
      try {
        const { data, error } = await supabase.from("users").select("role").eq("id", userId).single();

        if (error) {
          return null;
        }

        return (data?.role as UserRole) || "USER";
      } catch {
        return null;
      }
    },
    [supabase]
  );

  useEffect(() => {
    let isMounted = true;

    // Use onAuthStateChange for everything - it fires immediately with current session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchUserRole(currentUser.id).then((role) => {
          if (isMounted) setUserRole(role);
        });
      } else {
        setUserRole(null);
      }

      setLoading(false);

      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.refresh();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router, fetchUserRole]);

  const isAdmin = userRole === "ADMIN";
  const canAccessWorkspace = userRole === "ADMIN" || userRole === "CONTRIBUTOR";

  return (
    <Context.Provider value={{ supabase, user, userRole, loading, isAdmin, canAccessWorkspace }}>
      {children}
    </Context.Provider>
  );
}

export function useSupabase() {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider");
  }
  return context;
}
