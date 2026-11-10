import { extractArticle } from "../page/extractDocument";

type CopyMessage = {
  target: "offscreen";
  type: "copy";
  text: string;
};

type ReadHtmlMessage = {
  target: "offscreen";
  type: "read-html";
  html: string;
  url: string;
};

type OffscreenMessage = CopyMessage | ReadHtmlMessage;

function isOffscreenMessage(message: unknown): message is OffscreenMessage {
  const candidate = message as Partial<OffscreenMessage> | undefined;

  return candidate?.target === "offscreen";
}

function copy(text: string): void {
  const field = document.createElement("textarea");
  field.value = text;
  document.body.append(field);

  field.select();
  document.execCommand("copy");
  field.remove();
}

function documentAt(html: string, url: string): Document {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const base = doc.createElement("base");
  base.href = url;
  doc.head.prepend(base);

  return doc;
}

function handle(message: OffscreenMessage): unknown {
  if (message.type === "copy") {
    copy(message.text);
    return true;
  }

  return extractArticle(documentAt(message.html, message.url));
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isOffscreenMessage(message)) {
    return;
  }

  sendResponse(handle(message));
});
