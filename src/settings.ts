export type ChatSite = "claude" | "chatgpt" | "gemini";

export type Settings = {
  promptTemplate: string;
  chatSite: ChatSite;
  includeTimestamps: boolean;
  youtubeAppVersion: string;
};

export const CHAT_SITES: Record<ChatSite, { name: string; url: string }> = {
  claude: { name: "Claude", url: "https://claude.ai/new" },
  chatgpt: { name: "ChatGPT", url: "https://chatgpt.com/" },
  gemini: { name: "Gemini", url: "https://gemini.google.com/app" },
};

export const DEFAULT_PROMPT_TEMPLATE = `Here is {{source}}. Read all of it, then give me a short summary of the key ideas and wait for my questions.

<document>
{{content}}
</document>`;

export const DEFAULT_SETTINGS: Settings = {
  promptTemplate: DEFAULT_PROMPT_TEMPLATE,
  chatSite: "claude",
  includeTimestamps: true,
  youtubeAppVersion: "",
};

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  return { ...DEFAULT_SETTINGS, ...stored } as Settings;
}

export async function saveSettings(changes: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(changes);
}
