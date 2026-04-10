import type { Category, Clip, ClipSong, ClipVerse } from "@bibleclips/database";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ClipQueryResult extends Clip {
  clip_verses: ClipVerse[];
  clip_categories: { categories: Category }[];
  clip_songs: ClipSong[];
}

interface UseClipsOptions {
  verse?: string;
  categorySlug?: string;
}

export function useClips(options?: UseClipsOptions) {
  const [clips, setClips] = useState<ClipQueryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClips() {
      setLoading(true);
      let query = supabase
        .from("clips")
        .select("*, clip_verses(*), clip_categories(*, categories(*)), clip_songs(*)")
        .eq("status", "APPROVED")
        .order("created_at", { ascending: false });

      if (options?.verse) {
        const [book, chapterVerse] = options.verse.split("-");
        const [chapter, verse] = (chapterVerse ?? "").split(":");
        query = supabase
          .from("clips")
          .select("*, clip_verses!inner(*), clip_categories(*, categories(*)), clip_songs(*)")
          .eq("status", "APPROVED")
          .order("created_at", { ascending: false })
          .eq("clip_verses.book", book?.replace(/-/g, " "))
          .eq("clip_verses.chapter", Number(chapter));
        if (verse) {
          query = query.eq("clip_verses.verse_start", Number(verse));
        }
      }

      if (options?.categorySlug) {
        query = supabase
          .from("clips")
          .select("*, clip_verses(*), clip_categories!inner(*, categories!inner(*)), clip_songs(*)")
          .eq("status", "APPROVED")
          .order("created_at", { ascending: false })
          .eq("clip_categories.categories.slug", options.categorySlug);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setClips((data ?? []) as ClipQueryResult[]);
      }
      setLoading(false);
    }

    fetchClips();
  }, [options?.verse, options?.categorySlug]);

  return { clips, loading, error };
}
