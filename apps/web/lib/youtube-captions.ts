import { formatCaptionsWithAI } from "./caption-formatter";

type CaptionCue = {
  start: number;
  end: number;
  text: string;
};

type TranscriptItem = {
  text: string;
  duration: number;
  offset: number;
  lang?: string;
};

/**
 * Decodes HTML entities in text (handles double-encoding).
 */
function decodeHtmlEntities(text: string): string {
  let decoded = text;
  let prev = "";

  // Loop until no more changes (handles double/triple encoding)
  while (decoded !== prev) {
    prev = decoded;
    decoded = decoded
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&#(\d+);/gi, (_, code) => String.fromCharCode(parseInt(code, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
  }

  return decoded;
}

/**
 * Fetches YouTube captions for a video using youtube-transcript-plus.
 * Uses AI to format raw transcript into proper sentences.
 */
export async function fetchYouTubeCaptions(videoId: string): Promise<CaptionCue[]> {
  try {
    const { fetchTranscript } = await import("youtube-transcript-plus");
    const transcript: TranscriptItem[] = await fetchTranscript(videoId);

    const rawCues = transcript.map((item) => ({
      start: item.offset,
      end: item.offset + item.duration,
      text: decodeHtmlEntities(item.text),
    }));

    // Use AI to format into proper sentences
    return formatCaptionsWithAI(rawCues);
  } catch (error) {
    console.error("Failed to fetch YouTube captions:", error);
    return [];
  }
}
