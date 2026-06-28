# Architecture

FocusView is a lightweight browser extension that runs only on YouTube pages and applies local CSS transforms to the active video player.

## Runtime

- `manifest.json` defines the Chrome extension metadata, YouTube content script match, icon assets, and runtime files.
- `src/content.js` owns the YouTube player integration, toolbar UI, pointer and wheel interactions, transform application, and player state reset behavior.
- `src/transform-state.js` contains the shared transform state helpers used by the content script and tests.
- `src/overlay.css` contains the extension UI styling and video transform presentation.

## Testing

- `src/transform-state.test.js` verifies transform state behavior with Node's built-in test runner.
- Run tests with `node --test`.

## Release Packaging

- `scripts/build-release.sh` reads the version from `manifest.json` and writes `dist/focusview-<version>.zip`.
- The release zip includes only `manifest.json`, `src/`, and `icons/`, which are the files required for Chrome Web Store upload.

## Safari

- `platforms/safari/FocusView` contains the macOS Safari Web Extension wrapper project.
- The Safari extension manifest mirrors the Chrome manifest version and content script configuration.
