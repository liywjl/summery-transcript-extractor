import type { PopupState } from "./PopupState";

export type View = {
  element: HTMLElement;
  update?: (state: PopupState) => void;
};
