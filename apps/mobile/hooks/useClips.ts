import type { Category, Clip, ClipSong, ClipVerse } from "@bibleclips/database";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ClipQueryResult extends Clip {
  clip_verses: ClipVerse[];
  clip_categories: { categories: Category }[];
  clip_songs: ClipSong[];
}

export interface UseClipsOptions {
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

      const verseJoin = options?.verse ? "clip_verses!inner(*)" : "clip_verses(*)";
      const catJoin = options?.categorySlug
        ? "clip_categories!inner(*, categories!inner(*))"
        : "clip_categories(*, categories(*))";

      let query = supabase
        .from("clips")
        .select(`*, ${verseJoin}, ${catJoin}, clip_songs(*)`)
        .eq("status", "APPROVED")
        .order("created_at", { ascending: false });

      if (options?.verse) {
        const [book, chapterVerse] = options.verse.split("-");
        const [chapter, verse] = (chapterVerse ?? "").split(":");
        query = query.eq("clip_verses.book", book?.replace(/-/g, " ")).eq("clip_verses.chapter", Number(chapter));
        if (verse) {
          query = query.eq("clip_verses.verse_start", Number(verse));
        }
      }

      if (options?.categorySlug) {
        query = query.eq("clip_categories.categories.slug", options.categorySlug);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        const results = (data ?? []) as ClipQueryResult[];
        // Shuffle for random reel order
        for (let i = results.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [results[i], results[j]] = [results[j], results[i]];
        }
        setClips(results);
      }
      setLoading(false);
    }

    fetchClips();
  }, [options?.verse, options?.categorySlug]);

  return { clips, loading, error };
}
