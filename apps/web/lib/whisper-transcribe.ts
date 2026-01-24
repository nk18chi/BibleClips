import { exec } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import OpenAI from "openai";

const execAsync = promisify(exec);

// Lazy initialization to allow env vars to load first
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI();
  }
  return openaiClient;
}

export type WordTiming = {
  word: string;
  start: number;
  end: number;
};

/**
 * Downloads YouTube audio for a specific time range and transcribes with Whisper.
 * Returns word-level timestamps.
 */
export async function transcribeClipWithWhisper(
  videoId: string,
  startTime: number,
  endTime: number
): Promise<WordTiming[]> {
  const tempDir = tmpdir();
  const audioPath = join(tempDir, `${videoId}_${Date.now()}.mp3`);

  try {
    // Download audio segment using yt-dlp with ffmpeg post-processing
    const duration = endTime - startTime;
    const ytdlpCmd = `yt-dlp -x --audio-format mp3 --postprocessor-args "ffmpeg:-ss ${startTime} -t ${duration}" -o "${audioPath}" "https://www.youtube.com/watch?v=${videoId}"`;

    console.log("Downloading audio...");
    await execAsync(ytdlpCmd, { timeout: 120000 });

    // Read the audio file
    const audioBuffer = await readFile(audioPath);
    const audioFile = new File([audioBuffer], "audio.mp3", { type: "audio/mpeg" });

    console.log("Transcribing with Whisper...");
    // Use Whisper API with word-level timestamps
    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    // Extract word timings and adjust to video time
    const words: WordTiming[] = [];

    if (transcription.words) {
      for (const wordData of transcription.words) {
        words.push({
          word: wordData.word,
          start: startTime + wordData.start,
          end: startTime + wordData.end,
        });
      }
    }

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
