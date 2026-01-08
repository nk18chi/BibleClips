'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { SupabaseClient, User } from '@supabase/supabase-js';

type UserRole = 'USER' | 'CONTRIBUTOR' | 'ADMIN';

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
  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    return (data?.role as UserRole) || 'USER';
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const role = await fetchUserRole(currentUser.id);
        setUserRole(role);
      } else {
        setUserRole(null);
      }

      setLoading(false);

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const role = await fetchUserRole(currentUser.id);
        setUserRole(role);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const isAdmin = userRole === 'ADMIN';
  const canAccessWorkspace = userRole === 'ADMIN' || userRole === 'CONTRIBUTOR';

  return (
    <Context.Provider value={{ supabase, user, userRole, loading, isAdmin, canAccessWorkspace }}>
      {children}
    </Context.Provider>
  );
}

export function useSupabase() {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider');
  }
  return context;
}
