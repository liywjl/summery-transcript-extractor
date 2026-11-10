type CopyMessage = {
  target: "offscreen";
  type: "copy";
  text: string;
};

function isCopyMessage(message: unknown): message is CopyMessage {
  const candidate = message as Partial<CopyMessage> | undefined;

  return candidate?.target === "offscreen" && candidate.type === "copy";
}

function copy(text: string): void {
  const field = document.createElement("textarea");
  field.value = text;
  document.body.append(field);

  field.select();
  document.execCommand("copy");
  field.remove();
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isCopyMessage(message)) {
    return;
  }

  copy(message.text);
  sendResponse(true);
});
