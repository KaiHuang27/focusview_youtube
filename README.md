# YouTube Video Transform

Microsoft Edge / Chrome extension for transforming the YouTube video frame without changing the rest of the page.

## Features

- Zoom slider from 100% to 500%.
- Rotate video by 0, 90, 180, or 270 degrees.
- Mirror horizontally, vertically, or both.
- Pan mode for dragging a zoomed video and using the mouse wheel to zoom without adding extra black borders.
- Top-left position map showing the visible area inside the original video frame.
- Reset transform state when switching to another YouTube video.

## Test in Microsoft Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder: `/Users/kai/Documents/New project 2`.
5. Open a normal YouTube video page, such as `https://www.youtube.com/watch?v=...`.
6. Use the floating toolbar in the top-right corner of the YouTube player.
7. After changing zoom, enter and leave fullscreen to confirm the transform is preserved.

## Controls

- Slider: changes zoom between 100% and 500%.
- `0`, `90`, `180`, `270`: rotates the video.
- `H`: mirrors the video horizontally.
- `V`: mirrors the video vertically.
- `Pan`: enables drag-to-pan on the video. While enabled, the mouse wheel changes zoom in 10% steps and is blocked from YouTube's native fullscreen controls.
- `Reset`: restores zoom, rotation, mirror, and pan to the default state.

Pan movement is bounded by the current zoom level and video element size. When the video edge reaches the visible edge, the extension stops further movement in that direction. Returning to 100% zoom recenters the video.

When zoom is not 100%, a small position map appears in the top-left corner of the player. The blue rectangle shows which part of the original video frame is currently visible.

When Pan is off, clicking the video keeps YouTube's normal play and pause behavior, and the mouse wheel is not intercepted by the extension. When Pan is on, the extension intercepts wheel events at the player level to avoid triggering YouTube's native fullscreen recommendations or extra controls.

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
