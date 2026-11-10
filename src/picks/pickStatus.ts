export type PickProblem = {
  message: string;
  accessOrigin?: string;
};

export type PickStatus = {
  fetching: string[];
  problems: Record<string, PickProblem>;
};

const STATUS_KEY = "pickStatus";

const NO_STATUS: PickStatus = { fetching: [], problems: {} };

export async function loadPickStatus(): Promise<PickStatus> {
  const stored = await chrome.storage.session.get(STATUS_KEY);

  return (stored[STATUS_KEY] as PickStatus | undefined) ?? NO_STATUS;
}

export async function savePickStatus(status: PickStatus): Promise<void> {
  await chrome.storage.session.set({ [STATUS_KEY]: status });
}

export function onPickStatusChanged(listener: (status: PickStatus) => void): void {
  chrome.storage.session.onChanged.addListener((changes) => {
    if (changes[STATUS_KEY]) {
      listener((changes[STATUS_KEY].newValue as PickStatus | undefined) ?? NO_STATUS);
    }
  });
}

export const RETRY_PICKS = "retry-picks";

export function isRetryPicksMessage(message: unknown): boolean {
  return (message as { type?: string } | undefined)?.type === RETRY_PICKS;
}

export async function askToRetryPicks(): Promise<void> {
  await chrome.runtime.sendMessage({ type: RETRY_PICKS });
}
