import type { Clip, ClipVerse } from "@bibleclips/database";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSubtitles } from "@/hooks/useSubtitles";
import { ActionButtons } from "./ActionButtons";
import { ClipInfo } from "./ClipInfo";
import { SubtitleOverlay } from "./SubtitleOverlay";
import { YouTubePlayer, type YouTubePlayerRef } from "./YouTubePlayer";

interface ReelItemProps {
  clip: Clip & { clip_verses: ClipVerse[] };
  isActive: boolean;
  hasVoted: boolean;
  onVote: () => void;
  onEnded?: () => void;
}

export function ReelItem({ clip, isActive, hasVoted, onVote, onEnded }: ReelItemProps) {
  const { height } = useWindowDimensions();
  const playerRef = useRef<YouTubePlayerRef>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const hasEndedRef = useRef(false);
  const { subtitles, translations } = useSubtitles(clip.id, isActive);

  useEffect(() => {
    if (isActive) {
      hasEndedRef.current = false;
      playerRef.current?.play();
    } else {
      playerRef.current?.pause();
    }
  }, [isActive]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
    if (time >= clip.end_time && !hasEndedRef.current) {
      hasEndedRef.current = true;
      onEnded?.();
    }
  }, [clip.end_time, onEnded]);

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
      <ActionButtons clipId={clip.id} voteCount={clip.vote_count} hasVoted={hasVoted} onVote={onVote} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", backgroundColor: "#000" },
});
