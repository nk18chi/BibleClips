import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ReelViewer } from "@/components/ReelViewer";
import { useClips } from "@/hooks/useClips";

export default function HomeScreen() {
  const { clips, loading, error } = useClips();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Failed to load clips</Text>
      </View>
    );
  }

  if (clips.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>No clips yet</Text>
      </View>
    );
  }

  return <ReelViewer clips={clips} />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  error: { color: "#ef4444", fontSize: 16 },
  empty: { color: "#888", fontSize: 16 },
});
