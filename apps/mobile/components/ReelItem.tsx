import { Ionicons } from "@expo/vector-icons";
import type { Clip, ClipVerse } from "@bibleclips/database";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSubtitles } from "@/hooks/useSubtitles";
import { ActionButtons } from "./ActionButtons";
import { ClipInfo } from "./ClipInfo";
import { SubtitleOverlay } from "./SubtitleOverlay";
import { YouTubePlayer, type YouTubePlayerRef } from "./YouTubePlayer";

interface ReelItemProps {
  clip: Clip & { clip_verses: ClipVerse[] };
  isActive: boolean;
  shouldPreload: boolean;
  hasVoted: boolean;
  onVote: () => void;
  onEnded?: () => void;
  isAdmin?: boolean;
}

export function ReelItem({ clip, isActive, shouldPreload, hasVoted, onVote, onEnded, isAdmin }: ReelItemProps) {
  const { height } = useWindowDimensions();
  const playerRef = useRef<YouTubePlayerRef>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef(0);
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

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      if (!hasVoted) onVote();
      setShowHeart(true);
      heartScale.setValue(0);
      heartOpacity.setValue(1);
      Animated.sequence([
        Animated.spring(heartScale, { toValue: 1, friction: 3, useNativeDriver: true }),
        Animated.timing(heartOpacity, { toValue: 0, duration: 400, delay: 200, useNativeDriver: true }),
      ]).start(() => setShowHeart(false));
    }
    lastTapRef.current = now;
  };

  const thumbnail = `https://img.youtube.com/vi/${clip.youtube_video_id}/hqdefault.jpg`;
  const duration = clip.end_time - clip.start_time;
  const progress = duration > 0 ? Math.min((currentTime - clip.start_time) / duration, 1) : 0;

  return (
    <Pressable style={[styles.container, { height }]} onPress={handleDoubleTap}>
      {shouldPreload ? (
        <>
          <YouTubePlayer
            ref={playerRef}
            videoId={clip.youtube_video_id}
            startTime={clip.start_time}
            endTime={clip.end_time}
            onTimeUpdate={handleTimeUpdate}
            onReady={() => setPlayerReady(true)}
          />
          {!playerReady && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          )}
        </>
      ) : (
        <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}

      {/* Double-tap heart animation */}
      {showHeart && (
        <Animated.View
          style={[
            styles.heartOverlay,
            { opacity: heartOpacity, transform: [{ scale: heartScale }] },
          ]}
        >
          <Ionicons name="heart" size={100} color="#ef4444" />
        </Animated.View>
      )}

      {subtitles.length > 0 && (
        <SubtitleOverlay subtitles={subtitles} currentTime={currentTime} translations={translations} />
      )}
      <ClipInfo clip={clip} verses={clip.clip_verses} />
      <ActionButtons clipId={clip.id} voteCount={clip.vote_count} hasVoted={hasVoted} onVote={onVote} isAdmin={isAdmin} />

      {/* Progress bar */}
      {isActive && progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${Math.max(progress * 100, 1)}%` }]} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", backgroundColor: "#000" },
  heartOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 30,
  },
  progressContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    zIndex: 25,
  },
  progressBar: {
    height: 3,
    backgroundColor: "#8B5CF6",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 5,
  },
});
