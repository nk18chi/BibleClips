import { exec } from "child_process";
import { promisify } from "util";
import { unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import OpenAI from "openai";

const execAsync = promisify(exec);

export type WordTiming = {
  word: string;
  start: number;
  end: number;
};

/**
 * Transcribes YouTube audio using yt-dlp + OpenAI Whisper.
 * Runs locally with browser cookies for YouTube authentication.
 * Returns word-level timestamps.
 */
export async function transcribeClipWithWhisper(
  videoId: string,
  startTime: number,
  endTime: number
): Promise<WordTiming[]> {
  // Transcription only works locally
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("Transcription is only available in local development");
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const duration = endTime - startTime;
  const audioPath = join(tmpdir(), `${videoId}_${Date.now()}.mp3`);

  try {
    // Download audio with yt-dlp using browser cookies
    console.log(`Downloading audio for ${videoId} (${startTime}-${endTime})...`);

    const ytdlpCmd = [
      "yt-dlp",
      "-x",
      "--audio-format mp3",
      `--postprocessor-args "ffmpeg:-ss ${startTime.toFixed(2)} -t ${duration.toFixed(2)}"`,
      "-o", `"${audioPath}"`,
      "--cookies-from-browser chrome",
      `"https://www.youtube.com/watch?v=${videoId}"`,
    ].join(" ");

    await execAsync(ytdlpCmd, { timeout: 120000 });

    // Transcribe with OpenAI Whisper
    console.log("Transcribing with Whisper...");

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const audioFile = await readFile(audioPath);

    const response = await openai.audio.transcriptions.create({
      file: new File([audioFile], "audio.mp3", { type: "audio/mpeg" }),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    // Adjust timestamps relative to clip start time
    const words: WordTiming[] = (response.words ?? []).map((w) => ({
      word: w.word,
      start: startTime + w.start,
      end: startTime + w.end,
    }));

    console.log(`Transcribed ${words.length} words`);
    return words;
  } finally {
    // Cleanup temp file
    try {
      await unlink(audioPath);
    } catch {
      // Ignore cleanup errors
    }
  }
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
