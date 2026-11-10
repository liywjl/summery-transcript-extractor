import type { Capture } from "../capture/Capture";
import { wordCount } from "../capture/formatCapture";
import type { IconName } from "../icons";
import { formatClock } from "../youtube/transcript";

export const KINDS: Record<Capture["kind"], { icon: IconName; label: string; loading: string }> = {
  youtube: { icon: "youtube", label: "YouTube transcript", loading: "Reading captions from YouTube…" },
  article: { icon: "article", label: "Article", loading: "Reading the page…" },
  selection: { icon: "selection", label: "Selection", loading: "Reading your selection…" },
};

export function tokenEstimate(text: string): string {
  const tokens = Math.round(text.length / 4);

  if (tokens < 1000) {
    return `≈${tokens} tokens`;
  }

  return `≈${(tokens / 1000).toFixed(1)}k tokens`;
}

function sourceFacts(capture: Capture): string[] {
  if (capture.kind === "youtube") {
    const length = capture.durationSeconds ? formatClock(capture.durationSeconds) : "";

    return [capture.channel, length];
  }

  return [capture.siteName ?? new URL(capture.url).hostname];
}

export function captureFacts(capture: Capture, markdown: string): string[] {
  return [...sourceFacts(capture), `${wordCount(markdown).toLocaleString()} words`].filter(Boolean);
}
