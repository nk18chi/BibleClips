import type { ClipSubtitle } from "@bibleclips/database";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ClipTranslation {
  id: string;
  clip_id: string;
  language: string;
  text: string;
  start_time: number;
  end_time: number;
  sequence: number;
}

export function useSubtitles(clipId: string) {
  const [subtitles, setSubtitles] = useState<ClipSubtitle[]>([]);
  const [translations, setTranslations] = useState<ClipTranslation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("clip_subtitles").select("*").eq("clip_id", clipId).order("sequence"),
      supabase.from("clip_translations").select("*").eq("clip_id", clipId).order("sequence"),
    ]).then(([subResult, transResult]) => {
      setSubtitles(subResult.data ?? []);
      setTranslations((transResult.data ?? []) as ClipTranslation[]);
      setLoading(false);
    });
  }, [clipId]);

  return { subtitles, translations, loading };
}
