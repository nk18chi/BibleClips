import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
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
  onReady?: () => void;
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
                  onTimeUpdate?.(endTime + 1);
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

// Native: use HTML page with YouTube IFrame API + Referer via baseUrl
const YouTubePlayerNative = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(function YouTubePlayerNative(
  { videoId, startTime, endTime, onTimeUpdate, onReady },
  ref
) {
  const { WebView } = require("react-native-webview");
  const webViewRef = useRef<any>(null);

  const start = Math.floor(startTime);
  const end = Math.floor(endTime);

  const html = `
<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>*{margin:0;padding:0}body{background:#000;overflow:hidden}#player{width:100vw;height:100vh}</style>
</head><body>
<div id="player"></div>
<script>
var tag=document.createElement('script');
tag.src='https://www.youtube.com/iframe_api';
document.head.appendChild(tag);
var player,timeIv;
function onYouTubeIframeAPIReady(){
  player=new YT.Player('player',{
    videoId:'${videoId}',
    playerVars:{autoplay:1,controls:1,modestbranding:1,rel:0,start:${start},playsinline:1,fs:0},
    events:{
      onReady:function(e){
        e.target.seekTo(${start},true);
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
      },
      onStateChange:function(e){
        if(e.data===1){
          clearInterval(timeIv);
          timeIv=setInterval(function(){
            var t=player.getCurrentTime();
            window.ReactNativeWebView.postMessage(JSON.stringify({type:'time',currentTime:t}));
            if(t>=${end}){player.pauseVideo();clearInterval(timeIv);window.ReactNativeWebView.postMessage(JSON.stringify({type:'time',currentTime:${end}+1}));}
          },250);
        }else{clearInterval(timeIv);}
        if(e.data===0){window.ReactNativeWebView.postMessage(JSON.stringify({type:'ended'}));}
      }
    }
  });
}
window.addEventListener('message',function(e){
  try{
    var msg=JSON.parse(e.data);
    if(msg.action==='play')player.playVideo();
    if(msg.action==='pause')player.pauseVideo();
    if(msg.action==='seekTo')player.seekTo(msg.time,true);
  }catch(err){}
});
</script>
</body></html>`;

  const sendMessage = useCallback((msg: object) => {
    const js = `window.dispatchEvent(new MessageEvent('message',{data:'${JSON.stringify(msg).replace(/'/g, "\\'")}'}));true;`;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  useImperativeHandle(ref, () => ({
    play: () => sendMessage({ action: "play" }),
    pause: () => sendMessage({ action: "pause" }),
    seekTo: (seconds: number) => sendMessage({ action: "seekTo", time: seconds }),
  }));

  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "ready" && onReady) {
          onReady();
        }
        if (data.type === "time" && onTimeUpdate) {
          onTimeUpdate(data.currentTime);
        }
      } catch {}
    },
    [onTimeUpdate, onReady]
  );

  return (
    <WebView
      ref={webViewRef}
      source={{ html, baseUrl: "https://bibleclips.com" }}
      style={styles.webview}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={["*"]}
      onMessage={handleMessage}
      scrollEnabled={false}
      bounces={false}
    />
  );
});

export const YouTubePlayer = Platform.OS === "web" ? YouTubePlayerWeb : YouTubePlayerNative;

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: "#000" },
});
