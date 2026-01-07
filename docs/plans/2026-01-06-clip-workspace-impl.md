# Clip Workspace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an admin curator workspace for creating Bible verse clips from YouTube sermon videos.

**Architecture:** Split-screen UI with video queue (left) and player/form (right). Videos fetched from curated YouTube channels stored in work queue. Server actions handle CRUD operations.

**Tech Stack:** Next.js 14, Supabase, YouTube Data API v3, TypeScript, Tailwind CSS

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260106_work_queue.sql`

**Step 1: Create migration file**

```sql
-- YouTube channels to fetch videos from
CREATE TABLE youtube_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_handle TEXT UNIQUE NOT NULL,
  channel_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Videos in the work queue
CREATE TABLE work_queue_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_video_id TEXT UNIQUE NOT NULL,
  channel_id UUID NOT NULL REFERENCES youtube_channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  assigned_to UUID REFERENCES users(id),
  clips_created INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_work_queue_status ON work_queue_videos(status);
CREATE INDEX idx_work_queue_like_count ON work_queue_videos(like_count DESC);
CREATE INDEX idx_work_queue_channel ON work_queue_videos(channel_id);

-- Updated_at trigger
CREATE TRIGGER work_queue_videos_updated_at
  BEFORE UPDATE ON work_queue_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed channels
INSERT INTO youtube_channels (channel_handle, channel_name) VALUES
  ('@saddlebackchurch', 'Saddleback Church'),
  ('@DailyHopeRickWarren', 'Daily Hope with Rick Warren'),
  ('@PAZChurch', 'PAZ Church'),
  ('@CoastalChurchVancouver', 'Coastal Church Vancouver'),
  ('@life.church', 'Life.Church'),
  ('@lifehousetokyo', 'Lifehouse Tokyo'),
  ('@PassionCityChurch', 'Passion City Church'),
  ('@ThePorch', 'The Porch');

-- RLS policies
ALTER TABLE youtube_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_queue_videos ENABLE ROW LEVEL SECURITY;

-- Anyone can read channels
CREATE POLICY "Channels are viewable by everyone"
  ON youtube_channels FOR SELECT USING (true);

-- Anyone can read work queue
CREATE POLICY "Work queue is viewable by everyone"
  ON work_queue_videos FOR SELECT USING (true);

-- Authenticated users can insert/update work queue
CREATE POLICY "Authenticated users can insert work queue"
  ON work_queue_videos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update work queue"
  ON work_queue_videos FOR UPDATE
  USING (auth.role() = 'authenticated');
```

**Step 2: Apply migration to Supabase**

Run in Supabase SQL editor or via CLI:
```bash
# If using Supabase CLI:
supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260106_work_queue.sql
git commit -m "feat(db): add work queue tables for clip workspace"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `apps/web/types/workspace.ts`

**Step 1: Create type definitions**

```typescript
export type YouTubeChannel = {
  id: string;
  channel_handle: string;
  channel_name: string;
  is_active: boolean;
  created_at: string;
};

export type WorkQueueVideo = {
  id: string;
  youtube_video_id: string;
  channel_id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number;
  like_count: number;
  duration_seconds: number | null;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assigned_to: string | null;
  clips_created: number;
  created_at: string;
  updated_at: string;
  // Joined data
  channel?: YouTubeChannel;
};

export type ClipWithVerse = {
  id: string;
  youtube_video_id: string;
  start_time: number;
  end_time: number;
  title: string;
  status: string;
  created_at: string;
  clip_verses: {
    book: string;
    book_ja: string;
    chapter: number;
    verse_start: number;
    verse_end: number | null;
  }[];
};

export type SaveClipInput = {
  youtubeVideoId: string;
  startTime: number;
  endTime: number;
  title: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  categoryIds: string[];
};
```

**Step 2: Commit**

```bash
git add apps/web/types/workspace.ts
git commit -m "feat: add workspace TypeScript types"
```

---

## Task 3: YouTube API Utility

**Files:**
- Create: `apps/web/lib/youtube-api.ts`

**Step 1: Create YouTube API helper**

```typescript
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

type YouTubeSearchResult = {
  id: { videoId: string };
  snippet: {
    title: string;
    publishedAt: string;
    thumbnails: { medium: { url: string } };
  };
};

type YouTubeVideoStats = {
  id: string;
  statistics: {
    viewCount: string;
    likeCount: string;
  };
  contentDetails: {
    duration: string;
  };
};

// Parse ISO 8601 duration (PT1H2M3S) to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

// Get channel ID from handle (e.g., @saddlebackchurch)
export async function getChannelId(handle: string): Promise<string | null> {
  const cleanHandle = handle.replace('@', '');
  const url = `${YOUTUBE_API_BASE}/channels?forHandle=${cleanHandle}&part=id&key=${YOUTUBE_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return data.items?.[0]?.id || null;
}

// Fetch popular videos from a channel
export async function fetchChannelVideos(
  channelId: string,
  maxResults = 50
): Promise<{
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
}[]> {
  const url = `${YOUTUBE_API_BASE}/search?channelId=${channelId}&order=viewCount&type=video&part=snippet&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return (data.items || []).map((item: YouTubeSearchResult) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails.medium.url,
    publishedAt: item.snippet.publishedAt,
  }));
}

// Get video statistics (views, likes, duration)
export async function getVideoStats(
  videoIds: string[]
): Promise<Map<string, { viewCount: number; likeCount: number; durationSeconds: number }>> {
  const stats = new Map();

  // YouTube API allows max 50 IDs per request
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = `${YOUTUBE_API_BASE}/videos?id=${batch.join(',')}&part=statistics,contentDetails&key=${YOUTUBE_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    for (const item of data.items || []) {
      const v = item as YouTubeVideoStats;
      stats.set(v.id, {
        viewCount: parseInt(v.statistics.viewCount || '0'),
        likeCount: parseInt(v.statistics.likeCount || '0'),
        durationSeconds: parseDuration(v.contentDetails.duration),
      });
    }
  }

  return stats;
}
```

**Step 2: Update .env.example**

Add to `apps/web/.env.example`:
```
YOUTUBE_API_KEY=your_youtube_data_api_v3_key
```

**Step 3: Commit**

```bash
git add apps/web/lib/youtube-api.ts apps/web/.env.example
git commit -m "feat: add YouTube Data API utility"
```

---

## Task 4: Server Actions

**Files:**
- Create: `apps/web/app/workspace/actions.ts`

**Step 1: Create server actions**

```typescript
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { WorkQueueVideo, ClipWithVerse, SaveClipInput } from '@/types/workspace';

const BOOK_JA_MAP: Record<string, string> = {
  'Genesis': '創世記', 'Exodus': '出エジプト記', 'Leviticus': 'レビ記',
  'Numbers': '民数記', 'Deuteronomy': '申命記', 'Joshua': 'ヨシュア記',
  'Judges': '士師記', 'Ruth': 'ルツ記', '1 Samuel': 'サムエル記上',
  '2 Samuel': 'サムエル記下', '1 Kings': '列王記上', '2 Kings': '列王記下',
  '1 Chronicles': '歴代誌上', '2 Chronicles': '歴代誌下', 'Ezra': 'エズラ記',
  'Nehemiah': 'ネヘミヤ記', 'Esther': 'エステル記', 'Job': 'ヨブ記',
  'Psalms': '詩篇', 'Proverbs': '箴言', 'Ecclesiastes': '伝道者の書',
  'Song of Solomon': '雅歌', 'Isaiah': 'イザヤ書', 'Jeremiah': 'エレミヤ書',
  'Lamentations': '哀歌', 'Ezekiel': 'エゼキエル書', 'Daniel': 'ダニエル書',
  'Hosea': 'ホセア書', 'Joel': 'ヨエル書', 'Amos': 'アモス書',
  'Obadiah': 'オバデヤ書', 'Jonah': 'ヨナ書', 'Micah': 'ミカ書',
  'Nahum': 'ナホム書', 'Habakkuk': 'ハバクク書', 'Zephaniah': 'ゼパニヤ書',
  'Haggai': 'ハガイ書', 'Zechariah': 'ゼカリヤ書', 'Malachi': 'マラキ書',
  'Matthew': 'マタイ', 'Mark': 'マルコ', 'Luke': 'ルカ', 'John': 'ヨハネ',
  'Acts': '使徒', 'Romans': 'ローマ', '1 Corinthians': 'コリント第一',
  '2 Corinthians': 'コリント第二', 'Galatians': 'ガラテヤ', 'Ephesians': 'エペソ',
  'Philippians': 'ピリピ', 'Colossians': 'コロサイ', '1 Thessalonians': 'テサロニケ第一',
  '2 Thessalonians': 'テサロニケ第二', '1 Timothy': 'テモテ第一', '2 Timothy': 'テモテ第二',
  'Titus': 'テトス', 'Philemon': 'ピレモン', 'Hebrews': 'ヘブル', 'James': 'ヤコブ',
  '1 Peter': 'ペテロ第一', '2 Peter': 'ペテロ第二', '1 John': 'ヨハネ第一',
  '2 John': 'ヨハネ第二', '3 John': 'ヨハネ第三', 'Jude': 'ユダ', 'Revelation': '黙示録',
};

export async function getQueueVideos(channelId?: string): Promise<WorkQueueVideo[]> {
  const supabase = createServerClient();

  let query = supabase
    .from('work_queue_videos')
    .select('*, channel:youtube_channels(*)')
    .eq('status', 'pending')
    .order('like_count', { ascending: false });

  if (channelId) {
    query = query.eq('channel_id', channelId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getChannels() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('youtube_channels')
    .select('*')
    .eq('is_active', true)
    .order('channel_name');

  if (error) throw error;
  return data || [];
}

export async function getVideoClips(youtubeVideoId: string): Promise<ClipWithVerse[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('clips')
    .select(`
      id,
      youtube_video_id,
      start_time,
      end_time,
      title,
      status,
      created_at,
      clip_verses (
        book,
        book_ja,
        chapter,
        verse_start,
        verse_end
      )
    `)
    .eq('youtube_video_id', youtubeVideoId)
    .order('start_time');

  if (error) throw error;
  return data || [];
}

export async function saveClip(input: SaveClipInput): Promise<{ clipId: string }> {
  const supabase = createServerClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Insert clip
  const { data: clip, error: clipError } = await supabase
    .from('clips')
    .insert({
      youtube_video_id: input.youtubeVideoId,
      start_time: input.startTime,
      end_time: input.endTime,
      title: input.title,
      submitted_by: user.id,
      status: 'APPROVED', // Auto-approve for workspace
    })
    .select()
    .single();

  if (clipError) throw clipError;

  // Insert verse
  const { error: verseError } = await supabase
    .from('clip_verses')
    .insert({
      clip_id: clip.id,
      book: input.book,
      book_ja: BOOK_JA_MAP[input.book] || input.book,
      chapter: input.chapter,
      verse_start: input.verseStart,
      verse_end: input.verseEnd || null,
    });

  if (verseError) throw verseError;

  // Insert categories
  if (input.categoryIds.length > 0) {
    const { error: catError } = await supabase
      .from('clip_categories')
      .insert(input.categoryIds.map(catId => ({
        clip_id: clip.id,
        category_id: catId,
      })));

    if (catError) throw catError;
  }

  // Increment clips_created on work queue video
  await supabase.rpc('increment_clips_created', { video_id: input.youtubeVideoId });

  revalidatePath('/workspace');
  return { clipId: clip.id };
}

export async function deleteClip(clipId: string): Promise<void> {
  const supabase = createServerClient();

  // Get clip to find youtube_video_id
  const { data: clip } = await supabase
    .from('clips')
    .select('youtube_video_id')
    .eq('id', clipId)
    .single();

  // Delete clip (cascades to verses, categories)
  const { error } = await supabase
    .from('clips')
    .delete()
    .eq('id', clipId);

  if (error) throw error;

  // Decrement clips_created
  if (clip) {
    await supabase.rpc('decrement_clips_created', { video_id: clip.youtube_video_id });
  }

  revalidatePath('/workspace');
}

export async function updateVideoStatus(
  youtubeVideoId: string,
  status: 'completed' | 'skipped'
): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('work_queue_videos')
    .update({ status })
    .eq('youtube_video_id', youtubeVideoId);

  if (error) throw error;

  revalidatePath('/workspace');
}
```

**Step 2: Add database functions for increment/decrement**

Add to migration file `supabase/migrations/20260106_work_queue.sql`:

```sql
-- Function to increment clips_created
CREATE OR REPLACE FUNCTION increment_clips_created(video_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE work_queue_videos
  SET clips_created = clips_created + 1
  WHERE youtube_video_id = video_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement clips_created
CREATE OR REPLACE FUNCTION decrement_clips_created(video_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE work_queue_videos
  SET clips_created = GREATEST(clips_created - 1, 0)
  WHERE youtube_video_id = video_id;
END;
$$ LANGUAGE plpgsql;
```

**Step 3: Commit**

```bash
git add apps/web/app/workspace/actions.ts supabase/migrations/20260106_work_queue.sql
git commit -m "feat: add workspace server actions"
```

---

## Task 5: Video Queue Component

**Files:**
- Create: `apps/web/components/workspace/video-queue.tsx`

**Step 1: Create video queue component**

```typescript
'use client';

import { useState } from 'react';
import type { WorkQueueVideo, YouTubeChannel } from '@/types/workspace';

type VideoQueueProps = {
  videos: WorkQueueVideo[];
  channels: YouTubeChannel[];
  selectedVideoId: string | null;
  onSelectVideo: (video: WorkQueueVideo) => void;
  onFilterChange: (channelId: string | null) => void;
};

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function VideoQueue({
  videos,
  channels,
  selectedVideoId,
  onSelectVideo,
  onFilterChange,
}: VideoQueueProps) {
  const [filterChannelId, setFilterChannelId] = useState<string | null>(null);

  const handleFilterChange = (channelId: string) => {
    const newValue = channelId === '' ? null : channelId;
    setFilterChannelId(newValue);
    onFilterChange(newValue);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel Filter */}
      <div className="p-3 border-b">
        <select
          value={filterChannelId || ''}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Channels</option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.channel_name}
            </option>
          ))}
        </select>
      </div>

      {/* Video List */}
      <div className="flex-1 overflow-y-auto">
        {videos.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No videos in queue
          </div>
        ) : (
          videos.map((video) => (
            <button
              key={video.id}
              onClick={() => onSelectVideo(video)}
              className={`w-full p-3 border-b hover:bg-gray-50 text-left transition-colors ${
                selectedVideoId === video.youtube_video_id
                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                  : ''
              }`}
            >
              <div className="flex gap-3">
                {video.thumbnail_url && (
                  <img
                    src={video.thumbnail_url}
                    alt=""
                    className="w-24 h-14 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {video.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>👍 {formatNumber(video.like_count)}</span>
                    <span>👁 {formatNumber(video.view_count)}</span>
                    {video.clips_created > 0 && (
                      <span className="text-green-600">
                        ✓ {video.clips_created} clips
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/workspace/video-queue.tsx
git commit -m "feat: add video queue component"
```

---

## Task 6: Workspace Player Component

**Files:**
- Create: `apps/web/components/workspace/workspace-player.tsx`

**Step 1: Create player component with time controls**

```typescript
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type WorkspacePlayerProps = {
  videoId: string;
  onTimeCapture: (type: 'start' | 'end', time: number) => void;
};

interface YTPlayer {
  destroy: () => void;
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
}

declare global {
  interface Window {
    YT: {
      Player: new (element: HTMLElement, options: object) => YTPlayer;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function WorkspacePlayer({ videoId, onTimeCapture }: WorkspacePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
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
      });
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
      onTimeCapture('start', Math.floor(playerRef.current.getCurrentTime()));
    }
  }, [onTimeCapture]);

  const handleSetEnd = useCallback(() => {
    if (playerRef.current) {
      onTimeCapture('end', Math.floor(playerRef.current.getCurrentTime()));
    }
  }, [onTimeCapture]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSetStart();
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        handleSetEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSetStart, handleSetEnd]);

  return (
    <div className="space-y-3">
      {/* Player */}
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Time controls */}
      <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3">
        <div className="text-lg font-mono">
          {formatTime(currentTime)}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSetStart}
            disabled={!isReady}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            Set Start (S)
          </button>
          <button
            onClick={handleSetEnd}
            disabled={!isReady}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          >
            Set End (E)
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/workspace/workspace-player.tsx
git commit -m "feat: add workspace player with time controls"
```

---

## Task 7: Clip Form Component

**Files:**
- Create: `apps/web/components/workspace/clip-form.tsx`

**Step 1: Create clip form**

```typescript
'use client';

import { useState } from 'react';
import { saveClip } from '@/app/workspace/actions';

const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
  '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation',
];

const CATEGORIES = [
  { id: 'love', name: 'Love' },
  { id: 'anxiety', name: 'Anxiety' },
  { id: 'anger', name: 'Anger' },
  { id: 'hope', name: 'Hope' },
  { id: 'depression', name: 'Depression' },
  { id: 'peace', name: 'Peace' },
  { id: 'fear', name: 'Fear' },
  { id: 'stress', name: 'Stress' },
];

type ClipFormProps = {
  youtubeVideoId: string;
  startTime: number;
  endTime: number;
  onSaved: () => void;
  categories: { id: string; slug: string; name_en: string }[];
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ClipForm({
  youtubeVideoId,
  startTime,
  endTime,
  onSaved,
  categories,
}: ClipFormProps) {
  const [title, setTitle] = useState('');
  const [book, setBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseStart, setVerseStart] = useState('');
  const [verseEnd, setVerseEnd] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategoryToggle = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (endTime <= startTime) {
      setError('End time must be after start time');
      return;
    }

    if (!book || !chapter || !verseStart) {
      setError('Please fill in the verse reference');
      return;
    }

    setSaving(true);

    try {
      await saveClip({
        youtubeVideoId,
        startTime,
        endTime,
        title: title || `${book} ${chapter}:${verseStart}`,
        book,
        chapter: parseInt(chapter),
        verseStart: parseInt(verseStart),
        verseEnd: verseEnd ? parseInt(verseEnd) : undefined,
        categoryIds: selectedCategories,
      });

      // Reset form
      setTitle('');
      setBook('');
      setChapter('');
      setVerseStart('');
      setVerseEnd('');
      setSelectedCategories([]);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save clip');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold text-gray-900">Create Clip</h3>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>
      )}

      {/* Time display */}
      <div className="flex gap-4 text-sm">
        <div>
          <span className="text-gray-500">Start:</span>{' '}
          <span className="font-mono font-medium">{formatTime(startTime)}</span>
        </div>
        <div>
          <span className="text-gray-500">End:</span>{' '}
          <span className="font-mono font-medium">{formatTime(endTime)}</span>
        </div>
        <div>
          <span className="text-gray-500">Duration:</span>{' '}
          <span className="font-mono font-medium">{formatTime(endTime - startTime)}</span>
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Clip title (optional)"
        className="w-full px-3 py-2 border rounded-lg text-sm"
      />

      {/* Verse reference */}
      <div className="grid grid-cols-4 gap-2">
        <select
          value={book}
          onChange={(e) => setBook(e.target.value)}
          className="col-span-2 px-3 py-2 border rounded-lg text-sm"
          required
        >
          <option value="">Select book</option>
          {BIBLE_BOOKS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <input
          type="number"
          value={chapter}
          onChange={(e) => setChapter(e.target.value)}
          placeholder="Ch"
          min="1"
          className="px-3 py-2 border rounded-lg text-sm"
          required
        />
        <div className="flex gap-1 items-center">
          <input
            type="number"
            value={verseStart}
            onChange={(e) => setVerseStart(e.target.value)}
            placeholder="V"
            min="1"
            className="w-full px-2 py-2 border rounded-lg text-sm"
            required
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            value={verseEnd}
            onChange={(e) => setVerseEnd(e.target.value)}
            placeholder="V"
            min="1"
            className="w-full px-2 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <p className="text-sm text-gray-600 mb-2">Categories:</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryToggle(cat.id)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                selectedCategories.includes(cat.id)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {cat.name_en}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving || startTime === 0 || endTime === 0}
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {saving ? 'Saving...' : 'Save Clip'}
      </button>
    </form>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/workspace/clip-form.tsx
git commit -m "feat: add clip form component"
```

---

## Task 8: Clip History Component

**Files:**
- Create: `apps/web/components/workspace/clip-history.tsx`

**Step 1: Create clip history with delete**

```typescript
'use client';

import { useState } from 'react';
import { deleteClip } from '@/app/workspace/actions';
import type { ClipWithVerse } from '@/types/workspace';

type ClipHistoryProps = {
  clips: ClipWithVerse[];
  onDeleted: () => void;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ClipHistory({ clips, onDeleted }: ClipHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = async (clipId: string) => {
    setDeletingId(clipId);
    try {
      await deleteClip(clipId);
      onDeleted();
    } catch (err) {
      console.error('Failed to delete clip:', err);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  if (clips.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Clips from this video</h3>
        <p className="text-sm text-gray-500">No clips created yet</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold text-gray-900 mb-3">
        Clips from this video ({clips.length})
      </h3>
      <div className="space-y-2">
        {clips.map((clip) => {
          const verse = clip.clip_verses[0];
          const verseRef = verse
            ? `${verse.book} ${verse.chapter}:${verse.verse_start}${verse.verse_end ? `-${verse.verse_end}` : ''}`
            : clip.title;

          return (
            <div
              key={clip.id}
              className="flex items-center justify-between bg-white p-2 rounded border"
            >
              <div className="text-sm">
                <span className="font-medium">{verseRef}</span>
                <span className="text-gray-500 ml-2">
                  ({formatTime(clip.start_time)} - {formatTime(clip.end_time)})
                </span>
              </div>

              {confirmId === clip.id ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDelete(clip.id)}
                    disabled={deletingId === clip.id}
                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingId === clip.id ? '...' : 'Yes'}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(clip.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete clip"
                >
                  🗑
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/workspace/clip-history.tsx
git commit -m "feat: add clip history component with delete"
```

---

## Task 9: Main Workspace Page

**Files:**
- Create: `apps/web/app/workspace/page.tsx`

**Step 1: Create workspace page**

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/ui/header';
import { VideoQueue } from '@/components/workspace/video-queue';
import { WorkspacePlayer } from '@/components/workspace/workspace-player';
import { ClipForm } from '@/components/workspace/clip-form';
import { ClipHistory } from '@/components/workspace/clip-history';
import {
  getQueueVideos,
  getChannels,
  getVideoClips,
  updateVideoStatus,
} from './actions';
import type { WorkQueueVideo, YouTubeChannel, ClipWithVerse } from '@/types/workspace';

export default function WorkspacePage() {
  const [videos, setVideos] = useState<WorkQueueVideo[]>([]);
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [categories, setCategories] = useState<{ id: string; slug: string; name_en: string }[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<WorkQueueVideo | null>(null);
  const [videoClips, setVideoClips] = useState<ClipWithVerse[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterChannelId, setFilterChannelId] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [videosData, channelsData] = await Promise.all([
          getQueueVideos(),
          getChannels(),
        ]);
        setVideos(videosData);
        setChannels(channelsData);

        // Load categories from API
        const res = await fetch('/api/categories');
        const cats = await res.json();
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Load clips when video selected
  useEffect(() => {
    if (selectedVideo) {
      getVideoClips(selectedVideo.youtube_video_id).then(setVideoClips);
      setStartTime(0);
      setEndTime(0);
    }
  }, [selectedVideo]);

  const handleFilterChange = async (channelId: string | null) => {
    setFilterChannelId(channelId);
    const videosData = await getQueueVideos(channelId || undefined);
    setVideos(videosData);
  };

  const handleTimeCapture = useCallback((type: 'start' | 'end', time: number) => {
    if (type === 'start') {
      setStartTime(time);
    } else {
      setEndTime(time);
    }
  }, []);

  const handleClipSaved = async () => {
    if (selectedVideo) {
      const clips = await getVideoClips(selectedVideo.youtube_video_id);
      setVideoClips(clips);
      // Refresh video list to update clips_created count
      const videosData = await getQueueVideos(filterChannelId || undefined);
      setVideos(videosData);
    }
  };

  const handleVideoStatus = async (status: 'completed' | 'skipped') => {
    if (!selectedVideo) return;

    await updateVideoStatus(selectedVideo.youtube_video_id, status);
    setSelectedVideo(null);
    setVideoClips([]);

    // Refresh video list
    const videosData = await getQueueVideos(filterChannelId || undefined);
    setVideos(videosData);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-gray-500">Loading workspace...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel - Video Queue */}
        <div className="w-80 bg-white border-r flex-shrink-0">
          <VideoQueue
            videos={videos}
            channels={channels}
            selectedVideoId={selectedVideo?.youtube_video_id || null}
            onSelectVideo={setSelectedVideo}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Right Panel - Player & Form */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedVideo ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Video Title */}
              <h2 className="text-xl font-semibold text-gray-900 line-clamp-2">
                {selectedVideo.title}
              </h2>

              {/* Player */}
              <WorkspacePlayer
                videoId={selectedVideo.youtube_video_id}
                onTimeCapture={handleTimeCapture}
              />

              {/* Clip Form */}
              <ClipForm
                youtubeVideoId={selectedVideo.youtube_video_id}
                startTime={startTime}
                endTime={endTime}
                onSaved={handleClipSaved}
                categories={categories}
              />

              {/* Clip History */}
              <ClipHistory clips={videoClips} onDeleted={handleClipSaved} />

              {/* Video Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => handleVideoStatus('skipped')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Skip Video
                </button>
                <button
                  onClick={() => handleVideoStatus('completed')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Mark Complete
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a video from the queue to start creating clips
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create categories API route**

Create `apps/web/app/api/categories/route.ts`:

```typescript
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name_en')
    .order('sort_order');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

**Step 3: Commit**

```bash
git add apps/web/app/workspace/page.tsx apps/web/app/api/categories/route.ts
git commit -m "feat: add main workspace page"
```

---

## Task 10: Video Fetch Script

**Files:**
- Create: `apps/web/scripts/fetch-channel-videos.ts`

**Step 1: Create fetch script**

```typescript
/**
 * Fetch videos from YouTube channels and add to work queue
 * Usage: pnpm exec tsx scripts/fetch-channel-videos.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { getChannelId, fetchChannelVideos, getVideoStats } from '../lib/youtube-api';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

async function fetchAndStoreVideos() {
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  // Get all active channels
  const { data: channels, error: channelsError } = await supabase
    .from('youtube_channels')
    .select('*')
    .eq('is_active', true);

  if (channelsError) {
    console.error('Failed to fetch channels:', channelsError);
    return;
  }

  console.log(`Found ${channels.length} active channels\n`);

  for (const channel of channels) {
    console.log(`Processing ${channel.channel_name} (${channel.channel_handle})...`);

    try {
      // Get channel ID from handle
      const channelId = await getChannelId(channel.channel_handle);
      if (!channelId) {
        console.log(`  Could not find channel ID for ${channel.channel_handle}`);
        continue;
      }

      // Fetch popular videos
      const videos = await fetchChannelVideos(channelId, 30);
      console.log(`  Found ${videos.length} videos`);

      if (videos.length === 0) continue;

      // Get video stats
      const videoIds = videos.map((v) => v.videoId);
      const stats = await getVideoStats(videoIds);

      // Upsert videos to work queue
      let added = 0;
      for (const video of videos) {
        const videoStats = stats.get(video.videoId);

        const { error: upsertError } = await supabase
          .from('work_queue_videos')
          .upsert(
            {
              youtube_video_id: video.videoId,
              channel_id: channel.id,
              title: video.title,
              thumbnail_url: video.thumbnailUrl,
              published_at: video.publishedAt,
              view_count: videoStats?.viewCount || 0,
              like_count: videoStats?.likeCount || 0,
              duration_seconds: videoStats?.durationSeconds || 0,
            },
            {
              onConflict: 'youtube_video_id',
              ignoreDuplicates: false,
            }
          );

        if (!upsertError) added++;
      }

      console.log(`  Added/updated ${added} videos`);
    } catch (err) {
      console.error(`  Error processing channel:`, err);
    }

    console.log('');
  }

  console.log('Done!');
}

fetchAndStoreVideos().catch(console.error);
```

**Step 2: Commit**

```bash
git add apps/web/scripts/fetch-channel-videos.ts
git commit -m "feat: add script to fetch channel videos"
```

---

## Task 11: Final Integration

**Step 1: Apply database migration**

Run the SQL migration in Supabase dashboard or via CLI.

**Step 2: Add YOUTUBE_API_KEY to .env.local**

```
YOUTUBE_API_KEY=your_api_key_here
```

**Step 3: Fetch initial videos**

```bash
cd apps/web
pnpm exec tsx scripts/fetch-channel-videos.ts
```

**Step 4: Test the workspace**

```bash
pnpm dev
# Open http://localhost:3000/workspace
```

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete clip workspace implementation"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Database migration for channels + work queue |
| 2 | TypeScript types |
| 3 | YouTube API utility |
| 4 | Server actions (CRUD) |
| 5 | Video queue component |
| 6 | Workspace player component |
| 7 | Clip form component |
| 8 | Clip history component |
| 9 | Main workspace page |
| 10 | Video fetch script |
| 11 | Final integration & testing |
