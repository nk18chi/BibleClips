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
   - IMPORTANT: Pastors often cite many verses in rapid succession to support ONE main point. This is ONE segment, not many. Use the PRIMARY verse being taught as the reference
   - Only create a NEW segment when the speaker clearly transitions to a DIFFERENT main topic (not just citing a supporting verse)
   - A good sermon clip should be a self-contained teaching moment that makes sense on its own
   - Aim for fewer, longer segments rather than many short ones. 5-10 segments per hour-long video is typical

2. TESTIMONY segments: A continuous personal story or experience of faith.
   - Must be a coherent narrative with a beginning, middle, and end
   - Find the natural start and end of the story — testimony clips can be up to 10 minutes since the full story matters

CRITICAL RULES for timestamps:
- start_time and end_time MUST come directly from the transcript timestamps — use the actual [seconds] values
- Do NOT round to nice numbers. If the segment starts at [142.8s], use 142.8, not 140 or 150
- start_time = timestamp of the first line where the topic/verse begins (subtract ~5s buffer)
- end_time = timestamp of the last line before the speaker transitions away (add ~5s buffer)
- SERMON segments: MUST be 30-120 seconds (0.5-2 minutes). This is for short-form reel content — keep clips concise and focused. If a speaker discusses one verse for 5 minutes, find the best 1-2 minute portion that captures the core message. NEVER exceed 120 seconds for sermon clips
- TESTIMONY segments: Can be up to 10 minutes (600 seconds) since the full story matters. Capture the complete narrative

CRITICAL RULES for verse references:
- Auto-captions often break verse references across lines or mangle formatting. Look for patterns like:
  "Ephesians chapter 1" (chapter only — look at surrounding context to identify the verse)
  "Romans 8 28" or "Romans 8:28" (standard reference)
  "Colossians 1:1 16" (caption split — this means Colossians 1:16, not 1:1)
  "first John 3:16" or "1 John 3:16" (numbered books)
  "verse 11 and 12" or "verses 11 through 12" (verse ranges)
- When the speaker quotes a passage but only mentions the book or chapter (e.g., "Ephesians chapter 1 says..."), identify the specific verse(s) from the quoted text content. For example, "it is in Christ that we find out who we are and what we're living for" is Ephesians 1:11-12 (MSG), not 1:1
- Use your knowledge of the Bible to match quoted text to the correct verse numbers
- verse_end should be different from verse_start when the speaker discusses a range (e.g., Romans 8:28-29 → verse_start=28, verse_end=29)
- Spoken patterns like "verse 11 and 12", "verses 11 to 14", "11 through 13" indicate a range
- If only a single verse is discussed, set verse_end to null (NOT the same number as verse_start — e.g., for Romans 8:1 use verse_start=1, verse_end=null, NOT verse_end=1)
- Use the exact verse numbers the speaker mentions or quotes

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

  const result = AnalysisResultSchema.parse(JSON.parse(content));

  // Post-process: fix verse_end when same as verse_start (should be null)
  for (const seg of result.segments) {
    if (seg.type === "sermon" && seg.verse.verse_end === seg.verse.verse_start) {
      seg.verse.verse_end = null;
    }
  }

  return result;
}

export {
  analyzeSegments,
  type AnalysisResult,
  type DetectedSegment,
  type SermonSegment,
  type TestimonySegment,
};
