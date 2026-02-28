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
Your task is to identify two types of segments:

1. SERMON segments: Parts where a pastor/speaker is explaining a specific Bible verse or passage.
   - The speaker must explicitly reference or quote a specific Bible verse (book + chapter + verse)
   - General spiritual advice without a specific verse reference is NOT a sermon segment
   - Include the verse reference (book, chapter, verse numbers)

2. TESTIMONY segments: Parts where someone shares a personal story or experience of faith.
   - Personal stories about how God worked in someone's life
   - Conversion stories, healing stories, life-changing experiences
   - Must be a coherent personal narrative, not just a brief mention

Rules:
- Each segment should be 60-300 seconds long (1-5 minutes)
- Skip: announcements, worship songs, prayers, greetings, transitions, casual chat
- Use the timestamps from the transcript to set accurate start_time and end_time
- Set start_time slightly before the segment begins (5-10 seconds buffer)
- Set end_time slightly after the segment ends (5-10 seconds buffer)
- One video can have multiple sermon and testimony segments
- If no sermon or testimony segments are found, set segments to empty array and explain in skipped_reason
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
