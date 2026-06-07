# Changelog

## 1.0.0

Initial Chrome Web Store release candidate.

### Added

- Native-style YouTube player toolbar control for FocusView.
- Pan mode for moving around zoomed video content.
- Zoom controls from 100% to 500%, including mouse wheel zoom while Pan mode is active.
- Manual zoom percentage input and custom slider control.
- Rotation controls for 0, 90, 180, and 270 degrees.
- Horizontal mirror control.
- Source Map and Viewport Indicator for understanding the visible area while panning.
- Reset behavior for returning transforms to the default state.
- Automatic reset when switching to another YouTube video.
- Fullscreen transform preservation.
- Local-only privacy model with no data collection, no tracking, and no extra extension permissions.
- Final extension icon assets in 16, 32, 48, and 128 pixel sizes.

### Limitations

- Version 1 targets normal YouTube watch pages.
- Shorts, embedded YouTube iframes, and special live-player layouts are out of scope.
- Video transforms use CSS transforms instead of canvas video rendering.
