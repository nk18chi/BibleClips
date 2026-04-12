import { type ClipSubtitle, groupIntoSentences } from "@bibleclips/database";
import { useMemo } from "react";
import { Text, View } from "react-native";

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

  // Find active word index
  let activeWordIndex = -1;
  for (let i = 0; i < activeSentence.words.length; i++) {
    const word = activeSentence.words[i];
    const nextWord = activeSentence.words[i + 1];
    const wordEnd = nextWord ? nextWord.start : activeSentence.end;
    if (currentTime >= word.start && currentTime < wordEnd) {
      activeWordIndex = i;
      break;
    }
  }

  const translation = translations?.find((t) => currentTime >= t.start_time && currentTime <= t.end_time + 0.3);

  return (
    <View style={{ position: "absolute", bottom: 180, left: 16, right: 60, alignItems: "center", zIndex: 20 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
        {activeSentence.words.map((w, i) => (
          <Text
            key={i}
            style={{
              color: i === activeWordIndex ? "#facc15" : "#ffffff",
              fontSize: 20,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              textShadowColor: "rgba(0,0,0,0.9)",
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 4,
              transform: [{ scale: i === activeWordIndex ? 1.1 : 1 }],
            }}
          >
            {w.word}
          </Text>
        ))}
      </View>
      {translation && (
        <Text
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 14,
            marginTop: 6,
            textShadowColor: "rgba(0,0,0,0.9)",
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 3,
            textAlign: "center",
          }}
        >
          ({translation.text})
        </Text>
      )}
    </View>
  );
}
