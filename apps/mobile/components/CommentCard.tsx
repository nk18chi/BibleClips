import type { CommentWithUser } from "@bibleclips/database";
import { StyleSheet, Text, View } from "react-native";

interface CommentCardProps {
  comment: CommentWithUser;
}

export function CommentCard({ comment }: CommentCardProps) {
  const displayName =
    (comment as unknown as { user: { display_name: string } | null }).user?.display_name ?? "Anonymous";
  const timeAgo = formatTimeAgo(new Date(comment.created_at));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.time}>{timeAgo}</Text>
      </View>
      <Text style={styles.content}>{comment.content}</Text>
    </View>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  name: { color: "#fff", fontSize: 14, fontWeight: "600" },
  time: { color: "#888", fontSize: 12 },
  content: { color: "#ddd", fontSize: 14, lineHeight: 20 },
});
