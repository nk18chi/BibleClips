-- Allow anyone to read basic user profile info (display_name)
-- Needed for comments to show author names
CREATE POLICY "Anyone can view user display names"
  ON users FOR SELECT
  USING (TRUE);

-- Drop the restrictive policy that only allowed viewing own profile
DROP POLICY IF EXISTS "Users can view own profile" ON users;
