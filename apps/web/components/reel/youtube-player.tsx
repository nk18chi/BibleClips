'use client';

import { useEffect, useRef } from 'react';

type YouTubePlayerProps = {
  videoId: string;
  startTime: number;
  endTime: number;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
};

interface YTPlayer {
  destroy: () => void;
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
}

interface YTPlayerEvent {
  data: number;
}

declare global {
  interface Window {
    YT: {
      Player: new (element: HTMLElement, options: object) => YTPlayer;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

export function YouTubePlayer({ videoId, startTime, endTime, onEnded, onTimeUpdate }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    }

    const initPlayer = () => {
      if (!containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          start: startTime,
          end: endTime,
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          cc_load_policy: 0, // Disable YouTube captions (use our overlay)
        },
        events: {
          onStateChange: (event: YTPlayerEvent) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              onEnded?.();
            }
          },
        },
      });

      // Check time updates and end time
      checkIntervalRef.current = setInterval(() => {
        if (playerRef.current?.getCurrentTime) {
          const currentTime = playerRef.current.getCurrentTime();
          onTimeUpdate?.(currentTime);
          if (currentTime >= endTime) {
            playerRef.current.pauseVideo();
            onEnded?.();
          }
        }
      }, 100); // More frequent updates for smooth subtitles
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      playerRef.current?.destroy();
    };
  }, [videoId, startTime, endTime, onEnded, onTimeUpdate]);

  return (
    <div className="w-full h-full bg-black relative overflow-hidden">
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
      />
    </div>
  );
}
