export type YouTubeStatus = {
  isWorking: boolean;
  at: number;
  detail: string;
};

const STATUS_KEY = "youtubeStatus";

export async function recordYouTubeStatus(status: YouTubeStatus): Promise<void> {
  await chrome.storage.local.set({ [STATUS_KEY]: status });
}

export async function loadYouTubeStatus(): Promise<YouTubeStatus | undefined> {
  const stored = await chrome.storage.local.get(STATUS_KEY);

  return stored[STATUS_KEY] as YouTubeStatus | undefined;
}
