import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ReelViewer } from "@/components/ReelViewer";
import { useClips } from "@/hooks/useClips";

type ClipType = "all" | "sermon" | "song" | "testimony";
const FILTERS: { key: ClipType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sermon", label: "Sermons" },
  { key: "song", label: "Songs" },
  { key: "testimony", label: "Testimonies" },
];

export default function HomeScreen() {
  const [filter, setFilter] = useState<ClipType>("all");
  const options = useMemo(
    () => (filter === "all" ? undefined : { clipType: filter as "sermon" | "song" | "testimony" }),
    [filter]
  );
  const { clips, loading, refreshing, error, refetch } = useClips(options);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Filter bar */}
      <View
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          zIndex: 10,
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 8,
        }}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: filter === f.key ? "#fff" : "rgba(255,255,255,0.15)",
            }}
          >
            <Text
              style={{
                color: filter === f.key ? "#000" : "#fff",
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#ef4444", fontSize: 16 }}>Failed to load clips</Text>
        </View>
      ) : clips.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#888", fontSize: 16 }}>No {filter === "all" ? "" : filter} clips yet</Text>
        </View>
      ) : (
        <ReelViewer clips={clips} refreshing={refreshing} onRefresh={refetch} />
      )}
    </View>
  );
}
