import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Clip, ClipVerse } from "@bibleclips/database";
import { useSupabase } from "@/hooks/useSupabase";
import { supabase } from "@/lib/supabase";
import { YouTubePlayer, type YouTubePlayerRef } from "@/components/YouTubePlayer";

type PendingClip = Clip & { clip_verses: ClipVerse[]; clip_categories: { category_id: string }[] };
type Category = { id: string; slug: string; name_en: string };
type VideoGroup = { videoId: string; title: string; clips: PendingClip[] };

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

const bookJaMap: Record<string, string> = {
  Genesis:"創世記",Exodus:"出エジプト記",Matthew:"マタイ",Mark:"マルコ",Luke:"ルカ",
  John:"ヨハネ",Acts:"使徒",Romans:"ローマ",Philippians:"ピリピ",Psalms:"詩篇",
  Proverbs:"箴言",Isaiah:"イザヤ",Revelation:"黙示録",
};

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function fmtDur(a: number, b: number) {
  const d = Math.round(b - a);
  return d >= 60 ? `${Math.floor(d / 60)}m ${d % 60}s` : `${d}s`;
}

function EditForm({
  clip,
  categories,
  onSave,
  onCancel,
}: {
  clip: PendingClip;
  categories: Category[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const verse = clip.clip_verses?.[0];
  const [title, setTitle] = useState(clip.title);
  const [startTime, setStartTime] = useState(fmtTime(clip.start_time));
  const [endTime, setEndTime] = useState(fmtTime(clip.end_time));
  const [book, setBook] = useState(verse?.book ?? "");
  const [chapter, setChapter] = useState(verse?.chapter?.toString() ?? "");
  const [verseStart, setVerseStart] = useState(verse?.verse_start?.toString() ?? "");
  const [verseEnd, setVerseEnd] = useState(verse?.verse_end?.toString() ?? "");
  const [selectedCats, setSelectedCats] = useState<string[]>(
    clip.clip_categories?.map((c) => c.category_id) ?? []
  );
  const [saving, setSaving] = useState(false);

  const parseTime = (str: string): number | null => {
    const parts = str.split(":");
    if (parts.length !== 2) return null;
    const m = Number.parseInt(parts[0], 10);
    const s = Number.parseInt(parts[1], 10);
    if (Number.isNaN(m) || Number.isNaN(s)) return null;
    return m * 60 + s;
  };

  const handleSave = async () => {
    const st = parseTime(startTime);
    const et = parseTime(endTime);
    if (st === null || et === null || et <= st) {
      Alert.alert("Error", "Invalid time format (use m:ss)");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("clips")
        .update({ title, start_time: st, end_time: et })
        .eq("id", clip.id);
      if (error) throw error;

      // Update verse
      if (book && chapter && verseStart) {
        await supabase.from("clip_verses").delete().eq("clip_id", clip.id);
        await supabase.from("clip_verses").insert({
          clip_id: clip.id,
          book,
          book_ja: bookJaMap[book] || book,
          chapter: Number.parseInt(chapter, 10),
          verse_start: Number.parseInt(verseStart, 10),
          verse_end: verseEnd ? Number.parseInt(verseEnd, 10) : null,
        });
      }

      // Update categories
      await supabase.from("clip_categories").delete().eq("clip_id", clip.id);
      if (selectedCats.length > 0) {
        await supabase.from("clip_categories").insert(
          selectedCats.map((catId) => ({ clip_id: clip.id, category_id: catId }))
        );
      }

      onSave();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleCat = (id: string) =>
    setSelectedCats((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const inputStyle = {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
  };

  return (
    <View style={{ padding: 12, backgroundColor: "#0a0a1a", borderRadius: 8 }}>
      <Text style={{ color: "#aaa", fontSize: 12, marginBottom: 4 }}>Title</Text>
      <TextInput style={inputStyle} value={title} onChangeText={setTitle} placeholderTextColor="#555" />

      <Text style={{ color: "#aaa", fontSize: 12, marginTop: 12, marginBottom: 4 }}>Time (m:ss)</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput style={[inputStyle, { flex: 1 }]} value={startTime} onChangeText={setStartTime} placeholder="Start" placeholderTextColor="#555" />
        <TextInput style={[inputStyle, { flex: 1 }]} value={endTime} onChangeText={setEndTime} placeholder="End" placeholderTextColor="#555" />
      </View>

      <Text style={{ color: "#aaa", fontSize: 12, marginTop: 12, marginBottom: 4 }}>Verse</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {BIBLE_BOOKS.map((b) => (
            <Pressable
              key={b}
              onPress={() => setBook(b)}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: book === b ? "#8B5CF6" : "#222",
              }}
            >
              <Text style={{ color: book === b ? "#fff" : "#888", fontSize: 11 }}>{b}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput style={[inputStyle, { flex: 1 }]} value={chapter} onChangeText={setChapter} placeholder="Ch" keyboardType="number-pad" placeholderTextColor="#555" />
        <TextInput style={[inputStyle, { flex: 1 }]} value={verseStart} onChangeText={setVerseStart} placeholder="V start" keyboardType="number-pad" placeholderTextColor="#555" />
        <TextInput style={[inputStyle, { flex: 1 }]} value={verseEnd} onChangeText={setVerseEnd} placeholder="V end" keyboardType="number-pad" placeholderTextColor="#555" />
      </View>

      <Text style={{ color: "#aaa", fontSize: 12, marginTop: 12, marginBottom: 4 }}>Categories</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {categories.map((cat) => {
          const sel = selectedCats.includes(cat.id);
          return (
            <Pressable
              key={cat.id}
              onPress={() => toggleCat(cat.id)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: sel ? "#8B5CF6" : "#333",
                backgroundColor: sel ? "rgba(139,92,246,0.2)" : "transparent",
              }}
            >
              <Text style={{ color: sel ? "#8B5CF6" : "#888", fontSize: 12 }}>{cat.name_en}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{ flex: 1, backgroundColor: "#3b82f6", padding: 10, borderRadius: 6, alignItems: "center", opacity: saving ? 0.5 : 1 }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>
        <Pressable
          onPress={onCancel}
          style={{ flex: 1, backgroundColor: "#333", padding: 10, borderRadius: 6, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontSize: 14 }}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AdminScreen() {
  const { user } = useSupabase();
  const [clips, setClips] = useState<PendingClip[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const playerRef = useRef<YouTubePlayerRef>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("role").eq("id", user.id).single().then(({ data }) => {
      setUserRole(data?.role ?? "USER");
    });
  }, [user]);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    const [clipsRes, catsRes] = await Promise.all([
      supabase.from("clips").select("*, clip_verses(*), clip_categories(category_id)").eq("status", "PENDING").order("start_time", { ascending: true }),
      supabase.from("categories").select("id, slug, name_en").order("name_en"),
    ]);
    const fetchedClips = (clipsRes.data ?? []) as PendingClip[];
    setClips(fetchedClips);
    setCategories(catsRes.data ?? []);
    if (!selectedVideoId && fetchedClips.length > 0) {
      setSelectedVideoId(fetchedClips[0].youtube_video_id);
    }
    setLoading(false);
  }, [selectedVideoId]);

  useEffect(() => {
    if (userRole === "ADMIN") fetchPending();
  }, [userRole, fetchPending]);

  const groups = useMemo((): VideoGroup[] => {
    const map = new Map<string, VideoGroup>();
    for (const clip of clips) {
      let group = map.get(clip.youtube_video_id);
      if (!group) {
        group = { videoId: clip.youtube_video_id, title: clip.title, clips: [] };
        map.set(clip.youtube_video_id, group);
      }
      group.clips.push(clip);
    }
    return [...map.values()];
  }, [clips]);

  const selectedGroup = groups.find((g) => g.videoId === selectedVideoId) ?? null;

  const handleAction = async (clipId: string, status: "APPROVED" | "REJECTED") => {
    const { error } = await supabase.from("clips").update({ status }).eq("id", clipId);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setClips((prev) => prev.filter((c) => c.id !== clipId));
  };

  const handleSeek = (clip: PendingClip) => {
    playerRef.current?.seekTo(clip.start_time);
    playerRef.current?.play();
  };

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Text style={{ color: "#888", fontSize: 16 }}>Sign in to access admin</Text>
      </View>
    );
  }

  if (userRole !== "ADMIN") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Text style={{ color: "#888", fontSize: 16 }}>Admin access required</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#000", paddingTop: 60 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>Pending Clips</Text>
        <View style={{ backgroundColor: "#fef3c7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
          <Text style={{ color: "#92400e", fontSize: 13, fontWeight: "600" }}>
            {clips.length} across {groups.length} video{groups.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Video selector */}
      <Text style={{ color: "#888", fontSize: 12, fontWeight: "600", paddingHorizontal: 16, marginBottom: 6 }}>VIDEOS</Text>
      {groups.map((g) => (
        <Pressable
          key={g.videoId}
          onPress={() => { setSelectedVideoId(g.videoId); setEditingId(null); }}
          style={{
            marginHorizontal: 16,
            marginBottom: 6,
            padding: 10,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: selectedVideoId === g.videoId ? "#3b82f6" : "#333",
            backgroundColor: selectedVideoId === g.videoId ? "#1e3a5f" : "#111",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }} numberOfLines={2}>{g.title}</Text>
          <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{g.clips.length} clips</Text>
        </Pressable>
      ))}

      {/* Selected video content */}
      {selectedGroup && (
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 12 }}>{selectedGroup.title}</Text>

          {/* Player */}
          <View style={{ height: 220, borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
            <YouTubePlayer
              ref={playerRef}
              videoId={selectedGroup.videoId}
              startTime={0}
              endTime={99999}
            />
          </View>

          {/* Clips list */}
          <Text style={{ color: "#888", fontSize: 12, fontWeight: "600", marginTop: 12, marginBottom: 8 }}>
            PENDING CLIPS ({selectedGroup.clips.length})
          </Text>

          {selectedGroup.clips.map((clip) => {
            const verse = clip.clip_verses?.[0];
            const verseRef = verse
              ? `${verse.book} ${verse.chapter}:${verse.verse_start}${verse.verse_end ? `-${verse.verse_end}` : ""}`
              : null;

            if (editingId === clip.id) {
              return (
                <View key={clip.id} style={{ marginBottom: 8 }}>
                  <EditForm
                    clip={clip}
                    categories={categories}
                    onSave={() => { setEditingId(null); fetchPending(); }}
                    onCancel={() => setEditingId(null)}
                  />
                </View>
              );
            }

            return (
              <View
                key={clip.id}
                style={{
                  backgroundColor: "#111",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: "#222",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Pressable onPress={() => handleSeek(clip)} style={{ marginRight: 10 }}>
                    <Text style={{ color: "#3b82f6", fontSize: 18 }}>▶</Text>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>{clip.title}</Text>
                    <Text style={{ color: "#888", fontSize: 13, marginTop: 2 }}>
                      {verseRef}{"   "}{fmtTime(clip.start_time)} - {fmtTime(clip.end_time)}{"   "}({fmtDur(clip.start_time, clip.end_time)})
                    </Text>
                  </View>
                  <Pressable onPress={() => setEditingId(clip.id)} style={{ padding: 8 }}>
                    <Text style={{ color: "#888", fontSize: 16 }}>✏️</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <Pressable
                    onPress={() => handleAction(clip.id, "APPROVED")}
                    style={{ flex: 1, backgroundColor: "#22c55e", paddingVertical: 8, borderRadius: 6, alignItems: "center" }}
                  >
                    <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Approve</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleAction(clip.id, "REJECTED")}
                    style={{ flex: 1, backgroundColor: "#ef4444", paddingVertical: 8, borderRadius: 6, alignItems: "center" }}
                  >
                    <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}
