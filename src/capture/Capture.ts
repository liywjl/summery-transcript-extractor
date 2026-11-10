import type { Cue } from "../youtube/transcript";

export type YouTubeCapture = {
  kind: "youtube";
  title: string;
  url: string;
  channel: string;
  durationSeconds?: number;
  captionsLabel?: string;
  description: string;
  cues: Cue[];
};

export type PageCapture = {
  kind: "article" | "selection";
  title: string;
  url: string;
  siteName?: string;
  byline?: string;
  markdown: string;
};

export type Capture = YouTubeCapture | PageCapture;
