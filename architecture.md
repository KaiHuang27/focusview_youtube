# Architecture

## Overview

This is a Manifest V3 extension with one content-script entrypoint on `https://www.youtube.com/*`, loaded at `document_start` so keyboard capture can be registered before YouTube consumes shortcuts.

The extension keeps YouTube's native player behavior intact. It only applies CSS transforms to the `video.html5-main-video` element and inserts a small zoom trigger into YouTube's native right-side control bar, with a floating fallback if the native controls are unavailable.

## Components

- `manifest.json`: declares the MV3 extension and injects CSS plus content scripts on YouTube at `document_start`.
- `src/transform-state.js`: shared transform and shortcut helpers exposed on `globalThis.YTVTTransform` so they can run as a classic content script and still be tested with Node.
- `src/content.js`: detects the YouTube player, inserts the zoom trigger into `.ytp-right-controls` when available, toggles Pan mode from that trigger, renders a settings button centered below the top-right position map during recent Pan activity, renders the YouTube-style menu beside that settings button, updates transform state, renders the position map during recent Pan activity, handles pan dragging, handles Pan-mode wheel zoom, handles the Pan keyboard shortcut, reapplies transforms after fullscreen/style mutations, and resets state on YouTube SPA navigation.
- `src/overlay.css`: native-control-bar zoom trigger using compact fixed YouTube-style sizing, magnifier icon, native `ytp-button` hover styling, a dedicated compact active background layer, compact conditional percentage text, Roboto/Arial typography, floating fallback trigger, top-right settings button, compact YouTube-settings-style gray menu, toggle, segment, YouTube-style slider track, and position-map styling.
- `src/transform-state.test.js`: Node test coverage for reset state, zoom scale conversion, rotation fit scaling, zoom and pan clamping, Pan-mode wheel interception, transient viewport-control visibility, Pan shortcut detection, transform reapply detection, viewport-map math, rotation validation, and mirror composition.

## Data Flow

1. YouTube loads or navigates to a watch URL.
2. The content script finds `.html5-video-player` and `video.html5-main-video`.
3. The zoom trigger is prepended to `.ytp-right-controls` so it appears at the left edge of YouTube's right-side native control group. If the native host is missing, it falls back to a floating top-right trigger.
4. The zoom trigger renders as a compact fixed-size native-style control with a magnifier icon at rest, then switches to centered percentage text while Pan mode is on or zoom is not 100%. The toolbar slot and internal active background keep the same dimensions in both icon and text modes, including narrow viewports. Hover is left to YouTube's native `ytp-button` styling; while hovered, the extension hides its active background layer so the native hover is not double-stacked. Only Pan mode adds the active background and heavier text; zoomed-but-Pan-off keeps the percentage text without active styling.
5. Clicking the zoom trigger toggles Pan mode directly. Turning Pan on starts the transient position-control activity window; turning Pan off closes the transform menu and hides transient position controls. Double-clicking the trigger resets only zoom and pan to the centered 100% view.
6. When Pan turns on, during Pan dragging, or during Pan-mode wheel zoom, the top-right position map and centered settings button appear. Mouse movement keeps them visible briefly, and they hide after the activity delay unless the transform menu is open. Clicking the settings button opens a compact YouTube-settings-style gray menu anchored beside that settings area. The menu contains zoom, rotation, horizontal mirror, and reset controls; Pan remains controlled by the toolbar trigger and shortcut.
7. `Alt/Option + Shift + P` toggles Pan mode at window/document capture time, but only outside editable fields and without `Ctrl` or `Cmd` modifiers.
8. In Pan mode, pointer down starts a pending gesture instead of immediately blocking YouTube. A quick single click is left for native play/pause; a long press or intentional movement activates frame dragging, then the pointer-up path suppresses that gesture's following native click so suppression cannot expire while the user is still holding the mouse button.
9. In Pan mode, player-level capture wheel events are intercepted before YouTube can handle them; they update zoom in 5% steps and clamp it to 100%-500%. Wheel events that start inside the menu are blocked without changing zoom.
10. `getRotationFitScale` computes the fit scale for 90/270-degree rotations so the rotated bounding box fits inside the player frame before user zoom is applied.
11. `clampPanState` bounds pan to the current scaled and rotated video size before transforms are applied.
12. `createTransformStyle` converts state into a CSS `transform`.
13. The transform is applied directly to the video element.
14. `createViewportFrame` maps zoom and pan into a normalized visible rectangle inside the top-right position map during recent Pan activity.
15. URL, player, or fullscreen-related layout changes trigger `sync`; the current transform, clamped pan, and position controls are reapplied or reparented to the current player root.
16. Fullscreen events and video style mutations schedule repeated `requestAnimationFrame` reapplication so YouTube style rewrites are corrected quickly.
17. When leaving the watch page or switching videos, transient overlays, timers, and transform state are cleared before the next player binding.

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
- Confirm only one magnifier zoom button appears at the left edge of YouTube's native right-side control group on a normal YouTube watch page.
- Confirm the magnifier is visible at 100% with Pan off, then hidden when Pan is enabled so only compact centered zoom text remains.
- Confirm hover uses YouTube's native toolbar hover styling. Confirm Pan on shows a compact fixed pill active background when not hovered, plus heavier percentage text, while Pan off with zoom above 100% shows percentage text without the active background.
- Confirm double-clicking the trigger resets zoom to 100%.
- Confirm clicking the zoom button toggles Pan mode on and off without opening the menu.
- Confirm turning Pan mode on from the zoom button shows the position map and settings button immediately, then lets them hide after the normal inactivity delay.
- Confirm turning Pan mode off from the zoom button hides the position map, settings button, and transform menu immediately.
- Confirm Pan-mode quick single clicks still trigger YouTube native play/pause.
- Confirm Pan-mode long press or drag moves the frame and does not trigger YouTube native play/pause when released, even if the pointer is held still briefly before release.
- Confirm the top-right position map appears below the YouTube title area while dragging or wheel-zooming in Pan mode, stays visible during nearby mouse movement, then hides after the activity delay.
- Confirm the top-right position map and settings button remain visible while the transform menu is open, even after the activity delay.
- Confirm clicking the settings button centered below the top-right position map while dragging opens and closes the YouTube-style transform menu beside the settings area, with dark translucent rounded panel, native-like smaller gray controls, rounded inset row hover states, compact top zoom control with white progress and gray remaining track, red top-right Reset action, text rows, and right-aligned controls that stay inside the panel.
- Confirm menu Zoom, Rotation, horizontal Mirror, and Reset. Confirm clicking either the Mirror switch or the full Mirror row toggles mirror once. Confirm the menu does not show Mirror V or Pan rows.
- Confirm `Alt/Option + Shift + P` toggles Pan mode while focus is on the video page, and does nothing while typing in YouTube search or comments.
- Confirm slider changes and Pan-mode wheel zoom update the zoom button text.
- Confirm pressing and holding the zoom slider keeps dragging while the cursor moves above or below the track, matching YouTube's native slider behavior.
- Confirm the Rotation row itself does not show a row hover background; only the `0 / 90 / 180 / 270` buttons show their own hover or active state.
- Confirm 90/270-degree rotation fits the rotated video inside the player frame at 100% zoom without cropping the rotated top/bottom or left/right edges.
- Confirm panning stops at video-content edges and does not create extra black borders.
- Confirm returning to 100% zoom recenters the video.
- Confirm the top-right position map updates while dragging and after Pan-mode wheel zoom.
- Confirm mouse wheel zooms only while Pan is enabled.
- Confirm mouse wheel zoom in fullscreen Pan mode does not open YouTube's native recommendations or more-video controls.
- Confirm zoom, rotation, mirror, and pan state are preserved when entering and leaving fullscreen without flashing back to the original view.
- Confirm switching YouTube videos resets state.
- Confirm leaving a watch page removes the position map, settings button, and transform menu.
- Confirm normal video click-to-play still works while Pan is off.
