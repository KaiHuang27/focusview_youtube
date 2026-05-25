# YouTube Video Transform

Microsoft Edge / Chrome extension for transforming the YouTube video frame without changing the rest of the page.

## Features

- Single native-style magnifier zoom button. It switches to zoom text while Pan mode is on or the video is zoomed.
- Toolbar zoom button toggles Pan mode directly.
- Settings button appears below the top-right position map during recent Pan activity and opens the YouTube-native-style transform menu.
- Rotate video by 0, 90, 180, or 270 degrees, fitting 90/270-degree rotations inside the player frame first.
- Mirror horizontally.
- Pan mode for dragging a zoomed video and using the mouse wheel to zoom without adding extra black borders.
- Top-right position map during recent Pan activity, showing the visible area inside the original video frame.
- Reset transform state when switching to another YouTube video.

## Test in Microsoft Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder: `/Users/kai/Documents/New project 2`.
5. Open a normal YouTube video page, such as `https://www.youtube.com/watch?v=...`.
6. Click the magnifier button in YouTube's native control bar to turn Pan mode on or off.
7. Turn on Pan mode, drag the video, and click the settings button below the top-right position map to open the transform menu.
8. After changing zoom, enter and leave fullscreen to confirm the transform is preserved without briefly flashing back to the original view.

## Controls

The zoom button is placed in YouTube's native right-side control bar, at the left edge of the right control group. It uses a YouTube-style magnifier icon by default, then switches to compact zoom text when Pan mode is on or the video is zoomed. Click it to turn Pan mode on or off, or double-click it to reset zoom to 100%. If YouTube's native controls are unavailable, the extension falls back to a floating top-right button.

The transform menu opens next to the settings button centered below the top-right position map during recent Pan activity. It follows YouTube's settings-menu density: rounded gray panel, compact centered text rows, a compact top `- / slider / +` zoom control, and a small red `Reset` action in the top-right corner.

- `Zoom`: changes zoom between 100% and 500%.
- Zoom slider drag uses pointer capture on the whole zoom control row: after pressing the slider area, keep holding and move horizontally to adjust zoom even if the cursor is no longer directly above the track.
- `Rotation`: rotates the video by `0`, `90`, `180`, or `270` degrees.
- `Mirror`: mirrors the video horizontally.
- Pan mode is controlled from the native toolbar zoom button. Quick single clicks still use YouTube's native play/pause behavior; long press or intentional drag moves the video frame and suppresses that drag's native click. While enabled, the mouse wheel changes zoom in 5% steps and is blocked from YouTube's native fullscreen controls.
- `Alt/Option + Shift + P`: toggles Pan mode without using YouTube's single-key shortcuts or Chrome/Edge `Ctrl`/`Cmd` shortcuts. The shortcut listener loads early and runs at capture time so YouTube does not consume it first. It is ignored while typing in inputs, comments, search, or other editable fields.
- `Reset`: restores zoom, rotation, mirror, and pan to the default state and closes the menu.

Pan movement is bounded by the current zoom level and video element size. When the video edge reaches the visible edge, the extension stops further movement in that direction. Returning to 100% zoom recenters the video.

When rotating 90 or 270 degrees, 100% zoom means the rotated video is first scaled to fit inside the player frame. This prevents a landscape video from being cut off at the top and bottom after rotating to portrait orientation.

While dragging or using the mouse wheel to zoom in Pan mode, a position map appears in the top-right corner of the player. The white rectangle shows which part of the original video frame is currently visible. The position map and settings button stay visible briefly after the last drag, wheel, or mouse movement, then hide like YouTube's native controls.

When Pan is off, clicking the video keeps YouTube's normal play and pause behavior, and the mouse wheel is not intercepted by the extension. When Pan is on, quick video clicks still play or pause normally, while long-press drag gestures move the frame without triggering play or pause. The extension intercepts wheel events at the player level to avoid triggering YouTube's native fullscreen recommendations or extra controls.

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
