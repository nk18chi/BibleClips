import { notFound } from "next/navigation";
import { ReelViewer } from "@/components/reel/reel-viewer";
import { createServerClient } from "@/lib/supabase/server";

type Props = {
  params: { id: string };
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
  clip_subtitles: {
    word: string;
    start_time: number;
    end_time: number;
    sequence: number;
  }[];
  clip_translations: {
    language: string;
    text: string;
    start_time: number;
    end_time: number;
    sequence: number;
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

async function getClip(id: string, userId?: string) {
  const supabase = createServerClient();

  const { data: clip } = await supabase
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
      clip_verses (book, book_ja, chapter, verse_start, verse_end),
      clip_categories (categories (slug, name_en)),
      clip_subtitles (word, start_time, end_time, sequence),
      clip_translations (language, text, start_time, end_time, sequence)
    `
    )
    .eq("id", id)
    .eq("status", "APPROVED")
    .single();

  const typedClip = clip as ClipFromDb | null;

  if (!typedClip) return null;

  // Convert subtitles to WordTiming format
  const wordTimings: WordTiming[] = (typedClip.clip_subtitles || [])
    .sort((a, b) => a.sequence - b.sequence)
    .map((sub) => ({
      word: sub.word,
      start: Number(sub.start_time),
      end: Number(sub.end_time),
    }));

  // Convert translations
  const translations: SentenceTranslation[] = (typedClip.clip_translations || [])
    .sort((a, b) => a.sequence - b.sequence)
    .map((trans) => ({
      language: trans.language,
      text: trans.text,
      start: Number(trans.start_time),
      end: Number(trans.end_time),
    }));

  const baseClip = {
    id: typedClip.id,
    title: typedClip.title,
    youtube_video_id: typedClip.youtube_video_id,
    start_time: typedClip.start_time,
    end_time: typedClip.end_time,
    vote_count: typedClip.vote_count,
    language: (typedClip.language === "ja" ? "ja" : "en") as "en" | "ja",
    subtitle_style: typedClip.subtitle_style || undefined,
    clip_verses: typedClip.clip_verses,
    clip_categories: typedClip.clip_categories,
    wordTimings,
    translations,
  };

  if (userId) {
    const { data: vote } = await supabase
      .from("votes")
      .select("clip_id")
      .eq("user_id", userId)
      .eq("clip_id", id)
      .single();

    return { ...baseClip, has_voted: !!vote };
  }

  return { ...baseClip, has_voted: false };
}

export default async function ClipPage({ params }: Props) {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const clip = await getClip(params.id, session?.user?.id);

  if (!clip) {
    notFound();
  }

  return <ReelViewer clips={[clip]} showHeader />;
}
