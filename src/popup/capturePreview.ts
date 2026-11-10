import { h } from "./dom";
import { previewBlocks, type PreviewBlock } from "./previewBlocks";

function blockElement(block: PreviewBlock): HTMLElement {
  if (block.type === "heading") {
    return h(`h${Math.min(block.level + 1, 4)}` as "h2", { text: block.text });
  }

  if (block.type === "list") {
    return h("ul", {}, ...block.items.map((item) => h("li", { text: item })));
  }

  if (block.type === "code") {
    return h("pre", { text: block.text });
  }

  return h("p", {}, block.timestamp && h("span", { className: "timestamp", text: block.timestamp }), block.text);
}

function withoutTitleAndFacts(blocks: PreviewBlock[]): PreviewBlock[] {
  const hasTitleAndFacts = blocks[0]?.type === "heading" && blocks[1]?.type === "list";

  return hasTitleAndFacts ? blocks.slice(2) : blocks;
}

export function capturePreview(markdown: string): HTMLElement {
  const blocks = withoutTitleAndFacts(previewBlocks(markdown));

  return h("div", { className: "preview" }, ...blocks.map(blockElement));
}
