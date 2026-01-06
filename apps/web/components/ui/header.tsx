'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useUserProfile } from '@/hooks/use-user-profile';

export function Header() {
  const { supabase, user } = useSupabase();
  const { isAdmin } = useUserProfile();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if it's a verse reference (e.g., "John 3:16")
    const verseMatch = searchQuery.match(/^(\d?\s*\w+)\s+(\d+):(\d+)(?:-(\d+))?$/i);
    if (verseMatch && verseMatch[1] && verseMatch[2] && verseMatch[3]) {
      const book = verseMatch[1].toLowerCase().replace(/\s+/g, '-');
      const chapter = verseMatch[2];
      const verse = verseMatch[3];
      router.push(`/verse/${book}/${chapter}/${verse}`);
    } else {
      // Search as hashtag/category
      const slug = searchQuery.toLowerCase().replace(/^#/, '').trim();
      router.push(`/category/${slug}`);
    }
    setSearchQuery('');
    setShowSearch(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">
          BibleClips
        </Link>

        <div className="flex items-center gap-3">
          {/* Search */}
          {showSearch ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="John 3:16 or #anxiety"
                className="w-40 sm:w-56 px-3 py-1.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowSearch(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 text-gray-600 hover:text-gray-900"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}

          {user ? (
            <>
              {isAdmin && (
                <Link href="/admin/pending" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">
                  Admin
                </Link>
              )}
              <Link href="/submit" className="p-2 text-gray-600 hover:text-gray-900" aria-label="Submit clip">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Link>
              <Link href="/my-clips" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">
                My Clips
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block"
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
