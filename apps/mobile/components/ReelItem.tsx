import { View, StyleSheet, useWindowDimensions } from "react-native";
import { useRef, useEffect } from "react";
import { YouTubePlayer, type YouTubePlayerRef } from "./YouTubePlayer";
import { ClipInfo } from "./ClipInfo";
import type { Clip, ClipVerse } from "@bibleclips/database";

interface ReelItemProps {
  clip: Clip & { clip_verses: ClipVerse[] };
  isActive: boolean;
}

export function ReelItem({ clip, isActive }: ReelItemProps) {
  const { height } = useWindowDimensions();
  const playerRef = useRef<YouTubePlayerRef>(null);

  useEffect(() => {
    if (isActive) {
      playerRef.current?.play();
    } else {
      playerRef.current?.pause();
    }
  }, [isActive]);

  return (
    <View style={[styles.container, { height }]}>
      <YouTubePlayer
        ref={playerRef}
        videoId={clip.youtube_video_id}
        startTime={clip.start_time}
        endTime={clip.end_time}
      />
      <ClipInfo clip={clip} verses={clip.clip_verses} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", backgroundColor: "#000" },
});
