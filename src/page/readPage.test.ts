import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { readPage } from "./readPage";

const longParagraph = `<p>${"Researchers watched sleeping octopuses flash through colour patterns they use when awake. ".repeat(4)}</p>`;

const headlines = Array.from(
  { length: 5 },
  (_, index) => `<a href="/science/2026/nov/10/octopus-story-number-${index}">Octopus story number ${index} makes the news</a>`,
).join("");

const documentFor = (body: string, url = "https://www.theguardian.com/uk") =>
  new JSDOM(`<html><head><title>News</title></head><body>${body}</body></html>`, { url }).window.document;

describe("readPage", () => {
  it("reads an article", () => {
    expect(readPage(documentFor(`<article><h1>Octopuses</h1>${longParagraph.repeat(4)}</article>`)).shape).toBe("article");
  });

  it("lists the stories on a front page", () => {
    const reading = readPage(documentFor(headlines));

    expect(reading.shape).toBe("listing");
  });

  it("reads a front page as a page when asked for the whole page", () => {
    expect(readPage(documentFor(headlines), undefined, { isWholePage: true }).shape).toBe("article");
  });

  it("reads a page with only a couple of links as a page", () => {
    expect(readPage(documentFor(`<p>Welcome</p><a href="/science/2026/nov/10/one-octopus-story-here">One octopus story here today</a>`)).shape).toBe("article");
  });

  it("lists the videos on a YouTube page that is not a video", () => {
    const doc = documentFor(`<a href="/watch?v=aircAruvnKk">But what is a neural network?</a>`, "https://www.youtube.com/@3blue1brown/videos");

    expect(readPage(doc)).toMatchObject({ shape: "listing", links: [{ title: "But what is a neural network?" }] });
  });

  it("reads a selection as a selection", () => {
    const reading = readPage(documentFor(headlines), "<p>Octopuses dream in colour, say researchers who watched them sleep.</p>");

    expect(reading).toMatchObject({ shape: "article", extract: { isSelection: true } });
  });
});
