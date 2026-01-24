/**
 * Fetch videos from YouTube channels and add to work queue
 * Usage: pnpm exec tsx scripts/fetch-channel-videos.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { fetchChannelVideos, getChannelId, getVideoStats } from "../lib/youtube-api";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? "";

async function fetchAndStoreVideos() {
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  // Get all active channels
  const { data: channels, error: channelsError } = await supabase
    .from("youtube_channels")
    .select("*")
    .eq("is_active", true);

  if (channelsError) {
    console.error("Failed to fetch channels:", channelsError);
    return;
  }

  console.log(`Found ${channels.length} active channels\n`);

  for (const channel of channels) {
    console.log(`Processing ${channel.channel_name} (${channel.channel_handle})...`);

    try {
      // Get channel ID from handle
      const channelId = await getChannelId(channel.channel_handle);
      if (!channelId) {
        console.log(`  Could not find channel ID for ${channel.channel_handle}`);
        continue;
      }

      // Fetch all videos from channel (to include older popular videos)
      const videos = await fetchChannelVideos(channelId, 2000);
      console.log(`  Found ${videos.length} videos`);

      if (videos.length === 0) continue;

      // Get video stats
      const videoIds = videos.map((v) => v.videoId);
      const stats = await getVideoStats(videoIds);

      // Upsert videos to work queue
      let added = 0;
      for (const video of videos) {
        const videoStats = stats.get(video.videoId);

        const { error: upsertError } = await supabase.from("work_queue_videos").upsert(
          {
            youtube_video_id: video.videoId,
            channel_id: channel.id,
            title: video.title,
            thumbnail_url: video.thumbnailUrl,
            published_at: video.publishedAt,
            view_count: videoStats?.viewCount || 0,
            like_count: videoStats?.likeCount || 0,
            duration_seconds: videoStats?.durationSeconds || 0,
          },
          {
            onConflict: "youtube_video_id",
            ignoreDuplicates: false,
          }
        );

        if (!upsertError) added++;
      }

      console.log(`  Added/updated ${added} videos`);
    } catch (err) {
      console.error(`  Error processing channel:`, err);
    }

    console.log("");
  }

  console.log("Done!");
}

fetchAndStoreVideos().catch(console.error);
