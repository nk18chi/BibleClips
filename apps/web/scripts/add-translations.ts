/**
 * Add Japanese translations to clip subtitles.
 * Groups words into sentences and translates each sentence.
 * Usage: npx tsx scripts/add-translations.ts <clip_id>
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

if (!openaiApiKey) {
  console.error('Missing OPENAI_API_KEY in .env.local');
  process.exit(1);
}

type WordTiming = {
  id: string;
  word: string;
  start_time: number;
  end_time: number;
  sequence: number;
};

type Sentence = {
  words: WordTiming[];
  text: string;
  firstWordId: string;
};

/**
 * Groups word timings into sentences based on pauses and word count.
 * Same logic as subtitle-overlay.tsx
 */
function groupIntoSentences(words: WordTiming[], maxWords = 6, pauseThreshold = 0.4): Sentence[] {
  if (words.length === 0) return [];

  const sentences: Sentence[] = [];
  let currentWords: WordTiming[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    const nextWord = words[i + 1];
    currentWords.push(word);

    // Check if we should end the sentence
    const endsPunctuation = /[.!?]$/.test(word.word);
    const hasLongPause = nextWord && nextWord.start_time - word.end_time > pauseThreshold;
    const reachedMaxWords = currentWords.length >= maxWords;

    if (endsPunctuation || hasLongPause || reachedMaxWords || !nextWord) {
      const firstWord = currentWords[0];
      if (firstWord) {
        sentences.push({
          words: [...currentWords],
          text: currentWords.map(w => w.word).join(' '),
          firstWordId: firstWord.id,
        });
      }
      currentWords = [];
    }
  }

  return sentences;
}

async function translateSentences(sentences: string[]): Promise<string[]> {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  console.log(`Translating ${sentences.length} sentences...`);

  const prompt = `Translate the following English sentences to natural Japanese. Return ONLY the translations, one per line, in the same order. Keep them concise for subtitles.

${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a professional translator. Translate English to natural, conversational Japanese suitable for video subtitles.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content || '';

  // Parse translations (remove numbering if present)
  const translations = content
    .split('\n')
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 0);

  if (translations.length !== sentences.length) {
    console.warn(`Warning: Got ${translations.length} translations for ${sentences.length} sentences`);
  }

  return translations;
}

async function addTranslations(clipId: string) {
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  console.log(`Fetching subtitles for clip ${clipId}...`);

  // Get all subtitles for the clip
  const { data: subtitles, error } = await supabase
    .from('clip_subtitles')
    .select('id, word, start_time, end_time, sequence')
    .eq('clip_id', clipId)
    .order('sequence', { ascending: true });

  if (error || !subtitles) {
    console.error('Failed to fetch subtitles:', error);
    process.exit(1);
  }

  console.log(`Found ${subtitles.length} words`);

  // Group into sentences
  const sentences = groupIntoSentences(subtitles as WordTiming[]);
  console.log(`Grouped into ${sentences.length} sentences`);

  // Print sentences for review
  console.log('\nSentences:');
  sentences.forEach((s, i) => {
    console.log(`  ${i + 1}. "${s.text}"`);
  });

  // Translate sentences
  const translations = await translateSentences(sentences.map(s => s.text));

  console.log('\nTranslations:');
  translations.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t}`);
  });

  // Update first word of each sentence with translation
  console.log('\nUpdating database...');

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const translation = translations[i];

    if (!sentence || !translation) continue;

    const { error: updateError } = await supabase
      .from('clip_subtitles')
      .update({ word_ja: translation })
      .eq('id', sentence.firstWordId);

    if (updateError) {
      console.error(`Failed to update word ${sentence.firstWordId}:`, updateError);
    }
  }

  console.log(`\n✅ Added ${translations.length} Japanese translations for clip ${clipId}`);
}

// Get clip ID from command line
const clipId = process.argv[2];

if (!clipId) {
  console.error('Usage: npx tsx scripts/add-translations.ts <clip_id>');
  process.exit(1);
}

addTranslations(clipId).catch(console.error);
