import type { IconName } from "../icons";
import { h, iconElement } from "./dom";

export type PillTone = "youtube" | "article" | "selection" | "picked" | "saved";

export function kindPill(tone: PillTone, iconName: IconName, label: string): HTMLElement {
  return h("span", { className: "kind", data: { kind: tone } }, iconElement(iconName), label);
}
