<img src="assets/icon.svg" width="64" height="64" alt="">

# Summery

Chrome extension that turns a YouTube video or any web page into a ready-to-paste chat prompt.

- **YouTube**: full transcript with timestamps, channel, length and description.
- **Any page**: the main article text as Markdown, without menus, ads, images or link clutter.
- **Selection**: select a passage first to copy only that.

| YouTube talk | Web article |
| --- | --- |
| <img src="docs/popup-youtube.png" width="380" alt="Summery popup showing the timestamped transcript of a YouTube talk"> | <img src="docs/popup-article.png" width="380" alt="Summery popup showing the clean text of a Wikipedia article"> |

<img src="docs/settings.png" width="760" alt="Summery settings: prompt template, chat site, timestamps and YouTube app version">

## Install

```sh
npm install
npm run build
```

1. Open `chrome://extensions` and turn on **Developer mode**.
2. **Load unpacked** and pick the `dist` folder.
3. Pin Summery to the toolbar.

After a code change, run `npm run build` and press reload on the extension card.

## Use

- Click the icon: preview, then **Copy prompt**, copy text only, download `.md`, or copy and open Claude.
- Right-click a page, a selection, or any YouTube video link: **Copy … as prompt**.
- Change the prompt, chat site and timestamps in the settings (gear icon).
- Want a hotkey? Set one at `chrome://extensions/shortcuts`.

## Where the data comes from

- Transcripts come straight from youtube.com: the captions YouTube itself serves (its own speech-to-text for auto-generated ones). No third-party service.
- The extension asks YouTube's player API as the Android app does, then downloads the caption track.
- If that fails while you're on the video, it reads YouTube's own "Show transcript" panel instead.
- Pages are read locally with Mozilla's Readability. Nothing leaves your browser except the request to YouTube.

## Develop

```sh
npm test
npm run typecheck
npm run watch
```

## If transcripts stop working

YouTube has probably retired the app version Summery pretends to be. The popup then shows **Update app version**:

1. Open **Newest version number** and copy the latest YouTube version (for example `20.45.36`).
2. Paste it and press **Test and save**. It's only saved if a real test transcript comes back.

A bad saved version can't break anything: Summery falls back to the built-in Android version, then the iPhone app. **Use built-in** undoes your change.
