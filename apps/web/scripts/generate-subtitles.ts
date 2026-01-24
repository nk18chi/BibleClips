/**
 * Generate word-level subtitles for a clip using Whisper API.
 * Usage: npx tsx scripts/generate-subtitles.ts <clip_id>
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { transcribeClipWithWhisper } from "../lib/whisper-transcribe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? "";

if (!supabaseUrl || !supabaseSecretKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

async function generateSubtitles(clipId: string) {
  // Create Supabase client with secret key for admin access
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  console.log(`Fetching clip ${clipId}...`);

  // Get clip details
  const { data: clip, error: clipError } = await supabase
    .from("clips")
    .select("id, youtube_video_id, start_time, end_time, title")
    .eq("id", clipId)
    .single();

  if (clipError || !clip) {
    console.error("Clip not found:", clipError);
    process.exit(1);
  }

  console.log(`Clip: "${clip.title}"`);
  console.log(`Video: ${clip.youtube_video_id}, ${clip.start_time}s - ${clip.end_time}s`);

  // Check if subtitles already exist
  const { count } = await supabase
    .from("clip_subtitles")
    .select("*", { count: "exact", head: true })
    .eq("clip_id", clipId);

  if (count && count > 0) {
    console.log(`Subtitles already exist (${count} words). Delete first to regenerate.`);
    process.exit(0);
  }

  // Transcribe with Whisper
  console.log("Transcribing with Whisper API...");
  const words = await transcribeClipWithWhisper(clip.youtube_video_id, clip.start_time, clip.end_time);

  console.log(`Got ${words.length} words from Whisper`);

  if (words.length === 0) {
    console.error("No words transcribed");
    process.exit(1);
  }

  // Insert subtitles into database
  console.log("Saving to database...");
  const subtitleRows = words.map((word, index) => ({
    clip_id: clipId,
    word: word.word,
    start_time: word.start,
    end_time: word.end,
    sequence: index,
  }));

  const { error: insertError } = await supabase.from("clip_subtitles").insert(subtitleRows);

  if (insertError) {
    console.error("Failed to insert subtitles:", insertError);
    process.exit(1);
  }

  console.log(`✅ Saved ${words.length} word-level subtitles for clip ${clipId}`);

  // Print sample
  console.log("\nFirst 10 words:");
  words.slice(0, 10).forEach((w, i) => {
    console.log(`  ${i}: "${w.word}" (${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s)`);
  });
}

// Get clip ID from command line
const clipId = process.argv[2];

if (!clipId) {
  console.error("Usage: npx tsx scripts/generate-subtitles.ts <clip_id>");
  process.exit(1);
}

generateSubtitles(clipId).catch(console.error);
