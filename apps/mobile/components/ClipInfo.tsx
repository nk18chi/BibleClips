import type { Clip, ClipVerse } from "@bibleclips/database";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface ClipInfoProps {
  clip: Clip;
  verses: ClipVerse[];
}

function VerseModal({ verse, onClose }: { verse: ClipVerse; onClose: () => void }) {
  const [verseText, setVerseText] = useState("");
  const [verseTextJa, setVerseTextJa] = useState("");
  const [loading, setLoading] = useState(true);

  const verseRef = `${verse.book} ${verse.chapter}:${verse.verse_start}${verse.verse_end ? `-${verse.verse_end}` : ""}`;
  const bookSlug = verse.book.toLowerCase().replace(/\s+/g, "");

  useEffect(() => {
    async function fetchVerse() {
      try {
        const [enRes, jaRes] = await Promise.all([
          fetch(
            `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/en-kjv/books/${bookSlug}/chapters/${verse.chapter}/verses/${verse.verse_start}.json`
          ),
          fetch(
            `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/ja-kougo/books/${bookSlug}/chapters/${verse.chapter}/verses/${verse.verse_start}.json`
          ),
        ]);
        if (enRes.ok) {
          const data = await enRes.json();
          setVerseText(data.text || "");
        }
        if (jaRes.ok) {
          const data = await jaRes.json();
          setVerseTextJa(data.text || "");
        }
      } catch {}
      setLoading(false);
    }
    fetchVerse();
  }, [bookSlug, verse.chapter, verse.verse_start]);

  const bibleGatewayUrl = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(verseRef)}&version=NIV`;

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{verseRef}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>X</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            {loading ? (
              <ActivityIndicator size="small" color="#8B5CF6" style={{ padding: 32 }} />
            ) : (
              <>
                {verseText ? <Text style={styles.verseFullText}>{verseText}</Text> : null}
                {verseTextJa ? (
                  <Text style={styles.verseJaText}>{verseTextJa}</Text>
                ) : null}
                {!verseText && !verseTextJa && (
                  <Text style={styles.noText}>Verse text not available.</Text>
                )}
              </>
            )}
          </ScrollView>

          <Pressable
            style={styles.gatewayButton}
            onPress={() => Linking.openURL(bibleGatewayUrl)}
          >
            <Text style={styles.gatewayText}>Read on Bible Gateway</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function ClipInfo({ clip, verses }: ClipInfoProps) {
  const [selectedVerse, setSelectedVerse] = useState<ClipVerse | null>(null);

  const verseText = verses
    .map((v) => `${v.book} ${v.chapter}:${v.verse_start}${v.verse_end ? `-${v.verse_end}` : ""}`)
    .join(", ");

  return (
    <View style={styles.container}>
      <Text style={styles.title} numberOfLines={2}>
        {clip.title}
      </Text>
      {verses.length > 0 && (
        <Pressable onPress={() => setSelectedVerse(verses[0])}>
          <Text style={styles.verse}>{verseText} →</Text>
        </Pressable>
      )}
      <Text style={styles.type}>{clip.clip_type}</Text>

      {selectedVerse && (
        <VerseModal verse={selectedVerse} onClose={() => setSelectedVerse(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", bottom: 100, left: 16, right: 80, zIndex: 10 },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verse: {
    color: "#93c5fd",
    fontSize: 13,
    marginTop: 4,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    textDecorationLine: "underline",
  },
  type: { color: "#8B5CF6", fontSize: 12, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#111",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  closeButton: { padding: 8 },
  closeText: { color: "#888", fontSize: 18 },
  modalBody: { padding: 16 },
  verseFullText: { color: "#fff", fontSize: 16, lineHeight: 26 },
  verseJaText: { color: "#aaa", fontSize: 15, lineHeight: 24, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#222" },
  noText: { color: "#888", fontSize: 14 },
  gatewayButton: {
    margin: 16,
    backgroundColor: "#3b82f6",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  gatewayText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
