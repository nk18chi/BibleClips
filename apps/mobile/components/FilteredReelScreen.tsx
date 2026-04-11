import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { UseClipsOptions } from "@/hooks/useClips";
import { useClips } from "@/hooks/useClips";
import { ReelViewer } from "./ReelViewer";

interface FilteredReelScreenProps {
  options: UseClipsOptions;
  emptyMessage: string;
}

export function FilteredReelScreen({ options, emptyMessage }: FilteredReelScreenProps) {
  const { clips, loading } = useClips(options);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (clips.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>{emptyMessage}</Text>
      </View>
    );
  }

  return <ReelViewer clips={clips} />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  empty: { color: "#888", fontSize: 16 },
});
