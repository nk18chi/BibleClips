import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";

interface ActionButtonsProps {
  clipId: string;
  voteCount: number;
  hasVoted: boolean;
  onVote: () => void;
}

export function ActionButtons({ clipId, voteCount, hasVoted, onVote }: ActionButtonsProps) {
  const handleShare = () => {
    Share.share({ url: `https://bibleclips.com/clip/${clipId}` });
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={onVote}>
        <Ionicons name={hasVoted ? "heart" : "heart-outline"} size={28} color={hasVoted ? "#ef4444" : "#fff"} />
        <Text style={styles.count}>{voteCount}</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => router.push(`/clip/${clipId}`)}>
        <Ionicons name="chatbubble-outline" size={26} color="#fff" />
      </Pressable>
      <Pressable style={styles.button} onPress={handleShare}>
        <Ionicons name="share-outline" size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", right: 12, bottom: 120, alignItems: "center", gap: 20, zIndex: 10 },
  button: { alignItems: "center" },
  count: { color: "#fff", fontSize: 12, marginTop: 2 },
});
