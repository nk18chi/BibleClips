import type { Category, Clip, ClipSong, ClipVerse } from "@bibleclips/database";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ClipQueryResult extends Clip {
  clip_verses: ClipVerse[];
  clip_categories: { categories: Category }[];
  clip_songs: ClipSong[];
}

export interface UseClipsOptions {
  verse?: string;
  categorySlug?: string;
  clipType?: "sermon" | "song" | "testimony";
}

export function useClips(options?: UseClipsOptions) {
  const [clips, setClips] = useState<ClipQueryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClips = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

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

    if (options?.clipType) {
      query = query.eq("clip_type", options.clipType);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
    } else {
      const results = (data ?? []) as ClipQueryResult[];
      for (let i = results.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [results[i], results[j]] = [results[j], results[i]];
      }
      setClips(results);
    }
    setLoading(false);
    setRefreshing(false);
  }, [options?.verse, options?.categorySlug, options?.clipType]);

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  const refetch = useCallback(() => fetchClips(true), [fetchClips]);

  return { clips, loading, refreshing, error, refetch };
}
