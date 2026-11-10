import type { PageExtract } from "../page/extractDocument";
import { loadSettings } from "../settings";
import { fetchYouTubeTranscript, YouTubeRejected } from "../youtube/fetchYouTubeTranscript";
import { findVideoId, watchUrl } from "../youtube/findVideoId";
import { readTranscriptPanel, type PanelTranscript } from "../youtube/readTranscriptPanel";
import { parseClock } from "../youtube/transcript";
import { clientLabel, clientsToTry } from "../youtube/youtubeClients";
import { recordYouTubeStatus } from "../youtube/youtubeStatus";
import type { Capture, PageCapture, YouTubeCapture } from "./Capture";

declare global {
  var summeryExtractPage: (() => PageExtract) | undefined;
}

export class CaptureFailed extends Error {
  constructor(
    message: string,
    readonly needsAppVersion = false,
  ) {
    super(message);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function captureFailure(error: unknown, hint?: string): CaptureFailed {
  if (error instanceof YouTubeRejected) {
    return new CaptureFailed("YouTube turned down the app version Summery uses to read captions.", true);
  }

  const message = errorMessage(error);

  return new CaptureFailed(hint ? `${message} ${hint}` : message);
}

async function fetchVideo(videoId: string): Promise<YouTubeCapture> {
  const settings = await loadSettings();

  try {
    const { client, ...transcript } = await fetchYouTubeTranscript(videoId, navigator.languages, clientsToTry(settings.youtubeAppVersion));
    await recordYouTubeStatus({ isWorking: true, at: Date.now(), detail: clientLabel(client) });

    return { kind: "youtube", url: watchUrl(videoId), ...transcript };
  } catch (error) {
    if (error instanceof YouTubeRejected) {
      await recordYouTubeStatus({ isWorking: false, at: Date.now(), detail: error.message });
    }

    throw error;
  }
}

function panelCapture(videoId: string, panel: PanelTranscript): YouTubeCapture {
  return {
    kind: "youtube",
    url: watchUrl(videoId),
    title: panel.title,
    channel: panel.channel,
    durationSeconds: panel.durationSeconds,
    description: "",
    cues: panel.lines.map((line) => ({ startMs: parseClock(line.time), text: line.text })),
  };
}

async function readVideoFromPage(tabId: number, videoId: string): Promise<YouTubeCapture> {
  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, func: readTranscriptPanel });
  const panel = injection?.result as PanelTranscript | undefined;

  if (!panel || panel.lines.length === 0) {
    throw new CaptureFailed("YouTube's transcript panel stayed empty.");
  }

  return panelCapture(videoId, panel);
}

export async function captureVideo(videoId: string, watchPageTabId?: number): Promise<YouTubeCapture> {
  try {
    return await fetchVideo(videoId);
  } catch (fetchError) {
    if (watchPageTabId === undefined) {
      throw captureFailure(fetchError, "Open the video and try again.");
    }

    try {
      return await readVideoFromPage(watchPageTabId, videoId);
    } catch {
      throw captureFailure(fetchError);
    }
  }
}

function pageCapture(extract: PageExtract): PageCapture {
  return {
    kind: extract.isSelection ? "selection" : "article",
    title: extract.title,
    url: extract.url,
    siteName: extract.siteName,
    byline: extract.byline,
    markdown: extract.markdown,
  };
}

export async function capturePage(tabId: number): Promise<PageCapture> {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["extract-page.js"] });

    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => globalThis.summeryExtractPage?.(),
    });

    return pageCapture(injection.result as PageExtract);
  } catch {
    throw new CaptureFailed("Chrome doesn't let extensions read this page.");
  }
}

export async function captureTab(tab: chrome.tabs.Tab): Promise<Capture> {
  if (tab.id === undefined) {
    throw new CaptureFailed("There is no page open in this tab.");
  }

  const videoId = findVideoId(tab.url);

  if (videoId) {
    return captureVideo(videoId, tab.id);
  }

  return capturePage(tab.id);
}
