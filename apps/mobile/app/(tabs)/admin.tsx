import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, Text, View } from "react-native";
import type { Clip, ClipVerse } from "@bibleclips/database";
import { useSupabase } from "@/hooks/useSupabase";
import { supabase } from "@/lib/supabase";

type PendingClip = Clip & { clip_verses: ClipVerse[] };

type VideoGroup = {
  videoId: string;
  title: string;
  clips: PendingClip[];
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDuration(start: number, end: number): string {
  const dur = Math.round(end - start);
  if (dur >= 60) {
    const m = Math.floor(dur / 60);
    const s = dur % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${dur}s`;
}

export default function AdminScreen() {
  const { user } = useSupabase();
  const [clips, setClips] = useState<PendingClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setUserRole(data?.role ?? "USER");
      });
  }, [user]);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clips")
      .select("*, clip_verses(*)")
      .eq("status", "PENDING")
      .order("start_time", { ascending: true });
    setClips((data ?? []) as PendingClip[]);
    setLoading(false);
  }, []);

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

  const handleAction = async (clipId: string, status: "APPROVED" | "REJECTED") => {
    const { error } = await supabase.from("clips").update({ status }).eq("id", clipId);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setClips((prev) => prev.filter((c) => c.id !== clipId));
  };

  const handlePlay = (videoId: string, startTime: number) => {
    const url = `https://youtube.com/watch?v=${videoId}&t=${Math.floor(startTime)}`;
    Linking.openURL(url);
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

  const totalClips = clips.length;

  return (
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: 60 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>Pending Clips</Text>
        <View style={{ backgroundColor: "#fef3c7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
          <Text style={{ color: "#92400e", fontSize: 13, fontWeight: "600" }}>
            {totalClips} across {groups.length} video{groups.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {totalClips === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#888", fontSize: 16 }}>No pending clips</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.videoId}
          renderItem={({ item: group }) => (
            <View style={{ marginBottom: 24 }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#111" }}>
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{group.title}</Text>
                <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
                  {group.clips.length} clip{group.clips.length !== 1 ? "s" : ""}
                </Text>
              </View>

              {group.clips.map((clip) => {
                const verse = clip.clip_verses?.[0];
                const verseRef = verse
                  ? `${verse.book} ${verse.chapter}:${verse.verse_start}${verse.verse_end ? `-${verse.verse_end}` : ""}`
                  : null;

                return (
                  <View
                    key={clip.id}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: "#1a1a1a",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                      <Pressable onPress={() => handlePlay(clip.youtube_video_id, clip.start_time)}>
                        <Text style={{ color: "#8B5CF6", fontSize: 18, marginRight: 8 }}>▶</Text>
                      </Pressable>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>{clip.title}</Text>
                        <Text style={{ color: "#888", fontSize: 13, marginTop: 2 }}>
                          {verseRef ? `${verseRef}   ` : ""}
                          {formatTime(clip.start_time)} - {formatTime(clip.end_time)}   ({formatDuration(clip.start_time, clip.end_time)})
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                      <Pressable
                        onPress={() => handleAction(clip.id, "APPROVED")}
                        style={{
                          flex: 1,
                          backgroundColor: "#22c55e",
                          paddingVertical: 8,
                          borderRadius: 6,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Approve</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleAction(clip.id, "REJECTED")}
                        style={{
                          flex: 1,
                          backgroundColor: "#ef4444",
                          paddingVertical: 8,
                          borderRadius: 6,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Reject</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        />
      )}
    </View>
  );
}
