import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";
import type { Clip, ClipVerse } from "@bibleclips/database";
import { useSupabase } from "@/hooks/useSupabase";
import { supabase } from "@/lib/supabase";

type PendingClip = Clip & { clip_verses: ClipVerse[]; users: { email: string } | null };

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
      .select("*, clip_verses(*), users(email)")
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });
    setClips((data ?? []) as PendingClip[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (userRole === "ADMIN") fetchPending();
  }, [userRole, fetchPending]);

  const handleAction = async (clipId: string, status: "APPROVED" | "REJECTED") => {
    const { error } = await supabase.from("clips").update({ status }).eq("id", clipId);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setClips((prev) => prev.filter((c) => c.id !== clipId));
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
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: 60 }}>
      <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700", padding: 16 }}>
        Pending Clips ({clips.length})
      </Text>
      {clips.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#888", fontSize: 16 }}>No pending clips</Text>
        </View>
      ) : (
        <FlatList
          data={clips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const verse = item.clip_verses?.[0];
            return (
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#222" }}>
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 4 }}>
                  {item.title}
                </Text>
                {verse && (
                  <Text style={{ color: "#aaa", fontSize: 13, marginBottom: 4 }}>
                    {verse.book} {verse.chapter}:{verse.verse_start}
                  </Text>
                )}
                <Text style={{ color: "#666", fontSize: 12, marginBottom: 8 }}>
                  {item.clip_type} | {(item as any).users?.email ?? "unknown"}
                </Text>
                <Text style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>
                  {item.youtube_video_id} ({item.start_time}s - {item.end_time}s)
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => handleAction(item.id, "APPROVED")}
                    style={{
                      flex: 1,
                      backgroundColor: "#22c55e",
                      padding: 10,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>Approve</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleAction(item.id, "REJECTED")}
                    style={{
                      flex: 1,
                      backgroundColor: "#ef4444",
                      padding: 10,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
