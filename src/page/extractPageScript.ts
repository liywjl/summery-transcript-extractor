import { hasMeaningfulSelection } from "./extractDocument";
import type { PageReading } from "./PageReading";
import { readPage, type ReadOptions } from "./readPage";

function selectionHtml(selection: Selection): string {
  const container = document.createElement("div");

  for (let index = 0; index < selection.rangeCount; index++) {
    container.append(selection.getRangeAt(index).cloneContents());
  }

  return container.innerHTML;
}

function meaningfulSelectionHtml(): string | undefined {
  const selection = window.getSelection();

  if (!selection || !hasMeaningfulSelection(selection.toString())) {
    return undefined;
  }

  return selectionHtml(selection);
}

function readThisPage(options: ReadOptions): PageReading {
  return readPage(document, meaningfulSelectionHtml(), options);
}

Object.assign(globalThis, { summeryReadPage: readThisPage });
