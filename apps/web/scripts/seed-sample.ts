import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load env from .env.local
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

console.log("Supabase URL:", supabaseUrl);
console.log("Has key:", !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedSampleClip() {
  console.log("Seeding sample clip...");

  // First, check if categories exist
  const { data: existingCategories, error: catCheckError } = await supabase
    .from("categories")
    .select("id, slug")
    .limit(1);

  if (catCheckError) {
    console.error("Error checking categories:", catCheckError);
    console.log("");
    console.log("It seems the database tables do not exist yet.");
    console.log("Please run the migrations first using Supabase dashboard or CLI:");
    console.log("1. Go to https://supabase.com/dashboard/project/hmjgkhxqrqbqlqqrexzw/sql");
    console.log("2. Copy and run the SQL from: supabase/migrations/00001_initial_schema.sql");
    console.log("3. Copy and run the SQL from: supabase/migrations/00002_rls_policies.sql");
    return;
  }

  // Seed categories if needed
  if (!existingCategories || existingCategories.length === 0) {
    console.log("Seeding categories...");
    const categories = [
      { slug: "love", name_en: "Love", name_ja: "愛", sort_order: 1 },
      { slug: "anxiety", name_en: "Anxiety", name_ja: "不安", sort_order: 2 },
      { slug: "anger", name_en: "Anger", name_ja: "怒り", sort_order: 3 },
      { slug: "hope", name_en: "Hope", name_ja: "希望", sort_order: 4 },
      { slug: "depression", name_en: "Depression", name_ja: "うつ", sort_order: 5 },
      { slug: "peace", name_en: "Peace", name_ja: "平安", sort_order: 6 },
      { slug: "fear", name_en: "Fear", name_ja: "恐れ", sort_order: 7 },
      { slug: "stress", name_en: "Stress", name_ja: "ストレス", sort_order: 8 },
      { slug: "patience", name_en: "Patience", name_ja: "忍耐", sort_order: 9 },
      { slug: "temptation", name_en: "Temptation", name_ja: "誘惑", sort_order: 10 },
      { slug: "pride", name_en: "Pride", name_ja: "高慢", sort_order: 11 },
      { slug: "doubt", name_en: "Doubt", name_ja: "疑い", sort_order: 12 },
      { slug: "joy", name_en: "Joy", name_ja: "喜び", sort_order: 13 },
      { slug: "jealousy", name_en: "Jealousy", name_ja: "嫉妬", sort_order: 14 },
      { slug: "loss", name_en: "Loss", name_ja: "喪失", sort_order: 15 },
      { slug: "healing", name_en: "Healing", name_ja: "癒し", sort_order: 16 },
    ];

    const { error: catError } = await supabase.from("categories").insert(categories);
    if (catError) {
      console.error("Error seeding categories:", catError);
      return;
    }
    console.log("Categories seeded!");
  }

  // Get the anxiety category ID
  const { data: anxietyCategory } = await supabase.from("categories").select("id").eq("slug", "anxiety").single();

  if (!anxietyCategory) {
    console.error("Anxiety category not found");
    return;
  }

  console.log("Anxiety category ID:", anxietyCategory.id);

  // Check if sample clip already exists
  const { data: existingClip } = await supabase
    .from("clips")
    .select("id")
    .eq("youtube_video_id", "S82EJ14zlMc")
    .single();

  if (existingClip) {
    console.log("Sample clip already exists:", existingClip.id);
    return;
  }

  // Insert the sample clip
  // Note: We need to bypass the submitted_by foreign key - this requires service role key
  // For now, let's try inserting without submitted_by (if schema allows) or use a workaround

  const clipId = crypto.randomUUID();

  const { error: clipError } = await supabase.from("clips").insert({
    id: clipId,
    youtube_video_id: "S82EJ14zlMc",
    start_time: 336, // 5:36 = 5*60 + 36
    end_time: 390, // 6:30 = 6*60 + 30
    title: "Do Not Be Anxious - Philippians 4:6",
    title_ja: "思い煩うな - ピリピ4:6",
    status: "APPROVED",
    is_featured: true,
    vote_count: 0,
  });

  if (clipError) {
    console.error("Error inserting clip:", clipError);
    console.log("");
    console.log("The clip insert failed. This is likely because:");
    console.log("1. The submitted_by column requires a valid user ID");
    console.log("2. RLS policies are blocking the insert");
    console.log("");
    console.log("To fix this, please:");
    console.log("1. Sign up a user at http://localhost:3001/register");
    console.log("2. Use Supabase dashboard to insert the clip directly, or");
    console.log("3. Set SUPABASE_SERVICE_ROLE_KEY in .env.local to bypass RLS");
    return;
  }

  // Insert clip verse
  const { error: verseError } = await supabase.from("clip_verses").insert({
    clip_id: clipId,
    book: "Philippians",
    book_ja: "ピリピ人への手紙",
    chapter: 4,
    verse_start: 6,
    verse_end: null,
  });

  if (verseError) {
    console.error("Error inserting verse:", verseError);
    return;
  }

  // Insert clip category
  const { error: catLinkError } = await supabase.from("clip_categories").insert({
    clip_id: clipId,
    category_id: anxietyCategory.id,
  });

  if (catLinkError) {
    console.error("Error linking category:", catLinkError);
    return;
  }

  console.log("");
  console.log("Sample clip seeded successfully!");
  console.log("Clip ID:", clipId);
  console.log("");
  console.log("Refresh http://localhost:3001 to see the clip!");
}

seedSampleClip().catch(console.error);
