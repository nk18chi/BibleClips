-- Combined migration and seed script for BibleClips
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hmjgkhxqrqbqlqqrexzw/sql

-- ============================================
-- PART 1: Schema (from 00001_initial_schema.sql)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'ja')),
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ja TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clips table (submitted_by nullable for seeded clips)
CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_video_id TEXT NOT NULL,
  start_time INTEGER NOT NULL CHECK (start_time >= 0),
  end_time INTEGER NOT NULL CHECK (end_time > start_time),
  title TEXT NOT NULL,
  title_ja TEXT,
  description TEXT,
  description_ja TEXT,
  submitted_by UUID REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clip verses table
CREATE TABLE IF NOT EXISTS clip_verses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  book TEXT NOT NULL,
  book_ja TEXT NOT NULL,
  chapter INTEGER NOT NULL CHECK (chapter > 0),
  verse_start INTEGER NOT NULL CHECK (verse_start > 0),
  verse_end INTEGER CHECK (verse_end IS NULL OR verse_end >= verse_start),
  UNIQUE(clip_id, book, chapter, verse_start)
);

-- Clip categories junction table
CREATE TABLE IF NOT EXISTS clip_categories (
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (clip_id, category_id)
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, clip_id)
);

-- Indexes (create if not exists by using a DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clips_status') THEN
    CREATE INDEX idx_clips_status ON clips(status);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clips_vote_count') THEN
    CREATE INDEX idx_clips_vote_count ON clips(vote_count DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clips_submitted_by') THEN
    CREATE INDEX idx_clips_submitted_by ON clips(submitted_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clips_is_featured') THEN
    CREATE INDEX idx_clips_is_featured ON clips(is_featured) WHERE is_featured = TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clip_verses_lookup') THEN
    CREATE INDEX idx_clip_verses_lookup ON clip_verses(book, chapter, verse_start);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_categories_slug') THEN
    CREATE INDEX idx_categories_slug ON categories(slug);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_categories_sort') THEN
    CREATE INDEX idx_categories_sort ON categories(sort_order);
  END IF;
END $$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS clips_updated_at ON clips;
CREATE TRIGGER clips_updated_at
  BEFORE UPDATE ON clips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vote count trigger function
CREATE OR REPLACE FUNCTION update_clip_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE clips SET vote_count = vote_count + 1 WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE clips SET vote_count = vote_count - 1 WHERE id = OLD.clip_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply vote count trigger
DROP TRIGGER IF EXISTS votes_count_trigger ON votes;
CREATE TRIGGER votes_count_trigger
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_clip_vote_count();

-- Create user profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- PART 2: RLS Policies (from 00002_rls_policies.sql)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to make script re-runnable)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Anyone can view approved clips" ON clips;
DROP POLICY IF EXISTS "Users can view own pending clips" ON clips;
DROP POLICY IF EXISTS "Admins can view all clips" ON clips;
DROP POLICY IF EXISTS "Authenticated users can insert clips" ON clips;
DROP POLICY IF EXISTS "Admins can update clips" ON clips;
DROP POLICY IF EXISTS "Clip verses follow clip visibility" ON clip_verses;
DROP POLICY IF EXISTS "Users can insert clip verses for own clips" ON clip_verses;
DROP POLICY IF EXISTS "Clip categories follow clip visibility" ON clip_categories;
DROP POLICY IF EXISTS "Users can insert clip categories for own clips" ON clip_categories;
DROP POLICY IF EXISTS "Anyone can view vote counts" ON votes;
DROP POLICY IF EXISTS "Authenticated users can vote" ON votes;
DROP POLICY IF EXISTS "Users can remove own votes" ON votes;

-- Users policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Categories policies (public read, admin write)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO PUBLIC
  USING (TRUE);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Clips policies
CREATE POLICY "Anyone can view approved clips"
  ON clips FOR SELECT
  USING (status = 'APPROVED');

CREATE POLICY "Users can view own pending clips"
  ON clips FOR SELECT
  USING (auth.uid() = submitted_by AND status = 'PENDING');

CREATE POLICY "Admins can view all clips"
  ON clips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Authenticated users can insert clips"
  ON clips FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Admins can update clips"
  ON clips FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Clip verses policies (follow clip visibility)
CREATE POLICY "Clip verses follow clip visibility"
  ON clip_verses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clips
      WHERE clips.id = clip_verses.clip_id
      AND (
        clips.status = 'APPROVED'
        OR clips.submitted_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
      )
    )
  );

CREATE POLICY "Users can insert clip verses for own clips"
  ON clip_verses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clips
      WHERE clips.id = clip_verses.clip_id
      AND clips.submitted_by = auth.uid()
    )
  );

-- Clip categories policies (follow clip visibility)
CREATE POLICY "Clip categories follow clip visibility"
  ON clip_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clips
      WHERE clips.id = clip_categories.clip_id
      AND (
        clips.status = 'APPROVED'
        OR clips.submitted_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
      )
    )
  );

CREATE POLICY "Users can insert clip categories for own clips"
  ON clip_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clips
      WHERE clips.id = clip_categories.clip_id
      AND clips.submitted_by = auth.uid()
    )
  );

-- Votes policies
CREATE POLICY "Anyone can view vote counts"
  ON votes FOR SELECT
  USING (TRUE);

CREATE POLICY "Authenticated users can vote"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own votes"
  ON votes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PART 3: Seed Data
-- ============================================

-- Seed categories
INSERT INTO categories (slug, name_en, name_ja, sort_order) VALUES
  ('love', 'Love', '愛', 1),
  ('anxiety', 'Anxiety', '不安', 2),
  ('anger', 'Anger', '怒り', 3),
  ('hope', 'Hope', '希望', 4),
  ('depression', 'Depression', 'うつ', 5),
  ('peace', 'Peace', '平安', 6),
  ('fear', 'Fear', '恐れ', 7),
  ('stress', 'Stress', 'ストレス', 8),
  ('patience', 'Patience', '忍耐', 9),
  ('temptation', 'Temptation', '誘惑', 10),
  ('pride', 'Pride', '高慢', 11),
  ('doubt', 'Doubt', '疑い', 12),
  ('joy', 'Joy', '喜び', 13),
  ('jealousy', 'Jealousy', '嫉妬', 14),
  ('loss', 'Loss', '喪失', 15),
  ('healing', 'Healing', '癒し', 16)
ON CONFLICT (slug) DO NOTHING;

-- Seed sample clip (Philippians 4:6 - Do Not Be Anxious)
INSERT INTO clips (
  id,
  youtube_video_id,
  start_time,
  end_time,
  title,
  title_ja,
  status,
  is_featured,
  vote_count
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'S82EJ14zlMc',
  336,  -- 5:36 = 5*60 + 36
  390,  -- 6:30 = 6*60 + 30
  'Do Not Be Anxious - Philippians 4:6',
  '思い煩うな - ピリピ4:6',
  'APPROVED',
  true,
  0
) ON CONFLICT (id) DO NOTHING;

-- Seed clip verse
INSERT INTO clip_verses (
  clip_id,
  book,
  book_ja,
  chapter,
  verse_start
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Philippians',
  'ピリピ人への手紙',
  4,
  6
) ON CONFLICT (clip_id, book, chapter, verse_start) DO NOTHING;

-- Seed clip category link
INSERT INTO clip_categories (clip_id, category_id)
SELECT
  '00000000-0000-0000-0000-000000000001',
  id
FROM categories
WHERE slug = 'anxiety'
ON CONFLICT (clip_id, category_id) DO NOTHING;

-- Done!
SELECT 'Database setup complete! Sample clip added.' as status;
