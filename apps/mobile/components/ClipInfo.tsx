import type { Clip, ClipVerse } from "@bibleclips/database";
import { StyleSheet, Text, View } from "react-native";

interface ClipInfoProps {
  clip: Clip;
  verses: ClipVerse[];
}

export function ClipInfo({ clip, verses }: ClipInfoProps) {
  const verseText = verses
    .map((v) => `${v.book} ${v.chapter}:${v.verse_start}${v.verse_end ? `-${v.verse_end}` : ""}`)
    .join(", ");

  return (
    <View style={styles.container}>
      <Text style={styles.title} numberOfLines={2}>
        {clip.title}
      </Text>
      {verseText ? <Text style={styles.verse}>{verseText}</Text> : null}
      <Text style={styles.type}>{clip.clip_type}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", bottom: 80, left: 16, right: 80, zIndex: 10 },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verse: {
    color: "#ddd",
    fontSize: 13,
    marginTop: 4,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  type: { color: "#8B5CF6", fontSize: 12, marginTop: 4, textTransform: "capitalize" },
});
