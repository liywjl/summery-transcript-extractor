import type { Pick } from "../picks/Pick";
import { extractArticle, extractSelection } from "./extractDocument";
import { findArticleLinks } from "./findArticleLinks";
import { findVideoLinks } from "./findVideoLinks";
import { isArticlePage } from "./isArticlePage";
import type { PageReading } from "./PageReading";

const MIN_LISTING_LINKS = 3;

const YOUTUBE_HOST = /(^|\.)youtube\.com$/;

function siteName(doc: Document): string | undefined {
  return doc.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content.trim() || undefined;
}

function listing(doc: Document, links: Pick[]): PageReading {
  return { shape: "listing", title: doc.title.trim() || new URL(doc.URL).hostname, url: doc.URL, links };
}

export type ReadOptions = {
  isWholePage: boolean;
};

export function readPage(doc: Document, selectionHtml?: string, options: ReadOptions = { isWholePage: false }): PageReading {
  if (selectionHtml !== undefined) {
    return { shape: "article", extract: extractSelection(doc, selectionHtml) };
  }

  const isYouTube = YOUTUBE_HOST.test(new URL(doc.URL).hostname);

  if (isYouTube && !options.isWholePage) {
    return listing(doc, findVideoLinks(doc));
  }

  if (options.isWholePage || isArticlePage(doc)) {
    return { shape: "article", extract: extractArticle(doc) };
  }

  const links = findArticleLinks(doc, siteName(doc));

  if (links.length < MIN_LISTING_LINKS) {
    return { shape: "article", extract: extractArticle(doc) };
  }

  return listing(doc, links);
}
