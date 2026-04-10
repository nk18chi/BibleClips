import { useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import type { Clip, ClipVerse } from "@bibleclips/database";
import { supabase } from "@/lib/supabase";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { ClipInfo } from "@/components/ClipInfo";
import { CommentSection } from "@/components/CommentSection";

type ClipWithVerses = Clip & { clip_verses: ClipVerse[] };

export default function ClipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [clip, setClip] = useState<ClipWithVerses | null>(null);

  useEffect(() => {
    supabase
      .from("clips")
      .select("*, clip_verses(*)")
      .eq("id", id)
      .single()
      .then(({ data }) => setClip(data as ClipWithVerses | null));
  }, [id]);

  if (!clip) {
    return <ActivityIndicator size="large" color="#8B5CF6" style={{ flex: 1, backgroundColor: "#000" }} />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.playerContainer}>
        <YouTubePlayer videoId={clip.youtube_video_id} startTime={clip.start_time} endTime={clip.end_time} />
      </View>
      <View style={styles.infoContainer}>
        <ClipInfo clip={clip} verses={clip.clip_verses} />
      </View>
      <CommentSection clipId={clip.id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  playerContainer: { height: 300 },
  infoContainer: { position: "relative", paddingHorizontal: 16, paddingVertical: 12 },
});
