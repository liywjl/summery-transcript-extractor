export type PanelLine = {
  time: string;
  text: string;
};

export type PanelTranscript = {
  title: string;
  channel: string;
  durationSeconds?: number;
  lines: PanelLine[];
};

export async function readTranscriptPanel(): Promise<PanelTranscript> {
  const segmentSelector = "ytd-transcript-segment-renderer, transcript-segment-view-model";
  const clockPattern = /^\d{1,2}(:\d{2}){1,2}$/;
  const spokenDurationPattern = /^\d+ (seconds?|minutes?|hours?)\b/i;

  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const segments = () => Array.from(document.querySelectorAll<HTMLElement>(segmentSelector));

  const findOpenButton = () => {
    const sectionButton = document.querySelector<HTMLButtonElement>("ytd-video-description-transcript-section-renderer button");
    const labelledButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      /transcript/i.test(button.getAttribute("aria-label") ?? button.textContent ?? ""),
    );

    return sectionButton ?? labelledButton;
  };

  const readLine = (segment: HTMLElement): PanelLine => {
    const parts = segment.innerText
      .split("\n")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    const time = parts.find((part) => clockPattern.test(part)) ?? "";
    const words = parts.filter((part) => part !== time && !spokenDurationPattern.test(part));

    return { time, text: words.join(" ") };
  };

  if (segments().length === 0) {
    findOpenButton()?.click();
  }

  for (let attempt = 0; attempt < 40 && segments().length === 0; attempt++) {
    await pause(250);
  }

  const title = document.querySelector("ytd-watch-metadata h1")?.textContent?.trim() ?? document.title.replace(/ - YouTube$/, "");
  const channel = document.querySelector("ytd-watch-metadata ytd-channel-name a")?.textContent?.trim() ?? "";
  const duration = document.querySelector("video")?.duration;

  return {
    title,
    channel,
    durationSeconds: Number.isFinite(duration) ? duration : undefined,
    lines: segments()
      .map(readLine)
      .filter((line) => line.text.length > 0),
  };
}
