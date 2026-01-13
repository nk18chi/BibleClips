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
  clip_categories?: {
    category_id: string;
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
  userId?: string; // Optional - for tracking who submitted
};
