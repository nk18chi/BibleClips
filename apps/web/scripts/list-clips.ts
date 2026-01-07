/**
 * List all clips with their IDs
 * Usage: npx tsx scripts/list-clips.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

async function listClips() {
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  const { data: clips, error } = await supabase
    .from('clips')
    .select(`
      id,
      title,
      youtube_video_id,
      start_time,
      end_time,
      status,
      clip_verses (book, chapter, verse_start)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching clips:', error);
    process.exit(1);
  }

  console.log('Clips in database:\n');
  clips?.forEach((clip, i) => {
    const verse = clip.clip_verses?.[0];
    const verseRef = verse ? `${verse.book} ${verse.chapter}:${verse.verse_start}` : 'No verse';
    console.log(`${i + 1}. ${clip.title}`);
    console.log(`   ID: ${clip.id}`);
    console.log(`   Video: ${clip.youtube_video_id} (${clip.start_time}s - ${clip.end_time}s)`);
    console.log(`   Verse: ${verseRef}`);
    console.log(`   Status: ${clip.status}`);
    console.log('');
  });
}

listClips().catch(console.error);
