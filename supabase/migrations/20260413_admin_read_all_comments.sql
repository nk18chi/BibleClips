-- Allow admins to read comments on any clip (not just APPROVED)
-- This is needed so edit notes on NEEDS_EDIT clips are visible in admin review
CREATE POLICY "Admins can read all comments"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );
