# YouTube Video Transform

Microsoft Edge / Chrome extension for transforming the YouTube video frame without changing the rest of the page.

## Features

- Zoom slider from 50% to 300%.
- Rotate video by 0, 90, 180, or 270 degrees.
- Mirror horizontally, vertically, or both.
- Pan mode for dragging a zoomed video.
- Reset transform state when switching to another YouTube video.

## Test in Microsoft Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder: `/Users/kai/Documents/New project 2`.
5. Open a normal YouTube video page, such as `https://www.youtube.com/watch?v=...`.
6. Use the floating toolbar in the top-right corner of the YouTube player.

## Controls

- Slider: changes zoom between 50% and 300%.
- `0`, `90`, `180`, `270`: rotates the video.
- `H`: mirrors the video horizontally.
- `V`: mirrors the video vertically.
- `Pan`: enables drag-to-pan on the video.
- `Reset`: restores zoom, rotation, mirror, and pan to the default state.

When Pan is off, clicking the video keeps YouTube's normal play and pause behavior.

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
