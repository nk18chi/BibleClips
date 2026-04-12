# Mobile App (React Native + Expo) Implementation Plan

> **For Claude:** After human approval, use plan2beads to convert this plan to a beads epic, then use `superpowers-bd:subagent-driven-development` for parallel execution.

**Goal:** Build a React Native + Expo mobile app at `apps/mobile/` that provides the full BibleClips experience — reel viewer, browse, clip submission, workspace — on iOS, Android, and Expo web.

**Architecture:** The Expo app lives inside the existing Turborepo monorepo as `apps/mobile/`, sharing `packages/database` (Supabase types), `packages/validation` (Zod schemas), and `packages/config` (TypeScript config). Expo Router v4 provides file-based routing. YouTube clips play via WebView embedding the IFrame API. All data is fetched client-side via Supabase JS SDK with AsyncStorage for session persistence.

**Tech Stack:** React Native, Expo SDK 54+ (use latest stable at implementation time — update all `expo-*` and `react-native` versions accordingly), Expo Router v4+, react-native-webview, @supabase/supabase-js, @react-native-async-storage/async-storage, react-native-reanimated, react-hook-form, Zod

**Convention:** After any task that adds dependencies to `apps/mobile/package.json`, run `pnpm install` from the monorepo root before proceeding.

**Key Decisions:**
- **Video player:** YouTube IFrame via WebView (not native video) — ToS-compliant, same approach as web app, simpler implementation
- **State management:** Supabase client + React useState/useEffect — no Redux/Zustand/TanStack Query (YAGNI, matches web app approach)
- **Monorepo integration:** Metro bundler with `watchFolders` pointing to monorepo root — avoids publishing packages to npm, enables direct imports
- **Auth session:** AsyncStorage (not cookies) — standard approach for React Native with Supabase, session auto-refresh built-in
- **No i18n library:** Bilingual support is content-level (subtitle translations, book_ja), not UI chrome translation

---

## Task 1: Initialize Expo App in Monorepo

**Depends on:** None
**Complexity:** standard
**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/index.tsx`

**Purpose:** Bootstrap the Expo app with Expo Router inside the monorepo. This creates the minimal runnable app.

**Not In Scope:** Metro config for workspace packages (Task 2), Supabase integration (Task 3), real tab content.

**Step 1: Create `apps/mobile/package.json`**
```json
{
  "name": "@bibleclips/mobile",
  "version": "0.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "build": "expo export",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-linking": "~7.0.0",
    "expo-constants": "~17.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.9",
    "react-native-safe-area-context": "~5.4.0",
    "react-native-screens": "~4.10.0",
    "react-native-web": "~0.19.13",
    "react-dom": "18.3.1",
    "@expo/vector-icons": "^14.0.0"
  },
  "devDependencies": {
    "@bibleclips/config": "workspace:*",
    "@types/react": "~18.3.0",
    "typescript": "^5.4.0"
  }
}
```

**Step 2: Create `apps/mobile/app.json`**
```json
{
  "expo": {
    "name": "BibleClips",
    "slug": "bibleclips",
    "version": "1.0.0",
    "scheme": "bibleclips",
    "platforms": ["ios", "android", "web"],
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "bundleIdentifier": "com.bibleclips.app",
      "supportsTablet": true
    },
    "android": {
      "package": "com.bibleclips.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "web": {
      "bundler": "metro",
      "favicon": "./assets/favicon.png"
    },
    "plugins": ["expo-router"],
    "extra": {
      "router": {
        "origin": "https://bibleclips.com"
      }
    }
  }
}
```

**Step 3: Create `apps/mobile/tsconfig.json`**
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

**Step 4: Create `apps/mobile/babel.config.js`**
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
```

**Step 5: Create placeholder asset files**
Create `apps/mobile/assets/` directory with placeholder `icon.png`, `splash.png`, `adaptive-icon.png`, `favicon.png` (simple 1x1 PNGs for now).

**Step 6: Create `apps/mobile/app/_layout.tsx`** (root layout)
```tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
```

**Step 7: Create `apps/mobile/app/(tabs)/_layout.tsx`** (tab navigator)
```tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#8B5CF6",
        tabBarStyle: { backgroundColor: "#000" },
        tabBarInactiveTintColor: "#888",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: "Submit",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

**Step 8: Create `apps/mobile/app/(tabs)/index.tsx`** (placeholder home)
```tsx
import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>BibleClips</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  text: { color: "#fff", fontSize: 24 },
});
```

**Step 9: Create placeholder tab screens**
Create `apps/mobile/app/(tabs)/browse.tsx`, `submit.tsx`, `profile.tsx` with the same placeholder pattern as `index.tsx` (different title text).

**Step 10: Install dependencies and verify**
```bash
cd apps/mobile && pnpm install && npx expo start --web
```
Expected: Expo dev server launches, browser shows "BibleClips" placeholder with 4 tabs.

**Step 11: Commit**
```
git add apps/mobile/
git commit -m "feat(mobile): initialize Expo app with Expo Router in monorepo"
```

---

## Task 2: Configure Metro Bundler + Turborepo Integration

**Depends on:** Task 1
**Complexity:** standard
**Files:**
- Create: `apps/mobile/metro.config.js`
- Modify: `apps/mobile/package.json` (add workspace deps)

**Purpose:** Enable the Expo app to import from `packages/database`, `packages/validation`, and `packages/config` via Metro's workspace resolution. Add Turborepo task definitions for the mobile app.

**Gotchas:** Metro bundler doesn't natively resolve pnpm workspace packages. Must explicitly configure `watchFolders` and `nodeModulesPaths`. Symlinked packages under `node_modules` need special handling.

**Step 1: Create `apps/mobile/metro.config.js`**
```javascript
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root for changes in shared packages
config.watchFolders = [monorepoRoot];

// Resolve modules from both the app and monorepo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Ensure we don't have duplicate React/React Native instances
module.exports = config;
```

**Step 2: Add workspace package dependencies to `apps/mobile/package.json`**
Add to `dependencies`:
```json
{
  "@bibleclips/database": "workspace:*",
  "@bibleclips/validation": "workspace:*"
}
```

**Step 3: Verify workspace package imports**
Note: The existing generic `turbo.json` tasks (`dev`, `build`, `type-check`) already apply to all workspace packages including `@bibleclips/mobile`. No package-scoped overrides needed.

Create a temporary test in `apps/mobile/app/(tabs)/index.tsx`:
```tsx
import type { Clip } from "@bibleclips/database";
import { clipSubmissionSchema } from "@bibleclips/validation";
```
Run: `cd apps/mobile && pnpm type-check`
Expected: PASS (no type errors)

**Step 5: Run from monorepo root**
```bash
pnpm install && pnpm turbo dev --filter=@bibleclips/mobile
```
Expected: Expo dev server starts, shared packages resolve.

**Step 6: Commit**
```
git add apps/mobile/metro.config.js apps/mobile/package.json
git commit -m "feat(mobile): configure Metro bundler and Turborepo for workspace packages"
```

---

## Task 3: Supabase Client for React Native

**Depends on:** Task 2
**Complexity:** standard
**Files:**
- Create: `apps/mobile/lib/supabase.ts`
- Create: `apps/mobile/hooks/useSupabase.ts`
- Create: `apps/mobile/components/providers/SupabaseProvider.tsx`
- Modify: `apps/mobile/package.json` (add supabase + async-storage deps)

**Purpose:** Initialize a Supabase client that persists auth sessions in AsyncStorage (instead of cookies). Provide a React context so any component can access the client and current user.

**Not In Scope:** OAuth flow (Task 4), actual login UI (Task 4).

**Gotchas:** The existing `packages/database/src/client.ts` uses `process.env.NEXT_PUBLIC_SUPABASE_URL` — the mobile app uses `EXPO_PUBLIC_SUPABASE_URL` via Expo's env var convention. The mobile client must be initialized separately, not imported from the shared package. We still import types from `@bibleclips/database`.

**Step 1: Add dependencies to `apps/mobile/package.json`**
```json
{
  "@supabase/supabase-js": "^2.43.0",
  "@react-native-async-storage/async-storage": "~2.1.0"
}
```

**Step 2: Create `apps/mobile/lib/supabase.ts`**
```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Set in .env.local (dev) or EAS secrets (build).");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Step 3: Create `apps/mobile/components/providers/SupabaseProvider.tsx`**
```tsx
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

interface SupabaseContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

export const SupabaseContext = createContext<SupabaseContextType>({
  session: null,
  user: null,
  isLoading: true,
});

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SupabaseContext.Provider value={{ session, user: session?.user ?? null, isLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
}
```

**Step 4: Create `apps/mobile/hooks/useSupabase.ts`**
```typescript
import { useContext } from "react";
import { SupabaseContext } from "@/components/providers/SupabaseProvider";

export function useSupabase() {
  return useContext(SupabaseContext);
}
```

**Step 5: Create `apps/mobile/.env.local`**
```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

**Step 6: Wire SupabaseProvider into root layout**
Update `apps/mobile/app/_layout.tsx`:
```tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";

export default function RootLayout() {
  return (
    <SupabaseProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SupabaseProvider>
  );
}
```

**Step 7: Verify**
Run: `cd apps/mobile && npx expo start --web`
Expected: App loads without errors, SupabaseProvider initializes (check console for no Supabase connection errors).

**Step 8: Commit**
```
git add apps/mobile/lib/ apps/mobile/hooks/ apps/mobile/components/providers/ apps/mobile/app/_layout.tsx apps/mobile/package.json
git commit -m "feat(mobile): add Supabase client with AsyncStorage session persistence"
```

---

## Task 4: Auth Screens (Login + Register)

**Depends on:** Task 3
**Complexity:** standard
**Files:**
- Create: `apps/mobile/app/(auth)/login.tsx`
- Create: `apps/mobile/app/(auth)/register.tsx`
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Modify: `apps/mobile/app/_layout.tsx` (add auth route group)
- Modify: `apps/mobile/app/(tabs)/profile.tsx` (auth-aware profile)

**Purpose:** Email/password login and registration screens using Supabase Auth. The Profile tab shows login prompt if unauthenticated, or user info if authenticated.

**Not In Scope:** Google OAuth (can be added later via `expo-auth-session`), password reset flow.

**Step 1: Create `apps/mobile/app/(auth)/_layout.tsx`**
```tsx
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#000" },
        headerTintColor: "#fff",
      }}
    >
      <Stack.Screen name="login" options={{ title: "Login" }} />
      <Stack.Screen name="register" options={{ title: "Register" }} />
    </Stack>
  );
}
```

**Step 2: Create `apps/mobile/app/(auth)/login.tsx`**
```tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert("Login Error", error.message);
    } else {
      router.replace("/(tabs)");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign In"}</Text>
      </Pressable>
      <Link href="/(auth)/register" style={styles.link}>
        <Text style={styles.linkText}>Don't have an account? Register</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#000" },
  title: { color: "#fff", fontSize: 28, fontWeight: "bold", marginBottom: 32, textAlign: "center" },
  input: { backgroundColor: "#1a1a1a", color: "#fff", padding: 16, borderRadius: 8, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: "#8B5CF6", padding: 16, borderRadius: 8, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { marginTop: 24, alignSelf: "center" },
  linkText: { color: "#8B5CF6", fontSize: 14 },
});
```

**Step 3: Create `apps/mobile/app/(auth)/register.tsx`**
Same pattern as login but calls `supabase.auth.signUp({ email, password })` and includes a `display_name` field.

**Step 4: Update Profile tab to be auth-aware**
Update `apps/mobile/app/(tabs)/profile.tsx`:
```tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useSupabase } from "@/hooks/useSupabase";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  const { user, isLoading } = useSupabase();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to BibleClips</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Sign In</Text>
          </Pressable>
        </Link>
        <Link href="/(auth)/register" asChild>
          <Pressable style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.buttonText}>Create Account</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{user.email}</Text>
      <Pressable style={styles.button} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#000" },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 32 },
  text: { color: "#888", fontSize: 16 },
  button: { backgroundColor: "#8B5CF6", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8, marginBottom: 12, width: "100%", alignItems: "center" },
  secondaryButton: { backgroundColor: "#333" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
```

**Step 5: Update root layout to include auth route group**
Add to `apps/mobile/app/_layout.tsx` Stack:
```tsx
<Stack.Screen name="(auth)" options={{ headerShown: false }} />
```

**Step 6: Verify**
Run app, navigate to Profile tab → see login/register links. Test login with existing Supabase account.
Expected: Successful login updates Profile tab to show email + sign out button.

**Step 7: Commit**
```
git commit -m "feat(mobile): add auth screens (login, register) and auth-aware profile tab"
```

---

## Task 5: YouTube WebView Player Component

**Depends on:** Task 1
**Complexity:** complex
**Files:**
- Create: `apps/mobile/components/YouTubePlayer.tsx`
- Modify: `apps/mobile/package.json` (add react-native-webview)

**Purpose:** A YouTube video player that renders inside a WebView using the YouTube IFrame API. Supports start/end time, play/pause control, and reports currentTime back to React Native via postMessage for subtitle sync.

**Gotchas:** WebView on web (react-native-web) uses `<iframe>` directly — test on both native and web. The YouTube IFrame API's `onStateChange` event uses numeric codes (1=playing, 2=paused, 0=ended). **Platform differences:** On Expo web, `window.ReactNativeWebView` does not exist — the `postMessage`/`injectJavaScript` bridge will fail. For web, use `Platform.OS === "web"` to render a direct `<iframe>` with `window.parent.postMessage()` instead. iOS may block autoplay in WKWebView — the first video may require a user tap to start.

**Step 1: Add dependency**
```json
{ "react-native-webview": "~13.12.0" }
```

**Step 2: Create `apps/mobile/components/YouTubePlayer.tsx`**
```tsx
import { useRef, useCallback, forwardRef, useImperativeHandle } from "react";
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

export const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(
  function YouTubePlayer({ videoId, startTime, endTime, onStateChange, onTimeUpdate }, ref) {
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
  }
);

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: "#000" },
});
```

**Step 3: Smoke test**
Temporarily render `<YouTubePlayer videoId="dQw4w9WgXcQ" startTime={0} endTime={30} />` in the home tab.
Expected: YouTube video loads in WebView, plays from start.

**Step 5: Commit**
```
git commit -m "feat(mobile): add YouTubePlayer WebView component with play/pause/seek control"
```

---

## Task 6: Data Fetching Hooks

**Depends on:** Task 3
**Complexity:** standard
**Files:**
- Create: `apps/mobile/hooks/useClips.ts`
- Create: `apps/mobile/hooks/useCategories.ts`
- Create: `apps/mobile/hooks/useClipComments.ts`
- Create: `apps/mobile/hooks/useVotes.ts`

**Purpose:** Client-side data fetching hooks that wrap Supabase queries. These mirror the queries used in the web app's server components but run client-side with useState/useEffect.

**Not In Scope:** Pagination/infinite scroll (can be added when needed), caching.

**Step 1: Create `apps/mobile/hooks/useClips.ts`**
```typescript
import { useState, useEffect } from "react";
import type { Clip, ClipVerse, Category, ClipSong } from "@bibleclips/database";
import { supabase } from "@/lib/supabase";

interface ClipQueryResult extends Clip {
  clip_verses: ClipVerse[];
  clip_categories: { categories: Category }[];
  clip_songs: ClipSong[];
}

interface UseClipsOptions {
  verse?: string;
  categorySlug?: string;
}

export function useClips(options?: UseClipsOptions) {
  const [clips, setClips] = useState<ClipQueryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClips() {
      setLoading(true);
      let query = supabase
        .from("clips")
        .select("*, clip_verses(*), clip_categories(*, categories(*)), clip_songs(*)")
        .eq("status", "APPROVED")
        .order("created_at", { ascending: false });

      if (options?.verse) {
        // Filter by verse reference (e.g., "John-3:16") using !inner join
        const [book, chapterVerse] = options.verse.split("-");
        const [chapter, verse] = (chapterVerse ?? "").split(":");
        query = supabase
          .from("clips")
          .select("*, clip_verses!inner(*), clip_categories(*, categories(*)), clip_songs(*)")
          .eq("status", "APPROVED")
          .order("created_at", { ascending: false })
          .eq("clip_verses.book", book?.replace(/-/g, " "))
          .eq("clip_verses.chapter", Number(chapter));
        if (verse) {
          query = query.eq("clip_verses.verse_start", Number(verse));
        }
      }

      if (options?.categorySlug) {
        query = supabase
          .from("clips")
          .select("*, clip_verses(*), clip_categories!inner(*, categories!inner(*)), clip_songs(*)")
          .eq("status", "APPROVED")
          .order("created_at", { ascending: false })
          .eq("clip_categories.categories.slug", options.categorySlug);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setClips((data ?? []) as ClipQueryResult[]);
      }
      setLoading(false);
    }

    fetchClips();
  }, [options?.verse, options?.categorySlug]);

  return { clips, loading, error, refetch: () => {} };
}
```

**Step 2: Create `apps/mobile/hooks/useCategories.ts`**
```typescript
import { useState, useEffect } from "react";
import type { Category } from "@bibleclips/database";
import { supabase } from "@/lib/supabase";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("categories")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        setCategories(data ?? []);
        setLoading(false);
      });
  }, []);

  return { categories, loading };
}
```

**Step 3: Create `apps/mobile/hooks/useVotes.ts`**
```typescript
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSupabase } from "./useSupabase";

export function useVotes() {
  const { user } = useSupabase();
  const [votedClipIds, setVotedClipIds] = useState<Set<string>>(new Set());

  // Load user's existing votes on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("votes")
      .select("clip_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setVotedClipIds(new Set(data.map((v) => v.clip_id)));
      });
  }, [user?.id]);

  const toggleVote = useCallback(
    async (clipId: string) => {
      if (!user) return;
      const hasVoted = votedClipIds.has(clipId);

      if (hasVoted) {
        await supabase.from("votes").delete().eq("clip_id", clipId).eq("user_id", user.id);
        setVotedClipIds((prev) => {
          const next = new Set(prev);
          next.delete(clipId);
          return next;
        });
      } else {
        await supabase.from("votes").insert({ clip_id: clipId, user_id: user.id });
        setVotedClipIds((prev) => new Set(prev).add(clipId));
      }
    },
    [user, votedClipIds]
  );

  return { votedClipIds, toggleVote };
}
```

**Step 4: Create `apps/mobile/hooks/useClipComments.ts`**
```typescript
import { useState, useEffect, useCallback } from "react";
import type { CommentWithUser } from "@bibleclips/database";
import { supabase } from "@/lib/supabase";
import { useSupabase } from "./useSupabase";

export function useClipComments(clipId: string) {
  const { user } = useSupabase();
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, user:users(id, display_name)")
      .eq("clip_id", clipId)
      .order("created_at", { ascending: false });
    setComments((data ?? []) as CommentWithUser[]);
    setLoading(false);
  }, [clipId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const addComment = useCallback(
    async (content: string) => {
      if (!user) return;
      await supabase.from("comments").insert({ clip_id: clipId, user_id: user.id, content });
      fetchComments();
    },
    [user, clipId, fetchComments]
  );

  return { comments, loading, addComment };
}
```

**Step 5: Create `apps/mobile/hooks/useSubtitles.ts`**
```typescript
import { useState, useEffect } from "react";
import type { ClipSubtitle } from "@bibleclips/database";
import { supabase } from "@/lib/supabase";

interface ClipTranslation {
  id: string;
  clip_id: string;
  language: string;
  text: string;
  start_time: number;
  end_time: number;
  sequence: number;
}

export function useSubtitles(clipId: string) {
  const [subtitles, setSubtitles] = useState<ClipSubtitle[]>([]);
  const [translations, setTranslations] = useState<ClipTranslation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("clip_subtitles").select("*").eq("clip_id", clipId).order("sequence"),
      supabase.from("clip_translations").select("*").eq("clip_id", clipId).order("sequence"),
    ]).then(([subResult, transResult]) => {
      setSubtitles(subResult.data ?? []);
      setTranslations(transResult.data ?? []);
      setLoading(false);
    });
  }, [clipId]);

  return { subtitles, translations, loading };
}
```

**Note:** The `ClipTranslation` type should be added to `packages/database/src/types.ts` as a prerequisite (matching the `clip_translations` table schema from `supabase/migrations/20260112_clip_translations.sql`).

**Step 6: Commit**
```
git commit -m "feat(mobile): add data fetching hooks for clips, categories, votes, comments, subtitles"
```

---

## Task 7: ReelViewer + ReelItem Components

**Depends on:** Task 5, Task 6
**Complexity:** complex
**Files:**
- Create: `apps/mobile/components/ReelViewer.tsx`
- Create: `apps/mobile/components/ReelItem.tsx`
- Create: `apps/mobile/components/ClipInfo.tsx`
- Modify: `apps/mobile/package.json` (add react-native-gesture-handler, react-native-reanimated)

**Purpose:** The core reel experience — a vertical FlatList with paging that shows one clip at a time. Each ReelItem contains the YouTubePlayer, clip info overlay, and placeholder for action buttons/subtitles.

**Gotchas:** `windowSize={3}` on FlatList keeps only 3 items mounted. `onViewableItemsChanged` must be memoized with `useRef` to avoid FlatList warnings. WebView inside FlatList can cause gesture conflicts — `react-native-gesture-handler` helps. **Important:** `react-native-gesture-handler` must be imported at the app entry point (`apps/mobile/app/_layout.tsx`) with `import "react-native-gesture-handler"` at the top of the file — required for Android.

**Performance Fallback:** If WebView-in-FlatList causes janky swiping or gesture conflicts on Android, switch to rendering only the active item's WebView and showing a static thumbnail (from YouTube `https://img.youtube.com/vi/{videoId}/hqdefault.jpg`) for non-active items. This matches the web app's pattern in `reel-viewer.tsx`. Test on a physical Android device — not just emulator or web.

**Step 1: Add dependencies**
```json
{
  "react-native-gesture-handler": "~2.24.0",
  "react-native-reanimated": "~3.16.0"
}
```

**Step 2: Create `apps/mobile/components/ClipInfo.tsx`**
```tsx
import { View, Text, StyleSheet } from "react-native";
import type { Clip, ClipVerse } from "@bibleclips/database";

interface ClipInfoProps {
  clip: Clip;
  verses: ClipVerse[];
}

export function ClipInfo({ clip, verses }: ClipInfoProps) {
  const verseText = verses
    .map((v) => `${v.book} ${v.chapter}:${v.verse_start}${v.verse_end ? `-${v.verse_end}` : ""}`)
    .join(", ");

  return (
    <View style={styles.container}>
      <Text style={styles.title} numberOfLines={2}>{clip.title}</Text>
      {verseText ? <Text style={styles.verse}>{verseText}</Text> : null}
      <Text style={styles.type}>{clip.clip_type}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", bottom: 80, left: 16, right: 80, zIndex: 10 },
  title: { color: "#fff", fontSize: 16, fontWeight: "600", textShadowColor: "#000", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  verse: { color: "#ddd", fontSize: 13, marginTop: 4, textShadowColor: "#000", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  type: { color: "#8B5CF6", fontSize: 12, marginTop: 4, textTransform: "capitalize" },
});
```

**Step 3: Create `apps/mobile/components/ReelItem.tsx`**
```tsx
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

  // Auto play/pause based on visibility
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
```

**Step 4: Create `apps/mobile/components/ReelViewer.tsx`**
```tsx
import { useRef, useCallback, useState } from "react";
import { FlatList, useWindowDimensions, type ViewToken } from "react-native";
import { ReelItem } from "./ReelItem";
import type { Clip, ClipVerse } from "@bibleclips/database";

type ClipWithVerse = Clip & { clip_verses: ClipVerse[] };

interface ReelViewerProps {
  clips: ClipWithVerse[];
}

export function ReelViewer({ clips }: ReelViewerProps) {
  const { height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: ClipWithVerse; index: number }) => (
      <ReelItem clip={item} isActive={index === activeIndex} />
    ),
    [activeIndex]
  );

  return (
    <FlatList
      data={clips}
      renderItem={renderItem}
      extraData={activeIndex}
      keyExtractor={(item) => item.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={height}
      decelerationRate="fast"
      windowSize={3}
      removeClippedSubviews
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
    />
  );
}
```

**Step 5: Commit**
```
git commit -m "feat(mobile): add ReelViewer with vertical swipe and YouTubePlayer integration"
```

---

## Task 8: Home Tab with Reel Viewer

**Depends on:** Task 7
**Complexity:** simple
**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

**Purpose:** Wire the Home tab to fetch approved clips and display them in the ReelViewer.

**Step 1: Update `apps/mobile/app/(tabs)/index.tsx`**
```tsx
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { ReelViewer } from "@/components/ReelViewer";
import { useClips } from "@/hooks/useClips";

export default function HomeScreen() {
  const { clips, loading, error } = useClips();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Failed to load clips</Text>
      </View>
    );
  }

  if (clips.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>No clips yet</Text>
      </View>
    );
  }

  return <ReelViewer clips={clips} />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  error: { color: "#ef4444", fontSize: 16 },
  empty: { color: "#888", fontSize: 16 },
});
```

**Step 2: Verify end-to-end**
Run: `cd apps/mobile && npx expo start --web`
Expected: Home tab loads approved clips from Supabase, displays in swipeable reel with YouTube video playing.

**Step 3: Commit**
```
git commit -m "feat(mobile): wire Home tab to ReelViewer with live Supabase data"
```

---

## Task 9: Browse Tab (Verse Search + Category Grid)

**Depends on:** Task 6
**Complexity:** standard
**Files:**
- Create: `apps/mobile/components/VerseSearch.tsx`
- Create: `apps/mobile/components/CategoryGrid.tsx`
- Modify: `apps/mobile/app/(tabs)/browse.tsx`

**Purpose:** The Browse tab lets users discover clips by searching for a Bible verse or tapping a life category. Tapping navigates to a filtered reel view.

**Step 1: Create `apps/mobile/components/VerseSearch.tsx`**
A TextInput with autocomplete for Bible book names. On submit, navigates to `/verse/[ref]`.
```tsx
import { useState } from "react";
import { View, TextInput, FlatList, Pressable, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { bibleBookNamesEn } from "@bibleclips/validation";

export function VerseSearch() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  function handleChange(text: string) {
    setQuery(text);
    if (text.length >= 2) {
      setSuggestions(bibleBookNamesEn.filter((b) => b.toLowerCase().startsWith(text.toLowerCase())).slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }

  function handleSelect(book: string) {
    setQuery(book);
    setSuggestions([]);
    // Navigate with book name; user can refine chapter:verse
    router.push(`/verse/${book.replace(/ /g, "-")}`);
  }

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} placeholder="Search by verse (e.g. John 3:16)" placeholderTextColor="#888" value={query} onChangeText={handleChange} />
      {suggestions.map((s) => (
        <Pressable key={s} onPress={() => handleSelect(s)} style={styles.suggestion}>
          <Text style={styles.suggestionText}>{s}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { backgroundColor: "#1a1a1a", color: "#fff", padding: 14, borderRadius: 8, fontSize: 16 },
  suggestion: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#222" },
  suggestionText: { color: "#fff", fontSize: 15 },
});
```

**Step 2: Create `apps/mobile/components/CategoryGrid.tsx`**
A grid of category cards fetched via `useCategories()`. Each card shows `name_en` / `name_ja` and navigates to `/category/[slug]` on press.
```tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useCategories } from "@/hooks/useCategories";

export function CategoryGrid() {
  const { categories, loading } = useCategories();
  if (loading) return null;

  return (
    <View style={styles.grid}>
      {categories.map((cat) => (
        <Pressable key={cat.id} style={styles.card} onPress={() => router.push(`/category/${cat.slug}`)}>
          <Text style={styles.nameEn}>{cat.name_en}</Text>
          <Text style={styles.nameJa}>{cat.name_ja}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 8, gap: 8 },
  card: { backgroundColor: "#1a1a1a", borderRadius: 8, padding: 16, width: "47%", alignItems: "center" },
  nameEn: { color: "#fff", fontSize: 14, fontWeight: "600" },
  nameJa: { color: "#888", fontSize: 12, marginTop: 4 },
});
```

**Step 3: Wire into `apps/mobile/app/(tabs)/browse.tsx`**
```tsx
import { ScrollView, StyleSheet } from "react-native";
import { VerseSearch } from "@/components/VerseSearch";
import { CategoryGrid } from "@/components/CategoryGrid";

export default function BrowseScreen() {
  return (
    <ScrollView style={styles.container}>
      <VerseSearch />
      <CategoryGrid />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 60 },
});
```

**Step 4: Commit**
```
git commit -m "feat(mobile): add Browse tab with verse search and category grid"
```

---

## Task 10: Filtered Reel Screens (Verse + Category)

**Depends on:** Task 6, Task 7
**Complexity:** standard
**Files:**
- Create: `apps/mobile/app/verse/[ref].tsx`
- Create: `apps/mobile/app/category/[slug].tsx`

**Purpose:** Stack screens that show a reel filtered by a specific verse reference or category. Deep-linkable via Expo Router.

**Step 1: Create `apps/mobile/app/verse/[ref].tsx`**
```tsx
import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { ReelViewer } from "@/components/ReelViewer";
import { useClips } from "@/hooks/useClips";

export default function VerseReelScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const { clips, loading } = useClips({ verse: ref });

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#8B5CF6" /></View>;
  }

  if (clips.length === 0) {
    return <View style={styles.centered}><Text style={styles.empty}>No clips for this verse</Text></View>;
  }

  return <ReelViewer clips={clips} />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  empty: { color: "#888", fontSize: 16 },
});
```

**Step 2: Create `apps/mobile/app/category/[slug].tsx`**
Same pattern, using `useClips({ categorySlug: slug })`.

**Step 3: Commit**
```
git commit -m "feat(mobile): add verse and category filtered reel screens"
```

---

## Task 11: Subtitle Overlay

**Depends on:** Task 7
**Complexity:** complex
**Files:**
- Create: `apps/mobile/components/SubtitleOverlay.tsx`
- Modify: `apps/mobile/components/ReelItem.tsx` (integrate overlay)

**Purpose:** Display dual-language subtitles synced to video playback. Words highlight based on `currentTime` from the YouTubePlayer. Uses `clip_subtitles` (word-level timing) and `clip_translations` data from Supabase.

**Gotchas:** No existing hook fetches subtitle or translation data. ReelItem must fetch `clip_subtitles` for the clip via `supabase.from("clip_subtitles").select("*").eq("clip_id", clipId).order("sequence")` and pass them to `SubtitleOverlay`. Translations (if available) come from `clip_translations` table using a similar query.

**Step 1: Create `apps/mobile/components/SubtitleOverlay.tsx`**
```tsx
import { View, Text, StyleSheet } from "react-native";
import type { ClipSubtitle } from "@bibleclips/database";

interface SubtitleOverlayProps {
  subtitles: ClipSubtitle[];
  currentTime: number;
  translation?: string;
}

export function SubtitleOverlay({ subtitles, currentTime, translation }: SubtitleOverlayProps) {
  // Find the current group of words visible at this time
  const visibleWords = subtitles.filter(
    (s) => currentTime >= s.start_time && currentTime <= s.end_time + 0.5
  );

  if (visibleWords.length === 0) return null;

  const text = visibleWords.map((w) => w.word).join(" ");

  return (
    <View style={styles.container}>
      <Text style={styles.primaryText}>{text}</Text>
      {translation ? <Text style={styles.translationText}>({translation})</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", bottom: 160, left: 16, right: 16, alignItems: "center", zIndex: 20 },
  primaryText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  translationText: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
```

**Step 2: Extract `groupIntoSentences` into shared package**
Move `groupIntoSentences` from `apps/web/components/reel/subtitle-overlay.tsx` (lines 43-93) to `packages/validation/src/subtitle.ts` (or `packages/database/src/subtitle-utils.ts`). This is pure business logic with zero DOM dependencies. Update web imports to use the shared version. Import it in `SubtitleOverlay` to group words into readable sentence chunks. This prevents maintaining 5+ copies of the same algorithm across web and mobile.

**Step 3: Integrate into ReelItem**
Update `ReelItem` to:
- Track `currentTime` via `onTimeUpdate` callback from YouTubePlayer
- Use `useSubtitles(clipId)` hook from Task 6 to fetch subtitles and translations
- Render `<SubtitleOverlay>` over the video with `groupIntoSentences` for sentence grouping and time-matched translations

**Step 4: Commit**
```
git commit -m "feat(mobile): add dual-language subtitle overlay with timing sync"
```

---

## Task 12: Action Buttons (Vote, Comment, Share)

**Depends on:** Task 6, Task 7
**Complexity:** standard
**Files:**
- Create: `apps/mobile/components/ActionButtons.tsx`
- Modify: `apps/mobile/components/ReelItem.tsx` (add action buttons)

**Purpose:** Floating action buttons on the right side of each reel item. Vote (heart), comment (navigate to clip detail), and share (native share sheet).

**Step 1: Create `apps/mobile/components/ActionButtons.tsx`**
```tsx
import { View, Pressable, Text, StyleSheet, Share } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface ActionButtonsProps {
  clipId: string;
  voteCount: number;
  hasVoted: boolean;
  onVote: () => void;
}

export function ActionButtons({ clipId, voteCount, hasVoted, onVote }: ActionButtonsProps) {
  const handleShare = () => {
    Share.share({ url: `https://bibleclips.com/clip/${clipId}` });
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={onVote}>
        <Ionicons name={hasVoted ? "heart" : "heart-outline"} size={28} color={hasVoted ? "#ef4444" : "#fff"} />
        <Text style={styles.count}>{voteCount}</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => router.push(`/clip/${clipId}`)}>
        <Ionicons name="chatbubble-outline" size={26} color="#fff" />
      </Pressable>
      <Pressable style={styles.button} onPress={handleShare}>
        <Ionicons name="share-outline" size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", right: 12, bottom: 120, alignItems: "center", gap: 20, zIndex: 10 },
  button: { alignItems: "center" },
  count: { color: "#fff", fontSize: 12, marginTop: 2 },
});
```

**Step 2: Integrate into ReelItem** — add `<ActionButtons>` and wire vote handler from `useVotes()`.

**Step 3: Commit**
```
git commit -m "feat(mobile): add vote, comment, and share action buttons on reel items"
```

---

## Task 13: Individual Clip Screen with Comments

**Depends on:** Task 12
**Complexity:** standard
**Files:**
- Create: `apps/mobile/app/clip/[id].tsx`
- Create: `apps/mobile/components/CommentSection.tsx`
- Create: `apps/mobile/components/CommentCard.tsx`

**Purpose:** Deep-linkable clip detail screen showing the video player, clip info, and a scrollable comment thread with a text input for adding new comments.

**Step 1: Create `apps/mobile/components/CommentCard.tsx`**
Renders a single comment with user display name, content, timestamp, and like button.

**Step 2: Create `apps/mobile/components/CommentSection.tsx`**
Uses `useClipComments(clipId)` to render a FlatList of CommentCard components with a TextInput at the bottom for adding comments.

**Step 3: Create `apps/mobile/app/clip/[id].tsx`**
```tsx
import { useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import type { Clip, ClipVerse } from "@bibleclips/database";
import { supabase } from "@/lib/supabase";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { ClipInfo } from "@/components/ClipInfo";
import { CommentSection } from "@/components/CommentSection";

export default function ClipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [clip, setClip] = useState<Clip & { clip_verses: ClipVerse[] } | null>(null);

  useEffect(() => {
    supabase
      .from("clips")
      .select("*, clip_verses(*)")
      .eq("id", id)
      .single()
      .then(({ data }) => setClip(data));
  }, [id]);

  if (!clip) return <ActivityIndicator size="large" color="#8B5CF6" style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container}>
      <View style={{ height: 300 }}>
        <YouTubePlayer videoId={clip.youtube_video_id} startTime={clip.start_time} endTime={clip.end_time} />
      </View>
      <ClipInfo clip={clip} verses={clip.clip_verses} />
      <CommentSection clipId={clip.id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
});
```

**Step 4: Commit**
```
git commit -m "feat(mobile): add clip detail screen with comment section"
```

---

## Task 14: Clip Submission Form

**Depends on:** Task 4, Task 6
**Complexity:** complex
**Files:**
- Create: `apps/mobile/components/ClipSubmitForm.tsx`
- Modify: `apps/mobile/app/(tabs)/submit.tsx`
- Modify: `apps/mobile/package.json` (add react-hook-form, @hookform/resolvers)

**Purpose:** Multi-step clip submission form matching the web app's functionality. Uses shared Zod schemas from `@bibleclips/validation` for form validation. Supports sermon, song, and testimony clip types.

**Not In Scope:** Subtitle generation (requires Edge Function, Task 17). Video preview player during submission.

**Gotchas:** The `clipSubmissionSchema` from `@bibleclips/validation` validates: youtubeVideoId, startTime, endTime, title, verses (1-10), categoryIds (1-5). The mobile form must collect all these fields. **Pre-requisite:** The shared `clipSubmissionSchema` in `packages/validation/src/clip.ts` must be updated before this task: (1) add a `clipType` field (`z.enum(["sermon", "song", "testimony"])`), and (2) change `startTime`/`endTime` from `.int()` to `.number()` to match the database's decimal precision.

**Step 1: Add dependencies**
```json
{
  "react-hook-form": "^7.51.0",
  "@hookform/resolvers": "^3.3.0"
}
```

**Step 2: Create `apps/mobile/components/ClipSubmitForm.tsx`**
Multi-step form using `react-hook-form` with `zodResolver(clipSubmissionSchema)`:
- Step 1: YouTube URL input → extract video ID
- Step 2: Start/end time selection
- Step 3: Title + clip type (sermon/song/testimony)
- Step 4: Verse references (add/remove)
- Step 5: Category selection (multi-select from `useCategories()`)
- Submit: Insert via Supabase client (RLS validates auth)

**Step 3: Update Submit tab**
```tsx
import { useSupabase } from "@/hooks/useSupabase";
import { Redirect } from "expo-router";
import { ClipSubmitForm } from "@/components/ClipSubmitForm";

export default function SubmitScreen() {
  const { user, isLoading } = useSupabase();
  if (isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  return <ClipSubmitForm />;
}
```

**Step 4: Commit**
```
git commit -m "feat(mobile): add multi-step clip submission form with Zod validation"
```

---

## Task 15: Profile Tab with My Clips

**Depends on:** Task 4
**Complexity:** standard
**Files:**
- Modify: `apps/mobile/app/(tabs)/profile.tsx`
- Create: `apps/mobile/components/MyClipsList.tsx`

**Purpose:** Extend the Profile tab to show the user's submitted clips with status indicators (pending/approved/rejected). Allow editing and deleting own clips.

**Pre-requisite: RLS policies for user clip management.** The current RLS policies on `clips` only allow INSERT by owner and UPDATE by ADMIN. Add new policies:
- `"Users can update own pending clips"` FOR UPDATE USING `(auth.uid() = submitted_by AND status = 'PENDING')`
- `"Users can delete own pending clips"` FOR DELETE USING `(auth.uid() = submitted_by AND status = 'PENDING')`
Create a new migration at `supabase/migrations/YYYYMMDD_user_clip_management_rls.sql`.

**Step 1: Create `apps/mobile/components/MyClipsList.tsx`**
Fetches clips where `submitted_by = user.id`. Renders a FlatList with clip title, status badge, and edit/delete actions.

**Step 2: Update Profile tab** to render `<MyClipsList />` below the user info section when authenticated.

**Step 3: Commit**
```
git commit -m "feat(mobile): add my clips list to profile tab with status badges"
```

---

## Task 16: Workspace - Video Queue [PHASE 2 - DEFERRED]

**Depends on:** Task 4, Task 8
**Complexity:** complex
**Status:** Deferred to Phase 2. The web workspace already works for contributors. Mobile workspace serves a small power-user subset and requires resolving RLS policy gaps, workspace auth gating, and the web app's use of service-role Supabase client (which mobile cannot use). Prioritize after core consumption + submission flow is validated.
**Files:**
- Create: `apps/mobile/app/(workspace)/_layout.tsx`
- Create: `apps/mobile/app/(workspace)/index.tsx`
- Create: `apps/mobile/components/workspace/VideoQueueList.tsx`
- Modify: `apps/mobile/app/_layout.tsx` (add workspace route group)

**Purpose:** The workspace video queue screen showing pending/processing/completed videos. Users can browse videos and tap to create clips from them.

**Not In Scope:** Video status management (changing pending → processing), channel filtering. These are admin-level features best kept on web.

**Gotchas:** The web app gates workspace via `requireWorkspaceAccess()` server action. The mobile app queries `work_queue_videos` directly via Supabase client. Verify that RLS policies on `work_queue_videos` restrict access to authenticated users with workspace permissions. If not, add an RLS policy or gate via an Edge Function.

**Step 1: Create workspace layout and index screen**
Stack navigator under `(workspace)/`. Index screen renders `VideoQueueList` which fetches from `work_queue_videos` table.

**Step 2: Add navigation entry point**
Add a "Workspace" button on the Profile tab (visible to authenticated users).

**Step 3: Commit**
```
git commit -m "feat(mobile): add workspace video queue screen"
```

---

## Task 17: Workspace - Clip Editing [PHASE 2 - DEFERRED]

**Depends on:** Task 5, Task 16
**Complexity:** complex
**Status:** Deferred to Phase 2 (depends on Task 16).
**Files:**
- Create: `apps/mobile/app/(workspace)/edit/[videoId].tsx`
- Create: `apps/mobile/components/workspace/ClipEditor.tsx`

**Purpose:** Clip editing interface for a specific video. Shows the YouTube player with scrubber controls to set start/end times, then submits the clip via the submission form fields.

**Gotchas:** The YouTube WebView player must support seeking via the scrubber. Use the existing `YouTubePlayerRef.seekTo()` API. Time precision is decimal (matches `clip_times_decimal` migration).

**Step 1: Create `apps/mobile/components/workspace/ClipEditor.tsx`**
- YouTube player at top with play/pause button
- Time scrubber (slider) for setting start/end times
- "Set Start" / "Set End" buttons that capture current player time
- Clip metadata form (title, verses, categories)
- Submit button

**Step 2: Create `apps/mobile/app/(workspace)/edit/[videoId].tsx`**
Route that fetches video metadata and renders `<ClipEditor>`.

**Step 3: Commit**
```
git commit -m "feat(mobile): add workspace clip editing with time scrubber"
```

---

## Task 18: Supabase Edge Functions [REDUCED SCOPE]

**Depends on:** None
**Complexity:** standard (reduced from complex)
**Files:**
- Create: `supabase/functions/youtube-metadata/index.ts`

**Purpose:** Create a Supabase Edge Function for YouTube metadata fetching (requires API key). This allows the mobile clip submission form to auto-populate video title/channel from YouTube.

**Note:** `generate-subtitles` edge function is deferred. The existing subtitle generation pipeline uses a local Go Cloud Run service + OpenAI API and the web app explicitly restricts it to dev environments. Clips submitted from mobile will have subtitles generated via the existing web admin workflow. Alternative: use YouTube's public oEmbed endpoint (`https://www.youtube.com/oembed?url=...&format=json`) client-side for basic metadata, eliminating the need for this edge function entirely.

**Gotchas:** Supabase Edge Functions run on Deno 2. Secrets are set via `supabase secrets set`. The `supabase/config.toml` already has Edge Runtime enabled.

**Step 1: Create `supabase/functions/youtube-metadata/index.ts`**
```typescript
// Deno 2 pattern (supabase/config.toml specifies deno_version = 2)
Deno.serve(async (req) => {
  const { videoId } = await req.json();
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
  );
  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**Step 2: Deploy and test**
```bash
supabase secrets set YOUTUBE_API_KEY=<key>
supabase functions deploy youtube-metadata
```

**Step 3: Commit**
```
git commit -m "feat(supabase): add youtube-metadata edge function"
```

---

## Task 19: EAS Build Configuration

**Depends on:** Task 1
**Complexity:** standard
**Files:**
- Create: `apps/mobile/eas.json`
- Modify: `apps/mobile/app.json` (add EAS project ID)

**Purpose:** Configure Expo Application Services (EAS) for building iOS and Android binaries. Set up development, preview, and production build profiles.

**Step 1: Create `apps/mobile/eas.json`**
```json
{
  "cli": {
    "version": ">= 13.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "<apple-id>",
        "ascAppId": "<app-store-connect-app-id>"
      },
      "android": {
        "serviceAccountKeyPath": "<path-to-key.json>"
      }
    }
  }
}
```

**Step 2: Initialize EAS project**
```bash
cd apps/mobile && npx eas-cli init
```

**Step 3: Configure EAS secrets for environment variables**
`.env.local` files are not uploaded to EAS Build servers. Set secrets via EAS CLI:
```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value <url>
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <key>
```

**Step 4: Test development build**
```bash
npx eas-cli build --profile development --platform ios
```
Expected: Build queued on EAS servers.

**Step 4: Commit**
```
git commit -m "feat(mobile): add EAS Build configuration for iOS and Android"
```

---

## Task 20: Deep Linking + Universal Links Configuration

**Depends on:** Task 10
**Complexity:** standard
**Files:**
- Modify: `apps/mobile/app.json` (add intentFilters for Android, associatedDomains for iOS)
- Create: `apps/mobile/app/+not-found.tsx` (404 fallback)

**Purpose:** Enable deep links (`bibleclips://clip/abc`) and universal links (`https://bibleclips.com/clip/abc`) so clips, verses, and categories can be shared and opened directly in the mobile app.

**Step 1: Update `app.json` with deep link config**
```json
{
  "ios": {
    "associatedDomains": ["applinks:bibleclips.com"]
  },
  "android": {
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": [{ "scheme": "https", "host": "bibleclips.com", "pathPrefix": "/clip" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }
    ]
  }
}
```

**Step 2: Create 404 fallback screen**
```tsx
// apps/mobile/app/+not-found.tsx
import { View, Text } from "react-native";
import { Link } from "expo-router";

export default function NotFoundScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
      <Text style={{ color: "#fff", fontSize: 18 }}>Page not found</Text>
      <Link href="/" style={{ color: "#8B5CF6", marginTop: 16 }}>Go home</Link>
    </View>
  );
}
```

**Step 3: Commit**
```
git commit -m "feat(mobile): configure deep linking and universal links"
```

---

## Verification Record

### Pass 1: Plan Verification Checklist
**Verdict:** PASS (after 4 fixes)
- Fixed `BIBLE_BOOKS` → `bibleBookNamesEn`/`bibleBookNamesJa`
- Fixed `mobile#dev` → `@bibleclips/mobile#dev` (then removed as unnecessary)
- Fixed Deno 1 `serve` import → Deno 2 `Deno.serve()` pattern
- Added `clipSubmissionSchema` pre-requisite note (missing `clipType`, `.int()` → `.number()`)

### Pass 2: Draft
**Verdict:** PASS (after 9 fixes)
- Moved play/pause side effect into `useEffect` (React correctness)
- Renamed local `ClipWithRelations` → `ClipQueryResult` (avoid shadowing shared type)
- Added `extraData={activeIndex}` to FlatList
- Removed `.env.local` from git commit command
- Removed unused `Platform` import
- Added code skeletons for `VerseSearch` and `CategoryGrid`
- Fleshed out clip detail screen from placeholder comments to working code
- Added subtitle data fetching gotcha to Task 11
- Added `useSubtitles` hook reference

### Pass 3: Feasibility
**Verdict:** PASS (after 6 fixes)
- Replaced `postMessage` with `injectJavaScript` for Android WebView compatibility
- Added SDK 54+ note (use latest stable at implementation time)
- Removed `disableHierarchicalLookup` from Metro config (conflicts with pnpm)
- Fixed Supabase query filtering to use `!inner` joins
- Added EAS secrets configuration step to Task 19
- Added subtitle sentence grouping improvement note

### Pass 4: Completeness
**Verdict:** PASS (after 6 fixes)
- Added `useSubtitles` hook to Task 6 (fetches `clip_subtitles` + `clip_translations`)
- Added `useEffect` to load existing votes in `useVotes` hook
- Added gesture-handler import requirement to Task 7 gotchas
- Added workspace RLS verification note to Task 16
- Added `pnpm install` convention note to plan header
- Added `ClipTranslation` type note as prerequisite

### Pass 5: Risk
**Verdict:** PASS (after mitigations applied)
- Added WebView-in-FlatList performance fallback strategy (thumbnail placeholders)
- Added runtime env var validation (throws on missing Supabase URL/key)
- Added RLS policies pre-requisite to Task 15 (user clip edit/delete)
- Added platform-specific YouTube player gotchas (Expo web, iOS autoplay)

### Pass 6: Optimality
**Verdict:** PASS (after optimizations applied)
- Removed unused `useYouTubePlayer` hook (YAGNI)
- Fixed Task 10 dependencies (Task 6+7 instead of Task 8+9) for better parallelism
- Deferred Tasks 16+17 (Workspace) to Phase 2
- Reduced Task 18 scope (removed `generate-subtitles`, kept `youtube-metadata` only)
- Removed redundant turbo.json package-scoped overrides
- Extracted `groupIntoSentences` to shared package instead of porting
- Clarified `useSubtitles` hook usage in ReelItem

### Summary
All 6 verification passes completed. Plan revised from 20 tasks to 18 active tasks (2 deferred to Phase 2). Critical path shortened. Key risks mitigated with fallback strategies documented.
