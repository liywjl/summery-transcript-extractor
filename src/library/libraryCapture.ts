import type { Capture } from "../capture/Capture";
import { findSaved, markUsed, saveCapture } from "./library";
import type { LibraryItem } from "./LibraryItem";

export type LibraryCapture = {
  capture: Capture;
  item?: LibraryItem;
  isFromLibrary: boolean;
};

export async function fetchAndSave(fetchFresh: () => Promise<Capture>): Promise<LibraryCapture> {
  const capture = await fetchFresh();
  const item = await saveCapture(capture);

  return { capture, item, isFromLibrary: false };
}

export async function fromLibrary(url: string): Promise<LibraryCapture | undefined> {
  const saved = await findSaved(url);

  if (!saved) {
    return undefined;
  }

  await markUsed(saved.item);

  return { capture: saved.capture, item: saved.item, isFromLibrary: true };
}

export async function savedOrFetched(url: string, fetchFresh: () => Promise<Capture>): Promise<LibraryCapture> {
  return (await fromLibrary(url)) ?? fetchAndSave(fetchFresh);
}
