/**
 * Generate subtitles and translations for all clips that don't have them yet.
 * This script should be run locally as it requires yt-dlp.
 *
 * Usage: pnpm --filter @bibleclips/web generate-subtitles
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { transcribeClipWithWhisper } from "../lib/whisper-transcribe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? "";
const openaiApiKey = process.env.OPENAI_API_KEY ?? "";

if (!supabaseUrl || !supabaseSecretKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

if (!openaiApiKey) {
  console.error("Missing OPENAI_API_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

type Clip = {
  id: string;
  youtube_video_id: string;
  start_time: number;
  end_time: number;
  title: string;
};

type WordTiming = {
  word: string;
  start: number;
  end: number;
};

/**
 * Groups words into sentences for translation.
 */
function groupIntoSentences(words: WordTiming[], maxWords = 10): { text: string; startTime: number; endTime: number }[] {
  if (words.length === 0) return [];

  const sentences: { text: string; startTime: number; endTime: number }[] = [];
  let currentWords: WordTiming[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    currentWords.push(word);

    const endsPunctuation = /[.!?]$/.test(word.word);
    const reachedMaxWords = currentWords.length >= maxWords;

    if (endsPunctuation || reachedMaxWords || i === words.length - 1) {
      const firstWord = currentWords[0];
      const lastWord = currentWords[currentWords.length - 1];
      if (firstWord && lastWord) {
        sentences.push({
          text: currentWords.map((w) => w.word).join(" "),
          startTime: firstWord.start,
          endTime: lastWord.end,
        });
      }
      currentWords = [];
    }
  }

  return sentences;
}

/**
 * Translate sentences to Japanese.
 */
async function translateSentences(sentences: string[]): Promise<string[]> {
  if (sentences.length === 0) return [];

  const prompt = `Translate the following English sentences to natural Japanese. Return ONLY the translations, one per line, in the same order. Keep them concise for subtitles.

${sentences.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a professional translator. Translate English to natural, conversational Japanese suitable for video subtitles.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content || "";

  return content
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * Process a single clip: transcribe with Whisper and add translations.
 */
async function processClip(clip: Clip): Promise<boolean> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing: "${clip.title}"`);
  console.log(`Video: ${clip.youtube_video_id}, ${clip.start_time}s - ${clip.end_time}s`);

  try {
    // Step 1: Transcribe with Whisper
    console.log("  Transcribing with Whisper...");
    const words = await transcribeClipWithWhisper(clip.youtube_video_id, clip.start_time, clip.end_time);

    if (words.length === 0) {
      console.error("  No words transcribed");
      return false;
    }

    console.log(`  Got ${words.length} words`);

    // Step 2: Save subtitles
    console.log("  Saving subtitles...");
    const subtitleRows = words.map((word, index) => ({
      clip_id: clip.id,
      word: word.word,
      start_time: word.start,
      end_time: word.end,
      sequence: index,
    }));

    const { error: insertError } = await supabase.from("clip_subtitles").insert(subtitleRows);

    if (insertError) {
      console.error("  Failed to insert subtitles:", insertError.message);
      return false;
    }

    // Step 3: Group into sentences and translate
    console.log("  Translating to Japanese...");
    const sentences = groupIntoSentences(words);
    const translations = await translateSentences(sentences.map((s) => s.text));

    // Step 4: Save translations
    console.log("  Saving translations...");
    const translationRows = sentences.map((sentence, index) => ({
      clip_id: clip.id,
      language: "ja",
      text: translations[index] || "",
      start_time: sentence.startTime,
      end_time: sentence.endTime,
      sequence: index,
    }));

    const { error: translationError } = await supabase.from("clip_translations").insert(translationRows);

    if (translationError) {
      console.error("  Failed to insert translations:", translationError.message);
      // Continue anyway - subtitles are saved
    }

    console.log(`  ✅ Done: ${words.length} words, ${translations.length} translations`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error:`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function main() {
  console.log("Finding clips without subtitles...\n");

  // Find all approved clips that don't have subtitles yet
  const { data: clips, error } = await supabase
    .from("clips")
    .select("id, youtube_video_id, start_time, end_time, title")
    .eq("status", "APPROVED")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch clips:", error);
    process.exit(1);
  }

  if (!clips || clips.length === 0) {
    console.log("No approved clips found.");
    return;
  }

  // Filter out clips that already have subtitles
  const clipsWithoutSubtitles: Clip[] = [];

  for (const clip of clips) {
    const { count } = await supabase
      .from("clip_subtitles")
      .select("*", { count: "exact", head: true })
      .eq("clip_id", clip.id);

    if (!count || count === 0) {
      clipsWithoutSubtitles.push(clip);
    }
  }

  if (clipsWithoutSubtitles.length === 0) {
    console.log("All clips already have subtitles!");
    return;
  }

  console.log(`Found ${clipsWithoutSubtitles.length} clips without subtitles:\n`);
  clipsWithoutSubtitles.forEach((clip, i) => {
    console.log(`  ${i + 1}. ${clip.title}`);
  });

  // Process each clip
  let success = 0;
  let failed = 0;

  for (const clip of clipsWithoutSubtitles) {
    const result = await processClip(clip);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Done! Success: ${success}, Failed: ${failed}`);
}

main().catch(console.error);
