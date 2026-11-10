import type { Capture } from "../capture/Capture";
import { CaptureFailed, captureTab } from "../capture/captureTab";
import { captureMarkdown, capturePrompt, fileName, wordCount } from "../capture/formatCapture";
import { icon, type IconName } from "../icons";
import { CHAT_SITES, loadSettings, type Settings } from "../settings";
import { findVideoId } from "../youtube/findVideoId";
import { formatClock } from "../youtube/transcript";
import { previewBlocks, type PreviewBlock } from "./previewBlocks";

const KINDS: Record<Capture["kind"], { icon: IconName; label: string; loading: string }> = {
  youtube: { icon: "youtube", label: "YouTube transcript", loading: "Reading captions from YouTube…" },
  article: { icon: "article", label: "Article", loading: "Reading the page…" },
  selection: { icon: "selection", label: "Selection", loading: "Reading your selection…" },
};

const DONE_MS = 1600;

function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const view = {
  root: document.querySelector<HTMLElement>(".popup")!,
  kind: element("kind"),
  settings: element<HTMLButtonElement>("settings"),
  title: element("title"),
  facts: element("facts"),
  preview: element("preview"),
  copyPrompt: element<HTMLButtonElement>("copy-prompt"),
  copyText: element<HTMLButtonElement>("copy-text"),
  download: element<HTMLButtonElement>("download"),
  openChat: element<HTMLButtonElement>("open-chat"),
};

const actionButtons = [view.copyPrompt, view.copyText, view.download, view.openChat];

function setButtonContent(button: HTMLButtonElement, iconName: IconName, label?: string): void {
  button.innerHTML = icon(iconName);

  if (label) {
    button.append(label);
  }
}

function showKind(kind: Capture["kind"]): void {
  view.kind.dataset.kind = kind;
  view.kind.innerHTML = icon(KINDS[kind].icon);
  view.kind.append(KINDS[kind].label);
}

function statusLine(iconName: IconName | undefined, text: string): HTMLElement {
  const line = document.createElement("p");
  line.className = "status-line";

  if (iconName) {
    line.innerHTML = icon(iconName);
  }

  line.append(text);

  return line;
}

function showLoading(kind: Capture["kind"]): void {
  view.root.dataset.state = "loading";
  showKind(kind);

  const status = document.createElement("div");
  status.className = "status";
  status.append(statusLine(undefined, KINDS[kind].loading));

  for (let index = 0; index < 8; index++) {
    const line = document.createElement("span");
    line.className = "skeleton skeleton-line";
    status.append(line);
  }

  view.preview.replaceChildren(status);
  actionButtons.forEach((button) => (button.disabled = true));
}

function fixAppVersionButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "retry fix";
  setButtonContent(button, "settings", "Update app version");
  button.addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("options.html#youtube") }));

  return button;
}

function showError(message: string, retry: () => void, needsAppVersion: boolean): void {
  view.root.dataset.state = "error";
  view.title.textContent = "Nothing to copy yet";
  view.facts.textContent = "";

  const status = document.createElement("div");
  status.className = "status status-error";

  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.className = "retry";
  setButtonContent(retryButton, "retry", "Try again");
  retryButton.addEventListener("click", retry);

  const buttons = document.createElement("div");
  buttons.className = "status-buttons";
  buttons.append(...(needsAppVersion ? [fixAppVersionButton(), retryButton] : [retryButton]));

  status.append(statusLine("alert", message), buttons);
  view.preview.replaceChildren(status);
  actionButtons.forEach((button) => (button.disabled = true));
}

function tokenEstimate(text: string): string {
  const tokens = Math.round(text.length / 4);

  if (tokens < 1000) {
    return `≈${tokens} tokens`;
  }

  return `≈${(tokens / 1000).toFixed(1)}k tokens`;
}

function sourceFacts(capture: Capture): string[] {
  if (capture.kind === "youtube") {
    const length = capture.durationSeconds ? formatClock(capture.durationSeconds) : "";

    return [capture.channel, length];
  }

  return [capture.siteName ?? new URL(capture.url).hostname];
}

function showFacts(capture: Capture, markdown: string): void {
  const facts = [...sourceFacts(capture), `${wordCount(markdown).toLocaleString()} words`].filter(Boolean);
  const tokens = document.createElement("span");
  tokens.className = "tokens";
  tokens.textContent = tokenEstimate(markdown);

  view.facts.replaceChildren(`${facts.join(" · ")} · `, tokens);
}

function blockElement(block: PreviewBlock): HTMLElement {
  if (block.type === "heading") {
    const heading = document.createElement(`h${Math.min(block.level + 1, 4)}`);
    heading.textContent = block.text;
    return heading;
  }

  if (block.type === "list") {
    const list = document.createElement("ul");
    list.append(...block.items.map((item) => Object.assign(document.createElement("li"), { textContent: item })));
    return list;
  }

  if (block.type === "code") {
    const code = document.createElement("pre");
    code.textContent = block.text;
    return code;
  }

  const paragraph = document.createElement("p");

  if (block.timestamp) {
    const time = document.createElement("span");
    time.className = "timestamp";
    time.textContent = block.timestamp;
    paragraph.append(time);
  }

  paragraph.append(block.text);

  return paragraph;
}

function withoutTitleAndFacts(blocks: PreviewBlock[]): PreviewBlock[] {
  const hasTitleAndFacts = blocks[0]?.type === "heading" && blocks[1]?.type === "list";

  return hasTitleAndFacts ? blocks.slice(2) : blocks;
}

function showPreview(markdown: string): void {
  const blocks = withoutTitleAndFacts(previewBlocks(markdown));

  view.preview.replaceChildren(...blocks.map(blockElement));
  view.preview.scrollTop = 0;
}

function flashDone(button: HTMLButtonElement, restore: () => void, doneLabel?: string): void {
  button.classList.add("is-done");
  setButtonContent(button, "check", doneLabel);

  setTimeout(() => {
    button.classList.remove("is-done");
    restore();
  }, DONE_MS);
}

function downloadMarkdown(name: string, markdown: string): void {
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });

  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function restoreActions(chatName: string): void {
  setButtonContent(view.copyPrompt, "copy", "Copy prompt");
  setButtonContent(view.copyText, "fileText");
  setButtonContent(view.download, "download");
  setButtonContent(view.openChat, "externalLink");

  view.openChat.title = `Copy and open ${chatName}`;
  view.openChat.setAttribute("aria-label", `Copy and open ${chatName}`);
}

function bindActions(capture: Capture, settings: Settings): void {
  const markdown = captureMarkdown(capture, settings);
  const prompt = capturePrompt(capture, settings.promptTemplate, settings);
  const chat = CHAT_SITES[settings.chatSite];

  restoreActions(chat.name);

  view.copyPrompt.onclick = async () => {
    await navigator.clipboard.writeText(prompt);
    flashDone(view.copyPrompt, () => setButtonContent(view.copyPrompt, "copy", "Copy prompt"), "Copied prompt");
  };

  view.copyText.onclick = async () => {
    await navigator.clipboard.writeText(markdown);
    flashDone(view.copyText, () => setButtonContent(view.copyText, "fileText"));
  };

  view.download.onclick = () => {
    downloadMarkdown(fileName(capture), markdown);
    flashDone(view.download, () => setButtonContent(view.download, "download"));
  };

  view.openChat.onclick = async () => {
    await navigator.clipboard.writeText(prompt);
    await chrome.tabs.create({ url: chat.url });
  };

  actionButtons.forEach((button) => (button.disabled = false));
}

function showCapture(capture: Capture, settings: Settings): void {
  const markdown = captureMarkdown(capture, settings);

  view.root.dataset.state = "ready";
  showKind(capture.kind);
  view.title.textContent = capture.title;
  showFacts(capture, markdown);
  showPreview(markdown);
  bindActions(capture, settings);
}

async function activeTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  return tab;
}

async function run(): Promise<void> {
  const [settings, tab] = await Promise.all([loadSettings(), activeTab()]);

  showLoading(findVideoId(tab?.url) ? "youtube" : "article");

  try {
    showCapture(await captureTab(tab), settings);
  } catch (error) {
    const needsAppVersion = error instanceof CaptureFailed && error.needsAppVersion;

    showError(error instanceof Error ? error.message : String(error), run, needsAppVersion);
  }
}

view.settings.innerHTML = icon("settings");
view.settings.addEventListener("click", () => chrome.runtime.openOptionsPage());
restoreActions(CHAT_SITES.claude.name);
run();
