# FocusView

Zoom, rotate, and mirror YouTube videos with simple, native-feeling controls.

FocusView helps you look closer without leaving YouTube. Whether you are watching a concert, a sports replay, a lecture, or a tutorial, FocusView gives you smooth video controls for the moments when the default player is not enough.

[Download from the Chrome Web Store](https://chromewebstore.google.com/detail/jbdndcjclbghkmbiehjigaapembpbgdb?utm_source=github)

[Watch the YouTube demo](https://www.youtube.com/watch?v=x4EzsXcOo_A)

## Preview

![FocusView promotional tile](assets/focusview-promo-tile.png)

![FocusView toolbar controls](assets/focusview-toolbar.png)

![FocusView zoom mode](assets/focusview-zoom-mode.png)

## Why FocusView

- See small details in YouTube videos without changing tabs or downloading the video.
- Zoom smoothly from `100%` to `500%` and move around the video naturally.
- Fill the player to cover black bars when you want the video to use more space.
- Rotate videos by `90°`, `180°`, or `270°` when the original angle is wrong.
- Mirror videos horizontally for dance practice, tutorials, and side-by-side learning.
- Reset everything instantly and return to the normal YouTube experience.

## Great For

- Concerts and livestreams where you want a closer look at the stage.
- Sports clips where small movements matter.
- Lectures, tutorials, and screen recordings with tiny text or details.
- Fitness, dance, music, craft, and repair videos that are easier to follow when mirrored or zoomed.
- Any YouTube video where the important detail is just a little too small.

## How It Works

1. Install FocusView in your browser.
2. Open a normal YouTube video.
3. Turn on Zoom mode with `Alt/Option + Shift + Z` or the in-player FocusView controls.
4. Scroll to zoom, drag to move around, and use the panel to rotate, mirror, fill, or reset the video.

FocusView is designed to feel like part of YouTube: normal play, pause, scrolling, and fullscreen behavior stay familiar.

The review prompt appears only after Zoom mode has been used for at least three seconds on five different played videos, and only after Zoom mode is turned off or reset. **Maybe Later** snoozes it for five more qualifying uses; rating or closing stops future prompts.

## Privacy

FocusView does not collect data, does not track users, and does not send anything to external servers. Video changes happen locally in your browser.

The extension only runs on YouTube pages:

```json
"matches": ["https://www.youtube.com/*"]
```

It does not request storage, history, account, analytics, or extra network permissions.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Contact

For support, feedback, or bug reports, email `kodin.gai.apps@gmail.com`.

## Browser Support

FocusView is available on the Chrome Web Store. The project also includes development support for Microsoft Edge and a macOS Safari Web Extension package.

## Compatibility Notes

- FocusView targets normal YouTube watch pages.
- Shorts, embedded YouTube iframes, and special live-player layouts are not the focus of version 1.
- Video transforms use browser-native CSS transforms to keep the extension lightweight.

## Development

Current version: `1.1.3`.

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
- `popup.html`
- `popup.css`
- `src/`
- `icons/`

### Install For Development

#### Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. Click the FocusView toolbar button and confirm the popup opens.
6. Open a normal YouTube video page.

#### Microsoft Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. Click the FocusView toolbar button and confirm the popup opens.
6. Open a normal YouTube video page.

#### Safari

The macOS Safari Web Extension project is in `platforms/safari/FocusView`.

1. Open `platforms/safari/FocusView/FocusView.xcodeproj` in Xcode.
2. Select the `FocusView` scheme.
3. Run the macOS app target.
4. Open Safari Settings > Extensions.
5. Enable FocusView and allow access to YouTube.
6. Click the FocusView toolbar button and confirm the popup opens.
7. Open a normal YouTube video page and confirm the in-player controls appear.

<details>
<summary>Release maintainer notes</summary>

FocusView is packaged for Safari as a macOS app with an embedded Safari Web Extension.

Planned store metadata:

- Chrome Web Store name: `FocusView – Zoom, Rotate & Mirror for YouTube`
- Apple App Store listing name: `FocusView - Zoom for YouTube`
- Safari extension name: `FocusView - Zoom for YouTube`
- Apple App Store subtitle: `Reveal Video Details`

Before App Store submission, replace the Safari popup review placeholder URL `https://apps.apple.com/app/id0000000000?action=write-review` with the live Mac App Store app ID URL. The Safari popup feedback link opens `kodin.gai.apps@gmail.com` with a FocusView feedback subject.

Before resubmitting after a Safari Web Extension rejection:

1. Delete any older FocusView app from `/Applications`.
2. In Safari Settings > Extensions, remove or disable older FocusView entries.
3. Install the archived App Store build, then launch the macOS container app.
4. Click **Quit and Open Safari Settings** and confirm Safari opens Extensions settings for FocusView.
5. Enable FocusView, allow access to YouTube, then open `https://www.youtube.com/watch?v=x4EzsXcOo_A`.
6. Click the Safari toolbar FocusView button and confirm the popup responds with the FocusView title, concise YouTube tagline, zoom mode shortcut hint, secondary App Store “Rate us” and feedback text links.
7. Confirm the YouTube player shows FocusView controls and zoom, rotate, mirror, and fill actions work.

</details>

## Release Notes

See [CHANGELOG.md](CHANGELOG.md).
