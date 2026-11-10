export type PreviewBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string; timestamp?: string }
  | { type: "list"; items: string[] }
  | { type: "code"; text: string };

const FENCE = /^```/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+\.)\s+/;
const TIMESTAMP = /^\[(\d{1,2}(?::\d{2}){1,2})\]\s+/;

export function plainInline(text: string): string {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(?<![\\*])\*([^*\s][^*]*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, "$1");
}

function chunkBlock(lines: string[]): PreviewBlock {
  const heading = lines.length === 1 ? HEADING.exec(lines[0]) : null;

  if (heading) {
    return { type: "heading", level: heading[1].length, text: plainInline(heading[2]) };
  }

  if (lines.every((line) => LIST_ITEM.test(line))) {
    return { type: "list", items: lines.map((line) => plainInline(line.replace(LIST_ITEM, ""))) };
  }

  const text = lines.join("\n");
  const timestamp = TIMESTAMP.exec(text);

  if (timestamp) {
    return { type: "paragraph", timestamp: timestamp[1], text: plainInline(text.slice(timestamp[0].length)) };
  }

  return { type: "paragraph", text: plainInline(text) };
}

export function previewBlocks(markdown: string): PreviewBlock[] {
  const blocks: PreviewBlock[] = [];
  let chunk: string[] = [];
  let code: string[] | undefined;

  const flushChunk = () => {
    if (chunk.length > 0) {
      blocks.push(chunkBlock(chunk));
    }

    chunk = [];
  };

  for (const line of markdown.split("\n")) {
    if (code && FENCE.test(line)) {
      blocks.push({ type: "code", text: code.join("\n") });
      code = undefined;
      continue;
    }

    if (code) {
      code.push(line);
      continue;
    }

    if (FENCE.test(line)) {
      flushChunk();
      code = [];
      continue;
    }

    if (line.trim() === "") {
      flushChunk();
      continue;
    }

    chunk.push(line);
  }

  flushChunk();

  if (code) {
    blocks.push({ type: "code", text: code.join("\n") });
  }

  return blocks;
}
