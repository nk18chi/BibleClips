type TranscriptSegment = {
  text: string;
  startSeconds: number;
  endSeconds: number;
};

type FetchSubtitlesResult =
  | { ok: true; segments: TranscriptSegment[]; source: "manual" | "auto" }
  | { ok: false; reason: string };

async function fetchSubtitles(videoId: string): Promise<FetchSubtitlesResult> {
  try {
    const { fetchTranscript } = await import("youtube-transcript-plus");
    const transcript = await fetchTranscript(videoId);

    if (!transcript || transcript.length === 0) {
      return { ok: false, reason: "No transcript available" };
    }

    const segments: TranscriptSegment[] = transcript.map((item) => ({
      text: item.text,
      startSeconds: item.offset,
      endSeconds: item.offset + item.duration,
    }));

    return { ok: true, segments, source: "auto" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: message };
  }
}

export { fetchSubtitles, type TranscriptSegment, type FetchSubtitlesResult };
