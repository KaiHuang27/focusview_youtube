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
- Use the toolbar popup to rate FocusView or send feedback.
- Double-click the Zoom toolbar button to reset the view and turn off zoom mode; single-click continues to toggle zoom mode.
- Scroll to zoom videos from `100%` to `500%` around the mouse pointer.
- Long-press and drag to move around a zoomed video.
- Use the zoom panel for centered `100%` to `500%` zoom control.
- Rotate videos by `90°`, `180°`, or `270°`.
- Mirror videos horizontally.
- Use Reset in zoom settings as an alternative way to restore the view and turn off zoom mode.
- Player discovery and transform refresh are event-driven; player structure is observed only on watch pages, with no frame retry loop for inline style changes.
- Pointer tracking and player wheel listeners attach only while zoom mode is active, and transient controls reuse a single inactivity timer.
- Each transform frame reuses one viewport geometry snapshot, and continuous slider movement is batched to the display frame rate.
- Wheel input uses fine-grained sensitivity with a capped per-event change, then accumulates into one frame-rate-independent animation while displaying a clear integer percentage.

## Privacy And Permissions

FocusView does not collect data, does not track users, and does not send anything to external servers. All transforms happen locally in your browser.

The Safari wrapper validates bundled resources and messages, surfaces setup errors, and does not log or echo native messages.

The extension only runs on YouTube pages:

```json
"matches": ["https://www.youtube.com/*"]
```

It does not request browser permissions for storage, history, accounts, analytics, or network access.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Contact

For support, feedback, or bug reports, email `kodin.gai.apps@gmail.com`.

## Release Notes

Latest release: `1.1.6`.

See [CHANGELOG.md](CHANGELOG.md).
