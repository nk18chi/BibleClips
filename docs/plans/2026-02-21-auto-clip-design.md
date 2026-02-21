# Auto-Clip: Automated Sermon & Testimony Clip Detection

## Overview

Automate clip creation from registered YouTube channels. A CLI script analyzes video transcripts using GPT-4o to detect sermon segments (with Bible verse references) and testimony segments, saving them as PENDING clips for human review.

## Goals

- Reduce manual clipping effort by auto-detecting sermon and testimony segments
- Keep costs minimal by using free YouTube captions instead of Whisper for analysis
- Validate feasibility with a small batch (2-3 videos) before scaling to 10

## Scope

- **In scope**: Sermon clips (verse detection), Testimony clips (story detection)
- **Out of scope**: Song clips (remain manual), auto-approval, Whisper transcription for analysis

## Architecture

### Execution Flow

```
pnpm auto-clip [--limit 10] [--channel <handle>] [--dry-run]

1. Fetch pending videos from work_queue_videos (max 10, channel filter optional)

2. For each video:
   a. Download YouTube captions via yt-dlp (json3 format)
      - Prefer manual captions > auto-generated captions
      - No captions → skip video (log reason)
      - Video too long (>2 hours) → skip (token limit guard)

   b. Send full transcript + prompt to GPT-4o (Structured Output)
      → Response: array of detected segments
      [
        {
          type: "sermon",
          title: "The Great Commission",
          start_time: 342.5,
          end_time: 589.0,
          verse: { book: "Matthew", chapter: 28, verse_start: 19, verse_end: 20 }
        },
        {
          type: "testimony",
          title: "How God changed my marriage",
          start_time: 890.0,
          end_time: 1045.0
        }
      ]

   c. Save each segment to DB as PENDING clip
      - sermon → clips + clip_verses
      - testimony → clips only (with title)

   d. Update work_queue_videos.clips_created counter

3. Print execution summary
```

### Subtitle Retrieval

Using yt-dlp (already in the project for Whisper integration):

```bash
yt-dlp --write-auto-sub --sub-lang en --skip-download --sub-format json3 <URL>
```

json3 format provides millisecond timestamps per segment, enabling accurate start/end time mapping.

**Fallback strategy**: YouTube captions for analysis (free). Whisper API only used later for display subtitle generation on approved clips (not in this phase).

### GPT-4o Analysis

**Prompt design**: Instructs GPT-4o to act as a sermon video analysis expert. Key rules:
- Sermon segments must reference a specific Bible verse (not just general topics)
- Testimony segments are personal stories/experiences
- Skip announcements, worship songs, prayers, casual chat
- Target segment length: 60-300 seconds
- Use subtitle timestamps for start/end times

**Response format**: Structured Output with JSON schema enforced via `response_format: { type: "json_schema" }`. Schema defined with Zod:

```typescript
const SegmentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("sermon"),
    title: z.string(),
    start_time: z.number(),
    end_time: z.number(),
    verse: z.object({
      book: z.string(),
      chapter: z.number(),
      verse_start: z.number(),
      verse_end: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal("testimony"),
    title: z.string(),
    start_time: z.number(),
    end_time: z.number(),
  }),
]);

const AnalysisResultSchema = z.object({
  segments: z.array(SegmentSchema),
  skipped_reason: z.string().optional(),
});
```

### Approval Flow

All auto-generated clips are saved as **PENDING**. Human review in the workspace is required before publication. Once accuracy is validated, this can be relaxed.

## File Structure

```
scripts/
  auto-clip.ts          # Main CLI entry point
  lib/
    fetch-subtitles.ts  # yt-dlp subtitle download
    analyze-segments.ts # GPT-4o analysis
    save-clips.ts       # DB save logic
```

## CLI Options

```bash
pnpm auto-clip                              # Process up to 10 pending videos
pnpm auto-clip --limit 3                    # Process up to 3 videos
pnpm auto-clip --channel @saddlebackchurch  # Filter by channel
pnpm auto-clip --dry-run                    # Show analysis results without saving
```

## Error Handling

- Subtitle fetch failure → skip video, continue to next
- GPT analysis failure → retry once, then skip
- DB save failure → rollback, log error
- Each video processed independently (one failure doesn't affect others)

## Cost Estimate (10 videos)

| API | Purpose | Cost |
|-----|---------|------|
| YouTube Data API | Caption track check | Free tier |
| yt-dlp | Subtitle download | Free |
| GPT-4o | Segment analysis x10 | ~$1-$3 |
| Whisper API | Not used in this phase | $0 |

**Total for verification phase: ~$1-$3**

## Safety Constraints

- Hard-coded maximum: 10 videos per run
- 1 GPT call per video (max 2 with retry)
- `--dry-run` for pre-validation
- Videos >2 hours skipped (token limit guard)

## Verification Criteria

The proof-of-concept is successful if:
1. YouTube captions are retrievable and parseable
2. Detected segment start/end times are reasonable
3. Verse references are accurate (correct book/chapter/verse)
4. Testimony segments have appropriate boundaries and titles

**Validation plan**: Start with 2-3 videos using `--dry-run`, review output manually, then expand to 10.

## Future Enhancements (post-verification)

- Confidence-based auto-approval
- Scheduled execution (cron)
- Whisper fallback for videos without captions
- Category auto-assignment for sermon clips
- Japanese subtitle auto-generation on approved clips
