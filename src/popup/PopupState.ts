import type { LibraryItem } from "../library/LibraryItem";
import type { Pick } from "../picks/Pick";
import type { PickStatus } from "../picks/pickStatus";
import type { Settings } from "../settings";

export type PopupState = {
  settings: Settings;
  picks: Pick[];
  status: PickStatus;
  saved: LibraryItem[];
};
