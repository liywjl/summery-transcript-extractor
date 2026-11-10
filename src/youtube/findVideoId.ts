const VIDEO_ID = /^[\w-]{11}$/;

const YOUTUBE_HOSTS = new Set(["www.youtube.com", "youtube.com", "m.youtube.com", "music.youtube.com"]);

const PATH_PREFIXES = ["/shorts/", "/live/", "/embed/"];

function idFromPath(pathname: string): string | undefined {
  const prefix = PATH_PREFIXES.find((candidate) => pathname.startsWith(candidate));

  if (!prefix) {
    return undefined;
  }

  return pathname.slice(prefix.length).split("/")[0];
}

function candidateId(url: URL): string | undefined {
  if (url.hostname === "youtu.be") {
    return url.pathname.slice(1).split("/")[0];
  }

  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    return undefined;
  }

  if (url.pathname === "/watch") {
    return url.searchParams.get("v") ?? undefined;
  }

  return idFromPath(url.pathname);
}

export function findVideoId(address: string | undefined): string | undefined {
  if (!address || !URL.canParse(address)) {
    return undefined;
  }

  const id = candidateId(new URL(address));

  if (!id || !VIDEO_ID.test(id)) {
    return undefined;
  }

  return id;
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
