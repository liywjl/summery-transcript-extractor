import { isProbablyReaderable } from "@mozilla/readability";

function openGraphType(doc: Document): string | undefined {
  return doc.querySelector<HTMLMetaElement>('meta[property="og:type"]')?.content.trim().toLowerCase();
}

export function isArticlePage(doc: Document): boolean {
  if (openGraphType(doc) === "article") {
    return true;
  }

  return isProbablyReaderable(doc);
}
