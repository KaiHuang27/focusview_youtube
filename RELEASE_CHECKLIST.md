# Release Checklist

## Metadata

- Manifest name is `FocusView – Zoom, Rotate & Mirror for YouTube`.
- Manifest version is `1.0.0`.
- Manifest description is `Zoom, rotate, mirror, and pan YouTube videos directly inside the player.`
- Chrome Web Store primary language is English.
- Chrome Web Store category is Productivity.
- Store listing copy is prepared in `STORE_LISTING.md`.

## Privacy And Permissions

- Privacy policy is prepared in `PRIVACY.md`.
- Privacy policy URL should point to a hosted copy of `PRIVACY.md` before submission.
- Extension requests no `permissions`.
- Extension requests no `host_permissions`.
- Content script match is limited to `https://www.youtube.com/*`.
- No analytics, ads, tracking, cookies, account access, browsing history access, or remote server calls.

## Assets

- Icon files are still required before submission.
- Required manifest/store icon: `128x128` PNG.
- Recommended manifest icon set: `16x16`, `32x32`, `48x48`, and `128x128` PNG.
- Small promotional image is required: `440x280`.
- At least one screenshot is required; prepare up to five.
- Preferred screenshot size: `1280x800`.
- Alternative screenshot size: `640x400`.
- Screenshots should be full bleed, square-cornered, sharp, and not text-heavy.

## Runtime Checks

- Load unpacked in Chrome and Edge.
- Open a normal YouTube watch page.
- Confirm the toolbar zoom control appears in YouTube's native control bar.
- Confirm Pan mode toggles from the toolbar control.
- Confirm Source Map and settings button appear during Pan activity.
- Confirm settings menu opens below the settings button.
- Confirm zoom input, custom slider, rotation, mirror, and reset work.
- Confirm quick click still triggers YouTube play/pause.
- Confirm long press or drag pans without triggering play/pause on release.
- Confirm mouse wheel zoom works only while Pan mode is active.
- Confirm fullscreen enter/exit preserves transforms without flashing back.
- Confirm switching videos resets transform state.

## Automated Checks

Run before packaging:

```sh
node --test
node --check src/content.js
node --check src/transform-state.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); JSON.parse(require('fs').readFileSync('package.json','utf8'))"
git diff --check
```

Documentation searches:

```sh
rg -n "YouTube Video Transform" README.md architecture.md PRIVACY.md STORE_LISTING.md manifest.json
rg -n "official|best|No\\. 1|tracking-free" README.md architecture.md PRIVACY.md STORE_LISTING.md manifest.json
```

The second search should only return intentional references if any. Avoid claims that imply endorsement, ranking, or unsupported status.

## Release ZIP Contents

Do not create the release ZIP until icon files are ready.

The release ZIP should include only runtime files:

- `manifest.json`
- `src/`
- `icons/`

Exclude:

- `.git/`
- `.DS_Store`
- `README.md`
- `architecture.md`
- `PRIVACY.md`
- `STORE_LISTING.md`
- `RELEASE_CHECKLIST.md`
- tests
- temporary files

## Submission Notes

- Use "for YouTube" descriptively and do not imply endorsement.
- Keep feature claims limited to current implementation.
- Keep the privacy wording aligned with the manifest and source code.
- Re-run the runtime checks after every extension reload and browser refresh during final review.
