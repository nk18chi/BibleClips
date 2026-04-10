type WordTiming = {
  word: string;
  start: number;
  end: number;
};

type Sentence = {
  start: number;
  end: number;
  words: WordTiming[];
};

/**
 * Groups word timings into display sentences based on punctuation and pauses.
 * Prioritizes natural sentence boundaries over word count.
 */
export function groupIntoSentences(words: WordTiming[], maxWords = 10, pauseThreshold = 0.5): Sentence[] {
  if (words.length === 0) return [];

  const sentences: Sentence[] = [];
  let currentWords: WordTiming[] = [];

  const hasPunctuationAhead = (startIndex: number, lookAhead: number): boolean => {
    for (let j = startIndex; j < Math.min(startIndex + lookAhead, words.length); j++) {
      const w = words[j];
      if (w && /[.!?,;]$/.test(w.word)) return true;
    }
    return false;
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    const nextWord = words[i + 1];

    currentWords.push(word);

    const endsPunctuation = /[.!?]$/.test(word.word);
    const endsClause = /[,;]$/.test(word.word);
    const hasLongPause = nextWord && nextWord.start - word.end > pauseThreshold;
    const reachedMaxWords = currentWords.length >= maxWords && !hasPunctuationAhead(i + 1, 4);
    const splitOnClause = endsClause && currentWords.length >= 6;

    if (endsPunctuation || hasLongPause || reachedMaxWords || splitOnClause || !nextWord) {
      const firstWord = currentWords[0];
      const lastWord = currentWords[currentWords.length - 1];

      if (firstWord && lastWord) {
        sentences.push({
          start: firstWord.start,
          end: lastWord.end,
          words: [...currentWords],
        });
      }
      currentWords = [];
    }
  }

  return sentences;
}

export type { WordTiming, Sentence };
