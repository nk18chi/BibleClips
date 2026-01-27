"use server";

import { createClient } from "@supabase/supabase-js";

// Use service role for rate limit checks
function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SECRET_KEY ?? "");
}

type RateLimitConfig = {
  /** Maximum number of actions allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
};

const DEFAULT_RATE_LIMIT: RateLimitConfig = { limit: 100, windowSeconds: 3600 }; // 100 per hour

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Expensive operations - strict limits
  generateSubtitles: { limit: 20, windowSeconds: 86400 }, // 20 per day
  saveClip: { limit: 50, windowSeconds: 86400 }, // 50 per day
};

/**
 * Check rate limit for a user action.
 * Uses Supabase to track action counts.
 * @throws Error if rate limit exceeded
 */
export async function checkRateLimit(userId: string, action: string): Promise<void> {
  const config = RATE_LIMITS[action] ?? DEFAULT_RATE_LIMIT;
  const supabase = createAdminClient();

  const windowStart = new Date(Date.now() - config.windowSeconds * 1000).toISOString();

  // Count recent actions for this user
  const { count, error } = await supabase
    .from("rate_limit_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", windowStart);

  if (error) {
    // If table doesn't exist, log warning but don't block
    console.warn("Rate limit check failed:", error.message);
    return;
  }

  if (count !== null && count >= config.limit) {
    const windowHours = Math.round(config.windowSeconds / 3600);
    throw new Error(
      `Rate limit exceeded: Maximum ${config.limit} ${action} actions per ${windowHours} hour(s). Please try again later.`
    );
  }

  // Log this action
  await supabase.from("rate_limit_logs").insert({
    user_id: userId,
    action,
  });
}

/**
 * Clean up old rate limit logs (call periodically)
 */
export async function cleanupRateLimitLogs(): Promise<void> {
  const supabase = createAdminClient();

  // Delete logs older than 7 days
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from("rate_limit_logs").delete().lt("created_at", cutoff);
}
