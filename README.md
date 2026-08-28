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
- In zoom mode, scroll to zoom videos from `100%` to `500%` around the mouse pointer, with each nonzero wheel or trackpad event capped at about fifteen percent and animated by at least one percent unless the zoom limit is reached.
- Outside the player, page scrolling remains native so Safari trackpad and mouse wheel scrolling remains smooth, including while zoom mode is on. The Safari wheel fallback stays synchronized for the duration of Zoom mode and recognizes player event paths, pointer state, and player bounds so rapid wheel input cannot leak into native page scrolling. Wheel-time UI updates remain batched to keep non-fullscreen controls responsive.
- Long-press and drag to move around a zoomed video without leaving YouTube's 2x hold indicator on screen, while normal single-click play and pause stays unchanged.
- Use the zoom panel for centered `100%` to `500%` zoom control with aligned actions, matching label sizes, setting rows, the slider, and step buttons.
- Click **Fill** in the zoom settings to enlarge the video until player black bars are covered.
- Double-click the toolbar zoom control, or click **Reset**, to reset the video view and turn off zoom mode.
- Rotate videos by `90°`, `180°`, or `270°`.
- Mirror videos horizontally.

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

See [CHANGELOG.md](CHANGELOG.md).
