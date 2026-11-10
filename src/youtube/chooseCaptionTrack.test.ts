import { describe, expect, it } from "vitest";
import { captionTrackLabel, chooseCaptionTrack, type CaptionTrack } from "./chooseCaptionTrack";

const track = (languageCode: string, kind?: string): CaptionTrack => ({
  baseUrl: `https://www.youtube.com/api/timedtext?lang=${languageCode}&kind=${kind ?? ""}`,
  languageCode,
  kind,
});

describe("chooseCaptionTrack", () => {
  it("prefers written captions in the reader's language", () => {
    const tracks = [track("de"), track("en", "asr"), track("en")];

    expect(chooseCaptionTrack(tracks, ["en-GB", "en"])).toEqual(track("en"));
  });

  it("falls back to auto-generated captions in the reader's language", () => {
    const tracks = [track("de"), track("en", "asr")];

    expect(chooseCaptionTrack(tracks, ["en-GB"])).toEqual(track("en", "asr"));
  });

  it("uses the reader's second language before the original audio", () => {
    const tracks = [track("es", "asr"), track("fr")];

    expect(chooseCaptionTrack(tracks, ["en", "fr"])).toEqual(track("fr"));
  });

  it("uses the original audio's captions when no preferred language exists", () => {
    const tracks = [track("de"), track("ja", "asr")];

    expect(chooseCaptionTrack(tracks, ["en"])).toEqual(track("ja", "asr"));
  });

  it("returns nothing when a video has no captions", () => {
    expect(chooseCaptionTrack([], ["en"])).toBeUndefined();
  });
});

describe("captionTrackLabel", () => {
  it("joins the runs YouTube's mobile client sends", () => {
    const labelled = { ...track("en", "asr"), name: { runs: [{ text: "English (auto-generated)" }] } };

    expect(captionTrackLabel(labelled)).toBe("English (auto-generated)");
  });

  it("falls back to the language code", () => {
    expect(captionTrackLabel(track("pt-BR"))).toBe("pt-BR");
  });
});
