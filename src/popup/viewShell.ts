import { h } from "./dom";

export type ViewShell = {
  element: HTMLElement;
  head: HTMLElement;
  summary: HTMLElement;
  body: HTMLElement;
  foot: HTMLElement;
};

export function viewShell(name: string): ViewShell {
  const head = h("header", { className: "view-head" });
  const summary = h("section", { className: "view-summary" });
  const body = h("section", { className: "view-body", attrs: { "aria-live": "polite" } });
  const foot = h("footer", { className: "view-foot" });

  return { element: h("div", { className: "view", data: { view: name } }, head, summary, body, foot), head, summary, body, foot };
}

export function summaryContent(title: string, facts: (Node | string)[]): Node[] {
  return [h("h1", { className: "title", text: title }), h("p", { className: "facts" }, ...facts)];
}
