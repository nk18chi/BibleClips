/**
 * Fix punctuation in subtitles
 * Usage: pnpm exec tsx scripts/fix-punctuation.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

async function fixPunctuation() {
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  // Fix "unreasonable" -> "unreasonable." in the Matthew 6:25 clip
  // The word appears at sequence around 13 (after "it is unreasonable")
  const clipId = 'f6df5ee8-131e-4495-862f-756c5a206160';

  // Find the word "unreasonable" that should have a period
  const { data: words } = await supabase
    .from('clip_subtitles')
    .select('id, word, sequence')
    .eq('clip_id', clipId)
    .ilike('word', 'unreasonable')
    .order('sequence', { ascending: true });

  console.log('Found words:', words);

  // The first occurrence (after "it is") should have a period
  if (words && words.length > 0) {
    // Find the one around sequence 13-15 (after "it is unreasonable")
    const wordToFix = words.find(w => w.sequence >= 10 && w.sequence <= 20);

    if (wordToFix) {
      console.log(`Fixing word at sequence ${wordToFix.sequence}: "${wordToFix.word}" -> "unreasonable."`);

      const { error } = await supabase
        .from('clip_subtitles')
        .update({ word: 'unreasonable.' })
        .eq('id', wordToFix.id);

      if (error) {
        console.error('Error:', error);
      } else {
        console.log('✅ Fixed!');
      }
    }
  }
}

fixPunctuation().catch(console.error);
