# Architecture

## Overview

This is a Manifest V3 extension with one content-script entrypoint on `https://www.youtube.com/*`.

The extension keeps YouTube's native player and controls intact. It only applies CSS transforms to the `video.html5-main-video` element and renders a small zoom trigger plus menu inside `.html5-video-player`.

## Components

- `manifest.json`: declares the MV3 extension and injects CSS plus content scripts on YouTube.
- `src/transform-state.js`: shared transform and shortcut helpers exposed on `globalThis.YTVTTransform` so they can run as a classic content script and still be tested with Node.
- `src/content.js`: detects the YouTube player, renders the zoom trigger and YouTube-style menu, updates transform state, renders the position map, handles pan dragging, handles Pan-mode wheel zoom, handles the Pan keyboard shortcut, reapplies transforms after fullscreen/style mutations, and resets state on YouTube SPA navigation.
- `src/overlay.css`: macOS-style zoom trigger, YouTube-style dark menu, toggle, segment, slider, and position-map styling.
- `src/transform-state.test.js`: Node test coverage for reset state, zoom scale conversion, rotation fit scaling, zoom and pan clamping, Pan-mode wheel interception, Pan shortcut detection, transform reapply detection, viewport-map math, rotation validation, and mirror composition.

## Data Flow

1. YouTube loads or navigates to a watch URL.
2. The content script finds `.html5-video-player` and `video.html5-main-video`.
3. The top-right zoom trigger opens a dark menu with Zoom, Rotation, Mirror H, Mirror V, Pan, and Reset controls.
4. Menu controls update local in-memory state. The trigger text is re-rendered from `state.zoom`.
5. `Alt/Option + Shift + P` toggles Pan mode at document capture time, but only outside editable fields and without `Ctrl` or `Cmd` modifiers.
6. In Pan mode, player-level capture wheel events are intercepted before YouTube can handle them; they update zoom in 5% steps and clamp it to 100%-500%. Wheel events that start inside the menu are blocked without changing zoom.
7. `getRotationFitScale` computes the fit scale for 90/270-degree rotations so the rotated bounding box fits inside the player frame before user zoom is applied.
8. `clampPanState` bounds pan to the current scaled and rotated video size before transforms are applied.
9. `createTransformStyle` converts state into a CSS `transform`.
10. The transform is applied directly to the video element.
11. `createViewportFrame` maps zoom and pan into a normalized visible rectangle for the top-left position map.
12. URL, player, or fullscreen-related layout changes trigger `sync`; the current transform, clamped pan, and position map are reapplied to the same video element.
13. Fullscreen events and video style mutations schedule repeated `requestAnimationFrame` reapplication so YouTube style rewrites are corrected quickly.
14. When the video key changes, state resets to defaults and the menu closes.

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
- Confirm only the zoom percentage button appears in the top-right corner on a normal YouTube watch page.
- Confirm clicking the zoom button opens and closes the dark transform menu.
- Confirm menu Zoom, Rotation, horizontal mirror, vertical mirror, combined mirror, Pan, and Reset.
- Confirm `Alt/Option + Shift + P` toggles Pan mode while focus is on the video page, and does nothing while typing in YouTube search or comments.
- Confirm slider changes and Pan-mode wheel zoom update the zoom button text.
- Confirm 90/270-degree rotation fits the rotated video inside the player frame at 100% zoom without cropping the rotated top/bottom or left/right edges.
- Confirm panning stops at video-content edges and does not create extra black borders.
- Confirm returning to 100% zoom recenters the video.
- Confirm the top-left position map appears when zoom is not 100% and updates while zooming or panning.
- Confirm mouse wheel zooms only while Pan is enabled.
- Confirm mouse wheel zoom in fullscreen Pan mode does not open YouTube's native recommendations or more-video controls.
- Confirm zoom, rotation, mirror, and pan state are preserved when entering and leaving fullscreen without flashing back to the original view.
- Confirm switching YouTube videos resets state.
- Confirm normal video click-to-play still works while Pan is off.
