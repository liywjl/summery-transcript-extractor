import { CaptureFailed, readPageInTab } from "../capture/captureTab";
import type { IconName } from "../icons";
import { askToFetch } from "../library/fetchMessage";
import { findSaved, isSavable } from "../library/library";
import { fetchAndSave, fromLibrary, type LibraryCapture } from "../library/libraryCapture";
import { cleanUrl } from "../links/cleanUrl";
import type { ListingReading } from "../page/PageReading";
import { loadIsPicking } from "../picks/picks";
import { findVideoId, watchUrl } from "../youtube/findVideoId";
import { captureView } from "./captureView";
import { iconElement } from "./dom";
import { listingView } from "./listingView";
import { pickedView } from "./pickedView";
import { savedView } from "./savedView";
import { popupState, startState, watchState } from "./stateStore";
import { errorView, loadingView } from "./statusViews";
import type { View } from "./View";

type Tab = "page" | "picked" | "saved";

type PageResult = { shape: "capture"; shown: LibraryCapture } | ListingReading | { shape: "error"; message: string; needsAppVersion: boolean };

type ReadOptions = {
  isRefresh: boolean;
  isWholePage: boolean;
};

const TABS: Record<Tab, { icon: IconName; label: string }> = {
  page: { icon: "page", label: "This page" },
  picked: { icon: "picked", label: "Picked" },
  saved: { icon: "saved", label: "Saved" },
};

const panel = document.getElementById("panel")!;
const settingsButton = document.getElementById("settings") as HTMLButtonElement;
const tabButtons = [...document.querySelectorAll<HTMLButtonElement>(".tab")];

let currentTab: Tab = "page";
let pageView: View | undefined;
let stopWatching = () => {};
let browserTab: chrome.tabs.Tab | undefined;

function showTabs(): void {
  const state = popupState();
  const counts: Record<Tab, number | undefined> = { page: undefined, picked: state.picks.length, saved: state.saved.length };

  for (const button of tabButtons) {
    const tab = button.dataset.tab as Tab;
    const count = counts[tab];
    const isCurrent = tab === currentTab;

    button.setAttribute("aria-selected", String(isCurrent));
    button.replaceChildren(iconElement(TABS[tab].icon), TABS[tab].label);

    if (count) {
      const badge = document.createElement("span");
      badge.className = "count";
      badge.textContent = String(count);
      button.append(badge);
    }
  }
}

function mount(view: View, tab: Tab): void {
  stopWatching();
  currentTab = tab;
  panel.replaceChildren(view.element);
  stopWatching = view.update ? watchState(view.update) : () => {};
  view.update?.(popupState());
  showTabs();
}

function pageLoadingView(tab: chrome.tabs.Tab | undefined): View {
  if (findVideoId(tab?.url)) {
    return loadingView("youtube", "youtube", "YouTube transcript", "Reading captions from YouTube…");
  }

  return loadingView("article", "article", "Page", "Reading the page…");
}

async function fetchInBackground(url: string, tabId?: number): Promise<LibraryCapture> {
  const result = await askToFetch(url, tabId);

  if (!result.isDone) {
    throw new CaptureFailed(result.message, result.needsAppVersion);
  }

  const saved = await findSaved(url);

  if (!saved) {
    throw new CaptureFailed("Summery fetched it but couldn't keep a copy. Try again.");
  }

  return { capture: saved.capture, item: saved.item, isFromLibrary: false };
}

async function readVideo(tab: chrome.tabs.Tab, videoId: string, options: ReadOptions): Promise<PageResult> {
  const url = watchUrl(videoId);
  const saved = options.isRefresh ? undefined : await fromLibrary(url);

  return { shape: "capture", shown: saved ?? (await fetchInBackground(url, tab.id)) };
}

async function readBrowserTab(tab: chrome.tabs.Tab, options: ReadOptions): Promise<PageResult> {
  const videoId = findVideoId(tab.url);

  if (videoId) {
    return readVideo(tab, videoId, options);
  }

  if (tab.id === undefined) {
    throw new CaptureFailed("There is no page open in this tab.");
  }

  const reading = await readPageInTab(tab.id, { isWholePage: options.isWholePage });

  if (reading.shape === "listing") {
    return reading;
  }

  return { shape: "capture", shown: await fetchAndSave(async () => reading.capture) };
}

async function pageResult(options: ReadOptions): Promise<PageResult> {
  try {
    return await readBrowserTab(browserTab!, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const needsAppVersion = error instanceof CaptureFailed && error.needsAppVersion;

    return { shape: "error", message, needsAppVersion };
  }
}

function openAppVersionSettings(): void {
  chrome.tabs.create({ url: chrome.runtime.getURL("options.html#youtube") });
}

async function viewForPage(result: PageResult, options: ReadOptions): Promise<View> {
  const state = popupState();

  if (result.shape === "capture") {
    return captureView({ shown: result.shown, state, onRefresh: () => showPage({ ...options, isRefresh: true }) });
  }

  if (result.shape === "listing") {
    return listingView({
      reading: result,
      state,
      isPickingOnYouTube: await loadIsPicking(),
      onShowPicked: () => showTab("picked"),
      onReadWholePage: () => showPage({ isRefresh: false, isWholePage: true }),
    });
  }

  const retry = { iconName: "retry" as const, label: "Try again", onClick: () => showPage(options) };
  const fixVersion = { iconName: "settings" as const, label: "Update app version", isPrimary: true, onClick: openAppVersionSettings };

  return errorView(result.message, result.needsAppVersion ? [fixVersion, retry] : [retry]);
}

async function showPage(options: ReadOptions): Promise<void> {
  pageView = pageLoadingView(browserTab);
  mount(pageView, "page");

  const view = await viewForPage(await pageResult(options), options);
  pageView = view;

  if (currentTab === "page") {
    mount(view, "page");
  }
}

function isShowingInTab(url: string): boolean {
  const tabUrl = browserTab?.url;

  return Boolean(tabUrl) && cleanUrl(tabUrl!) === url;
}

async function refetchDetail(url: string, backTo: Tab): Promise<void> {
  if (isShowingInTab(url)) {
    await showPage({ isRefresh: true, isWholePage: true });
    return;
  }

  mount(loadingView("saved", "saved", "Saved", "Fetching it again…"), backTo);

  const result = await askToFetch(url);

  if (!result.isDone) {
    mount(errorView(result.message, [{ iconName: "retry", label: "Try again", onClick: () => refetchDetail(url, backTo) }]), backTo);
    return;
  }

  await showDetail(url, backTo);
}

async function showDetail(url: string, backTo: Tab): Promise<void> {
  const saved = await findSaved(url);

  if (!saved) {
    showTab(backTo);
    return;
  }

  const shown = { capture: saved.capture, item: saved.item, isFromLibrary: true };
  const view = captureView({
    shown,
    state: popupState(),
    onRefresh: isSavable(saved.capture) ? () => refetchDetail(url, backTo) : undefined,
    onClose: () => showTab(backTo),
  });

  mount(view, backTo);
}

function showTab(tab: Tab): void {
  if (tab === "page") {
    mount(pageView ?? pageLoadingView(browserTab), "page");
    return;
  }

  if (tab === "picked") {
    mount(pickedView({ state: popupState(), onOpen: (url) => showDetail(url, "picked") }), "picked");
    return;
  }

  mount(savedView({ state: popupState(), onOpen: (url) => showDetail(url, "saved") }), "saved");
}

async function start(): Promise<void> {
  const [, [tab]] = await Promise.all([startState(), chrome.tabs.query({ active: true, currentWindow: true })]);
  browserTab = tab;

  settingsButton.append(iconElement("settings"));
  settingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
  tabButtons.forEach((button) => button.addEventListener("click", () => showTab(button.dataset.tab as Tab)));
  watchState(showTabs);

  await showPage({ isRefresh: false, isWholePage: false });
}

start();
