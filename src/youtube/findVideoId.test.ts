import { describe, expect, it } from "vitest";
import { findVideoId } from "./findVideoId";

describe("findVideoId", () => {
  it("reads the v parameter of a watch page", () => {
    expect(findVideoId("https://www.youtube.com/watch?v=aircAruvnKk&t=42s")).toBe("aircAruvnKk");
  });

  it("reads short youtu.be links", () => {
    expect(findVideoId("https://youtu.be/aircAruvnKk?si=abc")).toBe("aircAruvnKk");
  });

  it("reads shorts, live and embed paths", () => {
    expect(findVideoId("https://www.youtube.com/shorts/aircAruvnKk")).toBe("aircAruvnKk");
    expect(findVideoId("https://www.youtube.com/live/aircAruvnKk?feature=share")).toBe("aircAruvnKk");
    expect(findVideoId("https://www.youtube.com/embed/aircAruvnKk")).toBe("aircAruvnKk");
  });

  it("reads mobile watch pages", () => {
    expect(findVideoId("https://m.youtube.com/watch?v=aircAruvnKk")).toBe("aircAruvnKk");
  });

  it("ignores YouTube pages that are not a video", () => {
    expect(findVideoId("https://www.youtube.com/@3blue1brown/videos")).toBeUndefined();
  });

  it("ignores other sites with a v parameter", () => {
    expect(findVideoId("https://example.com/watch?v=aircAruvnKk")).toBeUndefined();
  });

  it("ignores missing and malformed addresses", () => {
    expect(findVideoId(undefined)).toBeUndefined();
    expect(findVideoId("chrome://extensions")).toBeUndefined();
    expect(findVideoId("not a url")).toBeUndefined();
  });
});
