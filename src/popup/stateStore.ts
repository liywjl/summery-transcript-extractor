import { listLibrary } from "../library/library";
import { loadPickStatus } from "../picks/pickStatus";
import { loadPicks } from "../picks/picks";
import { loadSettings } from "../settings";
import type { PopupState } from "./PopupState";

type Listener = (state: PopupState) => void;

const listeners = new Set<Listener>();

let state: PopupState;
let isReloadQueued = false;

async function loadState(): Promise<PopupState> {
  const [settings, picks, status, saved] = await Promise.all([loadSettings(), loadPicks(), loadPickStatus(), listLibrary()]);

  return { settings, picks, status, saved };
}

async function reload(): Promise<void> {
  isReloadQueued = false;
  state = await loadState();
  listeners.forEach((listener) => listener(state));
}

function queueReload(): void {
  if (isReloadQueued) {
    return;
  }

  isReloadQueued = true;
  setTimeout(reload, 50);
}

export function popupState(): PopupState {
  return state;
}

export function watchState(listener: Listener): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export async function startState(): Promise<PopupState> {
  state = await loadState();
  chrome.storage.onChanged.addListener(queueReload);

  return state;
}
