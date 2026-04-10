import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

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

function generateHTML(videoId: string, startTime: number, endTime: number): string {
  return `
<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
  * { margin: 0; padding: 0; }
  body { background: #000; overflow: hidden; }
  #player { width: 100vw; height: 100vh; }
</style>
</head><body>
<div id="player"></div>
<script>
  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);

  var player;
  var timeInterval;

  function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
      videoId: '${videoId}',
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        start: Math.floor(${startTime}),
        playsinline: 1,
        fs: 0,
      },
      events: {
        onReady: function(e) {
          e.target.seekTo(${startTime}, true);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        },
        onStateChange: function(e) {
          var stateMap = { 1: 'playing', 2: 'paused', 0: 'ended' };
          var state = stateMap[e.data];
          if (state) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'state', state: state }));
          }
          if (e.data === 1) {
            clearInterval(timeInterval);
            timeInterval = setInterval(function() {
              var t = player.getCurrentTime();
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'time', currentTime: t }));
              if (t >= ${endTime}) {
                player.pauseVideo();
                clearInterval(timeInterval);
              }
            }, 100);
          } else {
            clearInterval(timeInterval);
          }
        }
      }
    });
  }

  window.addEventListener('message', function(e) {
    var msg = JSON.parse(e.data);
    if (msg.action === 'play') player.playVideo();
    if (msg.action === 'pause') player.pauseVideo();
    if (msg.action === 'seekTo') player.seekTo(msg.time, true);
  });
</script>
</body></html>`;
}

export const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(function YouTubePlayer(
  { videoId, startTime, endTime, onStateChange, onTimeUpdate },
  ref
) {
  const webViewRef = useRef<WebView>(null);

  const sendMessage = useCallback((msg: object) => {
    const js = `window.dispatchEvent(new MessageEvent('message', { data: '${JSON.stringify(msg).replace(/'/g, "\\'")}' })); true;`;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  useImperativeHandle(ref, () => ({
    play: () => sendMessage({ action: "play" }),
    pause: () => sendMessage({ action: "pause" }),
    seekTo: (seconds: number) => sendMessage({ action: "seekTo", time: seconds }),
  }));

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "state" && onStateChange) {
        onStateChange(data.state);
      }
      if (data.type === "time" && onTimeUpdate) {
        onTimeUpdate(data.currentTime);
      }
    },
    [onStateChange, onTimeUpdate]
  );

  const html = generateHTML(videoId, startTime, endTime);

  return (
    <WebView
      ref={webViewRef}
      source={{ html }}
      style={styles.webview}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      onMessage={handleMessage}
      scrollEnabled={false}
      bounces={false}
    />
  );
});

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: "#000" },
});
