import type { ListingReading } from "../page/PageReading";
import type { Pick } from "../picks/Pick";
import { setIsPicking, togglePick } from "../picks/picks";
import { h, iconButton, textButton } from "./dom";
import { kindPill } from "./kindPill";
import type { PopupState } from "./PopupState";
import { requestSiteAccess } from "./requestSiteAccess";
import type { View } from "./View";
import { summaryContent, viewShell } from "./viewShell";

export type ListingViewOptions = {
  reading: ListingReading;
  state: PopupState;
  isPickingOnYouTube: boolean;
  onShowPicked: () => void;
  onReadWholePage: () => void;
};

function counted(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function pickRow(link: Pick): { element: HTMLElement; checkbox: HTMLInputElement } {
  const checkbox = h("input", { attrs: { type: "checkbox" } });

  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      requestSiteAccess([link.url]);
    }

    togglePick(link);
  });

  const text = h("span", { className: "row-text" }, h("span", { className: "row-title", text: link.title }), link.source && h("span", { className: "row-meta", text: link.source }));

  return { element: h("label", { className: "pick-row" }, checkbox, text), checkbox };
}

function thumbnailSwitch(isOn: boolean): HTMLElement {
  const input = h("input", { attrs: { type: "checkbox", role: "switch" } });
  input.checked = isOn;
  input.addEventListener("change", () => setIsPicking(input.checked));

  return h("label", { className: "switch", attrs: { title: "Show pick boxes on YouTube thumbnails" } }, input, "Boxes on thumbnails");
}

export function listingView({ reading, state, isPickingOnYouTube, onShowPicked, onReadWholePage }: ListingViewOptions): View {
  const isYouTube = reading.links.every((link) => link.kind === "youtube");
  const noun = isYouTube ? "video" : "article";
  const shell = viewShell("listing");
  const rows = reading.links.map(pickRow);
  const facts = h("span");
  const showPicked = textButton("primary", "arrowRight", "Show picks", onShowPicked);

  shell.head.append(
    isYouTube ? kindPill("youtube", "youtube", "Pick videos") : kindPill("article", "article", "Front page"),
    isYouTube ? thumbnailSwitch(isPickingOnYouTube) : h("span"),
  );

  shell.summary.append(...summaryContent(reading.title, [facts]));
  shell.body.append(h("div", { className: "row-list" }, ...rows.map((row) => row.element)));
  shell.foot.append(showPicked);

  if (!isYouTube) {
    shell.foot.append(iconButton("fileText", "Read the whole page instead", onReadWholePage));
  }

  const update = (nextState: PopupState) => {
    const pickedUrls = new Set(nextState.picks.map((pick) => pick.url));
    const pickedHere = reading.links.filter((link) => pickedUrls.has(link.url)).length;

    rows.forEach((row, index) => (row.checkbox.checked = pickedUrls.has(reading.links[index].url)));
    facts.textContent = `${counted(reading.links.length, noun)} on this page · ${pickedHere} picked`;
    showPicked.lastChild!.textContent = nextState.picks.length === 0 ? "Show picks" : `Show ${counted(nextState.picks.length, "pick")}`;
    showPicked.disabled = nextState.picks.length === 0;
  };

  update(state);

  return { element: shell.element, update };
}
