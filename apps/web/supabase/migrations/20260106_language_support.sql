-- Add language field to clips table
ALTER TABLE clips ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'en';

-- Add translation field to clip_subtitles table
ALTER TABLE clip_subtitles ADD COLUMN IF NOT EXISTS word_ja TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_clips_language ON clips(language);
