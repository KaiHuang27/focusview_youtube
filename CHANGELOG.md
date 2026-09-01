# Changelog

## Unreleased

### Changed

- Changed the in-player review prompt to appear when Zoom mode is turned on for the first time, including migration from the former ten-use threshold.
- Moved review prompt state into extension-owned local storage while retaining migration from existing YouTube page storage.

### Fixed

- Migrated active review prompt state left by the former two-use threshold so existing local installs can show the first-use prompt immediately after updating.
- Kept review counting functional in memory when browser and page storage are unavailable.
- Cleared detached review dialogs after YouTube replaces the active player so later prompts can render normally.

## 1.1.4 - 2026-08-28

### Added

- Added a macOS-style in-player review prompt after ten qualifying FocusView uses, with local-only state, five-use snooze behavior, accessible keyboard handling, and no new extension permission.

### Changed

- Tightened the review prompt from 420 × 395 px to 388 × 326 px with a smaller icon, shorter spacing, and 44 px-or-larger action targets.
- Changed each Zoom mode activation to record a review use immediately, with no playback or duration requirement; the prompt appears immediately on the tenth use.

### Fixed

- Replaced recurring 800 ms player polling and whole-page resize observation with event-driven player discovery and player-scoped resize updates, reducing long-running Safari tab work.
- Reduced high-frequency Safari input work by reusing one inactivity timer and choosing a single pointer or mouse movement listener.
- Centered the review prompt correctly by restoring the missing review animation block delimiter.
- Exposed only the FocusView review icon to YouTube so the dialog no longer shows a broken image.
- Kept Safari wheel fallback active throughout Zoom mode so player wheel events cannot fall through to native page scrolling after player replacement or fullscreen transitions.
- Hardened rapid wheel handling with event-path and pointer-state checks when Safari omits or misroutes wheel coordinates.
- Scoped the Safari global wheel fallback to pointer presence inside the player so page scrolling remains native outside it, including while zoom mode is active.
- Kept Safari page scrolling smooth by avoiding a blocking player wheel listener while zoom mode is off.
- Captured Safari wheel zoom inside the non-fullscreen player even when Safari or YouTube routes the wheel event outside the player listener.
- Batched wheel-time UI updates to reduce non-fullscreen Safari zoom lag.

## 1.1.3 - 2026-08-26

### Changed

- Synchronized Chrome Web Store and Safari App Store release versions.
- Prepared the latest Chrome Web Store upload package.
- Verified extension metadata, tests, and release packaging before store upload.

## 1.1.2 - 2026-08-19

### Changed

- Changed mouse wheel and trackpad zoom from a fixed step to delta-aware exponential scaling for more natural zoom speed.
- Set the maximum zoom change from a single wheel event to about fifteen percent.
- Animated wheel zoom proportionally toward the target zoom to reduce delayed trailing after scrolling stops.
- Fixed small nonzero wheel deltas sometimes rounding back to the current zoom with no visible response.

## 1.1.1

### Fixed

- Preserved YouTube's native single-click play and pause behavior while canceling YouTube's 2x hold indicator when Zoom mode long-press drag starts.

## 1.1.0

### Changed

- Improved user-facing reset and video position preview wording.
- Aligned zoom menu actions, setting rows, and zoom controls to a shared left and right edge.
- Matched Fill and Reset text size to the Rotation and Mirror labels.
- Clarified toolbar and Reset tooltips so reset behavior states that zoom mode turns off.
- Shortened the Fill button label while keeping its tooltip descriptive.
- Unified Safari setup wording around Safari Settings > Extensions.

## 1.0.4

### Changed

- Mouse wheel and trackpad zoom now keeps the content under the pointer anchored while zooming.
- Zoom panel controls continue to zoom around the viewport center.
- Added Fill Screen zoom control for covering player black bars.
- Improved zoom menu spacing for action buttons, zoom value, slider, and step controls.

## 1.0.3

Release version update.

### Changed

- Bumped the Chrome and Safari extension manifests and package metadata to `1.0.3`.
- Prepared the latest Chrome Web Store release package.

## 1.0.2

Minimap and Zoom mode polish.

### Changed

- Renamed the map terminology to Minimap while keeping Viewport Indicator for the visible area marker.
- Kept the Viewport Indicator visually anchored to the player viewport size when rotating videos sideways.
- Fit the Minimap inside the player viewport preview at 100% zoom, including sideways rotation.
- Rendered the Viewport Indicator with explicit pixel dimensions so rotation does not resize it visually.
- Anchored the Minimap controls to the Viewport Indicator rect so rotation does not move the control group vertically.
- Kept the open settings menu zoom value and slider synced while zooming with the mouse wheel or trackpad.
- Changed mouse wheel and trackpad zoom to two percent per wheel event for finer control.

## 1.0.1

Release packaging and store listing polish.

### Changed

- Updated public wording to describe the toolbar action as Zoom mode on/off.
- Added store listing shortcut instructions for `Alt/Option + Shift + Z`.
- Added a release ZIP build script that does not require Node in the user's shell.
- Synchronized the Minimap update path with mouse wheel zoom.
- Blocked YouTube's long-press 2x playback gesture while Zoom mode is on.
- Moved the Zoom mode long-press block earlier in the pointer event path.
- Updated toolbar tooltip wording for Zoom mode and reset.
- Rewrote the README as a public product introduction.
- Simplified the README to match the Chrome Web Store listing style.
- Added README preview images.
- Added a macOS Safari Web Extension Xcode project for local testing and App Store preparation.

## 1.0.0

Initial Chrome Web Store release candidate.

### Added

- Native-style YouTube player toolbar control for FocusView.
- Zoom mode for moving around zoomed video content.
- Zoom controls from 100% to 500%, including mouse wheel zoom while Zoom mode is on.
- Manual zoom percentage input and custom slider control.
- Rotation controls for 0, 90, 180, and 270 degrees.
- Horizontal mirror control.
- Minimap and Viewport Indicator for understanding the visible area while moving around.
- Reset behavior for returning transforms to the default state.
- Automatic reset when switching to another YouTube video.
- Fullscreen transform preservation.
- Local-only privacy model with no data collection, no tracking, and no extra extension permissions.
- Final extension icon assets in 16, 32, 48, and 128 pixel sizes.

### Limitations

- Version 1 targets normal YouTube watch pages.
- Shorts, embedded YouTube iframes, and special live-player layouts are out of scope.
- Video transforms use CSS transforms instead of canvas video rendering.
