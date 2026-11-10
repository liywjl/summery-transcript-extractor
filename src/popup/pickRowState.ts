import type { LibraryItem } from "../library/LibraryItem";
import type { Pick } from "../picks/Pick";
import type { PickProblem } from "../picks/pickStatus";
import type { PopupState } from "./PopupState";

export type PickRowState =
  | { state: "ready"; item: LibraryItem }
  | { state: "fetching" }
  | { state: "waiting" }
  | { state: "failed"; problem: PickProblem };

export function pickRowState(pick: Pick, popupState: PopupState): PickRowState {
  const item = popupState.saved.find((saved) => saved.url === pick.url);

  if (item) {
    return { state: "ready", item };
  }

  const problem = popupState.status.problems[pick.url];

  if (problem) {
    return { state: "failed", problem };
  }

  if (popupState.status.fetching.includes(pick.url)) {
    return { state: "fetching" };
  }

  return { state: "waiting" };
}
