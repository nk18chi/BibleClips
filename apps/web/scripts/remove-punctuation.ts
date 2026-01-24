/**
 * Remove punctuation from all subtitle words in database
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? "";

async function removePunctuation() {
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  // Get all words
  const { data: words } = await supabase.from("clip_subtitles").select("id, word");

  console.log(`Found ${words?.length || 0} total words`);

  let count = 0;
  for (const w of words || []) {
    // Remove trailing punctuation
    const cleaned = w.word.replace(/[.!?,;:]+$/, "");
    if (cleaned !== w.word) {
      console.log(`  "${w.word}" -> "${cleaned}"`);
      await supabase.from("clip_subtitles").update({ word: cleaned }).eq("id", w.id);
      count++;
    }
  }

  console.log(`\n✅ Removed punctuation from ${count} words`);
}

removePunctuation().catch(console.error);
