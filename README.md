# YouTube Video Transform

Microsoft Edge / Chrome extension for transforming the YouTube video frame without changing the rest of the page.

## Features

- Single zoom button showing the current zoom percentage.
- YouTube-native-style transform menu with compact text rows and a top zoom control from 100% to 500%.
- Rotate video by 0, 90, 180, or 270 degrees, fitting 90/270-degree rotations inside the player frame first.
- Mirror horizontally, vertically, or both.
- Pan mode for dragging a zoomed video and using the mouse wheel to zoom without adding extra black borders.
- Top-right position map showing the visible area inside the original video frame.
- Reset transform state when switching to another YouTube video.

## Test in Microsoft Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder: `/Users/kai/Documents/New project 2`.
5. Open a normal YouTube video page, such as `https://www.youtube.com/watch?v=...`.
6. Click the zoom percentage button in YouTube's native control bar to open the transform menu.
7. After changing zoom, enter and leave fullscreen to confirm the transform is preserved without briefly flashing back to the original view.

## Controls

The zoom button is placed in YouTube's native right-side control bar, at the left edge of the right control group. It directly shows the current zoom percentage in a native-sized toolbar slot. Click it to open or close the YouTube-style transform menu, or double-click it to reset zoom to 100%. If YouTube's native controls are unavailable, the extension falls back to a floating top-right button.

The transform menu follows YouTube's settings-menu density: rounded gray panel, compact centered text rows, a top `- / slider / +` zoom control, and a small red `Reset` action in the top-right corner.

- `Zoom`: changes zoom between 100% and 500%.
- Zoom slider drag uses pointer capture: after pressing the slider, keep holding and move horizontally to adjust zoom even if the cursor is no longer directly above the track.
- `Rotation`: rotates the video by `0`, `90`, `180`, or `270` degrees.
- `Mirror H`: mirrors the video horizontally.
- `Mirror V`: mirrors the video vertically.
- `Pan`: enables drag-to-pan on the video. While enabled, the mouse wheel changes zoom in 5% steps and is blocked from YouTube's native fullscreen controls.
- `Alt/Option + Shift + P`: toggles Pan mode without using YouTube's single-key shortcuts or Chrome/Edge `Ctrl`/`Cmd` shortcuts. The shortcut listener loads early and runs at capture time so YouTube does not consume it first. It is ignored while typing in inputs, comments, search, or other editable fields.
- `Reset`: restores zoom, rotation, mirror, and pan to the default state and closes the menu.

Pan movement is bounded by the current zoom level and video element size. When the video edge reaches the visible edge, the extension stops further movement in that direction. Returning to 100% zoom recenters the video.

When rotating 90 or 270 degrees, 100% zoom means the rotated video is first scaled to fit inside the player frame. This prevents a landscape video from being cut off at the top and bottom after rotating to portrait orientation.

When zoom is not 100%, a small position map appears in the top-right corner of the player. The white rectangle shows which part of the original video frame is currently visible.

When Pan is off, clicking the video keeps YouTube's normal play and pause behavior, and the mouse wheel is not intercepted by the extension. When Pan is on, the extension intercepts wheel events at the player level to avoid triggering YouTube's native fullscreen recommendations or extra controls.

Wheel events inside the transform menu are blocked from YouTube so the menu does not accidentally trigger native player behavior.

During fullscreen changes, YouTube may rewrite the video element's inline style. The extension watches for those style changes and reapplies the current transform across the next few animation frames to reduce flicker.

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
- The extension avoids extra black borders caused by panning too far, but it does not remove black borders already present because of vertical video or YouTube letterboxing.
- The extension uses CSS transforms, not canvas video rendering, to keep performance and compatibility simple.
