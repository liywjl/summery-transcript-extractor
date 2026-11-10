import { captureMarkdown } from "../capture/formatCapture";
import { formatDateTime } from "../formatDateTime";
import { isSavable, libraryUrl } from "../library/library";
import type { LibraryCapture } from "../library/libraryCapture";
import type { Pick } from "../picks/Pick";
import type { Capture } from "../capture/Capture";
import { captureActions } from "./captureActions";
import { captureFacts, KINDS, tokenEstimate } from "./captureFacts";
import { capturePreview } from "./capturePreview";
import { h, iconButton, iconElement, textButton } from "./dom";
import { kindPill } from "./kindPill";
import { pickToggle } from "./pickToggle";
import type { PopupState } from "./PopupState";
import type { View } from "./View";
import { summaryContent, viewShell } from "./viewShell";

export type CaptureViewOptions = {
  shown: LibraryCapture;
  state: PopupState;
  onRefresh?: () => void;
  onClose?: () => void;
};

function captureSource(capture: Capture): string | undefined {
  return capture.kind === "youtube" ? capture.channel : capture.siteName;
}

function pickFor(capture: Capture): Pick {
  return {
    url: libraryUrl(capture),
    title: capture.title,
    kind: capture.kind === "youtube" ? "youtube" : "article",
    source: captureSource(capture),
  };
}

function savedLine(savedAt: number, onRefresh?: () => void): HTMLElement {
  return h(
    "p",
    { className: "saved-line" },
    iconElement("saved"),
    `Saved ${formatDateTime(savedAt)}`,
    onRefresh && textButton("link-button", "retry", "Fetch again", onRefresh),
  );
}

export function captureView({ shown, state, onRefresh, onClose }: CaptureViewOptions): View {
  const { capture, item, isFromLibrary } = shown;
  const kind = KINDS[capture.kind];
  const markdown = captureMarkdown(capture, state.settings);
  const shell = viewShell("capture");
  const toggle = isSavable(capture) ? pickToggle(pickFor(capture), state) : undefined;
  const actions = captureActions(state.settings);
  const tokens = h("span", { className: "tokens", text: tokenEstimate(markdown) });

  shell.head.append(
    kindPill(capture.kind, kind.icon, kind.label),
    h("div", { className: "head-actions" }, toggle?.element, onClose && iconButton("close", "Close", onClose, "icon-button is-small")),
  );

  shell.summary.append(...summaryContent(capture.title, [`${captureFacts(capture, markdown).join(" · ")} · `, tokens]));

  if (isFromLibrary && item) {
    shell.summary.append(savedLine(item.savedAt, onRefresh));
  }

  shell.body.append(capturePreview(markdown));
  shell.foot.append(...actions.elements);
  actions.show([capture], item ? [item] : []);

  return { element: shell.element, update: toggle?.update };
}
