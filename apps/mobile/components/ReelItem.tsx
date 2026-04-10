import { View, StyleSheet, useWindowDimensions } from "react-native";
import { useRef, useEffect, useState, useCallback } from "react";
import { YouTubePlayer, type YouTubePlayerRef } from "./YouTubePlayer";
import { ClipInfo } from "./ClipInfo";
import { ActionButtons } from "./ActionButtons";
import { SubtitleOverlay } from "./SubtitleOverlay";
import { useSubtitles } from "@/hooks/useSubtitles";
import type { Clip, ClipVerse } from "@bibleclips/database";

interface ReelItemProps {
  clip: Clip & { clip_verses: ClipVerse[] };
  isActive: boolean;
  hasVoted: boolean;
  onVote: () => void;
}

export function ReelItem({ clip, isActive, hasVoted, onVote }: ReelItemProps) {
  const { height } = useWindowDimensions();
  const playerRef = useRef<YouTubePlayerRef>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const { subtitles, translations } = useSubtitles(clip.id);

  useEffect(() => {
    if (isActive) {
      playerRef.current?.play();
    } else {
      playerRef.current?.pause();
    }
  }, [isActive]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  return (
    <View style={[styles.container, { height }]}>
      <YouTubePlayer
        ref={playerRef}
        videoId={clip.youtube_video_id}
        startTime={clip.start_time}
        endTime={clip.end_time}
        onTimeUpdate={handleTimeUpdate}
      />
      {subtitles.length > 0 && (
        <SubtitleOverlay subtitles={subtitles} currentTime={currentTime} translations={translations} />
      )}
      <ClipInfo clip={clip} verses={clip.clip_verses} />
      <ActionButtons
        clipId={clip.id}
        voteCount={clip.vote_count}
        hasVoted={hasVoted}
        onVote={onVote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", backgroundColor: "#000" },
});
