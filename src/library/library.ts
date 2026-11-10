import type { Capture } from "../capture/Capture";
import { captureMarkdown, wordCount } from "../capture/formatCapture";
import { cleanUrl } from "../links/cleanUrl";
import { loadSettings, type KeepCaptures } from "../settings";
import type { LibraryItem, SavedCapture } from "./LibraryItem";
import { staleItems } from "./staleItems";

const ITEM_PREFIX = "item:";
const CAPTURE_PREFIX = "capture:";

function areaFor(keep: KeepCaptures): chrome.storage.StorageArea {
  return keep === "session" ? chrome.storage.session : chrome.storage.local;
}

async function libraryArea(): Promise<chrome.storage.StorageArea> {
  const { keepCaptures } = await loadSettings();

  return areaFor(keepCaptures);
}

function itemKey(url: string): string {
  return `${ITEM_PREFIX}${url}`;
}

function captureKey(url: string): string {
  return `${CAPTURE_PREFIX}${url}`;
}

function libraryKeys(url: string): string[] {
  return [itemKey(url), captureKey(url)];
}

function isLibraryKey(key: string): boolean {
  return key.startsWith(ITEM_PREFIX) || key.startsWith(CAPTURE_PREFIX);
}

async function libraryKeysIn(area: chrome.storage.StorageArea): Promise<string[]> {
  return (await area.getKeys()).filter(isLibraryKey);
}

async function itemsIn(area: chrome.storage.StorageArea): Promise<LibraryItem[]> {
  const keys = (await area.getKeys()).filter((key) => key.startsWith(ITEM_PREFIX));
  const stored = await area.get(keys);

  return Object.values(stored) as LibraryItem[];
}

export function isSavable(capture: Capture): boolean {
  return capture.kind !== "selection";
}

export function libraryUrl(capture: Capture): string {
  return cleanUrl(capture.url);
}

export async function listLibrary(): Promise<LibraryItem[]> {
  const items = await itemsIn(await libraryArea());

  return items.sort((first, second) => second.usedAt - first.usedAt);
}

export async function findSaved(url: string): Promise<SavedCapture | undefined> {
  const area = await libraryArea();
  const stored = await area.get(libraryKeys(url));
  const item = stored[itemKey(url)] as LibraryItem | undefined;
  const capture = stored[captureKey(url)] as Capture | undefined;

  if (!item || !capture) {
    return undefined;
  }

  return { item, capture };
}

export async function saveCapture(capture: Capture): Promise<LibraryItem | undefined> {
  if (!isSavable(capture)) {
    return undefined;
  }

  const url = libraryUrl(capture);
  const now = Date.now();
  const item: LibraryItem = {
    url,
    kind: capture.kind,
    title: capture.title,
    source: capture.kind === "youtube" ? capture.channel : capture.siteName,
    wordCount: wordCount(captureMarkdown(capture, { includeTimestamps: false })),
    savedAt: now,
    usedAt: now,
  };

  await (await libraryArea()).set({ [itemKey(url)]: item, [captureKey(url)]: { ...capture, url } });

  return item;
}

export async function markUsed(item: LibraryItem): Promise<void> {
  await (await libraryArea()).set({ [itemKey(item.url)]: { ...item, usedAt: Date.now() } });
}

export async function forget(urls: string[]): Promise<void> {
  await (await libraryArea()).remove(urls.flatMap(libraryKeys));
}

async function clearArea(area: chrome.storage.StorageArea): Promise<void> {
  await area.remove(await libraryKeysIn(area));
}

export async function forgetAll(): Promise<void> {
  await clearArea(await libraryArea());
}

export async function forgetStale(): Promise<void> {
  const { keepCaptures } = await loadSettings();
  const stale = staleItems(await itemsIn(areaFor(keepCaptures)), keepCaptures, Date.now());

  if (stale.length > 0) {
    await forget(stale.map((item) => item.url));
  }
}

export async function moveLibrary(from: KeepCaptures, to: KeepCaptures): Promise<void> {
  const source = areaFor(from);
  const target = areaFor(to);

  if (source === target) {
    return;
  }

  await target.set(await source.get(await libraryKeysIn(source)));
  await clearArea(source);
}

export async function librarySize(): Promise<{ count: number; bytes: number }> {
  const area = await libraryArea();
  const keys = await libraryKeysIn(area);

  return { count: keys.filter((key) => key.startsWith(ITEM_PREFIX)).length, bytes: await area.getBytesInUse(keys) };
}
