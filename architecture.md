# Architecture

## Overview

This is a Manifest V3 extension with one content-script entrypoint on `https://www.youtube.com/*`.

The extension keeps YouTube's native player and controls intact. It only applies CSS transforms to the `video.html5-main-video` element and renders a small floating toolbar inside `.html5-video-player`.

## Components

- `manifest.json`: declares the MV3 extension and injects CSS plus content scripts on YouTube.
- `src/transform-state.js`: shared transform helper exposed on `globalThis.YTVTTransform` so it can run as a classic content script and still be tested with Node.
- `src/content.js`: detects the YouTube player, renders controls, updates transform state, handles pan dragging, and resets state on YouTube SPA navigation.
- `src/overlay.css`: macOS-style translucent toolbar styling.
- `src/transform-state.test.js`: Node test coverage for reset state, zoom scale conversion, rotation validation, and mirror composition.

## Data Flow

1. YouTube loads or navigates to a watch URL.
2. The content script finds `.html5-video-player` and `video.html5-main-video`.
3. The toolbar updates local in-memory state.
4. `createTransformStyle` converts state into a CSS `transform`.
5. The transform is applied directly to the video element.
6. URL or player changes trigger `sync`; when the video key changes, state resets to defaults.

## State Model

Default state:

```js
{
  zoom: 100,
  rotation: 0,
  flipX: false,
  flipY: false,
  panX: 0,
  panY: 0,
  panMode: false
}
```

State is intentionally not persisted. A new YouTube video starts from the default state to avoid surprising future playback.

## Testing Strategy

Automated tests cover the pure transform helper with `node --test`.

Manual Edge acceptance covers browser-specific behavior:

- Load unpacked extension in `edge://extensions`.
- Confirm the toolbar appears on a normal YouTube watch page.
- Confirm zoom, rotation, horizontal mirror, vertical mirror, combined mirror, Pan, and Reset.
- Confirm switching YouTube videos resets state.
- Confirm normal video click-to-play still works while Pan is off.
