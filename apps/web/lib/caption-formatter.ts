import Anthropic from '@anthropic-ai/sdk';

type CaptionCue = {
  start: number;
  end: number;
  text: string;
};

const client = new Anthropic();

/**
 * Uses Claude to format raw transcript chunks into proper sentences.
 */
export async function formatCaptionsWithAI(cues: CaptionCue[]): Promise<CaptionCue[]> {
  if (cues.length === 0) return [];

  // Combine all text with markers for timing reference
  const markedText = cues.map((cue, i) => `[${i}]${cue.text}`).join(' ');

  const prompt = `You are a transcript formatter. Given a raw auto-generated transcript with timing markers [0], [1], etc., format it into proper sentences with correct punctuation and capitalization.

Rules:
1. Keep all timing markers [N] in place - they mark word boundaries
2. Add proper punctuation (periods, commas, question marks)
3. Capitalize sentence beginnings
4. Fix obvious speech recognition errors if clear from context
5. Keep the text natural and readable
6. Each output line should be one complete sentence or thought (max ~60 characters for readability)

Input transcript:
${markedText}

Output the formatted sentences, one per line. Keep all [N] markers exactly as they appear.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (!content || content.type !== 'text') return fallbackMerge(cues);

    const formattedText = content.text;
    return parseFormattedCaptions(formattedText, cues);
  } catch (error) {
    console.error('AI caption formatting failed:', error);
    return fallbackMerge(cues);
  }
}

/**
 * Parse AI-formatted text back into timed caption cues.
 */
function parseFormattedCaptions(formattedText: string, originalCues: CaptionCue[]): CaptionCue[] {
  const lines = formattedText.split('\n').filter((line) => line.trim());
  const result: CaptionCue[] = [];

  for (const line of lines) {
    // Extract all marker indices from this line
    const matches = [...line.matchAll(/\[(\d+)\]/g)];
    const markers = matches
      .map((m) => m[1])
      .filter((v): v is string => v !== undefined)
      .map((v) => parseInt(v, 10));

    if (markers.length === 0) continue;

    const startIdx = Math.min(...markers);
    const endIdx = Math.max(...markers);

    // Remove markers from text
    const cleanText = line.replace(/\[\d+\]/g, '').trim();

    const startCue = originalCues[startIdx];
    const endCue = originalCues[endIdx];

    if (cleanText && startCue && endCue) {
      result.push({
        start: startCue.start,
        end: endCue.end,
        text: cleanText,
      });
    }
  }

  return result.length > 0 ? result : fallbackMerge(originalCues);
}

/**
 * Fallback: simple merging without AI.
 */
function fallbackMerge(cues: CaptionCue[], maxChars = 60): CaptionCue[] {
  if (cues.length === 0) return [];

  const merged: CaptionCue[] = [];
  let currentGroup: CaptionCue[] = [];
  let currentText = '';

  for (const cue of cues) {
    const text = cue.text.trim();
    const wouldBe = currentText + (currentText ? ' ' : '') + text;

    const firstCue = currentGroup[0];
    const lastCue = currentGroup[currentGroup.length - 1];

    if (currentText && wouldBe.length > maxChars && firstCue && lastCue) {
      merged.push({
        start: firstCue.start,
        end: lastCue.end,
        text: currentText,
      });
      currentGroup = [cue];
      currentText = text;
    } else {
      currentGroup.push(cue);
      currentText = wouldBe;
    }
  }

  if (currentGroup.length > 0) {
    const firstCue = currentGroup[0];
    const lastCue = currentGroup[currentGroup.length - 1];
    if (firstCue && lastCue) {
      merged.push({
        start: firstCue.start,
        end: lastCue.end,
        text: currentText,
      });
    }
  }

  return merged;
}
