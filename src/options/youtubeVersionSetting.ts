import { formatDateTime } from "../formatDateTime";
import { loadSettings, saveSettings } from "../settings";
import { TEST_APP_VERSION, type AppVersionTest, type TestAppVersionMessage } from "../youtube/testAppVersion";
import { DEFAULT_ANDROID_VERSION, extractAppVersion, LATEST_VERSION_URL } from "../youtube/youtubeClients";
import { loadYouTubeStatus, recordYouTubeStatus } from "../youtube/youtubeStatus";

type Tone = "good" | "bad" | "neutral";

const form = document.getElementById("youtube") as HTMLFormElement;
const input = document.getElementById("app-version") as HTMLInputElement;
const testButton = document.getElementById("test-version") as HTMLButtonElement;
const resetButton = document.getElementById("reset-version") as HTMLButtonElement;
const result = document.getElementById("version-result") as HTMLElement;
const health = document.getElementById("health") as HTMLElement;
const latestLink = document.getElementById("latest-version") as HTMLAnchorElement;

function say(message: string, tone: Tone): void {
  result.textContent = message;
  result.dataset.tone = tone;
}

async function showHealth(): Promise<void> {
  const status = await loadYouTubeStatus();

  if (!status) {
    health.dataset.health = "unknown";
    health.textContent = "Not used yet";
    return;
  }

  health.dataset.health = status.isWorking ? "working" : "rejected";
  health.textContent = status.isWorking
    ? `Working · ${status.detail} · ${formatDateTime(status.at)}`
    : `Turned down by YouTube · ${formatDateTime(status.at)}`;
}

function showSavedVersion(savedVersion: string): void {
  input.value = savedVersion;
  input.placeholder = `Built-in: ${DEFAULT_ANDROID_VERSION}`;
  resetButton.disabled = savedVersion === "";
}

async function askBackgroundToTest(version: string): Promise<AppVersionTest> {
  const message: TestAppVersionMessage = { type: TEST_APP_VERSION, version };

  return chrome.runtime.sendMessage(message);
}

function failureMessage(version: string, test: Extract<AppVersionTest, { isWorking: false }>): string {
  if (test.isRejected) {
    return `YouTube turned down ${version}, so nothing was saved. Try the newest number from the link below.`;
  }

  return `Couldn't test ${version}: ${test.message} Nothing was saved.`;
}

async function testAndSave(): Promise<void> {
  const typed = input.value.trim();
  const version = extractAppVersion(typed);

  if (!typed) {
    say("Paste a version number first, like 20.45.36.", "bad");
    return;
  }

  if (!version) {
    say(`"${typed}" isn't a version number. It should look like 20.45.36.`, "bad");
    return;
  }

  testButton.disabled = true;
  testButton.textContent = "Testing…";
  say(`Fetching a test transcript with ${version}…`, "neutral");

  const test = await askBackgroundToTest(version);

  testButton.disabled = false;
  testButton.textContent = "Test and save";

  if (!test.isWorking) {
    say(failureMessage(version, test), "bad");
    return;
  }

  await saveSettings({ youtubeAppVersion: version });
  await recordYouTubeStatus({ isWorking: true, at: Date.now(), detail: `Android app ${version}` });

  showSavedVersion(version);
  say(`${version} works and is saved.`, "good");
  await showHealth();
}

async function useBuiltIn(): Promise<void> {
  await saveSettings({ youtubeAppVersion: "" });

  showSavedVersion("");
  say(`Back to the built-in version, ${DEFAULT_ANDROID_VERSION}.`, "neutral");
}

export async function startYouTubeVersionSetting(): Promise<void> {
  const settings = await loadSettings();

  latestLink.href = LATEST_VERSION_URL;
  showSavedVersion(settings.youtubeAppVersion);
  await showHealth();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    testAndSave();
  });

  resetButton.addEventListener("click", useBuiltIn);

  if (location.hash === "#youtube") {
    form.scrollIntoView();
    input.focus();
  }
}
