import { formatClock, transcriptText } from "../youtube/transcript";
import type { Capture, PageCapture, YouTubeCapture } from "./Capture";

export type FormatOptions = {
  includeTimestamps: boolean;
};

function factLines(facts: [string, string | undefined][]): string {
  return facts
    .filter((fact): fact is [string, string] => Boolean(fact[1]))
    .map(([label, value]) => `- ${label}: ${value}`)
    .join("\n");
}

function youTubeMarkdown(capture: YouTubeCapture, options: FormatOptions): string {
  const length = capture.durationSeconds ? formatClock(capture.durationSeconds) : undefined;
  const facts = factLines([
    ["Video", capture.url],
    ["Channel", capture.channel],
    ["Length", length],
    ["Captions", capture.captionsLabel],
  ]);
  const description = capture.description.trim();
  const sections = [`# ${capture.title}`, facts, `## Transcript\n\n${transcriptText(capture.cues, options.includeTimestamps)}`];

  if (description) {
    sections.push(`## Video description\n\n${description}`);
  }

  return sections.join("\n\n");
}

function pageMarkdown(capture: PageCapture): string {
  const facts = factLines([
    ["Source", capture.url],
    ["Site", capture.siteName],
    ["Author", capture.byline],
  ]);

  return [`# ${capture.title}`, facts, capture.markdown].join("\n\n");
}

export function captureMarkdown(capture: Capture, options: FormatOptions): string {
  if (capture.kind === "youtube") {
    return youTubeMarkdown(capture, options);
  }

  return pageMarkdown(capture);
}

export function captureSource(capture: Capture): string {
  const sources: Record<Capture["kind"], string> = {
    youtube: `the transcript of the YouTube video "${capture.title}"`,
    article: `the article "${capture.title}"`,
    selection: `an excerpt from "${capture.title}"`,
  };

  return sources[capture.kind];
}

export function capturePrompt(capture: Capture, template: string, options: FormatOptions): string {
  const values: Record<string, string> = {
    source: captureSource(capture),
    title: capture.title,
    url: capture.url,
    content: captureMarkdown(capture, options),
  };

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (placeholder, name: string) => values[name] ?? placeholder);
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

export function fileName(capture: Capture): string {
  const slug = capture.title
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${slug || "capture"}.md`;
}
