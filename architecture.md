# Architecture

FocusView is a lightweight browser extension that runs only on YouTube pages and applies local CSS transforms to the active video player.

## Runtime

- `manifest.json` defines the Chrome Web Store extension metadata, long searchable product name, toolbar popup action, browser-local storage permission, YouTube content script match, icon assets, and runtime files.
- `popup.html` and `popup.css` provide the Chrome and Edge toolbar popup with the same compact FocusView identity, zoom mode hint, review prompt, and macOS-style light/dark presentation as Safari, with only the shortcut key label and review URL adjusted for Chromium browsers.
- `src/content.js` owns the YouTube player integration, toolbar UI, pointer and wheel interactions, Zoom mode-only player wheel blocking, Zoom mode-scoped window/document fallback for Safari with event-path, pointer-state, and player-bounds hit testing, batched wheel and slider UI updates, watch-page-only player structure observation, ResizeObserver and fullscreen-triggered transform refresh without frame retry loops, Zoom mode-only pointer tracking and player wheel binding, single-timer transient-control activity tracking, one geometry snapshot per transform frame, review prompt rendering and focus handling, proportional wheel zoom animation, native play/pause preservation, drag gesture handling, immediate single-click Zoom mode toggling, explicit Fill and Reset settings actions, transform application, and player state reset triggers.
- `src/transform-state.js` contains the shared transform state helpers used by the content script and tests, including viewport-centered zoom for controls, about-fifteen-percent capped delta-aware cursor-centered zoom for wheel input, player bounds and Zoom mode-aware fallback listener decisions, player-bounds wheel hit testing, proportional wheel zoom animation steps, cover zoom calculation for Fill, and full transform reset state.
- `src/review-prompt-state.js` contains the review counter state machine and serialized storage queue: two-activation threshold, migration from the former ten-activation threshold and YouTube page storage, browser-local persistence with an in-page memory fallback, immediate Zoom mode counting, five-use snooze, persisted-state validation, and terminal rated or dismissed states.
- `src/overlay.css` contains the extension UI styling and video transform presentation, including the compact, responsive macOS-style review dialog, light and dark appearances, reduced-motion behavior, and shared menu alignment and typography.

## Testing

- `src/transform-state.test.js` verifies transform state behavior, capped wheel delta zoom scaling, minimum one-percent wheel response, Zoom mode-only player blocking and fallback decisions, player-bounds wheel hit testing, proportional wheel zoom animation steps, Zoom mode gesture guards, drag-start hold cancellation, and drag-time playback-rate restoration with Node's built-in test runner.
- `src/overlay-css.test.js` verifies zoom control CSS spacing, menu alignment, menu typography, and review prompt positioning, animation syntax, and design tokens across Chrome and Safari extension resources.
- `src/product-wording.test.js` verifies store-specific manifest metadata, browser-local review storage wiring, stale prompt cleanup, user-facing control labels, review prompt loading, icon exposure, immediate Zoom mode activation counting, accessibility wiring, single-click Zoom mode behavior without double-click side effects, Zoom mode-scoped wheel fallback, watch-page-only player observation, event-driven transform refresh, Zoom mode-only pointer tracking and player wheel binding, shared transform geometry, batched wheel and slider UI updates, and safe Safari wrapper resource and message handling across Chrome and Safari resources.
- `src/review-prompt-state.test.js` verifies the two-activation threshold, legacy threshold and page-storage migration, serialized updates, unavailable-storage fallback, immediate counting, snooze behavior, terminal states, invalid storage recovery, and Chrome/Safari parity.
- Run tests with `node --test`.

## Release Packaging

- `scripts/build-release.sh` reads the version from `manifest.json` and writes `dist/focusview-<version>.zip`.
- `package.json`, the Chrome manifest, the Safari extension manifest, and Xcode marketing version stay aligned for each release. Current release version: `1.1.4`; Xcode build number: `5`.
- The release zip includes `manifest.json`, `popup.html`, `popup.css`, `src/content.js`, `src/transform-state.js`, `src/review-prompt-state.js`, `src/overlay.css`, and `icons/`, which are the runtime files required for Chrome Web Store upload.
- Mac App Store distribution uses the Safari wrapper in `platforms/safari/FocusView`, not the Chrome release zip.

## Safari

- `platforms/safari/FocusView` contains the macOS Safari Web Extension wrapper project.
- The Safari extension manifest mirrors the Chrome manifest version and content script configuration while using the shorter `FocusView - Zoom for YouTube` product name for Apple listing consistency. The compact Safari-style toolbar popup uses explicit macOS-style spacing, dynamic light/dark colors, the FocusView icon, compact FocusView title, a concise YouTube tagline, a zoom mode shortcut hint, secondary App Store rating link to the live product page, and a feedback text link without a subtitle.
- The macOS app bundle ID is `com.kodingai.focusview`; the embedded extension bundle ID is `com.kodingai.focusview.Extension`, and the container app uses that exact identifier when opening Safari Extensions settings. The wrapper validates bundled resources and script messages, reports extension-state errors, and keeps the required native handler free of unused payload logging and echo behavior.
- The Xcode project marketing version is kept aligned with the extension manifest version before App Store upload.
