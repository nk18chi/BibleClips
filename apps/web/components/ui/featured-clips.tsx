import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

type Clip = {
  id: string;
  title: string;
  youtube_video_id: string;
  vote_count: number;
  clip_verses: {
    book: string;
    chapter: number;
    verse_start: number;
    verse_end: number | null;
  }[];
};

async function getFeaturedClips(): Promise<Clip[]> {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("clips")
    .select(`
      id,
      title,
      youtube_video_id,
      vote_count,
      clip_verses (book, chapter, verse_start, verse_end)
    `)
    .eq("status", "APPROVED")
    .eq("is_featured", true)
    .order("vote_count", { ascending: false })
    .limit(6);

  return (data as Clip[]) || [];
}

function formatVerseRef(verses: Clip["clip_verses"]): string {
  if (!verses || verses.length === 0) return "";
  const v = verses[0];
  if (!v) return "";
  const verseRange = v.verse_end ? `${v.verse_start}-${v.verse_end}` : `${v.verse_start}`;
  return `${v.book} ${v.chapter}:${verseRange}`;
}

export async function FeaturedClips() {
  const clips = await getFeaturedClips();

  if (clips.length === 0) {
    return <div className="text-center py-8 text-gray-500">No featured clips yet. Be the first to contribute!</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {clips.map((clip) => (
        <Link
          key={clip.id}
          href={`/clip/${clip.id}`}
          className="flex gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
        >
          <img
            src={`https://img.youtube.com/vi/${clip.youtube_video_id}/mqdefault.jpg`}
            alt={clip.title}
            className="w-32 h-20 object-cover rounded"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{clip.title}</h3>
            <p className="text-sm text-gray-500">{formatVerseRef(clip.clip_verses)}</p>
            <p className="text-sm text-gray-400 mt-1">{clip.vote_count} likes</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
