import { startYouTubeVersionSetting } from "./youtubeVersionSetting";
import { CHAT_SITES, DEFAULT_PROMPT_TEMPLATE, loadSettings, saveSettings, type ChatSite, type Settings } from "../settings";

const template = document.getElementById("template") as HTMLTextAreaElement;
const chatSite = document.getElementById("chat-site") as HTMLSelectElement;
const timestamps = document.getElementById("timestamps") as HTMLInputElement;
const reset = document.getElementById("reset") as HTMLButtonElement;
const saved = document.getElementById("saved") as HTMLElement;

let hideSaved: ReturnType<typeof setTimeout> | undefined;

async function save(changes: Partial<Settings>): Promise<void> {
  await saveSettings(changes);

  saved.textContent = "Saved";
  clearTimeout(hideSaved);
  hideSaved = setTimeout(() => (saved.textContent = ""), 1500);
}

function fillChatSites(selected: ChatSite): void {
  const options = Object.entries(CHAT_SITES).map(([value, site]) => new Option(site.name, value, false, value === selected));

  chatSite.replaceChildren(...options);
}

async function start(): Promise<void> {
  const settings = await loadSettings();

  template.value = settings.promptTemplate;
  timestamps.checked = settings.includeTimestamps;
  fillChatSites(settings.chatSite);

  template.addEventListener("input", () => save({ promptTemplate: template.value }));
  chatSite.addEventListener("change", () => save({ chatSite: chatSite.value as ChatSite }));
  timestamps.addEventListener("change", () => save({ includeTimestamps: timestamps.checked }));

  reset.addEventListener("click", () => {
    template.value = DEFAULT_PROMPT_TEMPLATE;
    save({ promptTemplate: DEFAULT_PROMPT_TEMPLATE });
  });
}

start();
startYouTubeVersionSetting();
