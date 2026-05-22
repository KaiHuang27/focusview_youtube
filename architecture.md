# Architecture

## Overview

This is a Manifest V3 extension with one content-script entrypoint on `https://www.youtube.com/*`.

The extension keeps YouTube's native player and controls intact. It only applies CSS transforms to the `video.html5-main-video` element and renders a small floating toolbar inside `.html5-video-player`.

## Components

- `manifest.json`: declares the MV3 extension and injects CSS plus content scripts on YouTube.
- `src/transform-state.js`: shared transform helper exposed on `globalThis.YTVTTransform` so it can run as a classic content script and still be tested with Node.
- `src/content.js`: detects the YouTube player, renders controls, updates transform state, renders the position map, handles pan dragging, handles Pan-mode wheel zoom, and resets state on YouTube SPA navigation.
- `src/overlay.css`: macOS-style translucent toolbar styling.
- `src/transform-state.test.js`: Node test coverage for reset state, zoom scale conversion, rotation fit scaling, zoom and pan clamping, Pan-mode wheel interception, viewport-map math, rotation validation, and mirror composition.

## Data Flow

1. YouTube loads or navigates to a watch URL.
2. The content script finds `.html5-video-player` and `video.html5-main-video`.
3. The toolbar updates local in-memory state.
4. In Pan mode, player-level capture wheel events are intercepted before YouTube can handle them; they update zoom in 1% steps and clamp it to 100%-500%.
5. `getRotationFitScale` computes the fit scale for 90/270-degree rotations so the rotated bounding box fits inside the player frame before user zoom is applied.
6. `clampPanState` bounds pan to the current scaled and rotated video size before transforms are applied.
7. `createTransformStyle` converts state into a CSS `transform`.
8. The transform is applied directly to the video element.
9. `createViewportFrame` maps zoom and pan into a normalized visible rectangle for the top-left position map.
10. URL, player, or fullscreen-related layout changes trigger `sync`; the current transform, clamped pan, and position map are reapplied to the same video element.
11. When the video key changes, state resets to defaults.

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
- Confirm 90/270-degree rotation fits the rotated video inside the player frame at 100% zoom without cropping the rotated top/bottom or left/right edges.
- Confirm panning stops at video-content edges and does not create extra black borders.
- Confirm returning to 100% zoom recenters the video.
- Confirm the top-left position map appears when zoom is not 100% and updates while zooming or panning.
- Confirm mouse wheel zooms only while Pan is enabled.
- Confirm mouse wheel zoom in fullscreen Pan mode does not open YouTube's native recommendations or more-video controls.
- Confirm zoom, rotation, mirror, and pan state are preserved when entering and leaving fullscreen.
- Confirm switching YouTube videos resets state.
- Confirm normal video click-to-play still works while Pan is off.
