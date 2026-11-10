import { extractArticle, extractSelection, hasMeaningfulSelection, type PageExtract } from "./extractDocument";

function selectionHtml(selection: Selection): string {
  const container = document.createElement("div");

  for (let index = 0; index < selection.rangeCount; index++) {
    container.append(selection.getRangeAt(index).cloneContents());
  }

  return container.innerHTML;
}

function extractPage(): PageExtract {
  const selection = window.getSelection();

  if (selection && hasMeaningfulSelection(selection.toString())) {
    return extractSelection(document, selectionHtml(selection));
  }

  return extractArticle(document);
}

Object.assign(globalThis, { summeryExtractPage: extractPage });
