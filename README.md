# FocusView – Zoom, Rotate & Mirror for YouTube

See more details in YouTube videos.

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
- Scroll to zoom videos from `100%` to `500%` around the mouse pointer.
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

## Install For Development

### Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. Open a normal YouTube video page.

### Microsoft Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. Open a normal YouTube video page.

### Safari

The macOS Safari Web Extension project is in `platforms/safari/FocusView`.

1. Open `platforms/safari/FocusView/FocusView.xcodeproj` in Xcode.
2. Select the `FocusView` scheme.
3. Run the macOS app target.
4. Open Safari Settings > Extensions.
5. Enable FocusView and allow access to YouTube.
6. Open a normal YouTube video page.

## Mac App Store Release

FocusView is packaged for Safari as a macOS app with an embedded Safari Web Extension.

1. In App Store Connect, create a macOS app record for `com.kodingai.focusview`.
2. In Xcode, open `platforms/safari/FocusView/FocusView.xcodeproj`.
3. Select the `FocusView` scheme and set your Apple Developer Team for the app and extension targets.
4. Confirm the app bundle ID is `com.kodingai.focusview` and the extension bundle ID is `com.kodingai.focusview.Extension`.
5. Select `Any Mac` as the run destination.
6. Choose Product > Archive.
7. In Organizer, choose Distribute App > App Store Connect > Upload.
8. In App Store Connect, select the uploaded build, complete the listing metadata, and submit it for review.

## Development

Current version: `1.1.1`.

Run tests:

```sh
node --test
```

Build the release zip:

```sh
./scripts/build-release.sh
```

The release zip includes only the runtime files required by the extension:

- `manifest.json`
- `src/`
- `icons/`

## Limitations

- FocusView targets normal YouTube watch pages.
- Shorts, embedded YouTube iframes, and special live-player layouts are not the focus of version 1.
- FocusView prevents extra black borders caused by moving too far, and **Fill** can cover YouTube letterboxing or vertical-video side bars by cropping the video.
- Video transforms use CSS transforms, not canvas rendering, to keep the extension lightweight.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md).
