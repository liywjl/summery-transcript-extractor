import { describe, expect, it } from "vitest";
import type { LibraryItem } from "./LibraryItem";
import { staleItems } from "./staleItems";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 10, 10);

const itemUsedDaysAgo = (days: number): LibraryItem => ({
  url: `https://www.youtube.com/watch?v=video${days}`,
  kind: "youtube",
  title: `Video used ${days} days ago`,
  wordCount: 1200,
  savedAt: now - 100 * DAY_MS,
  usedAt: now - days * DAY_MS,
});

describe("staleItems", () => {
  it("forgets captures not used within the kept days", () => {
    const items = [itemUsedDaysAgo(2), itemUsedDaysAgo(31)];

    expect(staleItems(items, "30", now)).toEqual([itemUsedDaysAgo(31)]);
  });

  it("keeps a capture that was saved long ago but used recently", () => {
    expect(staleItems([itemUsedDaysAgo(1)], "7", now)).toEqual([]);
  });

  it("keeps everything when captures are kept until deleted", () => {
    expect(staleItems([itemUsedDaysAgo(400)], "forever", now)).toEqual([]);
  });

  it("leaves session captures for Chrome to clear", () => {
    expect(staleItems([itemUsedDaysAgo(400)], "session", now)).toEqual([]);
  });
});
