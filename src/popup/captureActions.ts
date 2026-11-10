import type { Capture } from "../capture/Capture";
import { capturesFileName, capturesMarkdown, capturesPrompt } from "../capture/formatCapture";
import type { IconName } from "../icons";
import { markUsed } from "../library/library";
import type { LibraryItem } from "../library/LibraryItem";
import { CHAT_SITES, type Settings } from "../settings";
import { iconButton, setButtonContent, textButton } from "./dom";

const DONE_MS = 1600;

export type CaptureActions = {
  elements: HTMLButtonElement[];
  show: (captures: Capture[], items: LibraryItem[], copyLabel?: string) => void;
};

function flashDone(button: HTMLButtonElement, iconName: IconName, label?: string, doneLabel?: string): void {
  button.classList.add("is-done");
  setButtonContent(button, "check", doneLabel);

  setTimeout(() => {
    button.classList.remove("is-done");
    setButtonContent(button, iconName, label);
  }, DONE_MS);
}

function downloadMarkdown(name: string, markdown: string): void {
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });

  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function captureActions(settings: Settings): CaptureActions {
  const chat = CHAT_SITES[settings.chatSite];
  let captures: Capture[] = [];
  let items: LibraryItem[] = [];
  let copyLabel = "Copy prompt";

  const prompt = () => capturesPrompt(captures, settings.promptTemplate, settings);
  const markUsedItems = () => items.forEach(markUsed);

  const copyPrompt = textButton("primary", "copy", copyLabel, async () => {
    await navigator.clipboard.writeText(prompt());
    markUsedItems();
    flashDone(copyPrompt, "copy", copyLabel, "Copied prompt");
  });

  const copyText = iconButton("fileText", "Copy text only", async () => {
    await navigator.clipboard.writeText(capturesMarkdown(captures, settings));
    markUsedItems();
    flashDone(copyText, "fileText");
  });

  const download = iconButton("download", "Download Markdown", () => {
    downloadMarkdown(capturesFileName(captures), capturesMarkdown(captures, settings));
    markUsedItems();
    flashDone(download, "download");
  });

  const openChat = iconButton("externalLink", `Copy and open ${chat.name}`, async () => {
    await navigator.clipboard.writeText(prompt());
    markUsedItems();
    await chrome.tabs.create({ url: chat.url });
  });

  const elements = [copyPrompt, copyText, download, openChat];

  const show = (nextCaptures: Capture[], nextItems: LibraryItem[], nextCopyLabel = "Copy prompt") => {
    captures = nextCaptures;
    items = nextItems;

    if (nextCopyLabel !== copyLabel && !copyPrompt.classList.contains("is-done")) {
      setButtonContent(copyPrompt, "copy", nextCopyLabel);
    }

    copyLabel = nextCopyLabel;
    elements.forEach((button) => (button.disabled = captures.length === 0));
  };

  show([], []);

  return { elements, show };
}
