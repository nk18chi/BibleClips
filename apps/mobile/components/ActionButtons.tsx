import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";

interface ActionButtonsProps {
  clipId: string;
  voteCount: number;
  hasVoted: boolean;
  onVote: () => void;
  isAdmin?: boolean;
}

export function ActionButtons({ clipId, voteCount, hasVoted, onVote, isAdmin }: ActionButtonsProps) {
  const handleShare = () => {
    Share.share({ url: `https://bibleclips.com/clip/${clipId}` });
  };

  const handleFlag = () => {
    Alert.prompt(
      "Flag for Edit",
      "What needs to be fixed? (e.g., wrong verse, adjust time range)",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Flag",
          onPress: async (note?: string) => {
            await supabase.from("clips").update({ status: "NEEDS_EDIT" }).eq("id", clipId);
            if (note?.trim()) {
              await supabase.from("comments").insert({
                clip_id: clipId,
                user_id: (await supabase.auth.getUser()).data.user?.id,
                content: `[EDIT NOTE] ${note.trim()}`,
              });
            }
            Alert.alert("Flagged", "Clip marked for editing");
          },
        },
      ],
      "plain-text"
    );
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
      {isAdmin && (
        <Pressable style={styles.button} onPress={handleFlag}>
          <Ionicons name="flag-outline" size={26} color="#f59e0b" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", right: 12, bottom: 120, alignItems: "center", gap: 20, zIndex: 10 },
  button: { alignItems: "center" },
  count: { color: "#fff", fontSize: 12, marginTop: 2 },
});
