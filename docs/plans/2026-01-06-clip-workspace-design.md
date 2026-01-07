# Clip Workspace Design

## Overview

A dedicated admin/curator workspace for efficiently creating Bible verse clips from recommended YouTube sermon videos. The workspace provides a streamlined workflow: browse a queue of popular videos from curated channels, watch segments, and link them to specific Bible verses.

## Goals

1. Make clip creation efficient with a purpose-built UI
2. Surface popular sermon videos from trusted channels
3. Track progress - completed videos disappear from queue
4. Support multiple clips per video with full history

## Database Schema

### New Tables

```sql
-- YouTube channels to fetch videos from
CREATE TABLE youtube_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_handle TEXT UNIQUE NOT NULL,  -- e.g., "@saddlebackchurch"
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
```

### Seed Data - Channels

```sql
INSERT INTO youtube_channels (channel_handle, channel_name) VALUES
  ('@saddlebackchurch', 'Saddleback Church'),
  ('@DailyHopeRickWarren', 'Daily Hope with Rick Warren'),
  ('@PAZChurch', 'PAZ Church'),
  ('@CoastalChurchVancouver', 'Coastal Church Vancouver'),
  ('@life.church', 'Life.Church'),
  ('@lifehousetokyo', 'Lifehouse Tokyo'),
  ('@PassionCityChurch', 'Passion City Church'),
  ('@ThePorch', 'The Porch');
```

## UI Layout

Split-screen workspace at `/workspace`:

```
┌─────────────────────────────────────────────────────────────────┐
│  Clip Workspace                              [Channel Filter ▼] │
├──────────────────────┬──────────────────────────────────────────┤
│                      │                                          │
│  VIDEO QUEUE         │   VIDEO PLAYER                           │
│  (sorted by likes)   │   ┌────────────────────────────────┐     │
│                      │   │                                │     │
│  ┌────────────────┐  │   │     YouTube Player             │     │
│  │ 🎬 Thumbnail   │  │   │     (with seek controls)       │     │
│  │ Title...       │  │   │                                │     │
│  │ 👍 12.5K       │  │   └────────────────────────────────┘     │
│  └────────────────┘  │                                          │
│                      │   Current Time: 1:23:45                  │
│  ┌────────────────┐  │   [Set Start] [Set End]                  │
│  │ 🎬 Thumbnail   │  │                                          │
│  │ Title...       │  │   CLIP FORM                              │
│  │ 👍 8.2K        │  │   ┌─────────────────────────────────┐    │
│  └────────────────┘  │   │ Start: [0:30] End: [1:45]       │    │
│                      │   │ Title: [________________]        │    │
│  ...                 │   │ Book: [Matthew ▼] Ch:[6] V:[25] │    │
│                      │   │ Categories: [anxiety] [worry]   │    │
│                      │   │         [Save Clip]             │    │
│                      │   └─────────────────────────────────┘    │
│                      │                                          │
│                      │   CLIPS FROM THIS VIDEO                  │
│                      │   ┌─────────────────────────────────┐    │
│                      │   │ Matthew 6:25 (0:30-1:45)  [🗑]  │    │
│                      │   │ Phil 4:6 (2:10-3:30)      [🗑]  │    │
│                      │   └─────────────────────────────────┘    │
│                      │                                          │
│                      │   [Skip Video] [Mark Complete]           │
└──────────────────────┴──────────────────────────────────────────┘
```

## Components

### File Structure

```
apps/web/
├── app/
│   └── workspace/
│       ├── page.tsx              # Main workspace page
│       └── actions.ts            # Server actions
├── components/
│   └── workspace/
│       ├── video-queue.tsx       # Left panel - video list
│       ├── workspace-player.tsx  # YouTube player with time controls
│       ├── clip-form.tsx         # Verse + time range form
│       ├── clip-history.tsx      # Clips from current video + delete
│       └── channel-filter.tsx    # Dropdown to filter by channel
├── lib/
│   └── youtube.ts                # YouTube Data API utilities
└── scripts/
    └── fetch-channel-videos.ts   # Populate work queue from channels
```

### Component Details

**VideoQueue** (left panel)
- Fetches `work_queue_videos` where `status = 'pending'`
- Sorted by `like_count DESC`
- Optional channel filter
- Shows thumbnail, title, like count
- Click to select video

**WorkspacePlayer**
- YouTube IFrame player with controls enabled
- Displays current timestamp
- "Set Start" / "Set End" buttons capture current time
- Keyboard shortcuts: S = set start, E = set end

**ClipForm**
- Start/end time inputs (auto-filled from player buttons)
- Clip title input
- Bible verse selector (book dropdown, chapter, verse range)
- Category pills (multi-select)
- Save button → creates clip, adds to history

**ClipHistory**
- Lists clips created from current video
- Shows verse reference and time range
- Delete button with confirmation
- Updates `clips_created` count on delete

## Data Flow

### Fetching Videos from YouTube

1. Script `fetch-channel-videos.ts` runs manually or via cron
2. For each active channel in `youtube_channels`:
   - Call YouTube Data API: `GET /search?channelId=X&order=viewCount&type=video`
   - Get video details: `GET /videos?id=X&part=statistics,contentDetails`
3. Upsert into `work_queue_videos` (skip if already exists)

### Workspace Flow

1. **Load page** → Fetch pending videos sorted by popularity
2. **Select video** → Load in player, fetch existing clips for that video
3. **Set times** → Click "Set Start"/"Set End" while watching
4. **Save clip** → Insert to `clips`, `clip_verses`, `clip_categories`; increment `clips_created`
5. **Delete clip** → Remove from `clips` (cascade); decrement `clips_created`
6. **Complete video** → Set `status = 'completed'`; remove from queue
7. **Skip video** → Set `status = 'skipped'`; remove from queue

## Server Actions

```typescript
// actions.ts

async function saveClip(data: {
  videoId: string;
  startTime: number;
  endTime: number;
  title: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  categoryIds: string[];
}): Promise<{ clipId: string }>;

async function deleteClip(clipId: string): Promise<void>;

async function updateVideoStatus(
  videoId: string,
  status: 'completed' | 'skipped'
): Promise<void>;

async function getVideoClips(youtubeVideoId: string): Promise<Clip[]>;

async function getQueueVideos(channelId?: string): Promise<WorkQueueVideo[]>;
```

## YouTube API Integration

```typescript
// lib/youtube.ts

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Get channel ID from handle
async function getChannelId(handle: string): Promise<string>;

// Fetch popular videos from channel
async function fetchChannelVideos(channelId: string, maxResults = 50): Promise<Video[]>;

// Get video statistics (views, likes)
async function getVideoStats(videoIds: string[]): Promise<VideoStats[]>;
```

## Environment Variables

```
YOUTUBE_API_KEY=your_youtube_data_api_v3_key
```

## Future Enhancements

- Auto-refresh queue on schedule (cron job)
- Bulk operations (skip multiple videos)
- Search within queue
- Whisper transcription integration for subtitle generation
- AI-suggested verse references based on transcript
