import { fetchYouTubeTranscript, YouTubeRejected } from "./fetchYouTubeTranscript";
import { androidClient } from "./youtubeClients";

const TEST_VIDEO_ID = "aircAruvnKk";

export const TEST_APP_VERSION = "test-youtube-app-version";

export type TestAppVersionMessage = {
  type: typeof TEST_APP_VERSION;
  version: string;
};

export type AppVersionTest = { isWorking: true } | { isWorking: false; isRejected: boolean; message: string };

export function isTestAppVersionMessage(message: unknown): message is TestAppVersionMessage {
  return (message as Partial<TestAppVersionMessage> | undefined)?.type === TEST_APP_VERSION;
}

export async function testAppVersion(version: string): Promise<AppVersionTest> {
  try {
    await fetchYouTubeTranscript(TEST_VIDEO_ID, ["en"], [androidClient(version)]);

    return { isWorking: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return { isWorking: false, isRejected: error instanceof YouTubeRejected, message };
  }
}
