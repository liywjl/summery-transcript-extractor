import type { Pick } from "../picks/Pick";
import { togglePick } from "../picks/picks";
import { h, iconElement } from "./dom";
import type { PopupState } from "./PopupState";
import { requestSiteAccess } from "./requestSiteAccess";

export type PickToggle = {
  element: HTMLButtonElement;
  update: (state: PopupState) => void;
};

export function pickToggle(pick: Pick, state: PopupState, isCompact = false): PickToggle {
  const element = h("button", { className: isCompact ? "pick-toggle is-compact" : "pick-toggle", attrs: { type: "button" } });
  let isPicked = false;

  const update = (nextState: PopupState) => {
    isPicked = nextState.picks.some((candidate) => candidate.url === pick.url);

    const label = isPicked ? "Picked" : "Pick";
    const description = isPicked ? "Remove from picks" : "Add to picks";

    element.dataset.picked = String(isPicked);
    element.setAttribute("aria-pressed", String(isPicked));
    element.setAttribute("aria-label", description);
    element.title = description;
    element.replaceChildren(iconElement(isPicked ? "check" : "pick"), ...(isCompact ? [] : [label]));
  };

  element.addEventListener("click", () => {
    if (!isPicked) {
      requestSiteAccess([pick.url]);
    }

    togglePick(pick);
  });

  update(state);

  return { element, update };
}
