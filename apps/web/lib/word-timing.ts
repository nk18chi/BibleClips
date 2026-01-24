type CaptionCue = {
  start: number;
  end: number;
  text: string;
};

export type WordTiming = {
  word: string;
  start: number;
  end: number;
};

export type SentenceWithWords = {
  start: number;
  end: number;
  text: string;
  words: WordTiming[];
};

/**
 * Converts phrase-level cues to word-level timing using interpolation.
 * Estimates each word's timing based on character count within the phrase.
 */
export function interpolateWordTimings(cues: CaptionCue[]): SentenceWithWords[] {
  return cues.map((cue) => {
    const words = cue.text.split(/\s+/).filter((w) => w.length > 0);
    const duration = cue.end - cue.start;

    if (words.length === 0) {
      return { ...cue, words: [] };
    }

    // Calculate total character count (for proportional timing)
    const totalChars = words.reduce((sum, w) => sum + w.length, 0);

    // Assign timing to each word proportionally
    let currentTime = cue.start;
    const wordTimings: WordTiming[] = words.map((word) => {
      // Duration proportional to word length
      const wordDuration = (word.length / totalChars) * duration;
      const timing: WordTiming = {
        word,
        start: currentTime,
        end: currentTime + wordDuration,
      };
      currentTime += wordDuration;
      return timing;
    });

    return {
      start: cue.start,
      end: cue.end,
      text: cue.text,
      words: wordTimings,
    };
  });
}
