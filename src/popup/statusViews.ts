import type { IconName } from "../icons";
import { h, iconElement, textButton } from "./dom";
import { kindPill, type PillTone } from "./kindPill";
import type { View } from "./View";
import { viewShell } from "./viewShell";

export function statusLine(iconName: IconName | undefined, text: string): HTMLElement {
  return h("p", { className: "status-line" }, iconName && iconElement(iconName), text);
}

export function loadingView(tone: PillTone, iconName: IconName, label: string, message: string): View {
  const shell = viewShell("loading");
  const lines = Array.from({ length: 8 }, () => h("span", { className: "skeleton skeleton-line" }));

  shell.head.append(kindPill(tone, iconName, label));
  shell.summary.append(h("span", { className: "skeleton skeleton-title" }), h("span", { className: "skeleton skeleton-facts" }));
  shell.body.append(h("div", { className: "status" }, statusLine("loader", message), ...lines));

  return { element: shell.element };
}

export type ErrorAction = {
  iconName: IconName;
  label: string;
  isPrimary?: boolean;
  onClick: () => void;
};

export function errorView(message: string, actions: ErrorAction[]): View {
  const shell = viewShell("error");
  const buttons = actions.map((action) => textButton(action.isPrimary ? "retry fix" : "retry", action.iconName, action.label, action.onClick));

  shell.summary.append(h("h1", { className: "title", text: "Nothing to copy yet" }));
  shell.body.append(h("div", { className: "status status-error" }, statusLine("alert", message), h("div", { className: "status-buttons" }, ...buttons)));

  return { element: shell.element };
}
