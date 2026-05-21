# YouTube Video Transform

Microsoft Edge / Chrome extension for transforming the YouTube video frame without changing the rest of the page.

## Features

- Zoom slider from 100% to 500%.
- Rotate video by 0, 90, 180, or 270 degrees.
- Mirror horizontally, vertically, or both.
- Pan mode for dragging a zoomed video and using the mouse wheel to zoom.
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
- `Pan`: enables drag-to-pan on the video. While enabled, the mouse wheel changes zoom in 10% steps.
- `Reset`: restores zoom, rotation, mirror, and pan to the default state.

When zoom is not 100%, a small position map appears in the top-left corner of the player. The blue rectangle shows which part of the original video frame is currently visible.

When Pan is off, clicking the video keeps YouTube's normal play and pause behavior, and the mouse wheel is not intercepted by the extension.

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
- The extension uses CSS transforms, not canvas video rendering, to keep performance and compatibility simple.
