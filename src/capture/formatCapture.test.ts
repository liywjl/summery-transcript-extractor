import { describe, expect, it } from "vitest";
import type { PageCapture, YouTubeCapture } from "./Capture";
import { captureMarkdown, capturePrompt, capturesFileName, capturesPrompt, fileName, wordCount } from "./formatCapture";

const talk: YouTubeCapture = {
  kind: "youtube",
  title: "Building effective agents",
  url: "https://www.youtube.com/watch?v=aircAruvnKk",
  channel: "AI Engineer",
  durationSeconds: 1125,
  captionsLabel: "English",
  description: "Chapters:\n0:00 Intro",
  cues: [
    { startMs: 0, text: "Hi everyone." },
    { startMs: 30_000, text: "Let's start." },
  ],
};

const article: PageCapture = {
  kind: "article",
  title: "Caching at scale",
  url: "https://example.com/caching",
  siteName: "Example Blog",
  markdown: "## Invalidation\n\nIt is hard.",
};

describe("captureMarkdown", () => {
  it("lays out a video with its facts, timestamped transcript and description", () => {
    expect(captureMarkdown(talk, { includeTimestamps: true })).toBe(
      [
        "# Building effective agents",
        "- Video: https://www.youtube.com/watch?v=aircAruvnKk\n- Channel: AI Engineer\n- Length: 18:45\n- Captions: English",
        "## Transcript\n\n[0:00] Hi everyone.\n\n[0:30] Let's start.",
        "## Video description\n\nChapters:\n0:00 Intro",
      ].join("\n\n"),
    );
  });

  it("leaves out an empty description", () => {
    expect(captureMarkdown({ ...talk, description: "  " }, { includeTimestamps: true })).not.toContain("## Video description");
  });

  it("leaves out facts the page did not provide", () => {
    expect(captureMarkdown(article, { includeTimestamps: true })).toBe(
      "# Caching at scale\n\n- Source: https://example.com/caching\n- Site: Example Blog\n\n## Invalidation\n\nIt is hard.",
    );
  });
});

describe("capturePrompt", () => {
  it("fills every placeholder in the template", () => {
    const prompt = capturePrompt(article, "Discuss {{source}} from {{ url }}.\n{{content}}", { includeTimestamps: true });

    expect(prompt).toBe(
      'Discuss the article "Caching at scale" from https://example.com/caching.\n' +
        captureMarkdown(article, { includeTimestamps: true }),
    );
  });

  it("names a video as a transcript", () => {
    expect(capturePrompt(talk, "{{source}}", { includeTimestamps: false })).toBe(
      'the transcript of the YouTube video "Building effective agents"',
    );
  });

  it("names a selection as an excerpt", () => {
    expect(capturePrompt({ ...article, kind: "selection" }, "{{source}}", { includeTimestamps: false })).toBe(
      'an excerpt from "Caching at scale"',
    );
  });

  it("leaves unknown placeholders as written", () => {
    expect(capturePrompt(article, "{{nope}}", { includeTimestamps: false })).toBe("{{nope}}");
  });
});

describe("capturesPrompt", () => {
  it("names a set of videos", () => {
    expect(capturesPrompt([talk, talk], "Here is {{source}}.", { includeTimestamps: false })).toBe("Here is a set of 2 YouTube transcripts.");
  });

  it("names a mix of videos and articles", () => {
    expect(capturesPrompt([talk, article, article], "Here is {{source}}.", { includeTimestamps: false })).toBe(
      "Here is a set of 3 documents: 1 YouTube transcript and 2 articles.",
    );
  });

  it("puts every document in the content, divided by rules", () => {
    const options = { includeTimestamps: false };

    expect(capturesPrompt([talk, article], "{{content}}", options)).toBe(
      `${captureMarkdown(talk, options)}\n\n---\n\n${captureMarkdown(article, options)}`,
    );
  });

  it("reads like a single capture when there is only one", () => {
    const options = { includeTimestamps: true };

    expect(capturesPrompt([article], "{{source}} {{content}}", options)).toBe(capturePrompt(article, "{{source}} {{content}}", options));
  });
});

describe("capturesFileName", () => {
  it("names a combined file after how many sources it holds", () => {
    expect(capturesFileName([talk, article])).toBe("summery-2-sources.md");
  });
});

describe("wordCount", () => {
  it("counts words across lines", () => {
    expect(wordCount("one two\n\nthree  four")).toBe(4);
  });
});

describe("fileName", () => {
  it("turns the title into a Markdown file name", () => {
    expect(fileName({ ...talk, title: "Building Effective Agents: Barry Zhang (Anthropic)" })).toBe(
      "building-effective-agents-barry-zhang-anthropic.md",
    );
  });

  it("falls back when the title has no letters", () => {
    expect(fileName({ ...talk, title: "???" })).toBe("capture.md");
  });
});
