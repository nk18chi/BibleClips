import { config } from "dotenv";

config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { fetchSubtitles } from "./fetch-subtitles";
import { analyzeSegments } from "./analyze-segments";
import { saveAllSegments, type SaveResult } from "./save-clips";

type VideoRow = {
  youtube_video_id: string;
  title: string;
  channel: { channel_name: string } | null;
  duration_seconds: number | null;
};

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 10;
  let channel: string | undefined;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--limit" && args[i + 1] !== undefined) {
      const parsed = parseInt(args[i + 1]!, 10);
      limit = Number.isNaN(parsed) ? 10 : Math.min(parsed, 10); // Hard cap at 10
      i++;
    } else if (arg === "--channel" && args[i + 1] !== undefined) {
      channel = args[i + 1]!;
      i++;
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { limit, channel, dryRun };
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  }
  return createClient(url, key);
}

async function fetchPendingVideos(limit: number, channelHandle?: string): Promise<VideoRow[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("work_queue_videos")
    .select("youtube_video_id, title, duration_seconds, channel:youtube_channels(channel_name, channel_handle)")
    .eq("status", "pending")
    .order("view_count", { ascending: false })
    .limit(limit);

  if (channelHandle) {
    const cleanHandle = channelHandle.replace("@", "");
    const { data: channels } = await supabase
      .from("youtube_channels")
      .select("id")
      .eq("channel_handle", `@${cleanHandle}`)
      .limit(1);

    if (!channels || channels.length === 0) {
      console.error(`Channel not found: ${channelHandle}`);
      process.exit(1);
    }
    query = query.eq("channel_id", channels[0]!.id);
  }

  const { data, error } = await query;
  if (error) throw error;
  // Supabase join returns array; normalize to single object
  return ((data ?? []) as unknown as VideoRow[]).map((row) => ({
    ...row,
    channel: Array.isArray(row.channel) ? row.channel[0] ?? null : row.channel,
  }));
}

async function processVideo(
  video: VideoRow,
  dryRun: boolean,
): Promise<{ saved: SaveResult[]; errors: string[]; skipped?: string }> {
  const videoId = video.youtube_video_id;
  const channelName = video.channel?.channel_name || "Unknown";

  console.log(`\n--- Processing: "${video.title}" [${channelName}] ---`);

  if (video.duration_seconds && video.duration_seconds > 7200) {
    const reason = `Video too long (${Math.round(video.duration_seconds / 60)} min)`;
    console.log(`  SKIP: ${reason}`);
    return { saved: [], errors: [], skipped: reason };
  }

  console.log("  Fetching subtitles...");
  const subtitleResult = await fetchSubtitles(videoId);

  if (!subtitleResult.ok) {
    console.log(`  SKIP: ${subtitleResult.reason}`);
    return { saved: [], errors: [], skipped: subtitleResult.reason };
  }

  console.log(`  Got ${subtitleResult.segments.length} subtitle segments (${subtitleResult.source})`);

  console.log("  Analyzing with GPT-4o...");
  const analysis = await analyzeSegments(subtitleResult.segments, video.title);

  if (analysis.segments.length === 0) {
    const reason = analysis.skipped_reason || "No segments detected";
    console.log(`  SKIP: ${reason}`);
    return { saved: [], errors: [], skipped: reason };
  }

  console.log(`  Detected ${analysis.segments.length} segments:`);
  for (const seg of analysis.segments) {
    const timeRange = `${formatTime(seg.start_time)}-${formatTime(seg.end_time)}`;
    if (seg.type === "sermon") {
      console.log(`    [sermon] ${timeRange} ${seg.verse.book} ${seg.verse.chapter}:${seg.verse.verse_start}${seg.verse.verse_end ? `-${seg.verse.verse_end}` : ""} - "${seg.title}"`);
    } else {
      console.log(`    [testimony] ${timeRange} "${seg.title}"`);
    }
  }

  if (dryRun) {
    console.log("  DRY RUN: Skipping DB save");
    return { saved: [], errors: [] };
  }

  console.log("  Saving to database...");
  return saveAllSegments(analysis.segments, videoId);
}

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

async function main() {
  const { limit, channel, dryRun } = parseArgs();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY || !process.env.OPENAI_API_KEY) {
    console.error("Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY");
    process.exit(1);
  }

  console.log("=== Auto-Clip ===");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Limit: ${limit} videos`);
  if (channel) console.log(`Channel: ${channel}`);
  console.log("");

  const videos = await fetchPendingVideos(limit, channel);

  if (videos.length === 0) {
    console.log("No pending videos found.");
    return;
  }

  console.log(`Found ${videos.length} pending video(s)`);

  let totalSaved = 0;
  let totalSermon = 0;
  let totalTestimony = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const video of videos) {
    try {
      const result = await processVideo(video, dryRun);

      if (result.skipped) {
        totalSkipped++;
      }

      for (const s of result.saved) {
        totalSaved++;
        if (s.type === "sermon") totalSermon++;
        if (s.type === "testimony") totalTestimony++;
      }

      totalErrors += result.errors.length;
      for (const err of result.errors) {
        console.error(`  ERROR: ${err}`);
      }
    } catch (error) {
      console.error(`  FATAL: ${error instanceof Error ? error.message : error}`);
      totalErrors++;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Videos processed: ${videos.length}`);
  console.log(`Videos skipped: ${totalSkipped}`);
  if (!dryRun) {
    console.log(`Clips saved: ${totalSaved} (sermon: ${totalSermon}, testimony: ${totalTestimony})`);
  }
  console.log(`Errors: ${totalErrors}`);
  console.log(`Status: All clips saved as PENDING`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
