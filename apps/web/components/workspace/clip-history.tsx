"use client";

import { useState } from "react";
import { deleteClip, generateClipSubtitles, updateClip } from "@/app/workspace/actions";
import type { ClipWithVerse } from "@/types/workspace";

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

type Category = { id: string; slug: string; name_en: string };

type ClipHistoryProps = {
  clips: ClipWithVerse[];
  categories: Category[];
  onDeleted: () => void;
  isAdmin: boolean;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseTime(timeStr: string): number | null {
  const parts = timeStr.split(":");
  if (parts.length !== 2) return null;
  const [minStr, secStr] = parts;
  const min = parseInt(minStr || "0", 10);
  const sec = parseInt(secStr || "0", 10);
  if (Number.isNaN(min) || Number.isNaN(sec)) return null;
  return min * 60 + sec;
}

export function ClipHistory({ clips, categories, onDeleted, isAdmin }: ClipHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBook, setEditBook] = useState("");
  const [editChapter, setEditChapter] = useState("");
  const [editVerseStart, setEditVerseStart] = useState("");
  const [editVerseEnd, setEditVerseEnd] = useState("");
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleDelete = async (clipId: string) => {
    setDeletingId(clipId);
    try {
      await deleteClip(clipId);
      onDeleted();
    } catch (err) {
      console.error("Failed to delete clip:", err);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const handleStartEdit = (clip: ClipWithVerse) => {
    const verse = clip.clip_verses[0];
    setEditingId(clip.id);
    setEditStart(formatTime(clip.start_time));
    setEditEnd(formatTime(clip.end_time));
    setEditTitle(clip.title || "");
    setEditBook(verse?.book || "");
    setEditChapter(verse?.chapter?.toString() || "");
    setEditVerseStart(verse?.verse_start?.toString() || "");
    setEditVerseEnd(verse?.verse_end?.toString() || "");
    setEditCategories(clip.clip_categories?.map((c) => c.category_id) || []);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditStart("");
    setEditEnd("");
    setEditTitle("");
    setEditBook("");
    setEditChapter("");
    setEditVerseStart("");
    setEditVerseEnd("");
    setEditCategories([]);
    setEditError(null);
  };

  const handleCategoryToggle = (catId: string) => {
    setEditCategories((prev) => (prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]));
  };

  const handleSaveEdit = async (clipId: string) => {
    const startTime = parseTime(editStart);
    const endTime = parseTime(editEnd);

    if (startTime === null || endTime === null) {
      setEditError("Invalid time format (use m:ss)");
      return;
    }

    if (endTime <= startTime) {
      setEditError("End must be after start");
      return;
    }

    if (!editBook || !editChapter || !editVerseStart) {
      setEditError("Please fill in the verse reference");
      return;
    }

    setSaving(true);
    setEditError(null);

    try {
      await updateClip({
        clipId,
        startTime,
        endTime,
        title: editTitle || `${editBook} ${editChapter}:${editVerseStart}`,
        book: editBook,
        chapter: parseInt(editChapter, 10),
        verseStart: parseInt(editVerseStart, 10),
        verseEnd: editVerseEnd ? parseInt(editVerseEnd, 10) : null,
        categoryIds: editCategories,
      });
      await generateClipSubtitles(clipId);
      handleCancelEdit();
      onDeleted(); // Refresh the list
    } catch (err) {
      console.error("Failed to update clip:", err);
      setEditError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (clips.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Clips from this video</h3>
        <p className="text-sm text-gray-500">No clips created yet</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold text-gray-900 mb-3">Clips from this video ({clips.length})</h3>
      <div className="space-y-2">
        {clips.map((clip) => {
          const verse = clip.clip_verses[0];
          const verseRef = verse
            ? `${verse.book} ${verse.chapter}:${verse.verse_start}${verse.verse_end ? `-${verse.verse_end}` : ""}`
            : clip.title;

          const isEditing = editingId === clip.id;

          return (
            <div key={clip.id} className="bg-white p-3 rounded border">
              {isEditing ? (
                <div className="space-y-3">
                  {/* Title */}
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Clip title (optional)"
                    className="w-full px-2 py-1 border rounded text-sm"
                    disabled={saving}
                  />

                  {/* Verse reference */}
                  <div className="grid grid-cols-4 gap-2">
                    <select
                      value={editBook}
                      onChange={(e) => setEditBook(e.target.value)}
                      className="col-span-2 px-2 py-1 border rounded text-sm"
                      disabled={saving}
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
                      value={editChapter}
                      onChange={(e) => setEditChapter(e.target.value)}
                      placeholder="Ch"
                      min="1"
                      className="px-2 py-1 border rounded text-sm"
                      disabled={saving}
                    />
                    <div className="flex gap-1 items-center">
                      <input
                        type="number"
                        value={editVerseStart}
                        onChange={(e) => setEditVerseStart(e.target.value)}
                        placeholder="V"
                        min="1"
                        className="w-full px-1 py-1 border rounded text-sm"
                        disabled={saving}
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="number"
                        value={editVerseEnd}
                        onChange={(e) => setEditVerseEnd(e.target.value)}
                        placeholder="V"
                        min="1"
                        className="w-full px-1 py-1 border rounded text-sm"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Start:</label>
                    <input
                      type="text"
                      value={editStart}
                      onChange={(e) => setEditStart(e.target.value)}
                      placeholder="0:00"
                      className="w-16 px-2 py-1 border rounded text-sm font-mono"
                      disabled={saving}
                    />
                    <label className="text-xs text-gray-500">End:</label>
                    <input
                      type="text"
                      value={editEnd}
                      onChange={(e) => setEditEnd(e.target.value)}
                      placeholder="0:00"
                      className="w-16 px-2 py-1 border rounded text-sm font-mono"
                      disabled={saving}
                    />
                  </div>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-1">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryToggle(cat.id)}
                        disabled={saving}
                        className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                          editCategories.includes(cat.id)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                        }`}
                      >
                        {cat.name_en}
                      </button>
                    ))}
                  </div>

                  {editError && <div className="text-xs text-red-600">{editError}</div>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(clip.id)}
                      disabled={saving}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-sm flex items-center gap-2">
                    <span className="font-medium">{verseRef}</span>
                    <span className="text-gray-500">
                      ({formatTime(clip.start_time)} - {formatTime(clip.end_time)})
                    </span>
                    {clip.clip_subtitles?.[0]?.count ? (
                      <span className="text-xs text-green-600" title="Subtitles available">✓ subtitles</span>
                    ) : (
                      <span className="text-xs text-gray-400" title="No subtitles yet">no subtitles</span>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      {deletingId === clip.id ? (
                        <span className="text-xs text-gray-500">Deleting...</span>
                      ) : confirmId === clip.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(clip.id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(clip)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit clip"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setConfirmId(clip.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete clip"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
