"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";

type WordTiming = {
  word: string;
  start: number;
  end: number;
};

type SentenceTranslation = {
  language: string;
  text: string;
  start: number;
  end: number;
};

type Sentence = {
  start: number;
  end: number;
  words: WordTiming[];
};

type SubtitleOverlayProps = {
  wordTimings: WordTiming[];
  translations?: SentenceTranslation[];
  currentTime: number;
  offset?: number;
  maxWordsPerSentence?: number;
  videoLanguage?: "en" | "ja";
};

const DEFAULT_OFFSET = 0; // No offset needed with Whisper timestamps

/**
 * Groups word timings into display sentences based on punctuation and pauses.
 * Prioritizes natural sentence boundaries over word count.
 */
function groupIntoSentences(words: WordTiming[], maxWords = 10, pauseThreshold = 0.5): Sentence[] {
  if (words.length === 0) return [];

  const sentences: Sentence[] = [];
  let currentWords: WordTiming[] = [];

  // Check if punctuation exists within next N words
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

    // Check natural sentence boundaries
    const endsPunctuation = /[.!?]$/.test(word.word);
    const endsClause = /[,;]$/.test(word.word);
    const hasLongPause = nextWord && nextWord.start - word.end > pauseThreshold;

    // Only use maxWords if no punctuation is coming soon
    const reachedMaxWords = currentWords.length >= maxWords && !hasPunctuationAhead(i + 1, 4);

    // Split on clause boundaries only if sentence is getting long
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

export function SubtitleOverlay({
  wordTimings,
  translations,
  currentTime,
  offset = DEFAULT_OFFSET,
  maxWordsPerSentence = 6,
  videoLanguage = "en",
}: SubtitleOverlayProps) {
  const { language: userLanguage } = useLanguage();
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(-1);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [activeTranslation, setActiveTranslation] = useState<string | null>(null);

  // Should show translation if user language differs from video language
  const showTranslation = userLanguage !== videoLanguage;

  // Group words into display sentences
  const sentences = useMemo(
    () => groupIntoSentences(wordTimings, maxWordsPerSentence),
    [wordTimings, maxWordsPerSentence]
  );

  // Filter translations for user's language
  const userTranslations = useMemo(() => {
    if (!translations) return [];
    return translations.filter((t) => t.language === userLanguage);
  }, [translations, userLanguage]);

  useEffect(() => {
    const adjustedTime = currentTime + offset;

    let foundSentence = -1;
    let foundWord = -1;

    for (let si = 0; si < sentences.length; si++) {
      const sentence = sentences[si];
      if (!sentence) continue;

      if (adjustedTime >= sentence.start && adjustedTime < sentence.end) {
        foundSentence = si;

        // Find active word - highlight word until NEXT word starts
        for (let wi = 0; wi < sentence.words.length; wi++) {
          const word = sentence.words[wi];
          if (!word) continue;

          const nextWord = sentence.words[wi + 1];
          const wordEnd = nextWord ? nextWord.start : sentence.end;

          if (adjustedTime >= word.start && adjustedTime < wordEnd) {
            foundWord = wi;
            break;
          }
        }
        break;
      }
    }

    // Find active translation based on current time
    let foundTranslation: string | null = null;
    for (const trans of userTranslations) {
      if (adjustedTime >= trans.start && adjustedTime < trans.end) {
        foundTranslation = trans.text;
        break;
      }
    }

    setActiveSentenceIndex(foundSentence);
    setActiveWordIndex(foundWord);
    setActiveTranslation(foundTranslation);
  }, [currentTime, sentences, offset, userTranslations]);

  if (activeSentenceIndex === -1) return null;

  const currentSentence = sentences[activeSentenceIndex];
  if (!currentSentence) return null;

  // Use the active translation from clip_translations table
  const translatedSentence = showTranslation ? activeTranslation : null;

  return (
    <div className="absolute top-[60%] left-0 right-0 flex flex-col items-center px-4 z-20 pointer-events-none">
      {/* Main subtitle */}
      <div className="flex flex-wrap justify-center items-baseline gap-x-6 max-w-[90%]">
        {currentSentence.words.map((wordObj, index) => (
          <span
            key={index}
            className={`font-bold text-4xl uppercase tracking-wide transition-all duration-75 ${
              index === activeWordIndex ? "text-yellow-400" : "text-white"
            }`}
            style={{
              textShadow: "3px 3px 6px rgba(0,0,0,0.9)",
              transform: index === activeWordIndex ? "scale(1.15)" : "scale(1)",
            }}
          >
            {wordObj.word}
          </span>
        ))}
      </div>

      {/* Translation in parentheses */}
      {translatedSentence && (
        <div className="mt-2 text-white/80 text-xl" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.9)" }}>
          ({translatedSentence})
        </div>
      )}
    </div>
  );
}
