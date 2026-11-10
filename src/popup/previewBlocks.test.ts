import { describe, expect, it } from "vitest";
import { plainInline, previewBlocks } from "./previewBlocks";

describe("previewBlocks", () => {
  it("reads headings, facts and paragraphs", () => {
    const markdown = "# Caching\n\n- Source: https://example.com\n- Site: Blog\n\nFirst paragraph\ncontinues here.";

    expect(previewBlocks(markdown)).toEqual([
      { type: "heading", level: 1, text: "Caching" },
      { type: "list", items: ["Source: https://example.com", "Site: Blog"] },
      { type: "paragraph", text: "First paragraph\ncontinues here." },
    ]);
  });

  it("pulls the timestamp off transcript paragraphs", () => {
    expect(previewBlocks("[1:02:05] And that is the point.")).toEqual([
      { type: "paragraph", timestamp: "1:02:05", text: "And that is the point." },
    ]);
  });

  it("keeps fenced code intact, blank lines included", () => {
    expect(previewBlocks("```\nconst a = 1;\n\nconst b = 2;\n```")).toEqual([
      { type: "code", text: "const a = 1;\n\nconst b = 2;" },
    ]);
  });

  it("keeps an unclosed code fence", () => {
    expect(previewBlocks("```\nconst a = 1;")).toEqual([{ type: "code", text: "const a = 1;" }]);
  });
});

describe("plainInline", () => {
  it("keeps link text and drops the address", () => {
    expect(plainInline("Read [the follow-up](https://example.com/more) now")).toBe("Read the follow-up now");
  });

  it("drops emphasis and code markers", () => {
    expect(plainInline("**bold** and *italic* and `code` and \\*stars\\*")).toBe("bold and italic and code and *stars*");
  });
});
