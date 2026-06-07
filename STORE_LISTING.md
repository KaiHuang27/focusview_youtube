# Chrome Web Store Listing Draft

## Basic Information

- Name: FocusView – Zoom, Rotate & Mirror for YouTube
- Version: 1.0.0
- Primary language: English
- Suggested category: Productivity
- Short description: Zoom, rotate, mirror, and pan YouTube videos directly inside the player.

## Single Purpose

FocusView lets users zoom, rotate, mirror, and pan YouTube videos directly inside the YouTube player.

## Long Description

FocusView adds focused video transform controls to YouTube, directly inside the player.

Use it when you want to inspect details, reframe a video, rotate sideways footage, mirror a scene, or move around a zoomed video without changing the rest of the YouTube page.

Core features:

- Zoom YouTube videos from 100% to 500%
- Pan around zoomed video content with the mouse
- Use the mouse wheel to zoom while Pan mode is active
- Rotate videos by 0, 90, 180, or 270 degrees
- Mirror videos horizontally
- See a compact Source Map that shows the visible area while panning
- Reset transforms when needed
- Automatically reset when switching to another YouTube video

FocusView is designed to feel native to YouTube. The zoom control sits in the YouTube player toolbar, the settings menu uses a compact YouTube-style layout, and the extension avoids interfering with normal play, pause, fullscreen, and keyboard behavior.

Privacy and permissions:

FocusView does not collect data, does not track users, and does not send anything to external servers. All transforms happen locally in your browser.

The extension does not request extra extension permissions. It only runs on YouTube pages through its content script.

Limitations:

- Designed for normal YouTube watch pages
- Shorts, embedded YouTube iframes, and special live-player layouts are not the focus of version 1
- Uses CSS transforms instead of canvas video rendering for better simplicity and compatibility

FocusView is an independent browser extension for improving the YouTube video viewing experience.

## Privacy Summary

This extension does not collect, store, share, sell, or transmit personal data. It does not use analytics, advertising trackers, cookies, browsing history, account data, or remote servers.

All video transform controls are applied locally in the browser on YouTube pages only.

## Permission Justification

FocusView does not request extension permissions or host permissions.

The extension uses a content script on `https://www.youtube.com/*` only to detect the YouTube video player, add local transform controls, and apply CSS transforms to the video element. It does not collect data, read account information, access browsing history, or send data to external servers.

## Screenshot Plan

Use `1280x800` screenshots when possible. `640x400` is acceptable if the UI reads better at that size. Screenshots should be full bleed, square-cornered, sharp, and light on text.

1. Native toolbar control
   - Show a normal YouTube player with the FocusView zoom control integrated into the native right-side toolbar.
   - Goal: communicate that the extension feels built into the player.
2. Pan mode with Source Map
   - Show Pan mode active with a zoomed video and the Source Map visible in the top-right corner.
   - Goal: make the position feedback obvious.
3. Zoom settings menu
   - Show the settings menu with percentage input, slider, and reset action.
   - Goal: communicate direct, understandable controls.
4. Rotation example
   - Show a video rotated 90 degrees with the toolbar zoom value visible.
   - Goal: demonstrate rotation without relying on text-heavy explanation.
5. Mirror and privacy-minimal message
   - Show the Mirror control enabled or a clean before/after mirror frame.
   - Optional small overlay text for the store image: "No data collection. No extra permissions."

## Promotional Image Plan

- Small promotional image: `440x280`
- Focus on the product in context: YouTube player, compact toolbar control, and Source Map.
- Avoid long text. Suggested text if needed: "Focus YouTube videos your way."

## References

- Chrome Web Store image requirements: https://developer.chrome.com/webstore/images
- Chrome extension icon requirements: https://developer.chrome.com/docs/extensions/reference/manifest/icons
