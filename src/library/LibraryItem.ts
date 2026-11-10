import type { Capture } from "../capture/Capture";

export type LibraryItem = {
  url: string;
  kind: Capture["kind"];
  title: string;
  source?: string;
  wordCount: number;
  savedAt: number;
  usedAt: number;
};

export type SavedCapture = {
  item: LibraryItem;
  capture: Capture;
};
