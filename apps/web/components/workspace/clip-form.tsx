"use client";

import { useEffect, useState } from "react";
import { saveClip } from "@/app/workspace/actions";
import { useSupabase } from "@/components/providers/supabase-provider";
import { StylePreview } from "@/components/style-picker/style-preview";
import { BIBLE_VERSIONS } from "@/lib/bible-versions";
import { SUBTITLE_STYLES } from "@/lib/styles/subtitle-styles";

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
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
  onSaved: () => void;
  categories: { id: string; slug: string; name_en: string }[];
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const whole = Math.floor(s);
  const ms = Math.round((s - whole) * 1000);
  if (ms > 0) {
    return `${m}:${whole.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  }
  return `${m}:${whole.toString().padStart(2, "0")}`;
}

function parseTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const colonParts = trimmed.split(":");
    if (colonParts.some((p) => p === "")) return null;
    const parts = colonParts.map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
    if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
    return null;
  }
  const n = Number(trimmed);
  return isNaN(n) ? null : n;
}

export function ClipForm({ youtubeVideoId, startTime, endTime, onStartTimeChange, onEndTimeChange, onSaved, categories }: ClipFormProps) {
  const { user } = useSupabase();
  const [startTimeText, setStartTimeText] = useState(formatTime(startTime));
  const [endTimeText, setEndTimeText] = useState(formatTime(endTime));
  const [startFocused, setStartFocused] = useState(false);
  const [endFocused, setEndFocused] = useState(false);

  useEffect(() => {
    if (!startFocused) setStartTimeText(formatTime(startTime));
  }, [startTime, startFocused]);

  useEffect(() => {
    if (!endFocused) setEndTimeText(formatTime(endTime));
  }, [endTime, endFocused]);
  const [title, setTitle] = useState("");
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [verseStart, setVerseStart] = useState("");
  const [verseEnd, setVerseEnd] = useState("");
  const [version, setVersion] = useState("NIV");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [clipType, setClipType] = useState<"sermon" | "song" | "testimony">("sermon");
  const [artistName, setArtistName] = useState("");
  const [songName, setSongName] = useState("");
  const [subtitleStyleId, setSubtitleStyleId] = useState("classic-white");
  const [saving, setSaving] = useState(false);
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

    if (clipType === "sermon" && (!book || !chapter || !verseStart)) {
      setError("Please fill in the verse reference");
      return;
    }

    if (clipType === "song" && (!artistName || !songName)) {
      setError("Please fill in the artist name and song name");
      return;
    }

    // Testimony has no additional required fields beyond title

    setSaving(true);
    setSubtitleResult(null);

    try {
      const { clipId } = await saveClip({
        youtubeVideoId,
        startTime,
        endTime,
        title: title || (clipType === "sermon" ? `${book} ${chapter}:${verseStart}` : clipType === "song" ? `${artistName} - ${songName}` : "Testimony"),
        book: clipType === "sermon" ? book : "",
        chapter: clipType === "sermon" ? parseInt(chapter, 10) : 0,
        verseStart: clipType === "sermon" ? parseInt(verseStart, 10) : 0,
        verseEnd: clipType === "sermon" && verseEnd ? parseInt(verseEnd, 10) : undefined,
        version: clipType === "sermon" ? version : undefined,
        clipType,
        artistName: clipType === "song" ? artistName : undefined,
        songName: clipType === "song" ? songName : undefined,
        categoryIds: clipType === "sermon" ? selectedCategories : [],
        subtitleStyleId,
        userId: user?.id,
      });

      setSaving(false);
      setSubtitleResult("Clip saved");

      // Reset form
      setTitle("");
      setBook("");
      setChapter("");
      setVerseStart("");
      setVerseEnd("");
      setVersion("NIV");
      setClipType("sermon");
      setArtistName("");
      setSongName("");
      setSelectedCategories([]);
      setSubtitleStyleId("classic-white");

      // Refresh clips list immediately (don't await)
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save clip");
    } finally {
      setSaving(false);
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

      {/* Time inputs */}
      <div className="flex flex-wrap items-end gap-2 md:gap-4 text-sm">
        <div>
          <label className="text-gray-500 block mb-1">Start</label>
          <input
            type="text"
            value={startTimeText}
            onChange={(e) => setStartTimeText(e.target.value)}
            onFocus={() => setStartFocused(true)}
            onBlur={() => {
              setStartFocused(false);
              const parsed = parseTime(startTimeText);
              if (parsed !== null) {
                onStartTimeChange(parsed);
              }
              setStartTimeText(formatTime(parsed ?? startTime));
            }}
            className="w-28 px-2 py-1 border rounded font-mono text-sm"
            placeholder="0:00"
          />
        </div>
        <div>
          <label className="text-gray-500 block mb-1">End</label>
          <input
            type="text"
            value={endTimeText}
            onChange={(e) => setEndTimeText(e.target.value)}
            onFocus={() => setEndFocused(true)}
            onBlur={() => {
              setEndFocused(false);
              const parsed = parseTime(endTimeText);
              if (parsed !== null) {
                onEndTimeChange(parsed);
              }
              setEndTimeText(formatTime(parsed ?? endTime));
            }}
            className="w-28 px-2 py-1 border rounded font-mono text-sm"
            placeholder="0:00"
          />
        </div>
        <div className="py-1">
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

      {/* Clip Type */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setClipType("sermon")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            clipType === "sermon" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Sermon
        </button>
        <button
          type="button"
          onClick={() => setClipType("song")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            clipType === "song" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Song
        </button>
        <button
          type="button"
          onClick={() => setClipType("testimony")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            clipType === "testimony" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Testimony
        </button>
      </div>

      {/* Song fields */}
      {clipType === "song" && (
        <div className="space-y-2">
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Artist name"
            className="w-full px-3 py-2 border rounded-lg text-sm"
            required
          />
          <input
            type="text"
            value={songName}
            onChange={(e) => setSongName(e.target.value)}
            placeholder="Song name"
            className="w-full px-3 py-2 border rounded-lg text-sm"
            required
          />
        </div>
      )}

      {/* Verse reference (sermon only) */}
      {clipType === "sermon" && (
        <>
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

          {/* Bible Version */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Bible Version:</label>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {BIBLE_VERSIONS.map((v) => (
                <option key={v.code} value={v.code}>
                  {v.code} - {v.name}
                </option>
              ))}
            </select>
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
        </>
      )}

      {/* Subtitle Style */}
      <div>
        <p className="text-sm text-gray-600 mb-2">Subtitle Style:</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {SUBTITLE_STYLES.map((s) => (
            <div key={s.id} className="flex-shrink-0 w-28">
              <StylePreview
                style={s}
                isSelected={subtitleStyleId === s.id}
                onClick={() => setSubtitleStyleId(s.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving || startTime === 0 || endTime === 0}
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {saving ? "Saving..." : "Save Clip"}
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
