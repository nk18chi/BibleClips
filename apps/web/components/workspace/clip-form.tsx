"use client";

import { useState } from "react";
import { generateClipSubtitles, saveClip } from "@/app/workspace/actions";
import { useSupabase } from "@/components/providers/supabase-provider";

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

type ClipFormProps = {
  youtubeVideoId: string;
  startTime: number;
  endTime: number;
  onSaved: () => void;
  categories: { id: string; slug: string; name_en: string }[];
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ClipForm({ youtubeVideoId, startTime, endTime, onSaved, categories }: ClipFormProps) {
  const { user } = useSupabase();
  const [title, setTitle] = useState("");
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [verseStart, setVerseStart] = useState("");
  const [verseEnd, setVerseEnd] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingSubtitles, setGeneratingSubtitles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtitleResult, setSubtitleResult] = useState<string | null>(null);

  const handleCategoryToggle = (catId: string) => {
    setSelectedCategories((prev) => (prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (endTime <= startTime) {
      setError("End time must be after start time");
      return;
    }

    if (!book || !chapter || !verseStart) {
      setError("Please fill in the verse reference");
      return;
    }

    setSaving(true);
    setSubtitleResult(null);

    try {
      const { clipId } = await saveClip({
        youtubeVideoId,
        startTime,
        endTime,
        title: title || `${book} ${chapter}:${verseStart}`,
        book,
        chapter: parseInt(chapter, 10),
        verseStart: parseInt(verseStart, 10),
        verseEnd: verseEnd ? parseInt(verseEnd, 10) : undefined,
        categoryIds: selectedCategories,
        userId: user?.id,
      });

      setSaving(false);
      setGeneratingSubtitles(true);

      // Generate subtitles with Whisper and translate
      try {
        const result = await generateClipSubtitles(clipId);
        setSubtitleResult(`${result.wordCount} words transcribed`);
      } catch (subtitleErr) {
        console.error("Subtitle generation failed:", subtitleErr);
        setSubtitleResult("Subtitle generation failed (clip saved)");
      }

      // Reset form
      setTitle("");
      setBook("");
      setChapter("");
      setVerseStart("");
      setVerseEnd("");
      setSelectedCategories([]);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save clip");
    } finally {
      setSaving(false);
      setGeneratingSubtitles(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold text-gray-900">Create Clip</h3>

      {!user && (
        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
          Not logged in - clips will be saved without submitter info
        </div>
      )}

      {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

      {/* Time display */}
      <div className="flex flex-wrap gap-2 md:gap-4 text-sm">
        <div>
          <span className="text-gray-500">Start:</span>{" "}
          <span className="font-mono font-medium">{formatTime(startTime)}</span>
        </div>
        <div>
          <span className="text-gray-500">End:</span>{" "}
          <span className="font-mono font-medium">{formatTime(endTime)}</span>
        </div>
        <div>
          <span className="text-gray-500">Duration:</span>{" "}
          <span className="font-mono font-medium">{formatTime(endTime - startTime)}</span>
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Clip title (optional)"
        className="w-full px-3 py-2 border rounded-lg text-sm"
      />

      {/* Verse reference */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <select
          value={book}
          onChange={(e) => setBook(e.target.value)}
          className="col-span-2 px-3 py-2 border rounded-lg text-sm"
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
          className="px-3 py-2 border rounded-lg text-sm"
          required
        />
        <div className="flex gap-1 items-center">
          <input
            type="number"
            value={verseStart}
            onChange={(e) => setVerseStart(e.target.value)}
            placeholder="V"
            min="1"
            className="w-full px-2 py-2 border rounded-lg text-sm"
            required
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            value={verseEnd}
            onChange={(e) => setVerseEnd(e.target.value)}
            placeholder="V"
            min="1"
            className="w-full px-2 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <p className="text-sm text-gray-600 mb-2">Categories:</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryToggle(cat.id)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                selectedCategories.includes(cat.id)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
              }`}
            >
              {cat.name_en}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving || generatingSubtitles || startTime === 0 || endTime === 0}
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {saving ? "Saving..." : generatingSubtitles ? "Generating subtitles..." : "Save Clip"}
      </button>

      {/* Subtitle result */}
      {subtitleResult && (
        <div
          className={`text-sm p-2 rounded ${
            subtitleResult.includes("failed") ? "text-amber-600 bg-amber-50" : "text-green-600 bg-green-50"
          }`}
        >
          {subtitleResult}
        </div>
      )}
    </form>
  );
}
