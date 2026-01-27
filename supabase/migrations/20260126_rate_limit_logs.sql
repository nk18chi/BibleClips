-- Rate limit tracking table
-- Used to prevent abuse of expensive API calls (Whisper, GPT-4o)

CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient rate limit queries
CREATE INDEX idx_rate_limit_logs_user_action_time
  ON rate_limit_logs(user_id, action, created_at DESC);

-- Enable RLS
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for server-side rate limit checks)
CREATE POLICY "Service role full access on rate_limit_logs" ON rate_limit_logs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can only see their own logs (for debugging)
CREATE POLICY "Users can view own rate limit logs" ON rate_limit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Auto-cleanup: delete logs older than 7 days (optional, can use pg_cron)
-- For now, cleanup is handled by the application
