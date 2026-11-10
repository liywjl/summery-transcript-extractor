import { formatBytes } from "../formatBytes";
import { forgetAll, forgetStale, librarySize, moveLibrary } from "../library/library";
import { KEEP_CAPTURES, loadSettings, saveSettings, type KeepCaptures } from "../settings";

const CONFIRM_MS = 4000;

const keepCaptures = document.getElementById("keep-captures") as HTMLSelectElement;
const deleteSaved = document.getElementById("delete-saved") as HTMLButtonElement;
const size = document.getElementById("library-size") as HTMLElement;

let resetConfirm: ReturnType<typeof setTimeout> | undefined;

async function showSize(): Promise<void> {
  const { count, bytes } = await librarySize();

  size.textContent = count === 1 ? `1 capture · ${formatBytes(bytes)}` : `${count} captures · ${formatBytes(bytes)}`;
  deleteSaved.disabled = count === 0;
}

function stopConfirming(): void {
  clearTimeout(resetConfirm);
  deleteSaved.classList.remove("is-confirming");
  deleteSaved.textContent = "Delete all saved";
}

async function onDeleteClick(): Promise<void> {
  if (!deleteSaved.classList.contains("is-confirming")) {
    deleteSaved.classList.add("is-confirming");
    deleteSaved.textContent = "Click again to delete";
    resetConfirm = setTimeout(stopConfirming, CONFIRM_MS);
    return;
  }

  stopConfirming();
  await forgetAll();
  await showSize();
}

async function onKeepChange(previous: KeepCaptures): Promise<KeepCaptures> {
  const next = keepCaptures.value as KeepCaptures;

  await moveLibrary(previous, next);
  await saveSettings({ keepCaptures: next });
  await forgetStale();
  await showSize();

  return next;
}

export async function startLibrarySetting(): Promise<void> {
  let current = (await loadSettings()).keepCaptures;

  keepCaptures.replaceChildren(...Object.entries(KEEP_CAPTURES).map(([value, label]) => new Option(label, value, false, value === current)));
  keepCaptures.addEventListener("change", async () => (current = await onKeepChange(current)));
  deleteSaved.addEventListener("click", onDeleteClick);

  await showSize();
}
