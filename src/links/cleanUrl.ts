import { findVideoId, watchUrl } from "../youtube/findVideoId";

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "yclid",
  "twclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "_ga",
  "_gl",
  "_hsenc",
  "_hsmi",
  "mkt_tok",
  "oly_anon_id",
  "oly_enc_id",
  "vero_id",
  "ref",
  "ref_src",
  "ref_url",
  "cmp",
  "share",
  "smid",
  "sh",
  "si",
  "spm",
  "feature",
]);

const TRACKING_PREFIXES = ["utm_", "pk_", "itm_", "at_"];

function isTrackingParam(name: string): boolean {
  const lowerName = name.toLowerCase();

  return TRACKING_PARAMS.has(lowerName) || TRACKING_PREFIXES.some((prefix) => lowerName.startsWith(prefix));
}

export function isWebAddress(address: string): boolean {
  if (!URL.canParse(address)) {
    return false;
  }

  const { protocol } = new URL(address);

  return protocol === "https:" || protocol === "http:";
}

export function cleanUrl(address: string): string {
  const videoId = findVideoId(address);

  if (videoId) {
    return watchUrl(videoId);
  }

  const url = new URL(address);
  const trackingNames = [...url.searchParams.keys()].filter(isTrackingParam);

  trackingNames.forEach((name) => url.searchParams.delete(name));
  url.hash = "";

  return url.toString();
}

function withoutTrailingPunctuation(candidate: string): string {
  return candidate.replace(/[.,;:!?)\]]+$/, "");
}

function withScheme(candidate: string): string {
  return /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
}

export function findWebAddresses(text: string): string[] {
  const candidates = text.match(/https?:\/\/[^\s<>"']+|(?:www\.)?youtu(?:be\.com|\.be)\/[^\s<>"']+/gi) ?? [];
  const addresses = candidates.map(withoutTrailingPunctuation).map(withScheme).filter(isWebAddress);

  return [...new Set(addresses.map(cleanUrl))];
}
