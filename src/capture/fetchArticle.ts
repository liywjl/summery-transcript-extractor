import { ensureOffscreenDocument } from "../offscreen/ensureOffscreenDocument";
import type { PageExtract } from "../page/extractDocument";
import type { PageCapture } from "./Capture";
import { CaptureFailed, pageCapture } from "./captureTab";

export class NeedsSiteAccess extends CaptureFailed {
  constructor(readonly origin: string) {
    super(`Summery needs your permission to read ${new URL(origin).hostname}.`);
  }
}

export function siteAccessPattern(origin: string): string {
  return `${origin}/*`;
}

async function hasSiteAccess(origin: string): Promise<boolean> {
  return chrome.permissions.contains({ origins: [siteAccessPattern(origin)] });
}

async function downloadHtml(url: string): Promise<string> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new CaptureFailed(`The site answered ${response.status}.`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof CaptureFailed) {
      throw error;
    }

    throw new CaptureFailed("Couldn't reach the site. Check your connection and try again.");
  }
}

export async function fetchArticle(url: string): Promise<PageCapture> {
  const { origin } = new URL(url);

  if (!(await hasSiteAccess(origin))) {
    throw new NeedsSiteAccess(origin);
  }

  const html = await downloadHtml(url);

  await ensureOffscreenDocument();

  const extract = (await chrome.runtime.sendMessage({ target: "offscreen", type: "read-html", html, url })) as PageExtract | undefined;

  if (!extract) {
    throw new CaptureFailed("Summery couldn't find the article text.");
  }

  return pageCapture({ ...extract, url });
}
