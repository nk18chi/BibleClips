import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ReelViewer } from "@/components/reel/reel-viewer";
import { Header } from "@/components/ui/header";

// Revalidate every 60 seconds - balances freshness with performance
export const revalidate = 60;

// Use service role to bypass RLS issues
function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SECRET_KEY ?? "");
}

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

type SentenceTranslation = {
  language: string;
  text: string;
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
  language: "en" | "ja";
  subtitle_style?: string;
  wordTimings?: WordTiming[];
  translations?: SentenceTranslation[];
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
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("clips")
    .select(`
      id,
      title,
      youtube_video_id,
      start_time,
      end_time,
      vote_count,
      language,
      subtitle_style,
      clip_verses (book, book_ja, chapter, verse_start, verse_end),
      clip_categories (categories (slug, name_en)),
      clip_subtitles (word, start_time, end_time, sequence),
      clip_translations (language, text, start_time, end_time, sequence)
    `)
    .eq("status", "APPROVED")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch clips:", error.message);
  }

  const clips = (data || []) as unknown as (ClipFromDb & {
    language: string | null;
    subtitle_style: string | null;
    clip_subtitles: { word: string; start_time: number; end_time: number; sequence: number }[];
    clip_translations: { language: string; text: string; start_time: number; end_time: number; sequence: number }[];
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

    // Convert translations
    const translations: SentenceTranslation[] = (clip.clip_translations || [])
      .sort((a, b) => a.sequence - b.sequence)
      .map((trans) => ({
        language: trans.language,
        text: trans.text,
        start: Number(trans.start_time),
        end: Number(trans.end_time),
      }));

    return {
      id: clip.id,
      title: clip.title,
      youtube_video_id: clip.youtube_video_id,
      start_time: clip.start_time,
      end_time: clip.end_time,
      vote_count: clip.vote_count,
      has_voted: false,
      language: (clip.language === "ja" ? "ja" : "en") as "en" | "ja",
      subtitle_style: clip.subtitle_style || undefined,
      wordTimings,
      translations,
      clip_verses: clip.clip_verses,
      clip_categories: clip.clip_categories,
    };
  })
  // Only show clips with subtitles on homepage
  .filter((clip) => clip.wordTimings && clip.wordTimings.length > 0)
  // Shuffle randomly
  .sort(() => Math.random() - 0.5);

  if (userId && clipsWithTimings.length > 0) {
    const { data: votes } = await supabase
      .from("votes")
      .select("clip_id")
      .eq("user_id", userId)
      .in(
        "clip_id",
        clipsWithTimings.map((c) => c.id)
      );

    const votedClipIds = new Set(votes?.map((v) => v.clip_id) || []);

    return clipsWithTimings.map((clip) => ({
      ...clip,
      has_voted: votedClipIds.has(clip.id),
    }));
  }

  return clipsWithTimings;
}

export default async function HomePage() {
  // Session not working due to cookie issues, skip for now
  const clips = await getApprovedClips();

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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to BibleClips</h1>
          <p className="text-gray-600 mb-6">
            Discover sermon clips connected to Bible verses. Be the first to contribute!
          </p>
          <div className="space-y-3">
            <Link
              href="/workspace"
              className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Go to Workspace
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
