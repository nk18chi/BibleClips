-- Update clip_type constraint to include testimony
ALTER TABLE clips DROP CONSTRAINT clips_clip_type_check;
ALTER TABLE clips ADD CONSTRAINT clips_clip_type_check
  CHECK (clip_type IN ('sermon', 'song', 'testimony'));
