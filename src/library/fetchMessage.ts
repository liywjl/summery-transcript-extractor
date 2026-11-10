const FETCH_CAPTURE = "fetch-capture";

export type FetchMessage = {
  type: typeof FETCH_CAPTURE;
  url: string;
  tabId?: number;
};

export type FetchResult = { isDone: true } | { isDone: false; message: string; needsAppVersion: boolean };

export function isFetchMessage(message: unknown): message is FetchMessage {
  return (message as Partial<FetchMessage> | undefined)?.type === FETCH_CAPTURE;
}

export async function askToFetch(url: string, tabId?: number): Promise<FetchResult> {
  return chrome.runtime.sendMessage({ type: FETCH_CAPTURE, url, tabId });
}
