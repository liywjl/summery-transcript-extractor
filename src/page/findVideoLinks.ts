import type { Pick } from "../picks/Pick";
import { findVideoId, watchUrl } from "../youtube/findVideoId";

const VIDEO_CARD = [
  "ytd-rich-item-renderer",
  "ytd-video-renderer",
  "ytd-compact-video-renderer",
  "ytd-grid-video-renderer",
  "ytd-playlist-video-renderer",
  "ytd-playlist-panel-video-renderer",
  "yt-lockup-view-model",
  "ytm-shorts-lockup-view-model",
].join(",");

const PLAYLIST_ENTRY = "ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer";

const CHAPTER = "ytd-macro-markers-list-renderer, ytd-macro-markers-list-item-renderer";

const CHANNEL_LINK = 'ytd-channel-name a, a[href^="/@"], a[href^="/channel/"]';

const MAX_TITLE_LENGTH = 300;

type VideoLink = {
  videoId: string;
  title: string;
  titleRank: number;
  channel?: string;
};

function tidy(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function isUsableTitle(title: string): boolean {
  return title.length > 0 && title.length <= MAX_TITLE_LENGTH;
}

function linkTitle(anchor: HTMLAnchorElement): { title: string; titleRank: number } {
  const isTitleLink = anchor.id === "video-title" || /title/i.test(anchor.className);
  const candidates = [
    { title: tidy(anchor.title), titleRank: 3 },
    { title: tidy(anchor.textContent), titleRank: isTitleLink ? 2 : 1 },
    { title: tidy(anchor.getAttribute("aria-label")), titleRank: 0 },
  ];

  return candidates.find((candidate) => isUsableTitle(candidate.title)) ?? { title: "", titleRank: -1 };
}

function isPlaylistCard(anchor: HTMLAnchorElement): boolean {
  const isInPlaylist = new URL(anchor.href).searchParams.has("list");

  return isInPlaylist && !anchor.closest(PLAYLIST_ENTRY);
}

export function isVideoCardLink(anchor: HTMLAnchorElement): boolean {
  return Boolean(findVideoId(anchor.href)) && !isPlaylistCard(anchor) && !anchor.closest(CHAPTER);
}

function channelName(anchor: HTMLAnchorElement): string | undefined {
  const card = anchor.closest(VIDEO_CARD);
  const channel = tidy(card?.querySelector(CHANNEL_LINK)?.textContent);

  return channel || undefined;
}

function videoLink(anchor: HTMLAnchorElement): VideoLink | undefined {
  const videoId = findVideoId(anchor.href);

  if (!videoId || !isVideoCardLink(anchor)) {
    return undefined;
  }

  return { videoId, ...linkTitle(anchor), channel: channelName(anchor) };
}

function hasBetterTitle(candidate: VideoLink, current: VideoLink): boolean {
  if (candidate.titleRank !== current.titleRank) {
    return candidate.titleRank > current.titleRank;
  }

  return candidate.title.length > current.title.length;
}

function betterLink(current: VideoLink | undefined, candidate: VideoLink): VideoLink {
  if (!current) {
    return candidate;
  }

  const titled = hasBetterTitle(candidate, current) ? candidate : current;

  return { ...titled, channel: current.channel ?? candidate.channel };
}

export function findVideoLinks(doc: Document): Pick[] {
  const byVideoId = new Map<string, VideoLink>();
  const links = [...doc.querySelectorAll<HTMLAnchorElement>("a[href]")].map(videoLink).filter((link) => link !== undefined);

  for (const link of links) {
    byVideoId.set(link.videoId, betterLink(byVideoId.get(link.videoId), link));
  }

  return [...byVideoId.values()]
    .filter((link) => link.title.length > 0)
    .map((link) => ({ url: watchUrl(link.videoId), title: link.title, kind: "youtube", source: link.channel }));
}
