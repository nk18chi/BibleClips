'use client';

import Link from 'next/link';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useUserProfile } from '@/hooks/use-user-profile';

export function Header() {
  const { supabase, user } = useSupabase();
  const { isAdmin } = useUserProfile();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">
          BibleClips
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {isAdmin && (
                <Link href="/admin/pending" className="text-sm text-gray-600 hover:text-gray-900">
                  Admin
                </Link>
              )}
              <Link href="/submit" className="text-sm text-gray-600 hover:text-gray-900">
                Submit
              </Link>
              <Link href="/my-clips" className="text-sm text-gray-600 hover:text-gray-900">
                My Clips
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
