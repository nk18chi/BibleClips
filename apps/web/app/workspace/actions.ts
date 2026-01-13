'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';
import type { WorkQueueVideo, ClipWithVerse, SaveClipInput } from '@/types/workspace';
import { transcribeClipWithWhisper, type WordTiming } from '@/lib/whisper-transcribe';

// Use service role for workspace actions (admin tool)
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

const BOOK_JA_MAP: Record<string, string> = {
  'Genesis': '創世記', 'Exodus': '出エジプト記', 'Leviticus': 'レビ記',
  'Numbers': '民数記', 'Deuteronomy': '申命記', 'Joshua': 'ヨシュア記',
  'Judges': '士師記', 'Ruth': 'ルツ記', '1 Samuel': 'サムエル記上',
  '2 Samuel': 'サムエル記下', '1 Kings': '列王記上', '2 Kings': '列王記下',
  '1 Chronicles': '歴代誌上', '2 Chronicles': '歴代誌下', 'Ezra': 'エズラ記',
  'Nehemiah': 'ネヘミヤ記', 'Esther': 'エステル記', 'Job': 'ヨブ記',
  'Psalms': '詩篇', 'Proverbs': '箴言', 'Ecclesiastes': '伝道者の書',
  'Song of Solomon': '雅歌', 'Isaiah': 'イザヤ書', 'Jeremiah': 'エレミヤ書',
  'Lamentations': '哀歌', 'Ezekiel': 'エゼキエル書', 'Daniel': 'ダニエル書',
  'Hosea': 'ホセア書', 'Joel': 'ヨエル書', 'Amos': 'アモス書',
  'Obadiah': 'オバデヤ書', 'Jonah': 'ヨナ書', 'Micah': 'ミカ書',
  'Nahum': 'ナホム書', 'Habakkuk': 'ハバクク書', 'Zephaniah': 'ゼパニヤ書',
  'Haggai': 'ハガイ書', 'Zechariah': 'ゼカリヤ書', 'Malachi': 'マラキ書',
  'Matthew': 'マタイ', 'Mark': 'マルコ', 'Luke': 'ルカ', 'John': 'ヨハネ',
  'Acts': '使徒', 'Romans': 'ローマ', '1 Corinthians': 'コリント第一',
  '2 Corinthians': 'コリント第二', 'Galatians': 'ガラテヤ', 'Ephesians': 'エペソ',
  'Philippians': 'ピリピ', 'Colossians': 'コロサイ', '1 Thessalonians': 'テサロニケ第一',
  '2 Thessalonians': 'テサロニケ第二', '1 Timothy': 'テモテ第一', '2 Timothy': 'テモテ第二',
  'Titus': 'テトス', 'Philemon': 'ピレモン', 'Hebrews': 'ヘブル', 'James': 'ヤコブ',
  '1 Peter': 'ペテロ第一', '2 Peter': 'ペテロ第二', '1 John': 'ヨハネ第一',
  '2 John': 'ヨハネ第二', '3 John': 'ヨハネ第三', 'Jude': 'ユダ', 'Revelation': '黙示録',
};

export async function getQueueVideos(channelId?: string): Promise<WorkQueueVideo[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('work_queue_videos')
    .select('*, channel:youtube_channels(*)')
    .eq('status', 'pending')
    .order('view_count', { ascending: false });

  if (channelId) {
    query = query.eq('channel_id', channelId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getChannels() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('youtube_channels')
    .select('*')
    .eq('is_active', true)
    .order('channel_name');

  if (error) throw error;
  return data || [];
}

export async function getVideoClips(youtubeVideoId: string): Promise<ClipWithVerse[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('clips')
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
      )
    `)
    .eq('youtube_video_id', youtubeVideoId)
    .order('start_time');

  if (error) throw error;
  return data || [];
}

export async function saveClip(input: SaveClipInput): Promise<{ clipId: string }> {
  const supabase = createAdminClient();

  // Insert clip
  const { data: clip, error: clipError } = await supabase
    .from('clips')
    .insert({
      youtube_video_id: input.youtubeVideoId,
      start_time: input.startTime,
      end_time: input.endTime,
      title: input.title,
      submitted_by: input.userId || null,
      status: 'APPROVED', // Auto-approve for workspace
    })
    .select()
    .single();

  if (clipError) throw clipError;

  // Insert verse
  const { error: verseError } = await supabase
    .from('clip_verses')
    .insert({
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
    const { error: catError } = await supabase
      .from('clip_categories')
      .insert(input.categoryIds.map(catId => ({
        clip_id: clip.id,
        category_id: catId,
      })));

    if (catError) throw catError;
  }

  // Increment clips_created on work queue video
  await supabase.rpc('increment_clips_created', { video_id: input.youtubeVideoId });

  revalidatePath('/workspace');
  return { clipId: clip.id };
}

export async function deleteClip(clipId: string): Promise<void> {
  const supabase = createAdminClient();

  // Get clip to find youtube_video_id
  const { data: clip } = await supabase
    .from('clips')
    .select('youtube_video_id')
    .eq('id', clipId)
    .single();

  // Delete clip (cascades to verses, categories)
  const { error } = await supabase
    .from('clips')
    .delete()
    .eq('id', clipId);

  if (error) throw error;

  // Decrement clips_created
  if (clip) {
    await supabase.rpc('decrement_clips_created', { video_id: clip.youtube_video_id });
  }

  revalidatePath('/workspace');
}

export type UpdateClipInput = {
  clipId: string;
  startTime: number;
  endTime: number;
};

export async function updateClip(input: UpdateClipInput): Promise<{ clipId: string }> {
  const supabase = createAdminClient();

  // Update clip times
  const { error: updateError } = await supabase
    .from('clips')
    .update({
      start_time: input.startTime,
      end_time: input.endTime,
    })
    .eq('id', input.clipId);

  if (updateError) throw updateError;

  // Delete existing subtitles (will be regenerated)
  await supabase.from('clip_subtitles').delete().eq('clip_id', input.clipId);

  revalidatePath('/workspace');
  return { clipId: input.clipId };
}

export async function updateVideoStatus(
  youtubeVideoId: string,
  status: 'completed' | 'skipped'
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('work_queue_videos')
    .update({ status })
    .eq('youtube_video_id', youtubeVideoId);

  if (error) throw error;

  revalidatePath('/workspace');
}

// Helper: Group words into sentences for translation
type WordWithId = WordTiming & { id?: string };

function groupWordsIntoSentences(
  words: WordWithId[],
  maxWords = 10,
  pauseThreshold = 0.5
): { words: WordWithId[]; text: string; firstIndex: number }[] {
  if (words.length === 0) return [];

  const sentences: { words: WordWithId[]; text: string; firstIndex: number }[] = [];
  let currentWords: WordWithId[] = [];
  let firstIndex = 0;

  const hasPunctuationAhead = (startIndex: number, lookAhead: number): boolean => {
    for (let j = startIndex; j < Math.min(startIndex + lookAhead, words.length); j++) {
      const w = words[j];
      if (w && /[.!?,;]$/.test(w.word)) return true;
    }
    return false;
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    if (currentWords.length === 0) {
      firstIndex = i;
    }

    const nextWord = words[i + 1];
    currentWords.push(word);

    const endsPunctuation = /[.!?]$/.test(word.word);
    const endsClause = /[,;]$/.test(word.word);
    const hasLongPause = nextWord && nextWord.start - word.end > pauseThreshold;
    const reachedMaxWords = currentWords.length >= maxWords && !hasPunctuationAhead(i + 1, 4);
    const splitOnClause = endsClause && currentWords.length >= 6;

    if (endsPunctuation || hasLongPause || reachedMaxWords || splitOnClause || !nextWord) {
      sentences.push({
        words: [...currentWords],
        text: currentWords.map((w) => w.word).join(' '),
        firstIndex,
      });
      currentWords = [];
    }
  }

  return sentences;
}

// Helper: Translate sentences to Japanese
async function translateSentences(sentences: string[]): Promise<string[]> {
  if (sentences.length === 0) return [];

  const openai = new OpenAI();

  const prompt = `Translate the following English sentences to natural Japanese. Return ONLY the translations, one per line, in the same order. Keep them concise for subtitles.

${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a professional translator. Translate English to natural, conversational Japanese suitable for video subtitles.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content || '';

  return content
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter((line) => line.length > 0);
}

export async function generateClipSubtitles(clipId: string): Promise<{ wordCount: number }> {
  const supabase = createAdminClient();

  // Get clip details
  const { data: clip, error: clipError } = await supabase
    .from('clips')
    .select('id, youtube_video_id, start_time, end_time')
    .eq('id', clipId)
    .single();

  if (clipError || !clip) {
    throw new Error('Clip not found');
  }

  // Check if subtitles already exist
  const { count } = await supabase
    .from('clip_subtitles')
    .select('*', { count: 'exact', head: true })
    .eq('clip_id', clipId);

  if (count && count > 0) {
    return { wordCount: count };
  }

  // Transcribe with Whisper
  console.log(`Transcribing clip ${clipId}...`);
  const words = await transcribeClipWithWhisper(
    clip.youtube_video_id,
    clip.start_time,
    clip.end_time
  );

  if (words.length === 0) {
    throw new Error('No words transcribed');
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

  const { error: insertError } = await supabase.from('clip_subtitles').insert(subtitleRows);

  if (insertError) {
    throw new Error(`Failed to save subtitles: ${insertError.message}`);
  }

  // Group into sentences and translate
  console.log('Translating to Japanese...');
  const sentences = groupWordsIntoSentences(words);
  const translations = await translateSentences(sentences.map((s) => s.text));

  // Update first word of each sentence with translation
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const translation = translations[i];

    if (!sentence || !translation) continue;

    await supabase
      .from('clip_subtitles')
      .update({ word_ja: translation })
      .eq('clip_id', clipId)
      .eq('sequence', sentence.firstIndex);
  }

  console.log(`Generated ${words.length} subtitles with ${translations.length} translations`);
  return { wordCount: words.length };
}
