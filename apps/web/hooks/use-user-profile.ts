'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';

type UserProfile = {
  id: string;
  display_name: string | null;
  preferred_language: 'en' | 'ja';
  role: 'USER' | 'ADMIN';
  created_at: string;
};

export function useUserProfile() {
  const { supabase, user, loading: authLoading } = useSupabase();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setProfile(data as UserProfile);
      }
      setLoading(false);
    }

    if (!authLoading) {
      fetchProfile();
    }
  }, [user, authLoading, supabase]);

  return { profile, loading: loading || authLoading, isAdmin: profile?.role === 'ADMIN' };
}
