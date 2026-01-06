'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function VerseSearch() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse verse reference (e.g., "John 3:16" -> /verse/john/3/16)
    const match = query.match(/^(\d?\s*\w+)\s+(\d+):(\d+)(?:-(\d+))?$/i);
    if (match) {
      const book = match[1]!.toLowerCase().replace(/\s+/g, '-');
      const chapter = match[2]!;
      const verse = match[3]!;
      router.push(`/verse/${book}/${chapter}/${verse}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search verse (e.g., John 3:16)"
          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </form>
  );
}
