export type Cue = {
  startMs: number;
  text: string;
};

export type Paragraph = Cue;

type CaptionEvent = {
  tStartMs?: number;
  segs?: { utf8?: string }[];
};

export type CaptionJson = {
  events?: CaptionEvent[];
};

const PARAGRAPH_MIN_MS = 20_000;
const PARAGRAPH_MAX_MS = 45_000;
const SENTENCE_END = /[.!?…]["')\]]?$/;

function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function cuesFromCaptionJson(json: CaptionJson): Cue[] {
  const cues = (json.events ?? []).map((event) => ({
    startMs: event.tStartMs ?? 0,
    text: tidy((event.segs ?? []).map((seg) => seg.utf8 ?? "").join("")),
  }));

  return cues.filter((cue) => cue.text.length > 0);
}

export function paragraphsFromCues(cues: Cue[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const cue of cues) {
    const current = paragraphs.at(-1);

    if (!current) {
      paragraphs.push({ ...cue });
      continue;
    }

    const elapsed = cue.startMs - current.startMs;
    const isSentenceBreak = elapsed >= PARAGRAPH_MIN_MS && SENTENCE_END.test(current.text);
    const isTooLong = elapsed >= PARAGRAPH_MAX_MS;

    if (isSentenceBreak || isTooLong) {
      paragraphs.push({ ...cue });
      continue;
    }

    current.text = `${current.text} ${cue.text}`;
  }

  return paragraphs;
}

export function formatClock(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor(totalSeconds / 3600);
  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours === 0) {
    return `${minutes}:${paddedSeconds}`;
  }

  return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
}

export function parseClock(clock: string): number {
  const seconds = clock
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);

  return seconds * 1000;
}

export function transcriptText(cues: Cue[], includeTimestamps: boolean): string {
  const paragraphs = paragraphsFromCues(cues);

  if (!includeTimestamps) {
    return paragraphs.map((paragraph) => paragraph.text).join("\n\n");
  }

  return paragraphs.map((paragraph) => `[${formatClock(paragraph.startMs / 1000)}] ${paragraph.text}`).join("\n\n");
}
