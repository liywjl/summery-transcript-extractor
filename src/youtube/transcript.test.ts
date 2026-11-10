import { describe, expect, it } from "vitest";
import { cuesFromCaptionJson, formatClock, paragraphsFromCues, parseClock, transcriptText } from "./transcript";

describe("cuesFromCaptionJson", () => {
  it("joins word segments of auto-generated captions", () => {
    const json = {
      events: [
        { tStartMs: 1360, segs: [{ utf8: "we're" }, { utf8: " no" }, { utf8: " strangers" }] },
        { tStartMs: 3350, segs: [{ utf8: "\n" }] },
        { tStartMs: 3400, segs: [{ utf8: "to   love" }] },
      ],
    };

    expect(cuesFromCaptionJson(json)).toEqual([
      { startMs: 1360, text: "we're no strangers" },
      { startMs: 3400, text: "to love" },
    ]);
  });

  it("skips events without text", () => {
    expect(cuesFromCaptionJson({ events: [{ tStartMs: 0 }] })).toEqual([]);
  });

  it("handles a response without events", () => {
    expect(cuesFromCaptionJson({})).toEqual([]);
  });
});

describe("paragraphsFromCues", () => {
  it("keeps cues together until a sentence ends after twenty seconds", () => {
    const cues = [
      { startMs: 0, text: "Welcome to the talk." },
      { startMs: 10_000, text: "Today we cover caching." },
      { startMs: 21_000, text: "First, a story." },
    ];

    expect(paragraphsFromCues(cues)).toEqual([
      { startMs: 0, text: "Welcome to the talk. Today we cover caching." },
      { startMs: 21_000, text: "First, a story." },
    ]);
  });

  it("does not break mid-sentence before forty-five seconds", () => {
    const cues = [
      { startMs: 0, text: "so the thing about" },
      { startMs: 30_000, text: "caches is" },
    ];

    expect(paragraphsFromCues(cues)).toEqual([{ startMs: 0, text: "so the thing about caches is" }]);
  });

  it("breaks unpunctuated captions after forty-five seconds", () => {
    const cues = [
      { startMs: 0, text: "so the thing about" },
      { startMs: 46_000, text: "caches is" },
    ];

    expect(paragraphsFromCues(cues)).toHaveLength(2);
  });
});

describe("formatClock", () => {
  it("shows minutes and seconds for short videos", () => {
    expect(formatClock(65)).toBe("1:05");
  });

  it("shows hours for long talks", () => {
    expect(formatClock(3725)).toBe("1:02:05");
  });
});

describe("parseClock", () => {
  it("reads minutes and seconds", () => {
    expect(parseClock("1:05")).toBe(65_000);
  });

  it("reads hours", () => {
    expect(parseClock("1:02:05")).toBe(3_725_000);
  });
});

describe("transcriptText", () => {
  const cues = [
    { startMs: 0, text: "Hello there." },
    { startMs: 25_000, text: "Next point." },
  ];

  it("starts each paragraph with its timestamp", () => {
    expect(transcriptText(cues, true)).toBe("[0:00] Hello there.\n\n[0:25] Next point.");
  });

  it("leaves timestamps out when asked", () => {
    expect(transcriptText(cues, false)).toBe("Hello there.\n\nNext point.");
  });
});
