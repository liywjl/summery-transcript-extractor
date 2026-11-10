export type ChatSite = "claude" | "chatgpt" | "gemini";

export type KeepCaptures = "session" | "7" | "30" | "90" | "forever";

export type Settings = {
  promptTemplate: string;
  chatSite: ChatSite;
  includeTimestamps: boolean;
  youtubeAppVersion: string;
  keepCaptures: KeepCaptures;
};

export const CHAT_SITES: Record<ChatSite, { name: string; url: string }> = {
  claude: { name: "Claude", url: "https://claude.ai/new" },
  chatgpt: { name: "ChatGPT", url: "https://chatgpt.com/" },
  gemini: { name: "Gemini", url: "https://gemini.google.com/app" },
};

export const KEEP_CAPTURES: Record<KeepCaptures, string> = {
  session: "Until Chrome closes",
  "7": "7 days after last use",
  "30": "30 days after last use",
  "90": "90 days after last use",
  forever: "Until I delete them",
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
  keepCaptures: "30",
};

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  return { ...DEFAULT_SETTINGS, ...stored } as Settings;
}

export async function saveSettings(changes: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(changes);
}
