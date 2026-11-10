import { captureUrl } from "../capture/captureUrl";
import { NeedsSiteAccess } from "../capture/fetchArticle";
import { findSaved } from "../library/library";
import { fetchAndSave } from "../library/libraryCapture";
import type { Pick } from "./Pick";
import { loadPickStatus, savePickStatus, type PickProblem, type PickStatus } from "./pickStatus";
import { loadPicks } from "./picks";

let isRunning = false;
let isRequestedAgain = false;

function problemFor(error: unknown): PickProblem {
  if (error instanceof NeedsSiteAccess) {
    return { message: error.message, accessOrigin: error.origin };
  }

  return { message: error instanceof Error ? error.message : String(error) };
}

function withoutUnpicked(status: PickStatus, picks: Pick[]): PickStatus {
  const pickedUrls = new Set(picks.map((pick) => pick.url));
  const problems = Object.fromEntries(Object.entries(status.problems).filter(([url]) => pickedUrls.has(url)));

  return { fetching: [], problems };
}

async function isWaiting(pick: Pick, status: PickStatus): Promise<boolean> {
  if (status.problems[pick.url]) {
    return false;
  }

  return !(await findSaved(pick.url));
}

async function fetchOne(pick: Pick, status: PickStatus): Promise<PickStatus> {
  await savePickStatus({ ...status, fetching: [pick.url] });

  try {
    await fetchAndSave(() => captureUrl(pick.url));

    return status;
  } catch (error) {
    return { ...status, problems: { ...status.problems, [pick.url]: problemFor(error) } };
  }
}

async function fetchWaitingPicks(): Promise<void> {
  const picks = await loadPicks();
  let status = withoutUnpicked(await loadPickStatus(), picks);

  for (const pick of picks) {
    if (await isWaiting(pick, status)) {
      status = await fetchOne(pick, status);
    }
  }

  await savePickStatus(status);
}

export async function fetchPicks(): Promise<void> {
  if (isRunning) {
    isRequestedAgain = true;
    return;
  }

  isRunning = true;

  try {
    do {
      isRequestedAgain = false;
      await fetchWaitingPicks();
    } while (isRequestedAgain);
  } finally {
    isRunning = false;
  }
}

export async function retryPicks(): Promise<void> {
  await savePickStatus({ fetching: [], problems: {} });
  await fetchPicks();
}
