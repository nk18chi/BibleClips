import { Header } from '@/components/ui/header';
import { VerseSearch } from '@/components/ui/verse-search';
import { CategoryGrid } from '@/components/ui/category-grid';
import { FeaturedClips } from '@/components/ui/featured-clips';
import { Suspense } from 'react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Search */}
        <section>
          <VerseSearch />
        </section>

        {/* Categories */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
          <CategoryGrid />
        </section>

        {/* Featured Clips */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Featured Clips</h2>
          <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
            <FeaturedClips />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
