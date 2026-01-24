"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { transcribeClipWithWhisper, type WordTiming } from "@/lib/whisper-transcribe";
import type { ClipWithVerse, SaveClipInput, WorkQueueVideo } from "@/types/workspace";

// Use service role for workspace actions (admin tool)
function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SECRET_KEY ?? "");
}

const BOOK_JA_MAP: Record<string, string> = {
  Genesis: "創世記",
  Exodus: "出エジプト記",
  Leviticus: "レビ記",
  Numbers: "民数記",
  Deuteronomy: "申命記",
  Joshua: "ヨシュア記",
  Judges: "士師記",
  Ruth: "ルツ記",
  "1 Samuel": "サムエル記上",
  "2 Samuel": "サムエル記下",
  "1 Kings": "列王記上",
  "2 Kings": "列王記下",
  "1 Chronicles": "歴代誌上",
  "2 Chronicles": "歴代誌下",
  Ezra: "エズラ記",
  Nehemiah: "ネヘミヤ記",
  Esther: "エステル記",
  Job: "ヨブ記",
  Psalms: "詩篇",
  Proverbs: "箴言",
  Ecclesiastes: "伝道者の書",
  "Song of Solomon": "雅歌",
  Isaiah: "イザヤ書",
  Jeremiah: "エレミヤ書",
  Lamentations: "哀歌",
  Ezekiel: "エゼキエル書",
  Daniel: "ダニエル書",
  Hosea: "ホセア書",
  Joel: "ヨエル書",
  Amos: "アモス書",
  Obadiah: "オバデヤ書",
  Jonah: "ヨナ書",
  Micah: "ミカ書",
  Nahum: "ナホム書",
  Habakkuk: "ハバクク書",
  Zephaniah: "ゼパニヤ書",
  Haggai: "ハガイ書",
  Zechariah: "ゼカリヤ書",
  Malachi: "マラキ書",
  Matthew: "マタイ",
  Mark: "マルコ",
  Luke: "ルカ",
  John: "ヨハネ",
  Acts: "使徒",
  Romans: "ローマ",
  "1 Corinthians": "コリント第一",
  "2 Corinthians": "コリント第二",
  Galatians: "ガラテヤ",
  Ephesians: "エペソ",
  Philippians: "ピリピ",
  Colossians: "コロサイ",
  "1 Thessalonians": "テサロニケ第一",
  "2 Thessalonians": "テサロニケ第二",
  "1 Timothy": "テモテ第一",
  "2 Timothy": "テモテ第二",
  Titus: "テトス",
  Philemon: "ピレモン",
  Hebrews: "ヘブル",
  James: "ヤコブ",
  "1 Peter": "ペテロ第一",
  "2 Peter": "ペテロ第二",
  "1 John": "ヨハネ第一",
  "2 John": "ヨハネ第二",
  "3 John": "ヨハネ第三",
  Jude: "ユダ",
  Revelation: "黙示録",
};

export type VideoStatus = "pending" | "completed" | "skipped";

export async function getQueueVideos(channelId?: string, status: VideoStatus = "pending"): Promise<WorkQueueVideo[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("work_queue_videos")
    .select("*, channel:youtube_channels(*)")
    .eq("status", status)
    .order("view_count", { ascending: false });

  if (channelId) {
    query = query.eq("channel_id", channelId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getChannels() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("youtube_channels")
    .select("*")
    .eq("is_active", true)
    .order("channel_name");

  if (error) throw error;
  return data || [];
}

export async function getVideoClips(youtubeVideoId: string): Promise<ClipWithVerse[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("clips")
    .select(`
      id,
      youtube_video_id,
      start_time,
      end_time,
      title,
      status,
      created_at,
      clip_verses (
        book,
        book_ja,
        chapter,
        verse_start,
        verse_end
      ),
      clip_categories (
        category_id
      )
    `)
    .eq("youtube_video_id", youtubeVideoId)
    .order("start_time");

  if (error) throw error;
  return data || [];
}

export async function saveClip(input: SaveClipInput): Promise<{ clipId: string }> {
  const supabase = createAdminClient();

  // Insert clip
  const { data: clip, error: clipError } = await supabase
    .from("clips")
    .insert({
      youtube_video_id: input.youtubeVideoId,
      start_time: input.startTime,
      end_time: input.endTime,
      title: input.title,
      submitted_by: input.userId || null,
      status: "APPROVED", // Auto-approve for workspace
    })
    .select()
    .single();

  if (clipError) throw clipError;

  // Insert verse
  const { error: verseError } = await supabase.from("clip_verses").insert({
    clip_id: clip.id,
    book: input.book,
    book_ja: BOOK_JA_MAP[input.book] || input.book,
    chapter: input.chapter,
    verse_start: input.verseStart,
    verse_end: input.verseEnd || null,
  });

  if (verseError) throw verseError;

  // Insert categories
  if (input.categoryIds.length > 0) {
    const { error: catError } = await supabase.from("clip_categories").insert(
      input.categoryIds.map((catId) => ({
        clip_id: clip.id,
        category_id: catId,
      }))
    );

    if (catError) throw catError;
  }

  // Increment clips_created on work queue video
  await supabase.rpc("increment_clips_created", { video_id: input.youtubeVideoId });

  revalidatePath("/workspace");
  return { clipId: clip.id };
}

export async function deleteClip(clipId: string): Promise<void> {
  const supabase = createAdminClient();

  // Get clip to find youtube_video_id
  const { data: clip } = await supabase.from("clips").select("youtube_video_id").eq("id", clipId).single();

  // Delete clip (cascades to verses, categories)
  const { error } = await supabase.from("clips").delete().eq("id", clipId);

  if (error) throw error;

  // Decrement clips_created
  if (clip) {
    await supabase.rpc("decrement_clips_created", { video_id: clip.youtube_video_id });
  }

  revalidatePath("/workspace");
}

export type UpdateClipInput = {
  clipId: string;
  startTime: number;
  endTime: number;
  title?: string;
  book?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number | null;
  categoryIds?: string[];
};

export async function updateClip(input: UpdateClipInput): Promise<{ clipId: string }> {
  const supabase = createAdminClient();

  // Update clip (times and title)
  const clipUpdate: Record<string, unknown> = {
    start_time: input.startTime,
    end_time: input.endTime,
  };
  if (input.title !== undefined) {
    clipUpdate.title = input.title;
  }

  const { error: updateError } = await supabase.from("clips").update(clipUpdate).eq("id", input.clipId);

  if (updateError) throw updateError;

  // Update verse if provided
  if (input.book && input.chapter && input.verseStart) {
    // Delete existing verses
    await supabase.from("clip_verses").delete().eq("clip_id", input.clipId);

    // Insert new verse
    const { error: verseError } = await supabase.from("clip_verses").insert({
      clip_id: input.clipId,
      book: input.book,
      book_ja: BOOK_JA_MAP[input.book] || input.book,
      chapter: input.chapter,
      verse_start: input.verseStart,
      verse_end: input.verseEnd || null,
    });

    if (verseError) throw verseError;
  }

  // Update categories if provided
  if (input.categoryIds !== undefined) {
    // Delete existing categories
    await supabase.from("clip_categories").delete().eq("clip_id", input.clipId);

    // Insert new categories
    if (input.categoryIds.length > 0) {
      const { error: catError } = await supabase.from("clip_categories").insert(
        input.categoryIds.map((catId) => ({
          clip_id: input.clipId,
          category_id: catId,
        }))
      );

      if (catError) throw catError;
    }
  }

  // Delete existing subtitles (will be regenerated)
  await supabase.from("clip_subtitles").delete().eq("clip_id", input.clipId);

  revalidatePath("/workspace");
  return { clipId: input.clipId };
}

export async function updateVideoStatus(youtubeVideoId: string, status: "completed" | "skipped"): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("work_queue_videos").update({ status }).eq("youtube_video_id", youtubeVideoId);

  if (error) throw error;

  revalidatePath("/workspace");
}

// Helper: Translate full text and split into aligned subtitle chunks
type SubtitleChunk = {
  en: string;
  ja: string;
  startTime: number;
  endTime: number;
  sequence: number;
};

async function translateWithAlignment(words: WordTiming[]): Promise<SubtitleChunk[]> {
  if (words.length === 0) return [];

  const openai = new OpenAI();
  const fullText = words.map((w) => w.word).join(" ");

  const prompt = `Translate this English sermon speech to Japanese for video subtitles.

TEXT:
${fullText}

Split into 5-12 word chunks. Return JSON with "chunks" array:
{"chunks":[{"en":"English chunk","ja":"日本語翻訳"},...]}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          'You are a translator. Return valid JSON only. The "en" field must be EXACT substring from the input text.',
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  console.log("GPT response length:", content.length);

  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(content);
  } catch {
    console.error("Failed to parse GPT response:", content.slice(0, 500));
    return [];
  }

  // Find the chunks array
  let chunks: Array<{ en: string; ja: string }> = [];

  if (parsed.chunks && Array.isArray(parsed.chunks)) {
    chunks = parsed.chunks as typeof chunks;
  } else {
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key])) {
        chunks = parsed[key] as typeof chunks;
        break;
      }
    }
  }

  console.log("Parsed chunks count:", chunks.length);

  if (chunks.length === 0) {
    console.error("No chunks found in response");
    return [];
  }

  // Normalize for matching
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[.,!?;:'"-]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  // Build word sequence for matching
  const wordTexts = words.map((w) => normalize(w.word));

  // Find each chunk in the word sequence
  const result: SubtitleChunk[] = [];
  let searchStart = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk || !chunk.en || !chunk.ja) continue;

    // Split chunk into words
    const chunkWords = normalize(chunk.en)
      .split(" ")
      .filter((w) => w.length > 0);
    if (chunkWords.length === 0) continue;

    // Find where this chunk starts in the word list
    let startIdx = -1;
    const firstWord = chunkWords[0];

    for (let j = searchStart; j < words.length; j++) {
      if (wordTexts[j] === firstWord) {
        // Check if subsequent words match
        let matches = true;
        for (let k = 1; k < Math.min(chunkWords.length, 3); k++) {
          if (j + k >= words.length || wordTexts[j + k] !== chunkWords[k]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          startIdx = j;
          break;
        }
      }
    }

    if (startIdx === -1) {
      console.warn(`Could not find chunk ${i}: "${chunk.en.slice(0, 30)}..."`);
      continue;
    }

    // Find end index
    const endIdx = Math.min(startIdx + chunkWords.length - 1, words.length - 1);

    const startWord = words[startIdx];
    const endWord = words[endIdx];

    if (startWord && endWord) {
      result.push({
        en: chunk.en,
        ja: chunk.ja,
        startTime: startWord.start,
        endTime: endWord.end,
        sequence: result.length,
      });
      searchStart = endIdx + 1;
    }
  }

  console.log(`Aligned ${result.length} chunks out of ${chunks.length}`);
  return result;
}

export async function generateClipSubtitles(clipId: string): Promise<{ wordCount: number }> {
  const supabase = createAdminClient();

  // Get clip details
  const { data: clip, error: clipError } = await supabase
    .from("clips")
    .select("id, youtube_video_id, start_time, end_time")
    .eq("id", clipId)
    .single();

  if (clipError || !clip) {
    throw new Error("Clip not found");
  }

  // Check if subtitles already exist
  const { count } = await supabase
    .from("clip_subtitles")
    .select("*", { count: "exact", head: true })
    .eq("clip_id", clipId);

  if (count && count > 0) {
    return { wordCount: count };
  }

  // Transcribe with Whisper
  console.log(`Transcribing clip ${clipId}...`);
  const words = await transcribeClipWithWhisper(clip.youtube_video_id, clip.start_time, clip.end_time);

  if (words.length === 0) {
    throw new Error("No words transcribed");
  }

  // Insert subtitles into database
  console.log(`Saving ${words.length} words...`);
  const subtitleRows = words.map((word, index) => ({
    clip_id: clipId,
    word: word.word,
    start_time: word.start,
    end_time: word.end,
    sequence: index,
  }));

  const { error: insertError } = await supabase.from("clip_subtitles").insert(subtitleRows);

  if (insertError) {
    throw new Error(`Failed to save subtitles: ${insertError.message}`);
  }

  // Translate full text and get aligned chunks
  console.log("Translating to Japanese with alignment...");
  const chunks = await translateWithAlignment(words);

  // Delete existing translations for this clip
  await supabase.from("clip_translations").delete().eq("clip_id", clipId);

  // Insert aligned translations into clip_translations table
  if (chunks.length > 0) {
    const translationRows = chunks.map((chunk) => ({
      clip_id: clipId,
      language: "ja",
      text: chunk.ja,
      start_time: chunk.startTime,
      end_time: chunk.endTime,
      sequence: chunk.sequence,
    }));

    const { error: translationError } = await supabase.from("clip_translations").insert(translationRows);

    if (translationError) {
      console.error("Failed to save translations:", translationError);
    }
  }

  console.log(`Generated ${words.length} subtitles with ${chunks.length} translations`);
  return { wordCount: words.length };
}
