import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { isArticlePage } from "./isArticlePage";

const longParagraph = `<p>${"Researchers watched sleeping octopuses flash through colour patterns they use when awake. ".repeat(4)}</p>`;

const documentFor = (head: string, body: string) => new JSDOM(`<html><head>${head}</head><body>${body}</body></html>`).window.document;

describe("isArticlePage", () => {
  it("trusts pages that say they are articles", () => {
    expect(isArticlePage(documentFor('<meta property="og:type" content="article">', "<p>Short</p>"))).toBe(true);
  });

  it("treats pages with long paragraphs as articles", () => {
    expect(isArticlePage(documentFor("", longParagraph.repeat(4)))).toBe(true);
  });

  it("treats a page of headlines as a front page", () => {
    const headlines = Array.from({ length: 30 }, (_, index) => `<a href="/story-${index}">Headline number ${index}</a>`).join("");

    expect(isArticlePage(documentFor('<meta property="og:type" content="website">', headlines))).toBe(false);
  });
});
