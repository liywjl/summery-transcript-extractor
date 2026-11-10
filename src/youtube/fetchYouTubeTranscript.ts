import { captionTrackLabel, chooseCaptionTrack, type CaptionTrack } from "./chooseCaptionTrack";
import { cuesFromCaptionJson, type CaptionJson, type Cue } from "./transcript";
import type { YouTubeClient } from "./youtubeClients";

const PLAYER_ENDPOINT = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

export type YouTubeTranscript = {
  title: string;
  channel: string;
  durationSeconds?: number;
  description: string;
  captionsLabel: string;
  cues: Cue[];
  client: YouTubeClient;
};

type PlayerResponse = {
  playabilityStatus?: { status?: string; reason?: string };
  videoDetails?: { title?: string; author?: string; lengthSeconds?: string; shortDescription?: string };
  captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
};

export class TranscriptUnavailable extends Error {}

export class YouTubeRejected extends Error {}

class NoCaptions extends TranscriptUnavailable {}

const ORIGIN_RULE_ID = 1;

async function sendPlayerRequestsAsYouTube(): Promise<void> {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [ORIGIN_RULE_ID],
    addRules: [
      {
        id: ORIGIN_RULE_ID,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            { header: "origin", operation: chrome.declarativeNetRequest.HeaderOperation.SET, value: "https://www.youtube.com" },
          ],
        },
        condition: {
          urlFilter: "|https://www.youtube.com/youtubei/v1/player?",
          tabIds: [chrome.tabs.TAB_ID_NONE],
          requestMethods: [chrome.declarativeNetRequest.RequestMethod.POST],
        },
      },
    ],
  });
}

async function fetchPlayer(videoId: string, client: YouTubeClient): Promise<PlayerResponse> {
  await sendPlayerRequestsAsYouTube();

  const response = await fetch(PLAYER_ENDPOINT, {
    method: "POST",
    credentials: "omit",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ context: { client: { ...client, hl: "en" } }, videoId }),
  });

  if (!response.ok) {
    throw new YouTubeRejected(`YouTube answered ${response.status}.`);
  }

  return response.json();
}

async function fetchCaptionJson(track: CaptionTrack): Promise<CaptionJson> {
  const url = new URL(track.baseUrl);
  url.searchParams.set("fmt", "json3");

  const response = await fetch(url, { credentials: "omit" });
  const body = await response.text();

  if (!response.ok || body.length === 0) {
    throw new YouTubeRejected("YouTube listed captions but sent them back empty.");
  }

  return JSON.parse(body);
}

function playableTracks(player: PlayerResponse): CaptionTrack[] {
  const status = player.playabilityStatus?.status;

  if (status && status !== "OK") {
    throw new TranscriptUnavailable(player.playabilityStatus?.reason ?? `YouTube says this video is ${status.toLowerCase()}.`);
  }

  return player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
}

async function fetchWithClient(videoId: string, preferredLanguages: readonly string[], client: YouTubeClient): Promise<YouTubeTranscript> {
  const player = await fetchPlayer(videoId, client);
  const track = chooseCaptionTrack(playableTracks(player), preferredLanguages);

  if (!track) {
    throw new NoCaptions("This video has no captions, so there is no transcript to copy.");
  }

  const cues = cuesFromCaptionJson(await fetchCaptionJson(track));
  const details = player.videoDetails ?? {};
  const lengthSeconds = Number(details.lengthSeconds);

  return {
    title: details.title ?? "Untitled video",
    channel: details.author ?? "",
    durationSeconds: lengthSeconds > 0 ? lengthSeconds : undefined,
    description: details.shortDescription ?? "",
    captionsLabel: captionTrackLabel(track),
    cues,
    client,
  };
}

export async function fetchYouTubeTranscript(
  videoId: string,
  preferredLanguages: readonly string[],
  clients: YouTubeClient[],
): Promise<YouTubeTranscript> {
  const failures: unknown[] = [];

  for (const client of clients) {
    try {
      return await fetchWithClient(videoId, preferredLanguages, client);
    } catch (error) {
      if (error instanceof NoCaptions) {
        throw error;
      }

      failures.push(error);
    }
  }

  const videoProblem = failures.find((failure) => failure instanceof TranscriptUnavailable);

  if (videoProblem) {
    throw videoProblem;
  }

  const isOffline = failures.some((failure) => failure instanceof TypeError);

  if (isOffline) {
    throw new TranscriptUnavailable("Couldn't reach YouTube. Check your connection and try again.");
  }

  throw new YouTubeRejected("YouTube turned down every app version the extension tried.");
}
