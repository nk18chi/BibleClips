'use client';

import { useState, useEffect } from 'react';

type CaptionCue = {
  start: number;
  end: number;
  text: string;
};

export function useYouTubeCaptions(videoId: string, startTime: number, endTime: number) {
  const [captions, setCaptions] = useState<CaptionCue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCaptions() {
      try {
        // Fetch from our API route which will handle the YouTube request
        const response = await fetch(
          `/api/youtube-transcript?videoId=${videoId}&startTime=${startTime}&endTime=${endTime}`
        );

        if (response.ok) {
          const data = await response.json();
          setCaptions(data.subtitles || []);
        }
      } catch (error) {
        console.error('Failed to fetch captions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCaptions();
  }, [videoId, startTime, endTime]);

  return { captions, loading };
}
