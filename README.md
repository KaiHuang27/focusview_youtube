# FocusView – Zoom, Rotate & Mirror for YouTube

See more details in YouTube videos.

FocusView brings smooth, almost-native zoom, rotate, and mirror controls to YouTube videos in Chrome.

Best for:

- lectures and tutorials
- concerts and livestreams
- sports clips
- dance practice
- product demos
- any video where you want a closer look

[Watch the YouTube demo](https://www.youtube.com/watch?v=x4EzsXcOo_A)

[Download from the Chrome Web Store](https://chromewebstore.google.com/detail/jbdndcjclbghkmbiehjigaapembpbgdb?utm_source=github)

## Features

- Press `Alt/Option + Shift + Z` to turn zoom mode on or off.
- Scroll to zoom videos from `100%` to `500%`.
- Long-press and drag to move around a zoomed video.
- Rotate videos by `90°`, `180°`, or `270°`.
- Mirror videos horizontally.
- Use the small Source Map to see which part of the video is visible.

## Privacy And Permissions

FocusView does not collect data, does not track users, and does not send anything to external servers. All transforms happen locally in your browser.

The extension only runs on YouTube pages:

```json
"matches": ["https://www.youtube.com/*"]
```

It does not request storage, history, account, analytics, or extra network permissions.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Install For Development

### Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. Open a normal YouTube video page.

### Microsoft Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. Open a normal YouTube video page.

## Development

Run tests:

```sh
node --test
```

Build the release zip:

```sh
./scripts/build-release.sh
```

The release zip includes only the runtime files required by the extension:

- `manifest.json`
- `src/`
- `icons/`

## Limitations

- FocusView targets normal YouTube watch pages.
- Shorts, embedded YouTube iframes, and special live-player layouts are not the focus of version 1.
- FocusView prevents extra black borders caused by moving too far, but it does not remove black borders already created by YouTube letterboxing or vertical-video layout.
- Video transforms use CSS transforms, not canvas rendering, to keep the extension lightweight.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md).
