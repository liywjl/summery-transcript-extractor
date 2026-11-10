import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { extractArticle, extractSelection, hasMeaningfulSelection } from "./extractDocument";

const paragraph = (text: string) => `<p>${text} ${"This sentence pads the article so Readability treats it as real content. ".repeat(4)}</p>`;

const articlePage = `
  <html>
    <head><title>Caching at scale | Example Blog</title></head>
    <body>
      <nav><a href="/">Home</a><a href="/about">About</a></nav>
      <aside class="sidebar">Subscribe to our newsletter for weekly tips!</aside>
      <article>
        <h1>Caching at scale</h1>
        ${paragraph("Caches trade memory for latency.")}
        <h2>Invalidation</h2>
        ${paragraph("Invalidation is the hard part.")}
        <img src="diagram.png" alt="diagram">
        <pre><code>cache.delete(key)</code></pre>
        ${paragraph("Read <a href=\"https://example.com/more\">the follow-up</a> for numbers.")}
      </article>
      <footer>© Example Blog. All rights reserved.</footer>
    </body>
  </html>`;

const documentFor = (html: string) => new JSDOM(html, { url: "https://example.com/caching" }).window.document;

describe("extractArticle", () => {
  it("keeps the article as Markdown and drops the page chrome", () => {
    const extract = extractArticle(documentFor(articlePage));

    expect(extract.markdown).toContain("## Invalidation");
    expect(extract.markdown).toContain("Caches trade memory for latency.");
    expect(extract.markdown).toContain("```\ncache.delete(key)\n```");
    expect(extract.markdown).not.toContain("newsletter");
    expect(extract.markdown).not.toContain("All rights reserved");
  });

  it("drops images", () => {
    expect(extractArticle(documentFor(articlePage)).markdown).not.toContain("diagram.png");
  });

  it("keeps link text without the address", () => {
    const markdown = extractArticle(documentFor(articlePage)).markdown;

    expect(markdown).toContain("Read the follow-up for numbers.");
    expect(markdown).not.toContain("https://example.com/more");
  });
});

describe("extractSelection citations", () => {
  it("drops citation markers", () => {
    const html = '<p>A cache stores data<sup><a href="#cite-1">[1]</a></sup> for later.</p>';

    expect(extractSelection(documentFor(articlePage), html).markdown).toBe("A cache stores data for later.");
  });

  it("reports the page address and that it is a whole article", () => {
    const extract = extractArticle(documentFor(articlePage));

    expect(extract.url).toBe("https://example.com/caching");
    expect(extract.isSelection).toBe(false);
  });
});

describe("extractSelection", () => {
  it("converts the selected HTML and keeps the page title", () => {
    const extract = extractSelection(documentFor(articlePage), "<p>Only <strong>this</strong> part.</p>");

    expect(extract).toMatchObject({
      isSelection: true,
      title: "Caching at scale | Example Blog",
      markdown: "Only **this** part.",
    });
  });
});

describe("hasMeaningfulSelection", () => {
  it("ignores a stray word selected by accident", () => {
    expect(hasMeaningfulSelection("caching")).toBe(false);
  });

  it("accepts a sentence or more", () => {
    expect(hasMeaningfulSelection("Invalidation is the hard part of any caching layer.")).toBe(true);
  });
});
