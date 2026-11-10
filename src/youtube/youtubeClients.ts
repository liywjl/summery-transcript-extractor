export type YouTubeClient = {
  clientName: "ANDROID" | "IOS";
  clientVersion: string;
};

export const DEFAULT_ANDROID_VERSION = "20.10.38";

export const LATEST_VERSION_URL = "https://www.apkmirror.com/apk/google-inc/youtube/";

const IOS_CLIENT: YouTubeClient = { clientName: "IOS", clientVersion: "20.10.4" };

const APP_VERSION = /\d{1,3}\.\d{1,3}\.\d{1,4}/;

export function extractAppVersion(input: string): string | undefined {
  return APP_VERSION.exec(input)?.[0];
}

export function androidClient(version: string): YouTubeClient {
  return { clientName: "ANDROID", clientVersion: version };
}

export function clientsToTry(customVersion: string): YouTubeClient[] {
  const custom = extractAppVersion(customVersion);
  const androidVersions = new Set([custom, DEFAULT_ANDROID_VERSION].filter((version): version is string => Boolean(version)));

  return [...[...androidVersions].map(androidClient), IOS_CLIENT];
}

export function clientLabel(client: YouTubeClient): string {
  const appName = client.clientName === "IOS" ? "iPhone app" : "Android app";

  return `${appName} ${client.clientVersion}`;
}
