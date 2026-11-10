import { findVideoId } from "../youtube/findVideoId";
import type { Capture } from "./Capture";
import { captureVideo } from "./captureTab";
import { fetchArticle } from "./fetchArticle";

export function captureUrl(url: string, watchPageTabId?: number): Promise<Capture> {
  const videoId = findVideoId(url);

  if (videoId) {
    return captureVideo(videoId, watchPageTabId);
  }

  return fetchArticle(url);
}
