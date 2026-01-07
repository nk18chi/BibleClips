"use client";

import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/components/providers/language-provider";

type WordTiming = {
  word: string;
  word_ja?: string;
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
  currentTime: number;
  offset?: number;
  maxWordsPerSentence?: number;
  videoLanguage?: 'en' | 'ja';
};

const DEFAULT_OFFSET = 0; // No offset needed with Whisper timestamps

/**
 * Groups word timings into display sentences based on pauses and word count.
 */
function groupIntoSentences(words: WordTiming[], maxWords = 6, pauseThreshold = 0.4): Sentence[] {
  if (words.length === 0) return [];

  const sentences: Sentence[] = [];
  let currentWords: WordTiming[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    const nextWord = words[i + 1];

    currentWords.push(word);

    // Check if we should end the sentence
    const endsPunctuation = /[.!?]$/.test(word.word);
    const hasLongPause = nextWord && nextWord.start - word.end > pauseThreshold;
    const reachedMaxWords = currentWords.length >= maxWords;

    if (endsPunctuation || hasLongPause || reachedMaxWords || !nextWord) {
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

export function SubtitleOverlay({ wordTimings, currentTime, offset = DEFAULT_OFFSET, maxWordsPerSentence = 6, videoLanguage = 'en' }: SubtitleOverlayProps) {
  const { language: userLanguage } = useLanguage();
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(-1);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);

  // Should show translation if user language differs from video language
  const showTranslation = userLanguage !== videoLanguage;

  // Group words into display sentences
  const sentences = useMemo(() => groupIntoSentences(wordTimings, maxWordsPerSentence), [wordTimings, maxWordsPerSentence]);

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

    setActiveSentenceIndex(foundSentence);
    setActiveWordIndex(foundWord);
  }, [currentTime, sentences, offset]);

  if (activeSentenceIndex === -1) return null;

  const currentSentence = sentences[activeSentenceIndex];
  if (!currentSentence) return null;

  // Get sentence translation from first word's word_ja (stores full sentence translation)
  const firstWord = currentSentence.words[0];
  const translatedSentence = showTranslation && firstWord?.word_ja ? firstWord.word_ja : null;

  return (
    <div className='absolute top-[60%] left-0 right-0 flex flex-col items-center px-4 z-20 pointer-events-none'>
      {/* Main subtitle */}
      <div className='flex flex-wrap justify-center items-baseline gap-x-6 max-w-[90%]'>
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
        <div className='mt-2 text-white/80 text-xl' style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.9)" }}>
          ({translatedSentence})
        </div>
      )}
    </div>
  );
}
