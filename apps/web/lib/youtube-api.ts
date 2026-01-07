const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Read API key at call time (not module load time) to support dotenv
function getApiKey(): string {
  return process.env.YOUTUBE_API_KEY || '';
}

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

// Get channel info including uploads playlist ID
export async function getChannelInfo(handle: string): Promise<{ channelId: string; uploadsPlaylistId: string } | null> {
  const cleanHandle = handle.replace('@', '');
  const url = `${YOUTUBE_API_BASE}/channels?forHandle=${cleanHandle}&part=id,contentDetails&key=${getApiKey()}`;

  const res = await fetch(url);
  const data = await res.json();

  const channel = data.items?.[0];
  if (!channel) return null;

  return {
    channelId: channel.id,
    uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads,
  };
}

// For backwards compatibility
export async function getChannelId(handle: string): Promise<string | null> {
  const info = await getChannelInfo(handle);
  return info?.channelId || null;
}

// Fetch videos from uploads playlist (more reliable than search API)
export async function fetchChannelVideos(
  channelId: string,
  maxResults = 200
): Promise<{
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
}[]> {
  // First get the uploads playlist ID
  const channelUrl = `${YOUTUBE_API_BASE}/channels?id=${channelId}&part=contentDetails&key=${getApiKey()}`;
  const channelRes = await fetch(channelUrl);
  const channelData = await channelRes.json();

  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  // Fetch videos from uploads playlist with pagination
  const videos: { videoId: string; title: string; thumbnailUrl: string; publishedAt: string }[] = [];
  let pageToken = '';

  while (videos.length < maxResults) {
    const remaining = maxResults - videos.length;
    const pageSize = Math.min(50, remaining);

    let url = `${YOUTUBE_API_BASE}/playlistItems?playlistId=${uploadsPlaylistId}&part=snippet&maxResults=${pageSize}&key=${getApiKey()}`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.items || data.items.length === 0) break;

    for (const item of data.items) {
      const snippet = item.snippet;
      if (snippet.resourceId?.videoId) {
        videos.push({
          videoId: snippet.resourceId.videoId,
          title: snippet.title,
          thumbnailUrl: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
          publishedAt: snippet.publishedAt,
        });
      }
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return videos;
}

// Get video statistics (views, likes, duration)
export async function getVideoStats(
  videoIds: string[]
): Promise<Map<string, { viewCount: number; likeCount: number; durationSeconds: number }>> {
  const stats = new Map();

  // YouTube API allows max 50 IDs per request
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = `${YOUTUBE_API_BASE}/videos?id=${batch.join(',')}&part=statistics,contentDetails&key=${getApiKey()}`;

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
