"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { updateClip } from "@/app/workspace/actions";
import { BIBLE_VERSIONS } from "@/lib/bible-versions";
import { SUBTITLE_STYLES } from "@/lib/styles/subtitle-styles";
import { StylePreview } from "@/components/style-picker/style-preview";

const BIBLE_BOOKS = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra",
  "Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon",
  "Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah",
  "Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians",
  "2 Corinthians","Galatians","Ephesians","Philippians","Colossians",
  "1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon",
  "Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation",
];

type PendingClip = {
  id: string;
  title: string;
  youtube_video_id: string;
  start_time: number;
  end_time: number;
  clip_type: "sermon" | "song" | "testimony";
  created_at: string;
  clip_verses: {
    book: string;
    chapter: number;
    verse_start: number;
    verse_end: number | null;
  }[];
  clip_songs: {
    artist_name: string;
    song_name: string;
  }[];
  clip_categories: {
    category_id: string;
  }[];
};

type Category = { id: string; slug: string; name_en: string };

type VideoGroup = {
  youtube_video_id: string;
  title: string;
  clips: PendingClip[];
};

interface YTPlayer {
  destroy: () => void;
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseTime(str: string): number | null {
  const parts = str.split(":");
  if (parts.length === 2) {
    const m = parseInt(parts[0] || "0", 10);
    const s = parseInt(parts[1] || "0", 10);
    if (Number.isNaN(m) || Number.isNaN(s)) return null;
    return m * 60 + s;
  }
  if (parts.length === 3) {
    const h = parseInt(parts[0] || "0", 10);
    const m = parseInt(parts[1] || "0", 10);
    const s = parseInt(parts[2] || "0", 10);
    if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s)) return null;
    return h * 3600 + m * 60 + s;
  }
  return null;
}

function formatClipRef(clip: PendingClip): string {
  if (clip.clip_type === "testimony") return "Testimony";
  if (clip.clip_type === "song" && clip.clip_songs?.length > 0) {
    const song = clip.clip_songs[0];
    return song ? `${song.artist_name} - ${song.song_name}` : "Song";
  }
  const v = clip.clip_verses[0];
  if (!v) return clip.title;
  const verseRange = v.verse_end ? `${v.verse_start}-${v.verse_end}` : `${v.verse_start}`;
  return `${v.book} ${v.chapter}:${verseRange}`;
}

function clipDuration(clip: PendingClip): string {
  const diff = Math.round(clip.end_time - clip.start_time);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return m > 0 ? `${m}m${s > 0 ? ` ${s}s` : ""}` : `${s}s`;
}

export function PendingReview({ groups, categories }: { groups: VideoGroup[]; categories: Category[] }) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(
    groups[0]?.youtube_video_id ?? null
  );
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editClipType, setEditClipType] = useState<"sermon" | "song" | "testimony">("sermon");
  const [editBook, setEditBook] = useState("");
  const [editChapter, setEditChapter] = useState("");
  const [editVerseStart, setEditVerseStart] = useState("");
  const [editVerseEnd, setEditVerseEnd] = useState("");
  const [editVersion, setEditVersion] = useState("NIV");
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editSubtitleStyle, setEditSubtitleStyle] = useState("classic-white");
  const [editArtistName, setEditArtistName] = useState("");
  const [editSongName, setEditSongName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [originalStartTime, setOriginalStartTime] = useState(0);
  const [originalEndTime, setOriginalEndTime] = useState(0);

  const selectedGroup = groups.find((g) => g.youtube_video_id === selectedVideoId) ?? null;

  // Load YouTube player
  useEffect(() => {
    if (!selectedVideoId) return;
    setIsReady(false);

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const first = document.getElementsByTagName("script")[0];
      first?.parentNode?.insertBefore(tag, first);
    }

    const initPlayer = () => {
      if (!containerRef.current) return;
      if (playerRef.current) playerRef.current.destroy();
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: selectedVideoId,
        playerVars: { autoplay: 0, controls: 1, modestbranding: 1, rel: 0 },
        events: { onReady: () => setIsReady(true) },
      }) as YTPlayer;
    };

    if (window.YT?.Player) initPlayer();
    else window.onYouTubeIframeAPIReady = initPlayer;

    const interval = setInterval(() => {
      if (playerRef.current?.getCurrentTime) setCurrentTime(playerRef.current.getCurrentTime());
    }, 250);

    return () => {
      clearInterval(interval);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [selectedVideoId]);

  const startEdit = (clip: PendingClip) => {
    const verse = clip.clip_verses[0];
    const song = clip.clip_songs?.[0];
    setEditingId(clip.id);
    setOriginalStartTime(clip.start_time);
    setOriginalEndTime(clip.end_time);
    setEditStart(formatTime(clip.start_time));
    setEditEnd(formatTime(clip.end_time));
    setEditTitle(clip.title || "");
    setEditClipType(clip.clip_type || "sermon");
    setEditBook(verse?.book || "");
    setEditChapter(verse?.chapter?.toString() || "");
    setEditVerseStart(verse?.verse_start?.toString() || "");
    setEditVerseEnd(verse?.verse_end?.toString() || "");
    setEditVersion("NIV");
    setEditCategories(clip.clip_categories?.map((c) => c.category_id) || []);
    setEditSubtitleStyle("classic-white");
    setEditArtistName(song?.artist_name || "");
    setEditSongName(song?.song_name || "");
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleCategoryToggle = (catId: string) => {
    setEditCategories((prev) => prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]);
  };

  const saveEdit = async (clipId: string) => {
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
    if (editClipType === "sermon" && (!editBook || !editChapter || !editVerseStart)) {
      setEditError("Please fill in the verse reference");
      return;
    }
    if (editClipType === "song" && (!editArtistName || !editSongName)) {
      setEditError("Please fill in artist and song name");
      return;
    }

    setSaving(true);
    setEditError(null);
    try {
      await updateClip({
        clipId,
        startTime,
        endTime,
        title: editTitle || (editClipType === "sermon"
          ? `${editBook} ${editChapter}:${editVerseStart}`
          : editClipType === "song"
            ? `${editArtistName} - ${editSongName}`
            : "Testimony"),
        book: editClipType === "sermon" ? editBook : "",
        chapter: editClipType === "sermon" ? parseInt(editChapter, 10) : 0,
        verseStart: editClipType === "sermon" ? parseInt(editVerseStart, 10) : 0,
        verseEnd: editClipType === "sermon" && editVerseEnd ? parseInt(editVerseEnd, 10) : null,
        version: editClipType === "sermon" ? editVersion : "NIV",
        categoryIds: editClipType === "sermon" ? editCategories : [],
        subtitleStyleId: editSubtitleStyle,
        originalStartTime,
        originalEndTime,
        clipType: editClipType,
        artistName: editClipType === "song" ? editArtistName : undefined,
        songName: editClipType === "song" ? editSongName : undefined,
      });
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const setStartFromPlayer = useCallback(() => {
    if (!playerRef.current || !isReady || !editingId) return;
    const t = Math.floor(playerRef.current.getCurrentTime());
    const m = Math.floor(t / 60);
    const s = t % 60;
    setEditStart(`${m}:${s.toString().padStart(2, "0")}`);
  }, [isReady, editingId]);

  const setEndFromPlayer = useCallback(() => {
    if (!playerRef.current || !isReady || !editingId) return;
    const t = Math.floor(playerRef.current.getCurrentTime());
    const m = Math.floor(t / 60);
    const s = t % 60;
    setEditEnd(`${m}:${s.toString().padStart(2, "0")}`);
  }, [isReady, editingId]);

  const seekTo = useCallback(
    (clip: PendingClip) => {
      if (!playerRef.current || !isReady) return;
      playerRef.current.seekTo(clip.start_time, true);
      playerRef.current.playVideo();
      setActiveClipId(clip.id);
    },
    [isReady]
  );

  const handleAction = async (clipId: string, status: "APPROVED" | "REJECTED") => {
    setActionLoading(clipId);
    const { error } = await supabase.from("clips").update({ status }).eq("id", clipId);
    setActionLoading(null);
    if (!error) router.refresh();
  };

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <p className="text-gray-500">No pending clips to review.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Left: Video list */}
      <div className="w-full md:w-64 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Videos</h2>
        <div className="space-y-1">
          {groups.map((g) => (
            <button
              key={g.youtube_video_id}
              type="button"
              onClick={() => { setSelectedVideoId(g.youtube_video_id); setActiveClipId(null); cancelEdit(); }}
              className={`w-full text-left p-2 rounded text-sm transition-colors ${
                selectedVideoId === g.youtube_video_id
                  ? "bg-blue-50 border border-blue-200 text-blue-900"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="font-medium line-clamp-2">{g.title}</div>
              <div className="text-xs text-gray-500 mt-1">
                {g.clips.length} clip{g.clips.length !== 1 ? "s" : ""}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Player + clips */}
      <div className="flex-1 max-w-4xl">
        {selectedGroup ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">{selectedGroup.title}</h2>

            {/* Player */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <div ref={containerRef} className="w-full h-full" />
            </div>

            {/* Current time */}
            <div className="text-center text-sm font-mono text-gray-500">{formatTime(currentTime)}</div>

            {/* Pending clips */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase">
                Pending Clips ({selectedGroup.clips.length})
              </h3>
              {selectedGroup.clips.map((clip) => {
                const isEditing = editingId === clip.id;
                return (
                  <div
                    key={clip.id}
                    className={`bg-white border rounded-lg p-3 transition-colors ${
                      activeClipId === clip.id ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"
                    }`}
                  >
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

                        {/* Clip Type Toggle */}
                        <div className="flex gap-2">
                          {(["sermon", "song", "testimony"] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setEditClipType(type)}
                              disabled={saving}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                editClipType === type ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                          ))}
                        </div>

                        {/* Song fields */}
                        {editClipType === "song" && (
                          <div className="space-y-2">
                            <input type="text" value={editArtistName} onChange={(e) => setEditArtistName(e.target.value)} placeholder="Artist name" className="w-full px-2 py-1 border rounded text-sm" disabled={saving} />
                            <input type="text" value={editSongName} onChange={(e) => setEditSongName(e.target.value)} placeholder="Song name" className="w-full px-2 py-1 border rounded text-sm" disabled={saving} />
                          </div>
                        )}

                        {/* Sermon fields */}
                        {editClipType === "sermon" && (
                          <>
                            <div className="grid grid-cols-4 gap-2">
                              <select value={editBook} onChange={(e) => setEditBook(e.target.value)} className="col-span-2 px-2 py-1 border rounded text-sm" disabled={saving}>
                                <option value="">Select book</option>
                                {BIBLE_BOOKS.map((b) => <option key={b} value={b}>{b}</option>)}
                              </select>
                              <input type="number" value={editChapter} onChange={(e) => setEditChapter(e.target.value)} placeholder="Ch" min="1" className="px-2 py-1 border rounded text-sm" disabled={saving} />
                              <div className="flex gap-1 items-center">
                                <input type="number" value={editVerseStart} onChange={(e) => setEditVerseStart(e.target.value)} placeholder="V" min="1" className="w-full px-1 py-1 border rounded text-sm" disabled={saving} />
                                <span className="text-gray-400">-</span>
                                <input type="number" value={editVerseEnd} onChange={(e) => setEditVerseEnd(e.target.value)} placeholder="V" min="1" className="w-full px-1 py-1 border rounded text-sm" disabled={saving} />
                              </div>
                            </div>

                            <select value={editVersion} onChange={(e) => setEditVersion(e.target.value)} className="px-2 py-1 border rounded text-sm" disabled={saving}>
                              {BIBLE_VERSIONS.map((v) => <option key={v.code} value={v.code}>{v.code} - {v.name}</option>)}
                            </select>

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
                          </>
                        )}

                        {/* Time */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Start:</label>
                          <input type="text" value={editStart} onChange={(e) => setEditStart(e.target.value)} placeholder="m:ss" className="w-20 px-2 py-1 border rounded text-sm font-mono" disabled={saving} />
                          <button type="button" onClick={setStartFromPlayer} disabled={!isReady || saving} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 disabled:opacity-50" title="Set from current player time">S</button>
                          <label className="text-xs text-gray-500">End:</label>
                          <input type="text" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} placeholder="m:ss" className="w-20 px-2 py-1 border rounded text-sm font-mono" disabled={saving} />
                          <button type="button" onClick={setEndFromPlayer} disabled={!isReady || saving} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 disabled:opacity-50" title="Set from current player time">E</button>
                        </div>

                        {/* Subtitle Style */}
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Subtitle Style:</p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {SUBTITLE_STYLES.map((s) => (
                              <div key={s.id} className="flex-shrink-0 w-24">
                                <StylePreview style={s} isSelected={editSubtitleStyle === s.id} onClick={() => setEditSubtitleStyle(s.id)} />
                              </div>
                            ))}
                          </div>
                        </div>

                        {editError && <div className="text-xs text-red-600">{editError}</div>}
                        <div className="flex gap-2">
                          <button type="button" onClick={() => saveEdit(clip.id)} disabled={saving} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50">
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button type="button" onClick={cancelEdit} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => seekTo(clip)} disabled={!isReady} className="flex-1 text-left group">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 group-hover:text-blue-800 text-sm">▶</span>
                            <span className="font-medium text-sm">{clip.title}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{formatClipRef(clip)}</span>
                            <span>{formatTime(clip.start_time)} - {formatTime(clip.end_time)}</span>
                            <span>({clipDuration(clip)})</span>
                          </div>
                        </button>
                        <div className="flex gap-1 flex-shrink-0">
                          <button type="button" onClick={() => startEdit(clip)} className="px-2 py-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Edit clip">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                          </button>
                          <button type="button" onClick={() => handleAction(clip.id, "APPROVED")} disabled={actionLoading === clip.id} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50">Approve</button>
                          <button type="button" onClick={() => handleAction(clip.id, "REJECTED")} disabled={actionLoading === clip.id} className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50">Reject</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">Select a video to review</div>
        )}
      </div>
    </div>
  );
}
