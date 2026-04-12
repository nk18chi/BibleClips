import { type ClipSubtitle, groupIntoSentences } from "@bibleclips/database";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

interface SubtitleOverlayProps {
  subtitles: ClipSubtitle[];
  currentTime: number;
  translations?: { language: string; text: string; start_time: number; end_time: number }[];
}

export function SubtitleOverlay({ subtitles, currentTime, translations }: SubtitleOverlayProps) {
  const sentences = useMemo(
    () =>
      groupIntoSentences(
        subtitles.map((s) => ({ word: s.word, start: s.start_time, end: s.end_time })),
        6
      ),
    [subtitles]
  );

  const activeSentence = sentences.find((s) => currentTime >= s.start && currentTime <= s.end + 0.3);

  if (!activeSentence) return null;

  const text = activeSentence.words.map((w) => w.word).join(" ");

  const translation = translations?.find((t) => currentTime >= t.start_time && currentTime <= t.end_time + 0.3);

  return (
    <View style={styles.container}>
      <Text style={styles.primaryText}>{text}</Text>
      {translation ? <Text style={styles.translationText}>({translation.text})</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 180,
    left: 16,
    right: 60,
    alignItems: "center",
    zIndex: 20,
  },
  primaryText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    overflow: "hidden",
  },
  translationText: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
