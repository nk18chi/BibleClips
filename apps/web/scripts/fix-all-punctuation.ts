/**
 * Fix punctuation in all subtitles
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? "";

async function fixPunctuation() {
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  const matthewClipId = "f6df5ee8-131e-4495-862f-756c5a206160";

  console.log("Fixing Matthew 6:25 clip punctuation...\n");

  // All fixes based on actual sequence numbers
  const matthewFixes = [
    { sequence: 114, newWord: "bigger." }, // "it always makes it bigger."
    { sequence: 133, newWord: "gets." }, // "the bigger it gets."
    { sequence: 155, newWord: "worry?" }, // "shrink with your worry?"
    { sequence: 160, newWord: "bigger." }, // "it always gets bigger."
    { sequence: 177, newWord: "proportion." }, // "out of proportion."
    { sequence: 185, newWord: "problem," }, // "exaggerating your problem,"
    { sequence: 188, newWord: "work." }, // "worry doesn't work."
    { sequence: 192, newWord: "worked." }, // "It never has worked."
    { sequence: 208, newWord: "life." }, // "in your life."
    { sequence: 219, newWord: "useless." }, // "is useless."
    { sequence: 229, newWord: "stupid." }, // "is stupid."
    { sequence: 233, newWord: "it." }, // "Just go change it."
    { sequence: 236, newWord: "case," }, // "In either case,"
    { sequence: 246, newWord: "unreasonable." }, // final word
  ];

  for (const fix of matthewFixes) {
    const { data: word } = await supabase
      .from("clip_subtitles")
      .select("id, word")
      .eq("clip_id", matthewClipId)
      .eq("sequence", fix.sequence)
      .single();

    if (word) {
      console.log(`  ${fix.sequence}: "${word.word}" -> "${fix.newWord}"`);
      await supabase.from("clip_subtitles").update({ word: fix.newWord }).eq("id", word.id);
    }
  }

  // Philippians fixes - add more
  const philClipId = "00000000-0000-0000-0000-000000000001";

  console.log("\nFixing Philippians 4:6 clip punctuation...\n");

  const philFixes = [
    { sequence: 55, newWord: "anything." }, // "Never worry about anything."
    { sequence: 69, newWord: "exception?" }, // "Is there any exception?"
    { sequence: 70, newWord: "No." }, // "No."
    { sequence: 74, newWord: "exemption?" }, // "Is there any exemption?"
    { sequence: 75, newWord: "No." }, // "No."
    { sequence: 89, newWord: "circumstance?" }, // "in this circumstance?"
    { sequence: 90, newWord: "No." }, // "No."
    { sequence: 116, newWord: "anything." }, // end
    { sequence: 124, newWord: "anything." }, // end
    { sequence: 132, newWord: "anything." }, // final
  ];

  for (const fix of philFixes) {
    const { data: word } = await supabase
      .from("clip_subtitles")
      .select("id, word")
      .eq("clip_id", philClipId)
      .eq("sequence", fix.sequence)
      .single();

    if (word) {
      console.log(`  ${fix.sequence}: "${word.word}" -> "${fix.newWord}"`);
      await supabase.from("clip_subtitles").update({ word: fix.newWord }).eq("id", word.id);
    }
  }

  console.log("\n✅ All punctuation fixes complete!");
}

fixPunctuation().catch(console.error);
