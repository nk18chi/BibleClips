# Mobile App Design (React Native + Expo)

**Date**: 2026-03-07
**Status**: Approved

## Motivation

The reel-swiping experience is the core UX of BibleClips. A native mobile app provides smoother gesture handling, better video playback performance, and a more natural feel than the browser-based responsive web app.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | React Native + Expo (managed) | Cross-platform with Expo's managed workflow for faster iteration |
| Platforms | iOS + Android + Web (Expo web) | Full coverage; Expo web serves as a separate "app experience" for logged-in users |
| Web strategy | Separate from Next.js | Keep Next.js for public-facing web (SEO, admin). Expo web is a logged-in app experience |
| Monorepo | Add `apps/mobile/` to existing Turborepo | Maximum code reuse with shared packages |
| Video player | YouTube IFrame via WebView | Simpler, ToS-compliant, same approach as web app |
| Routing | Expo Router v4 (file-based) | Mirrors Next.js App Router patterns |
| MVP scope | Full feature parity | Reel viewer, browse, submit, workspace |

## Project Structure

```
bibleclips/
├── apps/
│   ├── web/                    # Existing Next.js app (unchanged)
│   └── mobile/                 # New Expo app
│       ├── app/                # Expo Router file-based routes
│       │   ├── (tabs)/         # Tab navigator
│       │   │   ├── _layout.tsx # Tab bar config
│       │   │   ├── index.tsx   # Home: reel viewer
│       │   │   ├── browse.tsx  # Verse search + category grid
│       │   │   ├── submit.tsx  # Clip submission
│       │   │   └── profile.tsx # User profile / auth
│       │   ├── (auth)/         # Login/register screens
│       │   │   ├── login.tsx
│       │   │   └── register.tsx
│       │   ├── (workspace)/    # Workspace stack group
│       │   │   ├── index.tsx   # Video queue list
│       │   │   └── edit/[videoId].tsx
│       │   ├── clip/[id].tsx   # Individual clip (deep link target)
│       │   ├── verse/[ref].tsx # Verse-filtered reel
│       │   ├── category/[slug].tsx # Category-filtered reel
│       │   └── _layout.tsx     # Root layout
│       ├── components/         # Mobile-specific components
│       │   ├── ReelViewer.tsx
│       │   ├── ReelItem.tsx
│       │   ├── YouTubePlayer.tsx
│       │   ├── SubtitleOverlay.tsx
│       │   ├── ClipInfo.tsx
│       │   └── ActionButtons.tsx
│       ├── hooks/              # Mobile-specific hooks
│       │   ├── useClips.ts
│       │   ├── useSupabase.ts
│       │   └── useYouTubePlayer.ts
│       ├── lib/                # Supabase client init, utils
│       │   └── supabase.ts
│       ├── app.json            # Expo config
│       ├── metro.config.js     # Metro bundler (workspace resolution)
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── database/               # Shared: Supabase types, queries (reused)
│   ├── validation/             # Shared: Zod schemas (reused)
│   └── config/                 # Shared: TypeScript config (reused)
```

### Metro Bundler Configuration

`metro.config.js` must resolve workspace packages:

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
```

### Turborepo Integration

Add to `turbo.json`:

```json
{
  "mobile#dev": { "dependsOn": ["^build"], "persistent": true },
  "mobile#build": { "dependsOn": ["^build"] }
}
```

## Navigation & Screens

### Bottom Tab Navigator (4 tabs)

| Tab | Icon | Screen | Description |
|-----|------|--------|-------------|
| Home | Play | Reel viewer | Full-screen swipeable clips |
| Browse | Search | Verse/category | Verse search + category cards |
| Submit | Plus | Submission form | Multi-step clip submission |
| Profile | User | Auth/profile | Login or user profile + my clips |

### Stack Screens (pushed on top of tabs)

| Route | Description |
|-------|-------------|
| `clip/[id]` | Deep link to specific clip |
| `verse/[ref]` | Reel filtered by verse reference |
| `category/[slug]` | Reel filtered by category |
| `(workspace)/index` | Video queue list |
| `(workspace)/edit/[videoId]` | Clip editing for a video |

### Deep Linking

Expo Router provides built-in deep link support:
- App scheme: `bibleclips://clip/abc123`
- Universal links: `https://bibleclips.com/clip/abc123`

## Reel Viewer (Core UX)

### Component Hierarchy

```
ReelViewer
├── FlatList (vertical, pagingEnabled, snapToInterval=screenHeight)
│   └── ReelItem (for each clip)
│       ├── YouTubePlayer (WebView with IFrame API)
│       ├── SubtitleOverlay (dual-language captions)
│       ├── ClipInfo (title, verse ref, pastor name)
│       └── ActionButtons (vote, comment, share)
```

### YouTube in WebView

Each `ReelItem` contains a `react-native-webview` rendering a minimal HTML page that loads the YouTube IFrame API.

**Communication protocol (postMessage/onMessage)**:
- **RN -> WebView**: `player.seekTo(startTime)`, `player.playVideo()`, `player.pauseVideo()`
- **WebView -> RN**: `onStateChange` (playing/paused/ended), `currentTime` updates for subtitle sync

### Performance

- Mount only 3 WebViews at a time (current + 1 above + 1 below) via `windowSize={3}`
- Unmount clips outside the window to free memory
- Preload next clip's WebView while current plays
- Use `removeClippedSubviews` on FlatList

### Subtitle Overlay

- React Native `Animated.View` positioned over the WebView
- Timing synced via `currentTime` messages from WebView
- Dual-language format: primary language on top, translation below
- Example: `"God loves you"` / `(神はあなたを愛しています)`

### Swipe Behavior

- `onViewableItemsChanged` detects current clip
- Previous clip pauses, new clip auto-plays from its `start_time`
- Vertical `FlatList` with `pagingEnabled` for snap-to-screen behavior

## Data Layer & Auth

### Supabase Client (Mobile)

```typescript
// apps/mobile/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database } from "@bibleclips/database";

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

- Same Supabase project as web app
- Session persisted in AsyncStorage (not cookies)
- Shared `Database` types from `packages/database`

### Auth Flow

- Email/password login (same as web)
- Google OAuth via `expo-auth-session` + `expo-web-browser` with deep link callback
- Shared `users` table — same user profile across web and mobile

### Data Fetching

- All client-side (no SSR in mobile)
- Shared query functions from `packages/database`
- Simple `useEffect` + `useState` hooks (no TanStack Query initially)

### Shared Query Pattern

```typescript
// packages/database/src/queries/clips.ts
export async function getApprovedClips(
  supabase: SupabaseClient,
  options?: { verse?: string; category?: string }
) {
  let query = supabase
    .from("clips")
    .select("*, clip_verses(*), clip_categories(*, categories(*))")
    .eq("status", "APPROVED");

  if (options?.verse) { /* filter by verse */ }
  if (options?.category) { /* filter by category */ }

  return query.order("created_at", { ascending: false });
}
```

Both the web app (server components) and mobile app (client hooks) can use the same query functions.

## Server Actions Migration

### Problem

The web app uses Next.js `"use server"` actions for operations requiring secrets (Whisper API, OpenAI, YouTube Data API). The mobile app cannot call these.

### Solution: Supabase Edge Functions

| Current Server Action | Migration Target |
|----------------------|-----------------|
| Clip submission (DB insert) | Direct Supabase client (RLS handles auth) |
| Vote / comment | Direct Supabase client (RLS handles auth) |
| Fetch video metadata | Edge Function: `/functions/v1/youtube-metadata` |
| Generate subtitles | Edge Function: `/functions/v1/generate-subtitles` |
| Admin approval/rejection | Edge Function: `/functions/v1/admin-actions` |

Edge Functions live in `supabase/functions/` and are deployed via `supabase functions deploy`. The web app can also switch to calling these, unifying the backend.

## Dependencies

| Purpose | Library |
|---------|---------|
| Framework | `expo` (~52) |
| Routing | `expo-router` v4 |
| YouTube embed | `react-native-webview` |
| Session storage | `@react-native-async-storage/async-storage` |
| OAuth | `expo-auth-session` + `expo-web-browser` |
| Gestures | `react-native-gesture-handler` |
| Animations | `react-native-reanimated` |
| Icons | `@expo/vector-icons` |
| Forms | `react-hook-form` + `@hookform/resolvers` |
| Deep links | `expo-linking` |
| Env vars | `expo-constants` |
| Supabase | `@supabase/supabase-js` (from shared package) |
| Validation | `zod` (from shared package) |

### Explicitly Not Needed (YAGNI)

- No Redux/Zustand — Supabase client + React state is sufficient
- No TanStack Query — add later only if caching becomes a problem
- No native video player — YouTube IFrame via WebView
- No i18n library — bilingual approach is content-level (subtitles), not UI-level

## Build & Distribution

- **EAS Build**: Expo Application Services for iOS/Android binaries
- **Development builds**: Free tier, installed on test devices via QR code
- **Production builds**: EAS paid plan (~$15/mo) for faster build queues
- **App Store**: EAS Submit for automated App Store / Google Play submissions
- **Expo web**: Deployed separately (e.g., to Vercel) as a web build

## Implementation Phases

| Phase | Scope | Details |
|-------|-------|---------|
| 1 | Foundation | Expo setup, monorepo config, Metro bundler, Supabase client, auth screens |
| 2 | Reel viewer | FlatList + WebView YouTube player, swipe behavior, auto-play |
| 3 | Browse | Verse search, category grid, filtered reel navigation |
| 4 | Subtitles | Dual-language subtitle overlay with timing sync |
| 5 | Engagement | Voting + comments on clips |
| 6 | Submission | Multi-step clip submission form (sermon/song/testimony) |
| 7 | Workspace | Video queue management + clip editing interface |
| 8 | Backend | Supabase Edge Functions for server action migration |
| 9 | Distribution | EAS Build, App Store submission, Expo web deployment |

Phases 1-2 produce a working prototype to validate the reel UX on a real device.
