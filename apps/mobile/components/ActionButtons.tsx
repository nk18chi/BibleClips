import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";

interface ActionButtonsProps {
  clipId: string;
  voteCount: number;
  hasVoted: boolean;
  onVote: () => void;
  isAdmin?: boolean;
}

export function ActionButtons({ clipId, voteCount, hasVoted, onVote, isAdmin }: ActionButtonsProps) {
  const [showFlagInput, setShowFlagInput] = useState(false);
  const [flagNote, setFlagNote] = useState("");
  const [flagging, setFlagging] = useState(false);

  const handleShare = () => {
    Share.share({ url: `https://bibleclips.com/clip/${clipId}` });
  };

  const submitFlag = async () => {
    if (!flagNote.trim()) {
      Alert.alert("Error", "Please enter a note describing what needs to be fixed.");
      return;
    }
    setFlagging(true);
    const { error } = await supabase.from("clips").update({ status: "NEEDS_EDIT" }).eq("id", clipId);
    if (error) {
      Alert.alert("Error", `Failed to flag: ${error.message}`);
      setFlagging(false);
      return;
    }
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const { error: commentError } = await supabase.from("comments").insert({
        clip_id: clipId,
        user_id: userId,
        content: `[EDIT NOTE] ${flagNote.trim()}`,
      });
      if (commentError) {
        Alert.alert("Warning", `Clip flagged but note failed: ${commentError.message}`);
      }
    }
    setFlagging(false);
    setShowFlagInput(false);
    setFlagNote("");
    Alert.alert("Flagged", "Clip marked for editing with your note.");
  };

  const handleFlag = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Flag for Edit",
        "What needs to be fixed? (required)",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Flag",
            onPress: async (note?: string) => {
              if (!note?.trim()) {
                Alert.alert("Error", "Please enter a note describing what needs to be fixed.");
                return;
              }
              const { error } = await supabase.from("clips").update({ status: "NEEDS_EDIT" }).eq("id", clipId);
              if (error) {
                Alert.alert("Error", `Failed to flag: ${error.message}`);
                return;
              }
              const userId = (await supabase.auth.getUser()).data.user?.id;
              if (userId) {
                const { error: commentError } = await supabase.from("comments").insert({
                  clip_id: clipId,
                  user_id: userId,
                  content: `[EDIT NOTE] ${note.trim()}`,
                });
                if (commentError) {
                  Alert.alert("Warning", `Clip flagged but note failed to save: ${commentError.message}`);
                  return;
                }
              }
              Alert.alert("Flagged", "Clip marked for editing with your note.");
            },
          },
        ],
        "plain-text"
      );
    } else {
      setShowFlagInput(true);
    }
  };

  return (
    <>
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
      {showFlagInput && (
        <View style={styles.flagOverlay}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 8 }}>Flag for Edit</Text>
          <TextInput
            style={styles.flagInput}
            placeholder="What needs to be fixed?"
            placeholderTextColor="#666"
            value={flagNote}
            onChangeText={setFlagNote}
            multiline
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => setShowFlagInput(false)} style={styles.flagCancel}>
              <Text style={{ color: "#888" }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submitFlag}
              disabled={flagging}
              style={[styles.flagSubmit, flagging && { opacity: 0.5 }]}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>{flagging ? "..." : "Flag"}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", right: 12, bottom: 120, alignItems: "center", gap: 20, zIndex: 10 },
  button: { alignItems: "center" },
  count: { color: "#fff", fontSize: 12, marginTop: 2 },
  flagOverlay: {
    position: "absolute",
    bottom: 200,
    left: 16,
    right: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    zIndex: 30,
  },
  flagInput: {
    backgroundColor: "#000",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    minHeight: 60,
    borderWidth: 1,
    borderColor: "#333",
  },
  flagCancel: { flex: 1, padding: 10, borderRadius: 6, alignItems: "center", backgroundColor: "#333" },
  flagSubmit: { flex: 1, padding: 10, borderRadius: 6, alignItems: "center", backgroundColor: "#f59e0b" },
});
