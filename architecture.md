# Architecture

FocusView is a lightweight browser extension that runs only on YouTube pages and applies local CSS transforms to the active video player.

## Runtime

- `manifest.json` defines the Chrome Web Store extension metadata, long searchable product name, toolbar popup action, YouTube content script match, icon assets, and runtime files.
- `popup.html` and `popup.css` provide the Chrome and Edge toolbar popup with the same compact FocusView identity, zoom mode hint, review prompt, and macOS-style light/dark presentation as Safari, with only the shortcut key label and review URL adjusted for Chromium browsers.
- `src/content.js` owns the YouTube player integration, toolbar UI, pointer and wheel interactions, Zoom mode-only player wheel blocking, Zoom mode-scoped window/document fallback for Safari with event-path, pointer-state, and player-bounds hit testing, batched wheel UI updates for smooth Safari page scrolling, review prompt rendering, post-use timing, and focus handling, proportional wheel zoom animation, Zoom mode preservation of native single-click play/pause, drag-start cancellation of YouTube's 2x hold gesture, drag-time playback-rate restoration, Fill action, reset and zoom mode tooltip wording, transform application, and player state reset triggers.
- `src/transform-state.js` contains the shared transform state helpers used by the content script and tests, including viewport-centered zoom for controls, about-fifteen-percent capped delta-aware cursor-centered zoom for wheel input, player bounds and Zoom mode-aware fallback listener decisions, player-bounds wheel hit testing, proportional wheel zoom animation steps, cover zoom calculation for Fill, and full transform reset state.
- `src/review-prompt-state.js` contains the permission-free review counter state machine: five-video threshold, three-second played-use qualification, five-use snooze, persisted-state validation, and terminal rated or dismissed states.
- `src/overlay.css` contains the extension UI styling and video transform presentation, including the responsive macOS-style review dialog, light and dark appearances, reduced-motion behavior, and shared menu alignment and typography.

## Testing

- `src/transform-state.test.js` verifies transform state behavior, capped wheel delta zoom scaling, minimum one-percent wheel response, Zoom mode-only player blocking and fallback decisions, player-bounds wheel hit testing, proportional wheel zoom animation steps, Zoom mode gesture guards, drag-start hold cancellation, and drag-time playback-rate restoration with Node's built-in test runner.
- `src/overlay-css.test.js` verifies zoom control CSS spacing, menu alignment, menu typography, and review prompt positioning, animation syntax, and design tokens across Chrome and Safari extension resources.
- `src/product-wording.test.js` verifies store-specific manifest metadata, user-facing control labels, review prompt loading, icon exposure, post-use timing, and accessibility wiring, wheel zoom animation wiring, Zoom mode-scoped window/document fallback and rapid-wheel hit-testing wiring, batched wheel UI updates, and Safari setup wording across Chrome and Safari resources.
- `src/review-prompt-state.test.js` verifies the five-use threshold, played-use duration qualification, snooze behavior, terminal states, invalid storage recovery, and Chrome/Safari parity.
- Run tests with `node --test`.

## Release Packaging

- `scripts/build-release.sh` reads the version from `manifest.json` and writes `dist/focusview-<version>.zip`.
- `package.json`, the Chrome manifest, the Safari extension manifest, and Xcode marketing version stay aligned for each release. Current release version: `1.1.3`; Xcode build number: `4`.
- The release zip includes `manifest.json`, `popup.html`, `popup.css`, `src/`, and `icons/`, which are the runtime files required for Chrome Web Store upload.
- Mac App Store distribution uses the Safari wrapper in `platforms/safari/FocusView`, not the Chrome release zip.

## Safari

- `platforms/safari/FocusView` contains the macOS Safari Web Extension wrapper project.
- The Safari extension manifest mirrors the Chrome manifest version and content script configuration while using the shorter `FocusView - Zoom for YouTube` product name for Apple listing consistency. The compact Safari-style toolbar popup uses explicit macOS-style spacing, dynamic light/dark colors, the FocusView icon, compact FocusView title, a concise YouTube tagline, a zoom mode shortcut hint, secondary App Store rating and feedback text links without a subtitle.
- The macOS app bundle ID is `com.kodingai.focusview`; the embedded extension bundle ID is `com.kodingai.focusview.Extension`, and the container app uses that exact identifier when opening Safari Extensions settings.
- The Xcode project marketing version is kept aligned with the extension manifest version before App Store upload.
