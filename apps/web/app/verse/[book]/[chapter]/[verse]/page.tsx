import { createServerClient } from '@/lib/supabase/server';
import { ReelViewer } from '@/components/reel/reel-viewer';
import Link from 'next/link';

type Props = {
  params: { book: string; chapter: string; verse: string };
};

type ClipFromDb = {
  id: string;
  title: string;
  youtube_video_id: string;
  start_time: number;
  end_time: number;
  vote_count: number;
  language: string | null;
  clip_verses: {
    book: string;
    book_ja: string;
    chapter: number;
    verse_start: number;
    verse_end: number | null;
  }[];
  clip_categories: {
    categories: {
      slug: string;
      name_en: string;
    } | null;
  }[];
};

async function getClipsForVerse(book: string, chapter: number, verse: number, userId?: string) {
  const supabase = createServerClient();

  // Normalize book name (e.g., "john" -> "John", "1-john" -> "1 John")
  const normalizedBook = book
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  const { data: clips } = await supabase
    .from('clips')
    .select(
      `
      id,
      title,
      youtube_video_id,
      start_time,
      end_time,
      vote_count,
      language,
      clip_verses!inner (book, book_ja, chapter, verse_start, verse_end),
      clip_categories (categories (slug, name_en))
    `
    )
    .eq('status', 'APPROVED')
    .ilike('clip_verses.book', normalizedBook)
    .eq('clip_verses.chapter', chapter)
    .lte('clip_verses.verse_start', verse)
    .order('vote_count', { ascending: false });

  const typedClips = clips as ClipFromDb[] | null;

  // Check if user has voted on each clip
  if (userId && typedClips) {
    const { data: votes } = await supabase
      .from('votes')
      .select('clip_id')
      .eq('user_id', userId)
      .in(
        'clip_id',
        typedClips.map((c) => c.id)
      );

    const votedClipIds = new Set(votes?.map((v) => v.clip_id) || []);

    return typedClips.map((clip) => ({
      ...clip,
      has_voted: votedClipIds.has(clip.id),
      language: (clip.language === 'ja' ? 'ja' : 'en') as 'en' | 'ja',
    }));
  }

  return typedClips?.map((clip) => ({ ...clip, has_voted: false, language: (clip.language === 'ja' ? 'ja' : 'en') as 'en' | 'ja' })) || [];
}

export default async function VersePage({ params }: Props) {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const chapter = parseInt(params.chapter);
  const verse = parseInt(params.verse);

  const clips = await getClipsForVerse(params.book, chapter, verse, session?.user?.id);

  if (clips.length === 0) {
    const bookDisplay = params.book
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {bookDisplay} {chapter}:{verse}
          </h1>
          <p className="text-gray-600 mb-4">No clips found for this verse yet.</p>
          <div className="space-y-2">
            <Link
              href="/submit"
              className="block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Submit a clip
            </Link>
            <Link href="/" className="block text-blue-600 hover:text-blue-800">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <ReelViewer clips={clips} />;
}
