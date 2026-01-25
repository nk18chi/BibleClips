"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type WorkspacePlayerProps = {
  videoId: string;
  onTimeCapture: (type: "start" | "end", time: number) => void;
};

// Extended YTPlayer interface for workspace (superset of reel player)
interface WorkspaceYTPlayer {
  destroy: () => void;
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function WorkspacePlayer({ videoId, onTimeCapture }: WorkspacePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<WorkspaceYTPlayer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag?.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    }

    const initPlayer = () => {
      if (!containerRef.current) return;

      // Destroy existing player
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: () => setIsReady(true),
        },
      }) as WorkspaceYTPlayer;
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Update current time
    const interval = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 250);

    return () => {
      clearInterval(interval);
      playerRef.current?.destroy();
    };
  }, [videoId]);

  const handleSetStart = useCallback(() => {
    if (playerRef.current) {
      onTimeCapture("start", Math.floor(playerRef.current.getCurrentTime()));
    }
  }, [onTimeCapture]);

  const handleSetEnd = useCallback(() => {
    if (playerRef.current) {
      onTimeCapture("end", Math.floor(playerRef.current.getCurrentTime()));
    }
  }, [onTimeCapture]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleSetStart();
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        handleSetEnd();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSetStart, handleSetEnd]);

  return (
    <div className="space-y-3">
      {/* Player */}
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Time controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-100 rounded-lg p-3">
        <div className="text-lg font-mono">{formatTime(currentTime)}</div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSetStart}
            disabled={!isReady}
            className="flex-1 sm:flex-initial px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            Set Start (S)
          </button>
          <button
            type="button"
            onClick={handleSetEnd}
            disabled={!isReady}
            className="flex-1 sm:flex-initial px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          >
            Set End (E)
          </button>
        </div>
      </div>
    </div>
  );
}
