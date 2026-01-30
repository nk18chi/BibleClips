import Link from "next/link";
import { ReelViewer } from "@/components/reel/reel-viewer";
import { Header } from "@/components/ui/header";
import { createServerClient } from "@/lib/supabase/server";

type Props = {
  params: { ref: string };
};

type ClipFromDb = {
  id: string;
  title: string;
  youtube_video_id: string;
  start_time: number;
  end_time: number;
  vote_count: number;
  language: string | null;
  subtitle_style: string | null;
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
  clip_subtitles: { word: string; start_time: number; end_time: number; sequence: number }[];
  clip_translations: { language: string; text: string; start_time: number; end_time: number; sequence: number }[];
};

/**
 * Parse a flat verse ref into { book, chapter, verseStart, verseEnd }.
 *
 * Single verse:  "genesis-1-1"      → book=genesis, chapter=1, verseStart=1, verseEnd=1
 * Verse range:   "genesis-1-1-3"    → book=genesis, chapter=1, verseStart=1, verseEnd=3
 * Multi-word:    "1-john-3-16-18"   → book=1-john, chapter=3, verseStart=16, verseEnd=18
 *
 * Strategy: if the last 3 segments are all numeric → range (chapter-start-end).
 * Otherwise last 2 numeric → single verse (chapter-verse).
 */
function parseVerseRef(ref: string): { book: string; chapter: number; verseStart: number; verseEnd: number } | null {
  const parts = ref.split("-");
  if (parts.length < 3) return null;

  const last3 = parts.slice(-3).map((p) => parseInt(p, 10));
  const last2 = parts.slice(-2).map((p) => parseInt(p, 10));

  // Try range: last 3 segments are all numeric
  if (parts.length >= 4 && last3.every((n) => !isNaN(n))) {
    const [chapter, verseStart, verseEnd] = last3 as [number, number, number];
    const bookParts = parts.slice(0, -3);
    if (bookParts.length === 0) return null;
    return { book: bookParts.join("-"), chapter, verseStart, verseEnd };
  }

  // Single verse: last 2 segments are numeric
  if (last2.every((n) => !isNaN(n))) {
    const [chapter, verse] = last2 as [number, number];
    const bookParts = parts.slice(0, -2);
    if (bookParts.length === 0) return null;
    return { book: bookParts.join("-"), chapter, verseStart: verse, verseEnd: verse };
  }

  return null;
}

async function getClipsForVerse(book: string, chapter: number, verseStart: number, verseEnd: number, userId?: string) {
  const supabase = createServerClient();

  // Normalize book name (e.g., "john" -> "John", "1-john" -> "1 John")
  const normalizedBook = book
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  const { data: clips } = await supabase
    .from("clips")
    .select(
      `
      id,
      title,
      youtube_video_id,
      start_time,
      end_time,
      vote_count,
      language,
      subtitle_style,
      clip_verses!inner (book, book_ja, chapter, verse_start, verse_end),
      clip_categories (categories (slug, name_en)),
      clip_subtitles (word, start_time, end_time, sequence),
      clip_translations (language, text, start_time, end_time, sequence)
    `
    )
    .eq("status", "APPROVED")
    .ilike("clip_verses.book", normalizedBook)
    .eq("clip_verses.chapter", chapter)
    .lte("clip_verses.verse_start", verseEnd)
    .order("vote_count", { ascending: false });

  // Filter to clips that overlap the requested verse range.
  // A clip covers verse_start...(verse_end ?? verse_start).
  // It overlaps [verseStart, verseEnd] if clip_end >= verseStart AND clip_start <= verseEnd.
  // The query already ensures clip_start <= verseEnd; now filter clip_end >= verseStart.
  const typedClips = (clips as ClipFromDb[] | null)?.filter((clip) =>
    clip.clip_verses.some((cv) => (cv.verse_end ?? cv.verse_start) >= verseStart)
  ) ?? null;

  const mapClip = (clip: ClipFromDb, hasVoted: boolean) => {
    const wordTimings = (clip.clip_subtitles || [])
      .sort((a, b) => a.sequence - b.sequence)
      .map((sub) => ({ word: sub.word, start: Number(sub.start_time), end: Number(sub.end_time) }));

    const translations = (clip.clip_translations || [])
      .sort((a, b) => a.sequence - b.sequence)
      .map((trans) => ({ language: trans.language, text: trans.text, start: Number(trans.start_time), end: Number(trans.end_time) }));

    return {
      id: clip.id,
      title: clip.title,
      youtube_video_id: clip.youtube_video_id,
      start_time: clip.start_time,
      end_time: clip.end_time,
      vote_count: clip.vote_count,
      has_voted: hasVoted,
      language: (clip.language === "ja" ? "ja" : "en") as "en" | "ja",
      subtitle_style: clip.subtitle_style || undefined,
      wordTimings,
      translations,
      clip_verses: clip.clip_verses,
      clip_categories: clip.clip_categories,
    };
  };

  if (userId && typedClips) {
    const { data: votes } = await supabase
      .from("votes")
      .select("clip_id")
      .eq("user_id", userId)
      .in(
        "clip_id",
        typedClips.map((c) => c.id)
      );

    const votedClipIds = new Set(votes?.map((v) => v.clip_id) || []);
    return typedClips.map((clip) => mapClip(clip, votedClipIds.has(clip.id)));
  }

  return typedClips?.map((clip) => mapClip(clip, false)) || [];
}

export default async function VersePage({ params }: Props) {
  const parsed = parseVerseRef(params.ref);

  if (!parsed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh] p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid verse reference</h1>
          <p className="text-gray-600 mb-4">Could not parse &quot;{params.ref}&quot;.</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Back to home
          </Link>
        </div>
        </div>
      </div>
    );
  }

  const { book, chapter, verseStart, verseEnd } = parsed;

  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const clips = await getClipsForVerse(book, chapter, verseStart, verseEnd, session?.user?.id);

  if (clips.length === 0) {
    const bookDisplay = book
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh] p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {bookDisplay} {chapter}:{verseStart}{verseEnd > verseStart ? `-${verseEnd}` : ""}
            </h1>
            <p className="text-gray-600 mb-4">No clips found for this verse yet.</p>
            <div className="space-y-2">
              <Link href="/submit" className="block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                Submit a clip
              </Link>
              <Link href="/" className="block text-blue-600 hover:text-blue-800">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ReelViewer clips={clips} showHeader />;
}
