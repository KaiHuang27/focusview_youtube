# FocusView

Reveal video details in YouTube videos.

FocusView adds smooth zoom, rotate, and mirror controls to YouTube videos in your browser.

Best for:

- concerts and livestreams
- sports clips
- lectures and tutorials
- any video where you want a closer look

[Watch the YouTube demo](https://www.youtube.com/watch?v=x4EzsXcOo_A)

[Download from the Chrome Web Store](https://chromewebstore.google.com/detail/jbdndcjclbghkmbiehjigaapembpbgdb?utm_source=github)

## Preview

![FocusView promotional tile](assets/focusview-promo-tile.png)

![FocusView toolbar controls](assets/focusview-toolbar.png)

![FocusView zoom mode](assets/focusview-zoom-mode.png)

## Features

- Press `Alt/Option + Shift + Z` to turn zoom mode on or off.
- The review prompt appears after zoom mode has been turned on 10 times.
- Scroll to zoom videos from `100%` to `500%` around the mouse pointer.
- Long-press and drag to move around a zoomed video.
- Use the zoom panel for centered `100%` to `500%` zoom control.
- Rotate videos by `90°`, `180°`, or `270°`.
- Mirror videos horizontally.
- Player detection and resizing are event-driven, so idle YouTube tabs do not run recurring FocusView synchronization work.
- Pointer tracking uses one supported event path, and transient controls reuse a single inactivity timer during continuous movement.

## Privacy And Permissions

FocusView does not collect data, does not track users, and does not send anything to external servers. All transforms happen locally in your browser.

The extension only runs on YouTube pages:

```json
"matches": ["https://www.youtube.com/*"]
```

It does not request storage, history, account, analytics, or extra network permissions.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Contact

For support, feedback, or bug reports, email `kodin.gai.apps@gmail.com`.

## Release Notes

Latest release: `1.1.4`.

See [CHANGELOG.md](CHANGELOG.md).
