import { cleanUrl, isWebAddress } from "../links/cleanUrl";
import type { Pick } from "../picks/Pick";

const PAGE_CHROME = "nav, header, footer, aside, [role=navigation], [role=banner], [role=contentinfo], [aria-hidden=true]";

const MIN_TITLE_WORDS = 4;
const MIN_TITLE_LENGTH = 20;
const MAX_TITLE_LENGTH = 300;
const MAX_LINKS = 60;

type ArticleLink = {
  url: string;
  title: string;
};

function tidy(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function siteHost(hostname: string): string {
  return hostname.replace(/^www\./, "");
}

function pathSegments(url: URL): string[] {
  return url.pathname.split("/").filter((segment) => segment.length > 0);
}

function slugWordCount(segment: string): number {
  return segment.replace(/\.\w+$/, "").split(/[-_]+/).filter(Boolean).length;
}

export function isLikelyArticlePath(url: URL): boolean {
  const segments = pathSegments(url);
  const lastSegment = segments.at(-1) ?? "";

  const hasLongSlug = slugWordCount(lastSegment) >= 4;
  const hasDatedPath = segments.length >= 3 && segments.some((segment) => /^\d{4}$/.test(segment));
  const hasNumericId = /\d{5,}/.test(lastSegment);
  const hasOpaqueId = segments.length >= 3 && lastSegment.length >= 8 && /\d/.test(lastSegment) && /[a-z]/i.test(lastSegment);

  return hasLongSlug || hasDatedPath || hasNumericId || hasOpaqueId;
}

function visibleText(anchor: HTMLAnchorElement): string {
  return tidy(anchor.innerText ?? anchor.textContent);
}

function linkTitle(anchor: HTMLAnchorElement): string {
  const label = tidy(anchor.getAttribute("aria-label"));
  const text = visibleText(anchor);

  return label.length > text.length ? label : text;
}

function isHeadline(title: string): boolean {
  const wordCount = title.split(" ").length;

  return title.length >= MIN_TITLE_LENGTH && title.length <= MAX_TITLE_LENGTH && wordCount >= MIN_TITLE_WORDS;
}

function articleLink(anchor: HTMLAnchorElement, page: URL): ArticleLink | undefined {
  if (!isWebAddress(anchor.href) || anchor.closest(PAGE_CHROME)) {
    return undefined;
  }

  const url = new URL(anchor.href);
  const title = linkTitle(anchor);
  const isSameSite = siteHost(url.hostname) === siteHost(page.hostname);
  const isOtherPage = cleanUrl(url.href) !== cleanUrl(page.href);

  if (!isSameSite || !isOtherPage || !isLikelyArticlePath(url) || !isHeadline(title)) {
    return undefined;
  }

  return { url: cleanUrl(url.href), title };
}

export function findArticleLinks(doc: Document, siteName?: string): Pick[] {
  const page = new URL(doc.URL);
  const byUrl = new Map<string, ArticleLink>();
  const links = [...doc.querySelectorAll<HTMLAnchorElement>("a[href]")].map((anchor) => articleLink(anchor, page)).filter((link) => link !== undefined);

  for (const link of links) {
    const current = byUrl.get(link.url);

    if (!current || link.title.length > current.title.length) {
      byUrl.set(link.url, link);
    }
  }

  return [...byUrl.values()].slice(0, MAX_LINKS).map((link) => ({ ...link, kind: "article", source: siteName ?? siteHost(page.hostname) }));
}
