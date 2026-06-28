# Changelog

## 1.0.1

Release packaging and store listing polish.

### Changed

- Updated public wording to describe the toolbar action as Zoom mode on/off.
- Renamed the map terminology to Minimap while keeping Viewport Indicator for the visible area marker.
- Kept the Viewport Indicator visually anchored to the player viewport size when rotating videos sideways.
- Changed mouse wheel and trackpad zoom to two percent per wheel event for finer control.
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
