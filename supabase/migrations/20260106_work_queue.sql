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
