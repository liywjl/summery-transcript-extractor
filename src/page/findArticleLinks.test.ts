import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { findArticleLinks, isLikelyArticlePath } from "./findArticleLinks";

const documentFor = (body: string) =>
  new JSDOM(`<html><body>${body}</body></html>`, { url: "https://www.theguardian.com/uk" }).window.document;

const story = "/science/2026/nov/10/octopuses-dream-in-colour-say-researchers";

describe("findArticleLinks", () => {
  it("lists story links on a front page with their headlines", () => {
    const doc = documentFor(`<main><a href="${story}?CMP=fp">Octopuses dream in colour, say researchers</a></main>`);

    expect(findArticleLinks(doc)).toEqual([
      {
        url: `https://www.theguardian.com${story}`,
        title: "Octopuses dream in colour, say researchers",
        kind: "article",
        source: "theguardian.com",
      },
    ]);
  });

  it("uses the card's aria-label when the link itself has no text", () => {
    const doc = documentFor(`<a href="${story}" aria-label="Octopuses dream in colour, say researchers"></a>`);

    expect(findArticleLinks(doc)[0].title).toBe("Octopuses dream in colour, say researchers");
  });

  it("lists a story linked twice only once", () => {
    const doc = documentFor(`<a href="${story}">Octopuses dream in colour, say researchers</a><a href="${story}#comments">Octopuses dream in colour, say researchers today</a>`);

    expect(findArticleLinks(doc)).toHaveLength(1);
  });

  it("skips navigation, section pages and short labels", () => {
    const doc = documentFor(`
      <nav><a href="${story}">Octopuses dream in colour, say researchers</a></nav>
      <a href="/world/europe-news">Europe news and analysis today</a>
      <a href="${story}">More</a>`);

    expect(findArticleLinks(doc)).toEqual([]);
  });

  it("skips links to other sites", () => {
    const doc = documentFor(`<a href="https://example.com${story}">Octopuses dream in colour, say researchers</a>`);

    expect(findArticleLinks(doc)).toEqual([]);
  });

  it("names the source after the site when it is known", () => {
    const doc = documentFor(`<a href="${story}">Octopuses dream in colour, say researchers</a>`);

    expect(findArticleLinks(doc, "The Guardian")[0].source).toBe("The Guardian");
  });
});

describe("isLikelyArticlePath", () => {
  const path = (address: string) => isLikelyArticlePath(new URL(address, "https://news.example.com"));

  it("accepts long slugs", () => {
    expect(path("/2026/octopuses-dream-in-colour")).toBe(true);
  });

  it("accepts dated paths", () => {
    expect(path("/world/2026/nov/10/live")).toBe(true);
  });

  it("accepts numeric and opaque story ids", () => {
    expect(path("/news/world-europe-67123456")).toBe(true);
    expect(path("/news/articles/c4g0zx8x9xo")).toBe(true);
  });

  it("rejects home and section pages", () => {
    expect(path("/")).toBe(false);
    expect(path("/sport")).toBe(false);
    expect(path("/world/europe-news")).toBe(false);
  });
});
