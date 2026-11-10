import type { Capture } from "../capture/Capture";
import { findWebAddresses } from "../links/cleanUrl";
import { findSaved } from "../library/library";
import type { LibraryItem } from "../library/LibraryItem";
import type { Pick } from "../picks/Pick";
import { askToRetryPicks } from "../picks/pickStatus";
import { addPicks, clearPicks, removePick } from "../picks/picks";
import { findVideoId } from "../youtube/findVideoId";
import { captureActions } from "./captureActions";
import { h, iconButton, iconElement, textButton } from "./dom";
import { pickRowState, type PickRowState } from "./pickRowState";
import type { PopupState } from "./PopupState";
import { requestSiteAccess } from "./requestSiteAccess";
import type { View } from "./View";
import { summaryContent, viewShell } from "./viewShell";

export type PickedViewOptions = {
  state: PopupState;
  onOpen: (url: string) => void;
};

function pickFromAddress(url: string): Pick {
  return { url, title: url, kind: findVideoId(url) ? "youtube" : "article", source: new URL(url).hostname.replace(/^www\./, "") };
}

function pasteForm(): HTMLFormElement {
  const input = h("input", { attrs: { type: "text", placeholder: "Paste YouTube or article links", "aria-label": "Links to pick", autocomplete: "off" } });
  const add = h("button", { className: "icon-button is-small", attrs: { type: "submit", "aria-label": "Add links", title: "Add links" } }, iconElement("plus"));
  const form = h("form", { className: "paste-form" }, iconElement("link"), input, add);

  input.addEventListener("input", () => input.setCustomValidity(""));

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const urls = findWebAddresses(input.value);

    if (urls.length === 0) {
      input.setCustomValidity("No links found. Paste a YouTube or article link.");
      input.reportValidity();
      return;
    }

    requestSiteAccess(urls);
    addPicks(urls.map(pickFromAddress));
    input.value = "";
  });

  return form;
}

function statusText(row: PickRowState, pick: Pick): HTMLElement {
  if (row.state === "ready") {
    return h("span", { className: "row-status is-ready" }, iconElement("check"), `${row.item.wordCount.toLocaleString()} words`);
  }

  if (row.state === "fetching") {
    const message = pick.kind === "youtube" ? "Reading captions…" : "Reading article…";

    return h("span", { className: "row-status is-fetching" }, iconElement("loader"), message);
  }

  if (row.state === "waiting") {
    return h("span", { className: "row-status", text: "Waiting" });
  }

  return h("span", { className: "row-status is-failed" }, iconElement("alert"), row.problem.message);
}

function fixButton(row: PickRowState): HTMLButtonElement | undefined {
  if (row.state !== "failed") {
    return undefined;
  }

  const origin = row.problem.accessOrigin;

  if (origin) {
    return textButton("row-fix", "unlock", `Allow ${new URL(origin).hostname.replace(/^www\./, "")}`, () => {
      chrome.permissions.request({ origins: [`${origin}/*`] });
    });
  }

  return textButton("row-fix", "retry", "Try again", () => askToRetryPicks());
}

function pickedRow(pick: Pick, state: PopupState, onOpen: (url: string) => void): HTMLElement {
  const row = pickRowState(pick, state);
  const title = row.state === "ready" ? row.item.title : pick.title;
  const source = row.state === "ready" ? row.item.source : pick.source;
  const main = h(
    "button",
    { className: "row-main", attrs: { type: "button" } },
    h("span", { className: "row-icon", data: { kind: pick.kind } }, iconElement(pick.kind === "youtube" ? "youtube" : "article")),
    h("span", { className: "row-text" }, h("span", { className: "row-title", text: title }), h("span", { className: "row-meta" }, source && `${source} · `, statusText(row, pick))),
  );

  main.disabled = row.state !== "ready";
  main.addEventListener("click", () => onOpen(pick.url));

  return h(
    "div",
    { className: "list-row", data: { state: row.state } },
    main,
    fixButton(row),
    iconButton("close", "Remove from picks", () => removePick(pick.url), "icon-button is-small"),
  );
}

function emptyPicks(): HTMLElement {
  return h(
    "div",
    { className: "empty" },
    h("p", { className: "empty-title", text: "Nothing picked yet" }),
    h(
      "ul",
      {},
      h("li", { text: "Paste links above" }),
      h("li", { text: "Tick videos on any YouTube page" }),
      h("li", { text: "Right-click a link: Add link to Summery picks" }),
    ),
  );
}

async function loadCaptures(items: LibraryItem[]): Promise<Capture[]> {
  const saved = await Promise.all(items.map((item) => findSaved(item.url)));

  return saved.filter((entry) => entry !== undefined).map((entry) => entry.capture);
}

function readyItems(state: PopupState): LibraryItem[] {
  return state.picks.map((pick) => pickRowState(pick, state)).flatMap((row) => (row.state === "ready" ? [row.item] : []));
}

function copyLabel(readyCount: number, total: number): string {
  return readyCount === total ? "Copy prompt" : `Copy ${readyCount} of ${total}`;
}

export function pickedView({ state, onOpen }: PickedViewOptions): View {
  const shell = viewShell("picked");
  const list = h("div", { className: "row-list" });
  const facts = h("span");
  const clear = iconButton("trash", "Clear all picks", () => clearPicks(), "icon-button is-small");
  const actions = captureActions(state.settings);
  let shownKey = "";

  shell.head.append(pasteForm());
  shell.summary.append(h("div", { className: "summary-row" }, h("div", {}, ...summaryContent("Picked", [facts])), clear));
  shell.body.append(list);
  shell.foot.append(...actions.elements);

  const showActions = async (nextState: PopupState) => {
    const items = readyItems(nextState);
    const key = `${items.map((item) => `${item.url}@${item.savedAt}`).join("|")}#${nextState.picks.length}`;

    if (key === shownKey) {
      return;
    }

    shownKey = key;
    actions.show(await loadCaptures(items), items, copyLabel(items.length, nextState.picks.length));
  };

  const update = (nextState: PopupState) => {
    const readyCount = readyItems(nextState).length;
    const words = readyItems(nextState).reduce((total, item) => total + item.wordCount, 0);

    facts.textContent = nextState.picks.length === 0 ? "None yet" : `${readyCount} of ${nextState.picks.length} ready · ${words.toLocaleString()} words`;
    clear.disabled = nextState.picks.length === 0;
    list.replaceChildren(...(nextState.picks.length === 0 ? [emptyPicks()] : nextState.picks.map((pick) => pickedRow(pick, nextState, onOpen))));
    showActions(nextState);
  };

  update(state);

  return { element: shell.element, update };
}
