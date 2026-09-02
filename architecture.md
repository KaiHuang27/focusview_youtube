# Architecture

FocusView is a lightweight browser extension that runs only on YouTube pages and applies local CSS transforms to the active video player.

## Runtime

- `manifest.json` defines the Chrome Web Store extension metadata, long searchable product name, toolbar popup action, YouTube content script match, icon assets, and runtime files without optional browser permissions.
- `popup.html` and `popup.css` provide the Chrome and Edge toolbar popup with the same compact FocusView identity, zoom mode hint, and macOS-style light/dark presentation as Safari, with only the shortcut key label adjusted for Chromium browsers.
- `src/content.js` owns the YouTube player integration, toolbar UI, pointer and wheel interactions, Zoom mode-only player wheel blocking, Zoom mode-scoped window/document fallback for Safari with event-path, pointer-state, and player-bounds hit testing, one accumulating wheel animation controller, 30 fps auxiliary wheel UI updates, batched slider updates, watch-page-only player structure observation, ResizeObserver and fullscreen-triggered transform refresh without frame retry loops, Zoom mode-only pointer tracking and player wheel binding, single-timer transient-control activity tracking, one geometry snapshot per transform frame, active-video CSS-variable transform writes, native play/pause preservation, drag gesture handling, immediate single-click Zoom mode toggling, explicit Fill and Reset settings actions, and player state reset triggers.
- `src/transform-state.js` contains the shared transform state helpers used by the content script and tests, including viewport-centered zoom for controls, precise capped delta-aware cursor-centered zoom for wheel input, integer user-facing percentage formatting, player bounds and Zoom mode-aware fallback listener decisions, player-bounds wheel hit testing, elapsed-time-based wheel animation steps, cover zoom calculation for Fill, and full transform reset state.
- `src/overlay.css` contains the extension UI styling and video transform presentation, including shared menu alignment and typography.

## Testing

- `src/transform-state.test.js` verifies transform state behavior, precise capped wheel delta scaling, rapid input accumulation, refresh-rate-independent animation and 100 ms settling, Zoom mode-only player blocking and fallback decisions, player-bounds wheel hit testing, Zoom mode gesture guards, drag-start hold cancellation, and drag-time playback-rate restoration with Node's built-in test runner.
- `src/overlay-css.test.js` verifies zoom control CSS spacing, menu alignment, menu typography, and the absence of removed prompt styles across Chrome and Safari extension resources.
- `src/product-wording.test.js` verifies store-specific manifest metadata, permission-free runtime wiring, removal of review solicitation, integer user-facing zoom values, user-facing control labels, single-click Zoom mode behavior without double-click side effects, accumulating wheel animation wiring, Zoom mode-scoped wheel fallback, watch-page-only player observation, event-driven transform refresh, Zoom mode-only pointer tracking and player wheel binding, shared transform geometry, targeted transform writes, batched wheel and slider UI updates, and safe Safari wrapper resource and message handling across Chrome and Safari resources.
- Run tests with `node --test`.

## Release Packaging

- `scripts/build-release.sh` reads the version from `manifest.json` and writes `dist/focusview-<version>.zip`.
- `package.json`, the Chrome manifest, the Safari extension manifest, and Xcode marketing version stay aligned for each release. Current release version: `1.1.4`; Xcode build number: `5`.
- The release zip includes `manifest.json`, `popup.html`, `popup.css`, `src/content.js`, `src/transform-state.js`, `src/overlay.css`, and `icons/`, which are the runtime files required for Chrome Web Store upload.
- Mac App Store distribution uses the Safari wrapper in `platforms/safari/FocusView`, not the Chrome release zip.

## Safari

- `platforms/safari/FocusView` contains the macOS Safari Web Extension wrapper project.
- The Safari extension manifest mirrors the Chrome manifest version and content script configuration while using the shorter `FocusView - Zoom for YouTube` product name for Apple listing consistency. The compact Safari-style toolbar popup uses explicit macOS-style spacing, dynamic light/dark colors, the FocusView icon, compact FocusView title, a concise YouTube tagline, and a zoom mode shortcut hint.
- The macOS app bundle ID is `com.kodingai.focusview`; the embedded extension bundle ID is `com.kodingai.focusview.Extension`, and the container app uses that exact identifier when opening Safari Extensions settings. The wrapper validates bundled resources and script messages, reports extension-state errors, and keeps the required native handler free of unused payload logging and echo behavior.
- The Xcode project marketing version is kept aligned with the extension manifest version before App Store upload.
