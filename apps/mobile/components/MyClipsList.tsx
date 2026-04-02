import { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import type { Clip } from "@bibleclips/database";
import { supabase } from "@/lib/supabase";
import { useSupabase } from "@/hooks/useSupabase";

const statusColors: Record<string, string> = {
  PENDING: "#f59e0b",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
};

export function MyClipsList() {
  const { user } = useSupabase();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("clips")
      .select("*")
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setClips((data ?? []) as Clip[]);
        setLoading(false);
      });
  }, [user?.id]);

  if (loading) {
    return <Text style={styles.loading}>Loading clips...</Text>;
  }

  if (clips.length === 0) {
    return <Text style={styles.empty}>No clips submitted yet</Text>;
  }

  return (
    <FlatList
      data={clips}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <View style={styles.clipRow}>
          <View style={styles.clipInfo}>
            <Text style={styles.clipTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.status, { color: statusColors[item.status] ?? "#888" }]}>
              {item.status}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  loading: { color: "#888", fontSize: 14, textAlign: "center", padding: 16 },
  empty: { color: "#888", fontSize: 14, textAlign: "center", padding: 16 },
  clipRow: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#222" },
  clipInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  clipTitle: { color: "#fff", fontSize: 14, flex: 1, marginRight: 8 },
  status: { fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
});
