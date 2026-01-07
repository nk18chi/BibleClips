import { createServerClient } from '@/lib/supabase/server';
import { ReelViewer } from '@/components/reel/reel-viewer';
import { Header } from '@/components/ui/header';
import Link from 'next/link';

type ClipFromDb = {
  id: string;
  title: string;
  youtube_video_id: string;
  start_time: number;
  end_time: number;
  vote_count: number;
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

type WordTiming = {
  word: string;
  start: number;
  end: number;
};

type Clip = {
  id: string;
  title: string;
  youtube_video_id: string;
  start_time: number;
  end_time: number;
  vote_count: number;
  has_voted: boolean;
  wordTimings?: WordTiming[];
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

async function getApprovedClips(userId?: string): Promise<Clip[]> {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('clips')
    .select(`
      id,
      title,
      youtube_video_id,
      start_time,
      end_time,
      vote_count,
      clip_verses (book, book_ja, chapter, verse_start, verse_end),
      clip_categories (categories (slug, name_en)),
      clip_subtitles (word, start_time, end_time, sequence)
    `)
    .eq('status', 'APPROVED')
    .order('created_at', { ascending: false })
    .limit(50);

  const clips = (data || []) as unknown as (ClipFromDb & {
    clip_subtitles: { word: string; start_time: number; end_time: number; sequence: number }[];
  })[];

  // Convert DB subtitles to WordTiming format
  const clipsWithTimings = clips.map((clip) => {
    // Sort by sequence and convert to WordTiming
    const wordTimings: WordTiming[] = (clip.clip_subtitles || [])
      .sort((a, b) => a.sequence - b.sequence)
      .map((sub) => ({
        word: sub.word,
        start: Number(sub.start_time),
        end: Number(sub.end_time),
      }));

    return {
      id: clip.id,
      title: clip.title,
      youtube_video_id: clip.youtube_video_id,
      start_time: clip.start_time,
      end_time: clip.end_time,
      vote_count: clip.vote_count,
      has_voted: false,
      wordTimings,
      clip_verses: clip.clip_verses,
      clip_categories: clip.clip_categories,
    };
  });

  if (userId && clipsWithTimings.length > 0) {
    const { data: votes } = await supabase
      .from('votes')
      .select('clip_id')
      .eq('user_id', userId)
      .in('clip_id', clipsWithTimings.map(c => c.id));

    const votedClipIds = new Set(votes?.map(v => v.clip_id) || []);

    return clipsWithTimings.map(clip => ({
      ...clip,
      has_voted: votedClipIds.has(clip.id),
    }));
  }

  return clipsWithTimings;
}

export default async function HomePage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  const clips = await getApprovedClips(session?.user?.id);

  // If there are clips, show the reel viewer (full screen like Instagram)
  if (clips.length > 0) {
    return <ReelViewer clips={clips} showHeader />;
  }

  // Empty state - no clips yet
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to BibleClips
          </h1>
          <p className="text-gray-600 mb-6">
            Discover sermon clips connected to Bible verses. Be the first to contribute!
          </p>
          <div className="space-y-3">
            {session ? (
              <Link
                href="/submit"
                className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Submit Your First Clip
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Sign in to Submit Clips
                </Link>
                <Link
                  href="/register"
                  className="block w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
