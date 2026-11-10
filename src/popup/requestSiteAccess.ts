import { siteAccessPattern } from "../capture/fetchArticle";
import { findVideoId } from "../youtube/findVideoId";

export function requestSiteAccess(urls: string[]): Promise<boolean> {
  const origins = [...new Set(urls.filter((url) => !findVideoId(url)).map((url) => siteAccessPattern(new URL(url).origin)))];

  if (origins.length === 0) {
    return Promise.resolve(true);
  }

  return chrome.permissions.request({ origins });
}
