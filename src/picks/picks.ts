import type { Pick } from "./Pick";

const PICKS_KEY = "picks";
const PICKING_KEY = "isPickingOnYouTube";

export async function loadPicks(): Promise<Pick[]> {
  const stored = await chrome.storage.local.get(PICKS_KEY);

  return (stored[PICKS_KEY] as Pick[] | undefined) ?? [];
}

async function savePicks(picks: Pick[]): Promise<void> {
  await chrome.storage.local.set({ [PICKS_KEY]: picks });
}

export async function addPicks(newPicks: Pick[]): Promise<void> {
  const picks = await loadPicks();
  const pickedUrls = new Set(picks.map((pick) => pick.url));

  await savePicks([...picks, ...newPicks.filter((pick) => !pickedUrls.has(pick.url))]);
}

export async function removePick(url: string): Promise<void> {
  await savePicks((await loadPicks()).filter((pick) => pick.url !== url));
}

export async function togglePick(pick: Pick): Promise<void> {
  const picks = await loadPicks();
  const isPicked = picks.some((candidate) => candidate.url === pick.url);

  if (isPicked) {
    await removePick(pick.url);
    return;
  }

  await savePicks([...picks, pick]);
}

export async function clearPicks(): Promise<void> {
  await savePicks([]);
}

export function onPicksChanged(listener: (picks: Pick[]) => void): void {
  chrome.storage.local.onChanged.addListener((changes) => {
    if (changes[PICKS_KEY]) {
      listener((changes[PICKS_KEY].newValue as Pick[] | undefined) ?? []);
    }
  });
}

export async function loadIsPicking(): Promise<boolean> {
  const stored = await chrome.storage.local.get(PICKING_KEY);

  return stored[PICKING_KEY] === true;
}

export async function setIsPicking(isPicking: boolean): Promise<void> {
  await chrome.storage.local.set({ [PICKING_KEY]: isPicking });
}

export function onIsPickingChanged(listener: (isPicking: boolean) => void): void {
  chrome.storage.local.onChanged.addListener((changes) => {
    if (changes[PICKING_KEY]) {
      listener(changes[PICKING_KEY].newValue === true);
    }
  });
}
