export async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.CLIPBOARD, chrome.offscreen.Reason.DOM_PARSER],
    justification: "Copy captured text to the clipboard and read the main text of picked articles.",
  });
}
