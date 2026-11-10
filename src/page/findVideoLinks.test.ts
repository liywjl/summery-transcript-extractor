import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { findVideoLinks } from "./findVideoLinks";

const documentFor = (body: string) =>
  new JSDOM(`<html><body>${body}</body></html>`, { url: "https://www.youtube.com/results?search_query=neural+networks" }).window.document;

const videoCard = (videoId: string, title: string, channel: string) => `
  <ytd-video-renderer>
    <a id="thumbnail" href="/watch?v=${videoId}&pp=ygUP"><img src="thumb.jpg"></a>
    <a id="video-title" href="/watch?v=${videoId}&pp=ygUP" title="${title}">${title}</a>
    <ytd-channel-name><a href="/@${channel}">${channel}</a></ytd-channel-name>
  </ytd-video-renderer>`;

describe("findVideoLinks", () => {
  it("lists each video on a search page once, with its title and channel", () => {
    const doc = documentFor(videoCard("aircAruvnKk", "But what is a neural network?", "3Blue1Brown") + videoCard("IHZwWFHWa-w", "Gradient descent", "3Blue1Brown"));

    expect(findVideoLinks(doc)).toEqual([
      { url: "https://www.youtube.com/watch?v=aircAruvnKk", title: "But what is a neural network?", kind: "youtube", source: "3Blue1Brown" },
      { url: "https://www.youtube.com/watch?v=IHZwWFHWa-w", title: "Gradient descent", kind: "youtube", source: "3Blue1Brown" },
    ]);
  });

  it("takes the title from the link that has one when the thumbnail link is empty", () => {
    const doc = documentFor(videoCard("aircAruvnKk", "But what is a neural network?", "3Blue1Brown"));

    expect(findVideoLinks(doc)[0].title).toBe("But what is a neural network?");
  });

  it("reads shorts links", () => {
    const doc = documentFor(`<a href="/shorts/aircAruvnKk">Neural nets in 60 seconds</a>`);

    expect(findVideoLinks(doc)).toEqual([
      { url: "https://www.youtube.com/watch?v=aircAruvnKk", title: "Neural nets in 60 seconds", kind: "youtube", source: undefined },
    ]);
  });

  it("skips videos with no title anywhere", () => {
    const doc = documentFor(`<a href="/watch?v=aircAruvnKk"><img src="thumb.jpg"></a>`);

    expect(findVideoLinks(doc)).toEqual([]);
  });

  it("prefers YouTube's title attribute over longer link text", () => {
    const doc = documentFor(`
      <a href="/watch?v=aircAruvnKk">But what is a neural network? | Deep learning chapter 1 · 18:40</a>
      <a id="video-title" href="/watch?v=aircAruvnKk" title="But what is a neural network?">But what is a neural network?</a>`);

    expect(findVideoLinks(doc)[0].title).toBe("But what is a neural network?");
  });

  it("skips playlist cards that link to their first video", () => {
    const doc = documentFor(`
      <yt-lockup-view-model>
        <a href="/watch?v=aircAruvnKk&list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi"><img src="thumb.jpg">10 lessons</a>
        <a href="/watch?v=aircAruvnKk&list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi">Neural networks</a>
      </yt-lockup-view-model>`);

    expect(findVideoLinks(doc)).toEqual([]);
  });

  it("keeps videos listed on a playlist page", () => {
    const doc = documentFor(`
      <ytd-playlist-video-renderer>
        <a id="video-title" href="/watch?v=aircAruvnKk&list=PLZHQ&index=1" title="But what is a neural network?">But what is a neural network?</a>
      </ytd-playlist-video-renderer>`);

    expect(findVideoLinks(doc)).toHaveLength(1);
  });

  it("skips chapter links inside a search result", () => {
    const doc = documentFor(`
      <ytd-macro-markers-list-item-renderer>
        <a id="endpoint" href="/watch?v=aircAruvnKk&t=0s"><img src="chapter.jpg">Introduction example</a>
      </ytd-macro-markers-list-item-renderer>`);

    expect(findVideoLinks(doc)).toEqual([]);
  });

  it("ignores links that are not videos", () => {
    const doc = documentFor(`<a href="/@3Blue1Brown">3Blue1Brown</a><a href="/feed/subscriptions">Subscriptions</a>`);

    expect(findVideoLinks(doc)).toEqual([]);
  });
});
