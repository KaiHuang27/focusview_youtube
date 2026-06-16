# FocusView – Zoom, Rotate & Mirror for YouTube

FocusView gives YouTube videos a cleaner, more flexible viewing experience. Zoom in on details, rotate the video, mirror it, and move around the frame directly inside the YouTube player.

It is designed to feel native: the main control lives in YouTube's player toolbar, the interface stays compact, and normal YouTube play/pause behavior remains familiar.

[View on the Chrome Web Store](https://chromewebstore.google.com/detail/focusview-%E2%80%93-zoom-rotate-m/jbdndcjclbghkmbiehjigaapembpbgdb)

## Why FocusView

YouTube is great for watching video, but it does not provide enough control when the video itself needs adjustment.

FocusView helps when you want to:

- zoom into a lecture board, product demo, sports moment, dance practice, tutorial, or small on-screen detail
- rotate videos that were uploaded in the wrong orientation
- mirror a video horizontally for learning movement, practice, or comparison
- move around a zoomed video without losing track of where you are
- keep the experience inside the YouTube player instead of using a separate video tool

## Features

- **Zoom from 100% to 500%**: use the menu slider, `-` / `+` buttons, manual percentage input, or mouse wheel while Zoom mode is on.

- **Move around while zoomed**: turn on Zoom mode, then long-press and drag the video to reposition the visible area.

- **Position map**: a small Source Map appears while zooming or moving, so you can see which part of the video is currently visible.

- **Rotate video**: choose `0`, `90`, `180`, or `270` degrees. FocusView fits rotated content into the player so the result stays usable.

- **Mirror horizontally**: flip the video left-to-right with one switch.

- **Native-feeling YouTube controls**: the zoom button is placed in YouTube's control bar and uses compact, low-distraction UI.

- **No extra accounts, no tracking**: FocusView runs locally in your browser and does not collect personal data.

## How To Use

1. Open a normal YouTube video page.
2. Click the FocusView button in the YouTube player toolbar.
3. When Zoom mode is on, scroll to zoom and long-press drag to move around the video.
4. Click the settings button near the Source Map to open rotation, mirror, reset, and detailed zoom controls.
5. Double-click the toolbar zoom button to reset zoom back to `100%`.

Keyboard shortcut:

```text
Alt/Option + Shift + Z
```

This turns Zoom mode on or off without using YouTube's single-key shortcuts.

## Controls

### Toolbar Button

- **Zoom mode off**: shows the FocusView magnifier icon.
- **Zoom mode on**: shows the current zoom percentage.
- **Zoomed while off**: keeps showing the zoom percentage so you know the video is still transformed.
- **Double-click**: resets zoom to `100%`.

### Zoom Menu

The compact settings menu includes:

- zoom percentage input
- custom zoom slider
- `-` and `+` zoom buttons
- rotation controls
- mirror switch
- reset action

Zoom values are always clamped between `100%` and `500%`.

### Moving The Video

While Zoom mode is on:

- quick click still plays or pauses the YouTube video
- long press and drag moves the zoomed frame
- mouse wheel zooms in 5% steps
- movement is limited so you do not drag into extra black borders

When the video returns to `100%`, FocusView recenters the frame.

## Privacy

FocusView does not collect, store, share, sell, or transmit personal data.

The extension only runs on YouTube pages and applies video transforms locally in your browser. It does not use analytics, tracking, cookies, account access, browsing history, or external servers.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Permissions

FocusView uses a minimal content script match:

```json
"matches": ["https://www.youtube.com/*"]
```

It does not request storage, history, account, network, or analytics permissions.

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

Run tests with:

```sh
node --test
```

If your local Node installation includes npm, this also works:

```sh
npm test
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
