import { formatBytes } from "../formatBytes";
import { formatDateTime } from "../formatDateTime";
import { forget, librarySize } from "../library/library";
import type { LibraryItem } from "../library/LibraryItem";
import { KEEP_CAPTURES } from "../settings";
import { h, iconButton, iconElement } from "./dom";
import { pickToggle } from "./pickToggle";
import type { PopupState } from "./PopupState";
import type { View } from "./View";
import { summaryContent, viewShell } from "./viewShell";

export type SavedViewOptions = {
  state: PopupState;
  onOpen: (url: string) => void;
};

function matches(item: LibraryItem, query: string): boolean {
  const haystack = `${item.title} ${item.source ?? ""}`.toLowerCase();

  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

function savedRow(item: LibraryItem, state: PopupState, onOpen: (url: string) => void): HTMLElement {
  const kind = item.kind === "youtube" ? "youtube" : "article";
  const meta = [item.source, formatDateTime(item.usedAt), `${item.wordCount.toLocaleString()} words`].filter(Boolean).join(" · ");
  const main = h(
    "button",
    { className: "row-main", attrs: { type: "button" } },
    h("span", { className: "row-icon", data: { kind } }, iconElement(kind)),
    h("span", { className: "row-text" }, h("span", { className: "row-title", text: item.title }), h("span", { className: "row-meta", text: meta })),
  );

  main.addEventListener("click", () => onOpen(item.url));

  return h(
    "div",
    { className: "list-row" },
    main,
    pickToggle({ url: item.url, title: item.title, kind, source: item.source }, state, true).element,
    iconButton("trash", "Delete from saved", () => forget([item.url]), "icon-button is-small"),
  );
}

function emptySaved(hasQuery: boolean): HTMLElement {
  const message = hasQuery ? "No saved captures match" : "Nothing saved yet";

  return h("div", { className: "empty" }, h("p", { className: "empty-title", text: message }));
}

export function savedView({ state, onOpen }: SavedViewOptions): View {
  const shell = viewShell("saved");
  const search = h("input", { attrs: { type: "search", placeholder: "Search saved", "aria-label": "Search saved captures" } });
  const list = h("div", { className: "row-list" });
  const facts = h("span");
  let current = state;

  const showList = () => {
    const query = search.value.trim();
    const items = current.saved.filter((item) => matches(item, query));

    list.replaceChildren(...(items.length === 0 ? [emptySaved(query.length > 0)] : items.map((item) => savedRow(item, current, onOpen))));
  };

  const showFacts = async () => {
    const keepLabel = KEEP_CAPTURES[current.settings.keepCaptures];
    const keep = `${keepLabel[0].toLowerCase()}${keepLabel.slice(1)}`;
    const { bytes } = await librarySize();

    facts.textContent = `${current.saved.length} saved · ${formatBytes(bytes)} · kept ${keep}`;
  };

  search.addEventListener("input", showList);

  shell.head.append(h("label", { className: "search-field" }, iconElement("search"), search));
  shell.summary.append(...summaryContent("Saved", [facts]));
  shell.body.append(list);
  shell.foot.remove();

  const update = (nextState: PopupState) => {
    current = nextState;
    showList();
    showFacts();
  };

  update(state);

  return { element: shell.element, update };
}
