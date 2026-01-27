export type WordTiming = {
  word: string;
  start: number;
  end: number;
};

/**
 * Transcribes YouTube audio using Cloud Run Whisper API.
 * Returns word-level timestamps.
 */
export async function transcribeClipWithWhisper(
  videoId: string,
  startTime: number,
  endTime: number
): Promise<WordTiming[]> {
  const apiUrl = process.env.WHISPER_API_URL;
  const apiKey = process.env.WHISPER_API_KEY;

  if (!apiUrl) {
    throw new Error("WHISPER_API_URL is not configured");
  }

  console.log(`Calling Whisper API for ${videoId} (${startTime}-${endTime})...`);

  const response = await fetch(`${apiUrl}/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
    },
    body: JSON.stringify({
      video_id: videoId,
      start: startTime,
      end: endTime,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper API failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.words as WordTiming[];
}

/**
 * Groups word timings into sentences for display.
 * Creates natural sentence breaks based on punctuation and pauses.
 */
export function groupWordsIntoSentences(
  words: WordTiming[],
  maxWordsPerSentence = 8,
  pauseThreshold = 0.5
): { start: number; end: number; text: string; words: WordTiming[] }[] {
  if (words.length === 0) return [];

  const sentences: { start: number; end: number; text: string; words: WordTiming[] }[] = [];
  let currentWords: WordTiming[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    const nextWord = words[i + 1];

    currentWords.push(word);

    // Check if we should end the sentence
    const endsPunctuation = /[.!?]$/.test(word.word);
    const hasLongPause = nextWord && nextWord.start - word.end > pauseThreshold;
    const reachedMaxWords = currentWords.length >= maxWordsPerSentence;

    if (endsPunctuation || hasLongPause || reachedMaxWords || !nextWord) {
      const firstWord = currentWords[0];
      const lastWord = currentWords[currentWords.length - 1];

      if (firstWord && lastWord) {
        sentences.push({
          start: firstWord.start,
          end: lastWord.end,
          text: currentWords.map((w) => w.word).join(" "),
          words: [...currentWords],
        });
      }
      currentWords = [];
    }
  }

  return sentences;
}
