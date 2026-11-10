import { icon } from "../icons";
import { findVideoLinks, isVideoCardLink } from "../page/findVideoLinks";
import type { Pick } from "../picks/Pick";
import { loadIsPicking, loadPicks, onIsPickingChanged, onPicksChanged, setIsPicking, togglePick } from "../picks/picks";
import { findVideoId, watchUrl } from "./findVideoId";

const BOX_CLASS = "summery-pick-box";
const TRAY_CLASS = "summery-pick-tray";
const THUMBNAIL_LINKS = 'a[href*="/watch?v="], a[href^="/shorts/"], a[href*="youtube.com/shorts/"]';
const THUMBNAIL_IMAGE = "img, yt-image, yt-thumbnail-view-model";

let isPicking = false;
let pickedUrls = new Set<string>();
let isDecorateQueued = false;

function thumbnailLinks(): HTMLAnchorElement[] {
  return [...document.querySelectorAll<HTMLAnchorElement>(THUMBNAIL_LINKS)].filter(
    (anchor) => anchor.querySelector(THUMBNAIL_IMAGE) && isVideoCardLink(anchor),
  );
}

function linkUrl(anchor: HTMLAnchorElement): string | undefined {
  const videoId = findVideoId(anchor.href);

  return videoId ? watchUrl(videoId) : undefined;
}

function createBox(): HTMLButtonElement {
  const box = document.createElement("button");
  box.type = "button";
  box.className = BOX_CLASS;
  box.innerHTML = icon("check");

  return box;
}

function boxIn(anchor: HTMLAnchorElement): HTMLButtonElement {
  const existing = anchor.querySelector<HTMLButtonElement>(`:scope > .${BOX_CLASS}`);

  if (existing) {
    return existing;
  }

  if (getComputedStyle(anchor).position === "static") {
    anchor.style.position = "relative";
  }

  const box = createBox();
  anchor.append(box);

  return box;
}

function showBox(anchor: HTMLAnchorElement): void {
  const url = linkUrl(anchor);

  if (!url) {
    return;
  }

  const box = boxIn(anchor);
  const isPicked = pickedUrls.has(url);

  box.dataset.picked = String(isPicked);
  box.setAttribute("aria-pressed", String(isPicked));
  box.setAttribute("aria-label", isPicked ? "Remove from Summery picks" : "Add to Summery picks");
  box.title = isPicked ? "Remove from picks" : "Add to picks";
}

function trayElement(): HTMLElement {
  const existing = document.querySelector<HTMLElement>(`.${TRAY_CLASS}`);

  if (existing) {
    return existing;
  }

  const tray = document.createElement("div");
  tray.className = TRAY_CLASS;
  tray.innerHTML = `<span class="summery-pick-count"></span><button type="button" class="summery-pick-stop" aria-label="Stop picking" title="Stop picking">${icon("close")}</button>`;
  tray.querySelector("button")?.addEventListener("click", () => setIsPicking(false));
  document.body.append(tray);

  return tray;
}

function showTray(): void {
  const count = pickedUrls.size;
  const label = count === 1 ? "1 video picked" : `${count} videos picked`;

  const text = `Summery · ${label}`;
  const countElement = trayElement().querySelector(".summery-pick-count")!;

  if (countElement.textContent !== text) {
    countElement.textContent = text;
  }
}

function removeEverything(): void {
  document.querySelectorAll(`.${BOX_CLASS}, .${TRAY_CLASS}`).forEach((element) => element.remove());
}

function removeStaleBoxes(): void {
  document.querySelectorAll<HTMLElement>(`.${BOX_CLASS}`).forEach((box) => {
    const anchor = box.parentElement?.closest<HTMLAnchorElement>("a[href]");

    if (!anchor || !isVideoCardLink(anchor)) {
      box.remove();
    }
  });
}

function decorate(): void {
  isDecorateQueued = false;

  if (!isPicking) {
    removeEverything();
    return;
  }

  removeStaleBoxes();
  thumbnailLinks().forEach(showBox);
  showTray();
}

function queueDecorate(): void {
  if (isDecorateQueued) {
    return;
  }

  isDecorateQueued = true;
  requestAnimationFrame(decorate);
}

function pickFor(anchor: HTMLAnchorElement, url: string): Pick {
  const found = findVideoLinks(document).find((link) => link.url === url);

  return found ?? { url, title: anchor.title || url, kind: "youtube" };
}

function onBoxClick(event: MouseEvent): void {
  const box = (event.target as Element | null)?.closest?.(`.${BOX_CLASS}`);
  const anchor = box?.parentElement?.closest<HTMLAnchorElement>("a[href]");

  if (!box || !anchor) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  const url = linkUrl(anchor);

  if (url) {
    togglePick(pickFor(anchor, url));
  }
}

function blockLinkPress(event: Event): void {
  const isOnBox = (event.target as Element | null)?.closest?.(`.${BOX_CLASS}`);

  if (isOnBox) {
    event.stopImmediatePropagation();
  }
}

async function start(): Promise<void> {
  const [picks, isPickingNow] = await Promise.all([loadPicks(), loadIsPicking()]);

  pickedUrls = new Set(picks.filter((pick) => pick.kind === "youtube").map((pick) => pick.url));
  isPicking = isPickingNow;

  onPicksChanged((newPicks) => {
    pickedUrls = new Set(newPicks.filter((pick) => pick.kind === "youtube").map((pick) => pick.url));
    queueDecorate();
  });

  onIsPickingChanged((isPickingNow) => {
    isPicking = isPickingNow;
    queueDecorate();
  });

  window.addEventListener("click", onBoxClick, true);
  window.addEventListener("mousedown", blockLinkPress, true);
  window.addEventListener("mouseup", blockLinkPress, true);

  new MutationObserver(queueDecorate).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href"],
  });

  queueDecorate();
}

start();
