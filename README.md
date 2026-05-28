# YouTube Video Transform

Microsoft Edge / Chrome extension for transforming the YouTube video frame without changing the rest of the page.

## Features

- Single native-style magnifier zoom button. It switches to zoom text while Pan mode is on or the video is zoomed, and uses an active background only while Pan mode is on.
- Toolbar zoom button toggles Pan mode directly.
- YouTube-native-style settings icon button appears below the top-right position map when Pan mode turns on or during recent Pan activity, and opens the transform menu.
- Rotate video by 0, 90, 180, or 270 degrees, fitting 90/270-degree rotations inside the player frame first.
- Mirror horizontally.
- Pan mode for dragging a zoomed video and using the mouse wheel to zoom without adding extra black borders.
- Top-right position map when Pan mode turns on or during recent Pan activity, showing the visible area inside the original video frame.
- Reset transform state when switching to another YouTube video.

## Test in Microsoft Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder: `/Users/kai/Documents/New project 2`.
5. Open a normal YouTube video page, such as `https://www.youtube.com/watch?v=...`.
6. Click the magnifier button in YouTube's native control bar to turn Pan mode on or off.
7. Turn on Pan mode, confirm the position map and settings button appear, then click the settings button below the map to open the transform menu.
8. After changing zoom, enter and leave fullscreen to confirm the transform is preserved without briefly flashing back to the original view.

## Controls

The zoom button is placed in YouTube's native right-side control bar, at the left edge of the right control group. It uses a YouTube-style magnifier icon by default, then switches to compact zoom text when Pan mode is on or the video is zoomed. Hover uses YouTube's native `ytp-button` styling. Pan mode adds a matching compact active background when the button is not hovered. Click it to turn Pan mode on or off, or double-click it to reset zoom to 100%. If YouTube's native controls are unavailable, the extension falls back to a floating top-right button.

The transform menu opens next to the native-style settings icon button centered below the top-right position map while the transient Pan controls are visible. It follows YouTube's settings-menu density: rounded gray panel, compact centered text rows, a compact top `- / slider / +` zoom control, and a small red `Reset` action in the top-right corner.

- `Zoom`: changes zoom between 100% and 500%.
- Zoom slider drag uses a custom pointer-controlled slider with a wider hit area around the track and keeps tracking pointer movement at the document level until release: after pressing that area, keep holding and move horizontally to adjust zoom even if the cursor is no longer directly above the thin track.
- `Rotation`: rotates the video by `0`, `90`, `180`, or `270` degrees.
- `Mirror`: mirrors the video horizontally. Click either the switch or anywhere on the Mirror row.
- Pan mode is controlled from the native toolbar zoom button. Quick single clicks still use YouTube's native play/pause behavior; long press or intentional drag moves the video frame and suppresses the native click after that drag ends. While enabled, the mouse wheel changes zoom in 5% steps and is blocked from YouTube's native fullscreen controls.
- `Alt/Option + Shift + P`: toggles Pan mode without using YouTube's single-key shortcuts or Chrome/Edge `Ctrl`/`Cmd` shortcuts. The shortcut listener loads early and runs at capture time so YouTube does not consume it first. It is ignored while typing in inputs, comments, search, or other editable fields.
- `Reset`: restores zoom, rotation, mirror, and pan to the default state and closes the menu.

Pan movement is bounded by the current zoom level and the Source Video content area inside the Player Viewport. If YouTube is already showing side bars or letterbox space, that black-border direction stays locked until zoom is high enough for the Source Video to fill that side of the Player Viewport. When the video edge reaches the visible edge, the extension stops further movement in that direction. Returning to 100% zoom recenters the video.

When rotating 90 or 270 degrees, 100% zoom means the rotated video is first scaled to fit inside the player frame. This prevents a landscape video from being cut off at the top and bottom after rotating to portrait orientation.

When Pan mode turns on, while dragging, or while using the mouse wheel to zoom in Pan mode, a low-emphasis Source Map appears in the top-right corner of the player. The Source Map follows the Source Video aspect ratio, while the white Viewport Indicator follows the current Player Viewport, zoom, and pan. The Viewport Indicator can extend outside the Source Map to show visible letterbox or pillarbox space. The overlay position is anchored from the 100% Player Viewport bounds so zooming and panning update only the indicator, not the Source Map or settings button position. The position map and settings button stay visible briefly after the last Pan activity or mouse movement, then hide like YouTube's native controls. If the transform menu is open, the position map and settings button remain visible until the menu closes.

When Pan is off, clicking the video keeps YouTube's normal play and pause behavior, and the mouse wheel is not intercepted by the extension. When Pan is on, quick video clicks still play or pause normally, while long-press drag gestures move the frame and suppress the click generated when the pointer is released. The extension intercepts wheel events at the player level to avoid triggering YouTube's native fullscreen recommendations or extra controls.

Wheel events inside the transform menu are blocked from YouTube so the menu does not accidentally trigger native player behavior.

During fullscreen changes, YouTube may rewrite the video element's inline style. The extension keeps the active transform in its own `!important` stylesheet rule and still reapplies across the next few animation frames, so fullscreen transitions do not briefly fall back to the original video size.

## Development

Run tests with:

```sh
node --test
```

If your local Node installation includes npm, this also works:

```sh
npm test
```

## Limitations

- Version 1 targets normal YouTube watch pages only.
- Shorts, embedded YouTube iframes, and special live-player layouts are out of scope.
- The extension avoids extra black borders caused by panning too far. It does not remove black borders already present because of vertical video or YouTube letterboxing, but it prevents panning further into those black-border-only areas until zoom fills that direction.
- The extension uses CSS transforms, not canvas video rendering, to keep performance and compatibility simple.
