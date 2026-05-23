# Architecture

## Overview

This is a Manifest V3 extension with one content-script entrypoint on `https://www.youtube.com/*`, loaded at `document_start` so keyboard capture can be registered before YouTube consumes shortcuts.

The extension keeps YouTube's native player behavior intact. It only applies CSS transforms to the `video.html5-main-video` element and inserts a small zoom trigger into YouTube's native right-side control bar, with a floating fallback if the native controls are unavailable.

## Components

- `manifest.json`: declares the MV3 extension and injects CSS plus content scripts on YouTube at `document_start`.
- `src/transform-state.js`: shared transform and shortcut helpers exposed on `globalThis.YTVTTransform` so they can run as a classic content script and still be tested with Node.
- `src/content.js`: detects the YouTube player, inserts the zoom trigger into `.ytp-right-controls` when available, renders the YouTube-style menu with a compact zoom panel and text rows, updates transform state, renders the position map, handles pan dragging, handles Pan-mode wheel zoom, handles the Pan keyboard shortcut, reapplies transforms after fullscreen/style mutations, and resets state on YouTube SPA navigation.
- `src/overlay.css`: native-control-bar zoom trigger using YouTube's `ytp-button` sizing, Roboto/Arial typography, centered percentage text, floating fallback trigger, compact YouTube-settings-style gray menu, toggle, segment, slider, and position-map styling.
- `src/transform-state.test.js`: Node test coverage for reset state, zoom scale conversion, rotation fit scaling, zoom and pan clamping, Pan-mode wheel interception, Pan shortcut detection, transform reapply detection, viewport-map math, rotation validation, and mirror composition.

## Data Flow

1. YouTube loads or navigates to a watch URL.
2. The content script finds `.html5-video-player` and `video.html5-main-video`.
3. The zoom trigger is prepended to `.ytp-right-controls` so it appears at the left edge of YouTube's right-side native control group. If the native host is missing, it falls back to a floating top-right trigger.
4. The zoom trigger renders as native-sized `ytp-button` percentage text centered in the toolbar slot.
5. Clicking the zoom trigger opens a compact YouTube-settings-style gray menu. The top section shows the zoom scale with `- / slider / +` controls and a small red Reset action in the top-right corner; the remaining rows use centered text labels and right-aligned controls. Double-clicking the trigger resets only zoom and pan to the centered 100% view.
6. Menu controls update local in-memory state. The badge is re-rendered from `state.zoom`.
7. `Alt/Option + Shift + P` toggles Pan mode at window/document capture time, but only outside editable fields and without `Ctrl` or `Cmd` modifiers.
8. In Pan mode, player-level capture wheel events are intercepted before YouTube can handle them; they update zoom in 5% steps and clamp it to 100%-500%. Wheel events that start inside the menu are blocked without changing zoom.
9. `getRotationFitScale` computes the fit scale for 90/270-degree rotations so the rotated bounding box fits inside the player frame before user zoom is applied.
10. `clampPanState` bounds pan to the current scaled and rotated video size before transforms are applied.
11. `createTransformStyle` converts state into a CSS `transform`.
12. The transform is applied directly to the video element.
13. `createViewportFrame` maps zoom and pan into a normalized visible rectangle for the top-right position map.
14. URL, player, or fullscreen-related layout changes trigger `sync`; the current transform, clamped pan, and position map are reapplied to the same video element.
15. Fullscreen events and video style mutations schedule repeated `requestAnimationFrame` reapplication so YouTube style rewrites are corrected quickly.
16. When the video key changes, state resets to defaults and the menu closes.

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
- Confirm only one zoom percentage button appears at the left edge of YouTube's native right-side control group on a normal YouTube watch page.
- Confirm the zoom percentage text is centered inside the native control slot and hover behavior matches nearby YouTube controls.
- Confirm double-clicking the trigger resets zoom to 100%.
- Confirm clicking the zoom button opens and closes the YouTube-style transform menu with gray rounded panel, native-like gray controls, compact top zoom control, red top-right Reset action, text rows, and right-aligned controls that stay inside the panel.
- Confirm menu Zoom, Rotation, horizontal mirror, vertical mirror, combined mirror, Pan, and Reset.
- Confirm `Alt/Option + Shift + P` toggles Pan mode while focus is on the video page, and does nothing while typing in YouTube search or comments.
- Confirm slider changes and Pan-mode wheel zoom update the zoom button text.
- Confirm 90/270-degree rotation fits the rotated video inside the player frame at 100% zoom without cropping the rotated top/bottom or left/right edges.
- Confirm panning stops at video-content edges and does not create extra black borders.
- Confirm returning to 100% zoom recenters the video.
- Confirm the top-right position map appears when zoom is not 100% and updates while zooming or panning.
- Confirm mouse wheel zooms only while Pan is enabled.
- Confirm mouse wheel zoom in fullscreen Pan mode does not open YouTube's native recommendations or more-video controls.
- Confirm zoom, rotation, mirror, and pan state are preserved when entering and leaving fullscreen without flashing back to the original view.
- Confirm switching YouTube videos resets state.
- Confirm normal video click-to-play still works while Pan is off.
