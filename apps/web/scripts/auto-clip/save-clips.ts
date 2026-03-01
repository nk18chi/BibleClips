import { createClient } from "@supabase/supabase-js";
import { BOOK_JA_MAP } from "../../lib/bible-books";
import type { DetectedSegment } from "./analyze-segments";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  return createClient(url, key);
}

type SaveResult = {
  clipId: string;
  type: "sermon" | "testimony";
  title: string;
};

async function saveSegmentAsClip(
  segment: DetectedSegment,
  youtubeVideoId: string,
): Promise<SaveResult> {
  const supabase = createAdminClient();

  const { data: clip, error: clipError } = await supabase
    .from("clips")
    .insert({
      youtube_video_id: youtubeVideoId,
      start_time: Math.round(segment.start_time * 100) / 100,
      end_time: Math.round(segment.end_time * 100) / 100,
      title: segment.title,
      status: "PENDING",
      clip_type: segment.type,
      submitted_by: null,
    })
    .select("id")
    .single();

  if (clipError || !clip) {
    throw new Error(`Failed to insert clip: ${clipError?.message}`);
  }

  if (segment.type === "sermon") {
    const { error: verseError } = await supabase.from("clip_verses").insert({
      clip_id: clip.id,
      book: segment.verse.book,
      book_ja: BOOK_JA_MAP[segment.verse.book] || segment.verse.book,
      chapter: segment.verse.chapter,
      verse_start: segment.verse.verse_start,
      verse_end: segment.verse.verse_end || null,
      version: "NIV",
    });

    if (verseError) {
      await supabase.from("clips").delete().eq("id", clip.id);
      throw new Error(`Failed to insert verse: ${verseError.message}`);
    }
  }

  return { clipId: clip.id, type: segment.type, title: segment.title };
}

async function saveAllSegments(
  segments: DetectedSegment[],
  youtubeVideoId: string,
): Promise<{ saved: SaveResult[]; errors: string[] }> {
  const saved: SaveResult[] = [];
  const errors: string[] = [];

  for (const segment of segments) {
    try {
      const result = await saveSegmentAsClip(segment, youtubeVideoId);
      saved.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`[${segment.type}] "${segment.title}": ${message}`);
    }
  }

  if (saved.length > 0) {
    const supabase = createAdminClient();
    for (let i = 0; i < saved.length; i++) {
      await supabase.rpc("increment_clips_created", { video_id: youtubeVideoId });
    }
  }

  return { saved, errors };
}

export { saveAllSegments, type SaveResult };
