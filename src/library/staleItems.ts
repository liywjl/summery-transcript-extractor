import type { KeepCaptures } from "../settings";
import type { LibraryItem } from "./LibraryItem";

const DAY_MS = 24 * 60 * 60 * 1000;

export function staleItems(items: LibraryItem[], keep: KeepCaptures, now: number): LibraryItem[] {
  if (keep === "session" || keep === "forever") {
    return [];
  }

  const oldestUse = now - Number(keep) * DAY_MS;

  return items.filter((item) => item.usedAt < oldestUse);
}
