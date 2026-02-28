import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import type { TranscriptSegment } from "./fetch-subtitles";

const SermonSegmentSchema = z.object({
  type: z.literal("sermon"),
  title: z.string().describe("Short descriptive title in English"),
  start_time: z.number().describe("Start time in seconds"),
  end_time: z.number().describe("End time in seconds"),
  verse: z.object({
    book: z.string().describe("Bible book name in English, e.g. Matthew, Genesis, Psalms"),
    chapter: z.number(),
    verse_start: z.number(),
    verse_end: z.number().nullable(),
  }),
});

const TestimonySegmentSchema = z.object({
  type: z.literal("testimony"),
  title: z.string().describe("Short descriptive title summarizing the testimony"),
  start_time: z.number().describe("Start time in seconds"),
  end_time: z.number().describe("End time in seconds"),
});

const AnalysisResultSchema = z.object({
  segments: z.array(z.discriminatedUnion("type", [SermonSegmentSchema, TestimonySegmentSchema])),
  skipped_reason: z.string().nullable().describe("If no segments found, explain why"),
});

type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
type SermonSegment = z.infer<typeof SermonSegmentSchema>;
type TestimonySegment = z.infer<typeof TestimonySegmentSchema>;
type DetectedSegment = SermonSegment | TestimonySegment;

const SYSTEM_PROMPT = `You are an expert at analyzing sermon and church service video transcripts.
Each transcript line has a timestamp in seconds: [123.4s] text

Your task is to identify two types of segments:

1. SERMON segments: A continuous section where the speaker explains or teaches on a specific Bible verse/passage.
   - The speaker must explicitly mention a Bible verse (book + chapter + verse)
   - Find where the speaker BEGINS discussing that verse and where they MOVE ON to a different topic
   - If the speaker discusses one verse for 3 minutes, that is ONE segment of ~180 seconds — do NOT split it into 60-second chunks
   - If the speaker references multiple verses in rapid succession as part of the SAME point, group them as ONE segment using the primary/main verse
   - Only create separate segments when the speaker clearly transitions to a different topic or verse

2. TESTIMONY segments: A continuous personal story or experience of faith.
   - Must be a coherent narrative with a beginning, middle, and end
   - Find the natural start and end of the story

CRITICAL RULES for timestamps:
- start_time and end_time MUST come directly from the transcript timestamps — use the actual [seconds] values
- Do NOT round to nice numbers. If the segment starts at [142.8s], use 142.8, not 140 or 150
- start_time = timestamp of the first line where the topic/verse begins (subtract ~5s buffer)
- end_time = timestamp of the last line before the speaker transitions away (add ~5s buffer)
- Segments should typically be 90-300 seconds (1.5-5 minutes). Very short segments (<60s) usually mean you are splitting too aggressively

CRITICAL RULES for verse references:
- verse_end should be different from verse_start when the speaker discusses a range (e.g., Romans 8:28-29 → verse_start=28, verse_end=29)
- If only a single verse is discussed, set verse_end to null
- Use the exact verse numbers the speaker mentions

Other rules:
- Skip: announcements, worship songs, prayers, greetings, transitions, casual chat
- Do NOT create overlapping segments
- If no segments are found, set segments to empty array and explain in skipped_reason
- Title should be concise English (max 60 characters)`;

const MAX_TRANSCRIPT_CHARS = 200_000; // ~50k tokens, well within GPT-4o 128k limit

async function analyzeSegments(
  transcript: TranscriptSegment[],
  videoTitle: string,
): Promise<AnalysisResult> {
  // Format transcript with timestamps for GPT
  const formattedTranscript = transcript
    .map((seg) => `[${seg.startSeconds.toFixed(1)}s] ${seg.text}`)
    .join("\n");

  if (formattedTranscript.length > MAX_TRANSCRIPT_CHARS) {
    return {
      segments: [],
      skipped_reason: `Transcript too long (${formattedTranscript.length} chars). Max: ${MAX_TRANSCRIPT_CHARS}`,
    };
  }

  const openai = new OpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Video title: "${videoTitle}"\n\nTranscript:\n${formattedTranscript}`,
      },
    ],
    response_format: zodResponseFormat(AnalysisResultSchema, "analysis_result"),
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { segments: [], skipped_reason: "Empty GPT response" };
  }

  return AnalysisResultSchema.parse(JSON.parse(content));
}

export {
  analyzeSegments,
  type AnalysisResult,
  type DetectedSegment,
  type SermonSegment,
  type TestimonySegment,
};
