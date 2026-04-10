import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ReelViewer } from "@/components/ReelViewer";
import { useClips } from "@/hooks/useClips";

export default function VerseReelScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const { clips, loading } = useClips({ verse: ref });

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
        <Text style={styles.empty}>No clips for this verse</Text>
      </View>
    );
  }

  return <ReelViewer clips={clips} />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  empty: { color: "#888", fontSize: 16 },
});
