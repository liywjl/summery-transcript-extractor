import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";

export type PageExtract = {
  isSelection: boolean;
  title: string;
  url: string;
  siteName?: string;
  byline?: string;
  markdown: string;
};

const MIN_SELECTION_CHARACTERS = 40;
const CITATION = /^\[?(\d+|[a-z]|citation needed)\]?$/i;

function createTurndown(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
  });

  turndown.addRule("dropNonText", {
    filter: ["script", "style", "noscript", "iframe", "img", "picture", "figcaption", "svg", "video", "audio", "button", "form"] as TurndownService.Filter,
    replacement: () => "",
  });

  turndown.addRule("citationMarkers", {
    filter: (node) => node.nodeName === "SUP" && CITATION.test(node.textContent?.trim() ?? ""),
    replacement: () => "",
  });

  turndown.addRule("linkTextOnly", {
    filter: "a",
    replacement: (content) => content,
  });

  return turndown;
}

function tidyMarkdown(markdown: string): string {
  return markdown.replace(/\n{3,}/g, "\n\n").trim();
}

function toMarkdown(html: string): string {
  return tidyMarkdown(createTurndown().turndown(html));
}

function pageTitle(doc: Document): string {
  return doc.title.trim() || doc.location?.hostname || "Untitled page";
}

export function hasMeaningfulSelection(selectedText: string): boolean {
  return selectedText.trim().length >= MIN_SELECTION_CHARACTERS;
}

export function extractSelection(doc: Document, selectionHtml: string): PageExtract {
  return {
    isSelection: true,
    title: pageTitle(doc),
    url: doc.URL,
    markdown: toMarkdown(selectionHtml),
  };
}

export function extractArticle(doc: Document): PageExtract {
  const article = new Readability(doc.cloneNode(true) as Document).parse();

  if (!article?.content) {
    return {
      isSelection: false,
      title: pageTitle(doc),
      url: doc.URL,
      markdown: tidyMarkdown(doc.body?.innerText ?? doc.body?.textContent ?? ""),
    };
  }

  return {
    isSelection: false,
    title: article.title?.trim() || pageTitle(doc),
    url: doc.URL,
    siteName: article.siteName?.trim() || undefined,
    byline: article.byline?.trim() || undefined,
    markdown: toMarkdown(article.content),
  };
}
