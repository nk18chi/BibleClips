"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Header } from "@/components/ui/header";

const CATEGORIES = [
  { slug: "love", name: "Love" },
  { slug: "anxiety", name: "Anxiety" },
  { slug: "anger", name: "Anger" },
  { slug: "hope", name: "Hope" },
  { slug: "depression", name: "Depression" },
  { slug: "peace", name: "Peace" },
  { slug: "fear", name: "Fear" },
  { slug: "stress", name: "Stress" },
  { slug: "patience", name: "Patience" },
  { slug: "temptation", name: "Temptation" },
  { slug: "pride", name: "Pride" },
  { slug: "doubt", name: "Doubt" },
  { slug: "joy", name: "Joy" },
  { slug: "jealousy", name: "Jealousy" },
  { slug: "loss", name: "Loss" },
  { slug: "healing", name: "Healing" },
];

const BIBLE_BOOKS = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
];

function parseYouTubeUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function parseTime(time: string): number {
  // Parse "1:30" or "90" to seconds
  if (time.includes(":")) {
    const parts = time.split(":").map(Number);
    if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3 && parts[0] !== undefined && parts[1] !== undefined && parts[2] !== undefined) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }
  return parseInt(time, 10) || 0;
}

export default function SubmitPage() {
  const { supabase, user } = useSupabase();
  const router = useRouter();

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [title, setTitle] = useState("");
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [verseStart, setVerseStart] = useState("");
  const [verseEnd, setVerseEnd] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const videoId = parseYouTubeUrl(youtubeUrl);

  const handleCategoryToggle = (slug: string) => {
    setSelectedCategories((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!videoId) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    if (!user) {
      setError("You must be logged in to submit a clip");
      return;
    }

    const startSeconds = parseTime(startTime);
    const endSeconds = parseTime(endTime);

    if (endSeconds <= startSeconds) {
      setError("End time must be after start time");
      return;
    }

    if (selectedCategories.length === 0) {
      setError("Please select at least one category");
      return;
    }

    setLoading(true);

    try {
      // Get book_ja from a simple mapping (you can expand this)
      const bookJaMap: Record<string, string> = {
        Genesis: "創世記",
        Exodus: "出エジプト記",
        Matthew: "マタイ",
        Mark: "マルコ",
        Luke: "ルカ",
        John: "ヨハネ",
        Acts: "使徒",
        Romans: "ローマ",
        Philippians: "ピリピ",
        Psalms: "詩篇",
        Proverbs: "箴言",
        Isaiah: "イザヤ",
        Revelation: "黙示録",
        // Add more as needed
      };

      // Insert clip
      const { data: clip, error: clipError } = await supabase
        .from("clips")
        .insert({
          youtube_video_id: videoId,
          start_time: startSeconds,
          end_time: endSeconds,
          title,
          submitted_by: user.id,
          status: "PENDING",
        })
        .select()
        .single();

      if (clipError) throw clipError;

      // Insert verse
      if (book && chapter && verseStart) {
        const { error: verseError } = await supabase.from("clip_verses").insert({
          clip_id: clip.id,
          book,
          book_ja: bookJaMap[book] || book,
          chapter: parseInt(chapter, 10),
          verse_start: parseInt(verseStart, 10),
          verse_end: verseEnd ? parseInt(verseEnd, 10) : null,
        });

        if (verseError) throw verseError;
      }

      // Get category IDs and insert clip_categories
      const { data: categories } = await supabase.from("categories").select("id, slug").in("slug", selectedCategories);

      if (categories && categories.length > 0) {
        const { error: catError } = await supabase.from("clip_categories").insert(
          categories.map((cat) => ({
            clip_id: clip.id,
            category_id: cat.id,
          }))
        );

        if (catError) throw catError;
      }

      router.push("/my-clips?submitted=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit clip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Submit a Clip</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

          {/* YouTube URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL *</label>
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {videoId && (
              <div className="mt-2">
                <img
                  src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                  alt="Video thumbnail"
                  className="w-40 rounded"
                />
              </div>
            )}
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time * (e.g., 1:30)</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="0:00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time * (e.g., 2:45)</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="1:00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clip Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A short title for this clip"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Bible Verse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bible Verse *</label>
            <div className="grid grid-cols-4 gap-2">
              <select
                value={book}
                onChange={(e) => setBook(e.target.value)}
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select book</option>
                {BIBLE_BOOKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="Ch"
                min="1"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="flex gap-1 items-center">
                <input
                  type="number"
                  value={verseStart}
                  onChange={(e) => setVerseStart(e.target.value)}
                  placeholder="V"
                  min="1"
                  className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span>-</span>
                <input
                  type="number"
                  value={verseEnd}
                  onChange={(e) => setVerseEnd(e.target.value)}
                  placeholder="V"
                  min="1"
                  className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categories * (select at least one)</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => handleCategoryToggle(cat.slug)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    selectedCategories.includes(cat.slug)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Submitting..." : "Submit Clip for Review"}
          </button>

          <p className="text-sm text-gray-500 text-center">
            Your clip will be reviewed by an admin before it becomes visible.
          </p>
        </form>
      </main>
    </div>
  );
}
