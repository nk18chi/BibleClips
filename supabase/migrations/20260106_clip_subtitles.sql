-- Create clip_subtitles table for word-level subtitle timing
CREATE TABLE IF NOT EXISTS clip_subtitles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  start_time DECIMAL(10,3) NOT NULL, -- seconds with millisecond precision
  end_time DECIMAL(10,3) NOT NULL,
  sequence INTEGER NOT NULL, -- word order (0, 1, 2, ...)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Index for fast lookup by clip
  CONSTRAINT unique_clip_sequence UNIQUE (clip_id, sequence)
);

-- Index for querying subtitles by clip
CREATE INDEX IF NOT EXISTS idx_clip_subtitles_clip_id ON clip_subtitles(clip_id);

-- RLS policies
ALTER TABLE clip_subtitles ENABLE ROW LEVEL SECURITY;

-- Anyone can read subtitles
CREATE POLICY "Anyone can read subtitles"
  ON clip_subtitles FOR SELECT
  USING (true);

-- Only admins can insert/update/delete subtitles
CREATE POLICY "Admins can manage subtitles"
  ON clip_subtitles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );
