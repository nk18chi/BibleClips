import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useClipComments } from "@/hooks/useClipComments";
import { useSupabase } from "@/hooks/useSupabase";
import { CommentCard } from "./CommentCard";

interface CommentSectionProps {
  clipId: string;
}

export function CommentSection({ clipId }: CommentSectionProps) {
  const { comments, loading, addComment } = useClipComments(clipId);
  const { user } = useSupabase();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    await addComment(trimmed);
    setText("");
    setSubmitting(false);
  };

  if (loading) {
    return <ActivityIndicator size="small" color="#8B5CF6" style={{ padding: 24 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Comments ({comments.length})</Text>
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CommentCard comment={item} />}
        scrollEnabled={false}
        ListEmptyComponent={<Text style={styles.empty}>No comments yet. Be the first!</Text>}
      />
      {user ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#666"
            value={text}
            onChangeText={setText}
            multiline
          />
          <Pressable
            style={[styles.sendButton, !text.trim() && styles.sendDisabled]}
            onPress={handleSubmit}
            disabled={!text.trim() || submitting}
          >
            <Text style={styles.sendText}>{submitting ? "..." : "Post"}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.loginPrompt}>Log in to comment</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { color: "#fff", fontSize: 16, fontWeight: "600", paddingHorizontal: 16, paddingVertical: 12 },
  empty: { color: "#888", fontSize: 14, textAlign: "center", padding: 24 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#333",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 80,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#8B5CF6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  loginPrompt: { color: "#888", fontSize: 14, textAlign: "center", padding: 16 },
});
