/**
 * Manually fix shifted translations
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

async function fixTranslations() {
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  // Matthew 6:25 - fix sentences 29-35
  const matthewClipId = 'f6df5ee8-131e-4495-862f-756c5a206160';

  console.log('Fixing Matthew 6:25 translations...\n');

  // Get words to find first word of each sentence
  const { data: mWords } = await supabase
    .from('clip_subtitles')
    .select('id, word, sequence')
    .eq('clip_id', matthewClipId)
    .order('sequence', { ascending: true });

  // Manual corrections based on review - first word sequence -> correct translation
  const matthewFixes: Record<number, string> = {
    // Sentence 29 starts at "It" (sequence ~193)
    193: '無価値で、ただ悩むだけで何もしない、',
    // Sentence 30 starts at "make" (~201)
    201: 'あなたの人生に何の違いも生まない。',
    // Sentence 31 starts at "You" (~209)
    209: '変えられないことを心配するのは無駄だ。',
    // Sentence 32 starts at "And" (~220)
    220: '変えられることを心配するのは愚かだ。',
    // Sentence 33 starts at "Just" (~230)
    230: 'さあ、変えればいい。',
    // Sentence 34 starts at "In" (~234)
    234: 'どちらにしても、',
    // Sentence 35 starts at "worry" (~237)
    237: '心配は答えではない。心配は効果がなく、不合理だ。',
  };

  for (const [seq, translation] of Object.entries(matthewFixes)) {
    const word = mWords?.find(w => w.sequence === parseInt(seq));
    if (word) {
      console.log(`  ${seq}: "${word.word}" -> "${translation.slice(0, 30)}..."`);
      await supabase
        .from('clip_subtitles')
        .update({ word_ja: translation })
        .eq('id', word.id);
    }
  }

  // Philippians 4:6 - fix all shifted translations
  const philClipId = '00000000-0000-0000-0000-000000000001';

  console.log('\nFixing Philippians 4:6 translations...\n');

  const { data: pWords } = await supabase
    .from('clip_subtitles')
    .select('id, word, sequence')
    .eq('clip_id', philClipId)
    .order('sequence', { ascending: true });

  // Manual corrections - first word sequence -> correct translation
  const philFixes: Record<number, string> = {
    0: 'する',  // "does" - fragment
    1: 'そしてほとんどの人が心配しすぎています。神は',
    11: '聖書で心配についてとても明確におっしゃっています。',
    21: 'そしてそれが最初の節、6節です。',
    31: 'フィリピ人への手紙4章にはこう書いてあります：',
    41: '何も心配してはいけません。',
    46: '「決して」と「何も」に丸をつけてください。何も心配してはいけません。',
    56: 'この節に余地はありますか？',
    65: 'いいえ。',
    66: '例外はありますか？',
    70: 'いいえ。',
    71: '免除はありますか？',
    75: 'いいえ。',
    76: '神がこの状況で心配してもいいと言う理由がありますか？',
    90: 'いいえ。',
    91: '何も心配してはいけません。',
    95: 'これは非常に包括的な声明です。',
    106: '彼は言っています「何も心配してはいけない」と。',
    117: 'でも何についてですか？何も心配してはいけない。',
    125: 'でも何についてですか？何も心配してはいけない。',
  };

  for (const [seq, translation] of Object.entries(philFixes)) {
    const word = pWords?.find(w => w.sequence === parseInt(seq));
    if (word) {
      console.log(`  ${seq}: "${word.word}" -> "${translation.slice(0, 30)}..."`);
      await supabase
        .from('clip_subtitles')
        .update({ word_ja: translation })
        .eq('id', word.id);
    }
  }

  console.log('\n✅ Translations fixed!');
}

fixTranslations().catch(console.error);
