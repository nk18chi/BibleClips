/**
 * Review all subtitles with translations
 * Usage: pnpm exec tsx scripts/review-subtitles.ts <clip_id>
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

type WordTiming = {
  id: string;
  word: string;
  word_ja: string | null;
  start_time: number;
  end_time: number;
  sequence: number;
};

type Sentence = {
  words: WordTiming[];
  text: string;
  translation: string | null;
};

function groupIntoSentences(words: WordTiming[], maxWords = 10, pauseThreshold = 0.5): Sentence[] {
  if (words.length === 0) return [];

  const sentences: Sentence[] = [];
  let currentWords: WordTiming[] = [];

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

    const nextWord = words[i + 1];
    currentWords.push(word);

    const endsPunctuation = /[.!?]$/.test(word.word);
    const endsClause = /[,;]$/.test(word.word);
    const hasLongPause = nextWord && nextWord.start_time - word.end_time > pauseThreshold;
    const reachedMaxWords = currentWords.length >= maxWords && !hasPunctuationAhead(i + 1, 4);
    const splitOnClause = endsClause && currentWords.length >= 6;

    if (endsPunctuation || hasLongPause || reachedMaxWords || splitOnClause || !nextWord) {
      const firstWord = currentWords[0];
      if (firstWord) {
        sentences.push({
          words: [...currentWords],
          text: currentWords.map(w => w.word).join(' '),
          translation: firstWord.word_ja,
        });
      }
      currentWords = [];
    }
  }

  return sentences;
}

async function reviewSubtitles(clipId: string) {
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  // Get clip info
  const { data: clip } = await supabase
    .from('clips')
    .select('title, youtube_video_id, start_time, end_time')
    .eq('id', clipId)
    .single();

  if (!clip) {
    console.error('Clip not found');
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Clip: ${clip.title}`);
  console.log(`Video: https://youtube.com/watch?v=${clip.youtube_video_id}&t=${clip.start_time}`);
  console.log(`${'='.repeat(60)}\n`);

  // Get all subtitles
  const { data: subtitles } = await supabase
    .from('clip_subtitles')
    .select('id, word, word_ja, start_time, end_time, sequence')
    .eq('clip_id', clipId)
    .order('sequence', { ascending: true });

  if (!subtitles || subtitles.length === 0) {
    console.log('No subtitles found');
    return;
  }

  const sentences = groupIntoSentences(subtitles as WordTiming[]);

  console.log(`Total words: ${subtitles.length}`);
  console.log(`Total sentences: ${sentences.length}\n`);
  console.log(`${'─'.repeat(60)}\n`);

  sentences.forEach((sentence, i) => {
    const num = String(i + 1).padStart(2, ' ');
    console.log(`${num}. EN: ${sentence.text}`);
    console.log(`    JA: ${sentence.translation || '(no translation)'}`);
    console.log('');
  });
}

// Get clip ID from command line or list all clips
const clipId = process.argv[2];

if (!clipId) {
  // List all clips
  const supabase = createClient(supabaseUrl, supabaseSecretKey);
  supabase
    .from('clips')
    .select('id, title')
    .then(({ data }) => {
      console.log('Available clips:');
      data?.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.id} - ${c.title}`);
      });
      console.log('\nUsage: pnpm exec tsx scripts/review-subtitles.ts <clip_id>');
    });
} else {
  reviewSubtitles(clipId).catch(console.error);
}
