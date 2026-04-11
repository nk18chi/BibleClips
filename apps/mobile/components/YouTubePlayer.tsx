import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { Platform, StyleSheet } from "react-native";

export interface YouTubePlayerRef {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
}

interface YouTubePlayerProps {
  videoId: string;
  startTime: number;
  endTime: number;
  onStateChange?: (state: "playing" | "paused" | "ended") => void;
  onTimeUpdate?: (currentTime: number) => void;
}

// Web: use iframe + YouTube IFrame API directly
const YouTubePlayerWeb = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(function YouTubePlayerWeb(
  { videoId, startTime, endTime, onStateChange, onTimeUpdate },
  ref
) {
  const playerRef = useRef<YT.Player | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimeInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useImperativeHandle(ref, () => ({
    play: () => playerRef.current?.playVideo(),
    pause: () => playerRef.current?.pauseVideo(),
    seekTo: (seconds: number) => playerRef.current?.seekTo(seconds, true),
  }));

  useEffect(() => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    (window as any).onYouTubeIframeAPIReady = () => {
      playerRef.current = new YT.Player("yt-player", {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          start: Math.floor(startTime),
          playsinline: 1,
          fs: 0,
        },
        events: {
          onReady: (e: YT.PlayerEvent) => {
            e.target.seekTo(startTime, true);
            e.target.playVideo();
          },
          onStateChange: (e: YT.OnStateChangeEvent) => {
            const stateMap: Record<number, "playing" | "paused" | "ended"> = {
              1: "playing",
              2: "paused",
              0: "ended",
            };
            const state = stateMap[e.data];
            if (state) onStateChange?.(state);

            if (e.data === 1) {
              clearTimeInterval();
              intervalRef.current = setInterval(() => {
                const t = playerRef.current?.getCurrentTime?.() ?? 0;
                onTimeUpdate?.(t);
                if (t >= endTime) {
                  playerRef.current?.pauseVideo();
                  clearTimeInterval();
                }
              }, 250);
            } else {
              clearTimeInterval();
            }
          },
        },
      });
    };

    return () => {
      clearTimeInterval();
      playerRef.current?.destroy();
    };
  }, [videoId, startTime, endTime, onStateChange, onTimeUpdate, clearTimeInterval]);

  return (
    <div style={{ flex: 1, backgroundColor: "#000", width: "100%", height: "100%" }}>
      <div id="yt-player" style={{ width: "100%", height: "100%" }} />
    </div>
  );
});

// Native: load YouTube embed URL with Referer header to avoid error 153
const YouTubePlayerNative = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(function YouTubePlayerNative(
  { videoId, startTime, endTime, onTimeUpdate },
  ref
) {
  const { WebView } = require("react-native-webview");
  const webViewRef = useRef<any>(null);

  const start = Math.floor(startTime);
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?start=${start}&autoplay=1&playsinline=1&rel=0&modestbranding=1&controls=1`;

  useImperativeHandle(ref, () => ({
    play: () => {
      webViewRef.current?.injectJavaScript("document.querySelector('video')?.play(); true;");
    },
    pause: () => {
      webViewRef.current?.injectJavaScript("document.querySelector('video')?.pause(); true;");
    },
    seekTo: (seconds: number) => {
      webViewRef.current?.injectJavaScript(
        `document.querySelector('video').currentTime = ${seconds}; true;`
      );
    },
  }));

  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "time" && onTimeUpdate) {
          onTimeUpdate(data.currentTime);
        }
      } catch {}
    },
    [onTimeUpdate]
  );

  const timeTrackerScript = `
    (function() {
      var iv = setInterval(function() {
        var video = document.querySelector('video');
        if (video) {
          clearInterval(iv);
          setInterval(function() {
            if (!video.paused) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'time', currentTime: video.currentTime
              }));
              if (video.currentTime >= ${Math.floor(endTime)}) {
                video.pause();
              }
            }
          }, 250);
        }
      }, 500);
    })(); true;
  `;

  return (
    <WebView
      ref={webViewRef}
      source={{
        uri: embedUrl,
        headers: { Referer: "https://bibleclips.com" },
      }}
      style={styles.webview}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo
      javaScriptEnabled
      domStorageEnabled
      onMessage={handleMessage}
      injectedJavaScript={timeTrackerScript}
      scrollEnabled={false}
      bounces={false}
    />
  );
});

export const YouTubePlayer = Platform.OS === "web" ? YouTubePlayerWeb : YouTubePlayerNative;

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: "#000" },
});
