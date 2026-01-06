import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

type TranscriptItem = {
  text: string;
  offset: number; // milliseconds
  duration: number; // milliseconds
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');
  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    // Convert to our subtitle format
    const subtitles = transcript.map((item: TranscriptItem) => ({
      start: item.offset / 1000, // Convert ms to seconds
      end: (item.offset + item.duration) / 1000,
      text: item.text.replace(/\n/g, ' ').trim(),
    }));

    // Filter by start/end time if provided
    if (startTime && endTime) {
      const start = parseFloat(startTime);
      const end = parseFloat(endTime);

      const filtered = subtitles.filter(
        (sub: { start: number; end: number }) =>
          sub.end > start && sub.start < end
      );

      return NextResponse.json({ subtitles: filtered });
    }

    return NextResponse.json({ subtitles });
  } catch (error) {
    console.error('Failed to fetch transcript:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript. The video may not have captions available.' },
      { status: 500 }
    );
  }
}
