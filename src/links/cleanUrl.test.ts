import { describe, expect, it } from "vitest";
import { cleanUrl, findWebAddresses } from "./cleanUrl";

describe("cleanUrl", () => {
  it("turns any YouTube video link into a plain watch link", () => {
    expect(cleanUrl("https://youtu.be/aircAruvnKk?si=Xy12abc&t=42")).toBe("https://www.youtube.com/watch?v=aircAruvnKk");
  });

  it("drops YouTube playlist and tracking parameters from watch links", () => {
    expect(cleanUrl("https://www.youtube.com/watch?v=aircAruvnKk&list=PLZHQ&index=2&pp=ygU")).toBe(
      "https://www.youtube.com/watch?v=aircAruvnKk",
    );
  });

  it("drops utm and click-id parameters from articles", () => {
    expect(cleanUrl("https://example.com/news/story?utm_source=x&utm_medium=social&fbclid=abc")).toBe("https://example.com/news/story");
  });

  it("drops the Guardian's CMP share parameter", () => {
    expect(cleanUrl("https://www.theguardian.com/science/2026/nov/10/a-story?CMP=share_btn_url")).toBe(
      "https://www.theguardian.com/science/2026/nov/10/a-story",
    );
  });

  it("keeps parameters that pick the content", () => {
    expect(cleanUrl("https://example.com/article?id=42&page=2&utm_campaign=x")).toBe("https://example.com/article?id=42&page=2");
  });

  it("drops the fragment", () => {
    expect(cleanUrl("https://example.com/article#comments")).toBe("https://example.com/article");
  });
});

describe("findWebAddresses", () => {
  it("finds every link in pasted text, cleaned and without repeats", () => {
    const pasted = `Watch https://youtu.be/aircAruvnKk?si=abc and
https://www.youtube.com/watch?v=aircAruvnKk&feature=share
then read https://example.com/story?utm_source=x.`;

    expect(findWebAddresses(pasted)).toEqual(["https://www.youtube.com/watch?v=aircAruvnKk", "https://example.com/story"]);
  });

  it("accepts YouTube links pasted without a scheme", () => {
    expect(findWebAddresses("youtu.be/aircAruvnKk")).toEqual(["https://www.youtube.com/watch?v=aircAruvnKk"]);
  });

  it("finds nothing in plain words", () => {
    expect(findWebAddresses("no links here")).toEqual([]);
  });
});
