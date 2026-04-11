import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";
import type { Clip, ClipVerse } from "@bibleclips/database";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useSupabase } from "@/hooks/useSupabase";
import { supabase } from "@/lib/supabase";

type ClipWithVerse = Clip & { clip_verses: ClipVerse[] };
type Tab = "submitted" | "liked" | "commented";

const statusColors: Record<string, string> = {
  PENDING: "#f59e0b",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
};

function ClipCard({ clip }: { clip: ClipWithVerse }) {
  const verse = clip.clip_verses?.[0];
  const verseRef = verse
    ? `${verse.book} ${verse.chapter}:${verse.verse_start}${verse.verse_end ? `-${verse.verse_end}` : ""}`
    : null;
  const thumb = `https://img.youtube.com/vi/${clip.youtube_video_id}/mqdefault.jpg`;

  return (
    <View style={{ flexDirection: "row", padding: 12, borderBottomWidth: 1, borderBottomColor: "#1a1a1a" }}>
      <Image
        source={{ uri: thumb }}
        style={{ width: 120, height: 68, borderRadius: 6, backgroundColor: "#222" }}
      />
      <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600", flex: 1 }} numberOfLines={2}>
            {clip.title}
          </Text>
          {clip.status && (
            <View style={{
              backgroundColor: `${statusColors[clip.status] ?? "#888"}20`,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: statusColors[clip.status] ?? "#888",
            }}>
              <Text style={{ color: statusColors[clip.status] ?? "#888", fontSize: 11, fontWeight: "600" }}>
                {clip.status.charAt(0) + clip.status.slice(1).toLowerCase()}
              </Text>
            </View>
          )}
        </View>
        {verseRef && <Text style={{ color: "#aaa", fontSize: 12 }}>{verseRef}</Text>}
        <Text style={{ color: "#666", fontSize: 11, marginTop: 2 }}>
          {clip.vote_count} likes{"   "}
          {new Date(clip.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, isLoading } = useSupabase();
  const { language, setLanguage, t: tr } = useLanguage();
  const userId = user?.id;
  const [tab, setTab] = useState<Tab>("submitted");
  const [clips, setClips] = useState<ClipWithVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({ submitted: 0, liked: 0, commented: 0 });

  const fetchClips = useCallback(async (activeTab: Tab) => {
    if (!userId) return;
    setLoading(true);

    if (activeTab === "submitted") {
      const { data } = await supabase
        .from("clips")
        .select("*, clip_verses(*)")
        .eq("submitted_by", userId)
        .order("created_at", { ascending: false });
      setClips((data ?? []) as ClipWithVerse[]);
    } else if (activeTab === "liked") {
      const { data: votes } = await supabase
        .from("votes")
        .select("clip_id")
        .eq("user_id", userId);
      if (votes && votes.length > 0) {
        const ids = votes.map((v) => v.clip_id);
        const { data } = await supabase
          .from("clips")
          .select("*, clip_verses(*)")
          .in("id", ids)
          .order("created_at", { ascending: false });
        setClips((data ?? []) as ClipWithVerse[]);
      } else {
        setClips([]);
      }
    } else if (activeTab === "commented") {
      const { data: comments } = await supabase
        .from("comments")
        .select("clip_id")
        .eq("user_id", userId);
      if (comments && comments.length > 0) {
        const uniqueIds = [...new Set(comments.map((c) => c.clip_id))];
        const { data } = await supabase
          .from("clips")
          .select("*, clip_verses(*)")
          .in("id", uniqueIds)
          .order("created_at", { ascending: false });
        setClips((data ?? []) as ClipWithVerse[]);
      } else {
        setClips([]);
      }
    }

    setLoading(false);
  }, [userId]);

  // Fetch counts
  useEffect(() => {
    if (!userId) return;
    Promise.all([
      supabase.from("clips").select("id", { count: "exact", head: true }).eq("submitted_by", userId),
      supabase.from("votes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("comments").select("clip_id", { count: "exact", head: true }).eq("user_id", userId),
    ]).then(([sub, liked, commented]) => {
      setCounts({
        submitted: sub.count ?? 0,
        liked: liked.count ?? 0,
        commented: commented.count ?? 0,
      });
    });
  }, [userId]);

  useEffect(() => {
    fetchClips(tab);
  }, [tab, fetchClips]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#000" }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 16 }}>Welcome to BibleClips</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable style={{ backgroundColor: "#8B5CF6", padding: 14, borderRadius: 8, marginBottom: 12, width: "100%", alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Sign In</Text>
          </Pressable>
        </Link>
        <Link href="/(auth)/register" asChild>
          <Pressable style={{ backgroundColor: "#333", padding: 14, borderRadius: 8, marginBottom: 12, width: "100%", alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Create Account</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "submitted", label: tr("profile.submitted"), count: counts.submitted },
    { key: "liked", label: tr("profile.liked"), count: counts.liked },
    { key: "commented", label: tr("profile.commented"), count: counts.commented },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: 60 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>{tr("profile.myClips")}</Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Pressable
            onPress={() => setLanguage(language === "en" ? "ja" : "en")}
            style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: "#333" }}
          >
            <Text style={{ color: "#888", fontSize: 13 }}>{language === "en" ? "🇺🇸 EN" : "🇯🇵 JP"}</Text>
          </Pressable>
          <Pressable onPress={() => supabase.auth.signOut()} style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, borderWidth: 1, borderColor: "#333" }}>
            <Text style={{ color: "#888", fontSize: 13 }}>{tr("profile.signOut")}</Text>
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#222", paddingHorizontal: 16 }}>
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              marginRight: 8,
              borderBottomWidth: 2,
              borderBottomColor: tab === t.key ? "#8B5CF6" : "transparent",
            }}
          >
            <Text style={{ color: tab === t.key ? "#fff" : "#888", fontSize: 14, fontWeight: "600" }}>
              {t.label}{t.count > 0 ? ` (${t.count})` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : clips.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#888", fontSize: 16 }}>
            {tab === "submitted" ? tr("profile.noSubmitted") : tab === "liked" ? tr("profile.noLiked") : tr("profile.noCommented")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={clips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ClipCard clip={item} />}
        />
      )}
    </View>
  );
}
