-- Add version column to clip_verses to track which Bible translation was used
ALTER TABLE clip_verses ADD COLUMN version TEXT NOT NULL DEFAULT 'NIV';
