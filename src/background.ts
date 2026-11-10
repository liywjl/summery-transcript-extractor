import { captureTab, captureVideo, capturePage } from "./capture/captureTab";
import type { Capture } from "./capture/Capture";
import { capturePrompt } from "./capture/formatCapture";
import { forgetStale, saveCapture } from "./library/library";
import { fetchAndSave, savedOrFetched } from "./library/libraryCapture";
import { isFetchMessage, type FetchResult } from "./library/fetchMessage";
import { captureUrl } from "./capture/captureUrl";
import { CaptureFailed } from "./capture/captureTab";
import { cleanUrl, isWebAddress } from "./links/cleanUrl";
import { ensureOffscreenDocument } from "./offscreen/ensureOffscreenDocument";
import { fetchPicks, retryPicks } from "./picks/fetchPicks";
import { isRetryPicksMessage } from "./picks/pickStatus";
import { addPicks, onPicksChanged } from "./picks/picks";
import { loadSettings } from "./settings";
import { findVideoId, watchUrl } from "./youtube/findVideoId";
import { isTestAppVersionMessage, testAppVersion } from "./youtube/testAppVersion";

const MENU = {
  page: "copy-page",
  selection: "copy-selection",
  videoLink: "copy-video-link",
  pickLink: "pick-link",
} as const;

const VIDEO_LINK_PATTERNS = [
  "*://*.youtube.com/watch*",
  "*://*.youtube.com/shorts/*",
  "*://*.youtube.com/live/*",
  "*://youtu.be/*",
];

const DEFAULT_TITLE = "Summery";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU.page, title: "Copy page as prompt", contexts: ["page"] });
    chrome.contextMenus.create({ id: MENU.selection, title: "Copy selection as prompt", contexts: ["selection"] });
    chrome.contextMenus.create({
      id: MENU.videoLink,
      title: "Copy video transcript as prompt",
      contexts: ["link"],
      targetUrlPatterns: VIDEO_LINK_PATTERNS,
    });
    chrome.contextMenus.create({ id: MENU.pickLink, title: "Add link to Summery picks", contexts: ["link"] });
  });

  forgetStale();
});

chrome.runtime.onStartup.addListener(() => {
  forgetStale();
  fetchPicks();
});

async function captureLinkedVideo(linkUrl: string | undefined, tab: chrome.tabs.Tab | undefined): Promise<Capture> {
  const videoId = findVideoId(linkUrl);

  if (!videoId) {
    throw new Error("That link is not a YouTube video.");
  }

  const isWatchingThatVideo = findVideoId(tab?.url) === videoId;
  const { capture } = await savedOrFetched(watchUrl(videoId), () => captureVideo(videoId, isWatchingThatVideo ? tab?.id : undefined));

  return capture;
}

async function captureWholeTab(tab: chrome.tabs.Tab): Promise<Capture> {
  const capture = await captureTab(tab);
  await saveCapture(capture);

  return capture;
}

async function captureForMenu(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab | undefined): Promise<Capture> {
  if (info.menuItemId === MENU.videoLink) {
    return captureLinkedVideo(info.linkUrl, tab);
  }

  if (!tab?.id) {
    throw new Error("There is no page open in this tab.");
  }

  if (info.menuItemId === MENU.selection) {
    return capturePage(tab.id);
  }

  return captureWholeTab(tab);
}

async function copyText(text: string): Promise<void> {
  await ensureOffscreenDocument();
  await chrome.runtime.sendMessage({ target: "offscreen", type: "copy", text });
}

async function showResult(badge: string, color: string, title: string): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text: badge });
  await chrome.action.setTitle({ title });

  setTimeout(() => {
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setTitle({ title: DEFAULT_TITLE });
  }, 6000);
}

async function pickLink(linkUrl: string | undefined): Promise<void> {
  if (!linkUrl || !isWebAddress(linkUrl)) {
    await showResult("!", "#dc2626", "Summery: that link can't be picked.");
    return;
  }

  const url = cleanUrl(linkUrl);
  const kind = findVideoId(url) ? "youtube" : "article";

  await addPicks([{ url, title: url, kind }]);
  await showResult("+1", "#6d5bd0", "Summery: added to picks");
}

async function copyForMenu(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab | undefined): Promise<void> {
  await showResult("…", "#6d5bd0", "Summery: capturing…");

  try {
    const capture = await captureForMenu(info, tab);
    const settings = await loadSettings();

    await copyText(capturePrompt(capture, settings.promptTemplate, settings));
    await showResult("✓", "#16a34a", `Summery: copied "${capture.title}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await showResult("!", "#dc2626", `Summery: ${message}`);
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU.pickLink) {
    pickLink(info.linkUrl);
    return;
  }

  copyForMenu(info, tab);
});

onPicksChanged(() => fetchPicks());

chrome.permissions.onAdded.addListener(() => retryPicks());

async function fetchForPopup(url: string, tabId?: number): Promise<FetchResult> {
  try {
    await fetchAndSave(() => captureUrl(url, tabId));

    return { isDone: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const needsAppVersion = error instanceof CaptureFailed && error.needsAppVersion;

    return { isDone: false, message, needsAppVersion };
  }
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (isFetchMessage(message)) {
    fetchForPopup(message.url, message.tabId).then(sendResponse);
    return true;
  }

  if (isRetryPicksMessage(message)) {
    retryPicks().then(() => sendResponse(true));
    return true;
  }

  if (!isTestAppVersionMessage(message)) {
    return;
  }

  testAppVersion(message.version).then(sendResponse);

  return true;
});
