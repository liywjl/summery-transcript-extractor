import { captureTab, captureVideo, capturePage } from "./capture/captureTab";
import type { Capture } from "./capture/Capture";
import { capturePrompt } from "./capture/formatCapture";
import { loadSettings } from "./settings";
import { findVideoId } from "./youtube/findVideoId";
import { isTestAppVersionMessage, testAppVersion } from "./youtube/testAppVersion";

const MENU = {
  page: "copy-page",
  selection: "copy-selection",
  videoLink: "copy-video-link",
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
  });
});

async function captureLinkedVideo(linkUrl: string | undefined, tab: chrome.tabs.Tab | undefined): Promise<Capture> {
  const videoId = findVideoId(linkUrl);

  if (!videoId) {
    throw new Error("That link is not a YouTube video.");
  }

  const isWatchingThatVideo = findVideoId(tab?.url) === videoId;

  return captureVideo(videoId, isWatchingThatVideo ? tab?.id : undefined);
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

  return captureTab(tab);
}

async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: "Copy the captured text to the clipboard.",
  });
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

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
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
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isTestAppVersionMessage(message)) {
    return;
  }

  testAppVersion(message.version).then(sendResponse);

  return true;
});
