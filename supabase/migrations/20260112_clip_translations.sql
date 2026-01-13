-- Create clip_translations table for sentence-level translations
-- Stores full sentence translations with timing (not word-by-word)
CREATE TABLE IF NOT EXISTS clip_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  language VARCHAR(2) NOT NULL, -- 'ja', 'ko', 'zh', etc.
  text TEXT NOT NULL, -- The translated sentence
  start_time DECIMAL(10,3) NOT NULL, -- seconds with millisecond precision
  end_time DECIMAL(10,3) NOT NULL,
  sequence INTEGER NOT NULL, -- sentence order (0, 1, 2, ...)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_clip_language_sequence UNIQUE (clip_id, language, sequence)
);

-- Index for fast lookup by clip and language
CREATE INDEX IF NOT EXISTS idx_clip_translations_clip_language
  ON clip_translations(clip_id, language);

-- RLS policies
ALTER TABLE clip_translations ENABLE ROW LEVEL SECURITY;

-- Anyone can read translations
CREATE POLICY "Anyone can read translations"
  ON clip_translations FOR SELECT
  USING (true);

-- Only admins can insert/update/delete translations
CREATE POLICY "Admins can manage translations"
  ON clip_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Remove word_ja column from clip_subtitles (no longer needed)
ALTER TABLE clip_subtitles DROP COLUMN IF EXISTS word_ja;
