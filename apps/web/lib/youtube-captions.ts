type CaptionCue = {
  start: number;
  end: number;
  text: string;
};

type CaptionTrack = {
  baseUrl: string;
  languageCode: string;
};

/**
 * Fetches YouTube captions for a video.
 * Note: Some channels disable API access to captions. In those cases, this returns empty.
 */
export async function fetchYouTubeCaptions(videoId: string): Promise<CaptionCue[]> {
  try {
    // Fetch video page to get signed caption URLs
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!pageResponse.ok) {
      return [];
    }

    const pageHtml = await pageResponse.text();

    // Extract caption tracks from the page
    const captionMatch = pageHtml.match(/"captionTracks":\s*(\[[^\]]+\])/);
    if (!captionMatch || !captionMatch[1]) {
      return [];
    }

    // Parse caption tracks
    const tracksJson = captionMatch[1].replace(/\\u0026/g, '&');
    let tracks: CaptionTrack[];
    try {
      tracks = JSON.parse(tracksJson);
    } catch {
      return [];
    }

    if (tracks.length === 0) {
      return [];
    }

    // Find English track or use first available
    const track = tracks.find((t) => t.languageCode === 'en') || tracks[0];
    if (!track?.baseUrl) {
      return [];
    }

    // Fetch captions with the signed URL
    const captionUrl = track.baseUrl.replace(/\\u0026/g, '&');
    const captionResponse = await fetch(captionUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.youtube.com/',
      },
    });

    if (!captionResponse.ok) {
      return [];
    }

    const captionXml = await captionResponse.text();
    if (captionXml.length < 50) {
      // Empty response - channel may have disabled API access
      return [];
    }

    return parseXmlCaptions(captionXml);
  } catch {
    return [];
  }
}

function parseXmlCaptions(xml: string): CaptionCue[] {
  const cues: CaptionCue[] = [];

  // Match <text start="X" dur="Y">content</text>
  const regex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    const text = match[3]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, ' ')
      .trim();

    if (text) {
      cues.push({
        start,
        end: start + duration,
        text,
      });
    }
  }

  return cues;
}
