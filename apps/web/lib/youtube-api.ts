const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

type YouTubeSearchResult = {
  id: { videoId: string };
  snippet: {
    title: string;
    publishedAt: string;
    thumbnails: { medium: { url: string } };
  };
};

type YouTubeVideoStats = {
  id: string;
  statistics: {
    viewCount: string;
    likeCount: string;
  };
  contentDetails: {
    duration: string;
  };
};

// Parse ISO 8601 duration (PT1H2M3S) to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

// Get channel ID from handle (e.g., @saddlebackchurch)
export async function getChannelId(handle: string): Promise<string | null> {
  const cleanHandle = handle.replace('@', '');
  const url = `${YOUTUBE_API_BASE}/channels?forHandle=${cleanHandle}&part=id&key=${YOUTUBE_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return data.items?.[0]?.id || null;
}

// Fetch popular videos from a channel
export async function fetchChannelVideos(
  channelId: string,
  maxResults = 50
): Promise<{
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
}[]> {
  const url = `${YOUTUBE_API_BASE}/search?channelId=${channelId}&order=viewCount&type=video&part=snippet&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return (data.items || []).map((item: YouTubeSearchResult) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails.medium.url,
    publishedAt: item.snippet.publishedAt,
  }));
}

// Get video statistics (views, likes, duration)
export async function getVideoStats(
  videoIds: string[]
): Promise<Map<string, { viewCount: number; likeCount: number; durationSeconds: number }>> {
  const stats = new Map();

  // YouTube API allows max 50 IDs per request
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = `${YOUTUBE_API_BASE}/videos?id=${batch.join(',')}&part=statistics,contentDetails&key=${YOUTUBE_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    for (const item of data.items || []) {
      const v = item as YouTubeVideoStats;
      stats.set(v.id, {
        viewCount: parseInt(v.statistics.viewCount || '0'),
        likeCount: parseInt(v.statistics.likeCount || '0'),
        durationSeconds: parseDuration(v.contentDetails.duration),
      });
    }
  }

  return stats;
}
