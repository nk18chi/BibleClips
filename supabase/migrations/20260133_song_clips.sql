ALTER TABLE clips ADD COLUMN clip_type TEXT NOT NULL DEFAULT 'sermon'
  CHECK (clip_type IN ('sermon', 'song'));
CREATE INDEX idx_clips_clip_type ON clips(clip_type);

CREATE TABLE clip_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  song_name TEXT NOT NULL,
  UNIQUE(clip_id)
);
CREATE INDEX idx_clip_songs_clip_id ON clip_songs(clip_id);
CREATE INDEX idx_clip_songs_artist ON clip_songs(artist_name);

ALTER TABLE clip_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clip_songs_read" ON clip_songs FOR SELECT USING (true);
CREATE POLICY "clip_songs_admin" ON clip_songs FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
);
