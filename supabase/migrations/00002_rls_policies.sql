-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

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
