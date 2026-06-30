# Architecture

FocusView is a lightweight browser extension that runs only on YouTube pages and applies local CSS transforms to the active video player.

## Runtime

- `manifest.json` defines the Chrome extension metadata, YouTube content script match, icon assets, and runtime files.
- `src/content.js` owns the YouTube player integration, toolbar UI, pointer and wheel interactions, Fill action, reset and zoom mode tooltip wording, transform application, and player state reset triggers.
- `src/transform-state.js` contains the shared transform state helpers used by the content script and tests, including viewport-centered zoom for controls, cursor-centered zoom for wheel input, cover zoom calculation for Fill, and full transform reset state.
- `src/overlay.css` contains the extension UI styling and video transform presentation, including shared menu alignment and typography so actions, setting rows, and zoom controls use consistent visual rhythm.

## Testing

- `src/transform-state.test.js` verifies transform state behavior with Node's built-in test runner.
- `src/overlay-css.test.js` verifies zoom control CSS spacing, menu alignment, and menu typography across Chrome and Safari extension resources.
- `src/product-wording.test.js` verifies user-facing control labels and Safari setup wording across Chrome and Safari resources.
- Run tests with `node --test`.

## Release Packaging

- `scripts/build-release.sh` reads the version from `manifest.json` and writes `dist/focusview-<version>.zip`.
- The release zip includes only `manifest.json`, `src/`, and `icons/`, which are the files required for Chrome Web Store upload.

## Safari

- `platforms/safari/FocusView` contains the macOS Safari Web Extension wrapper project.
- The Safari extension manifest mirrors the Chrome manifest version and content script configuration.
