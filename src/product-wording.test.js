import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const CONTENT_SCRIPT_PATHS = [
  new URL("./content.js", import.meta.url),
  new URL("../platforms/safari/FocusView/FocusView Extension/Resources/src/content.js", import.meta.url),
];

const MANIFEST_PATHS = [
  new URL("../manifest.json", import.meta.url),
  new URL("../platforms/safari/FocusView/FocusView Extension/Resources/manifest.json", import.meta.url),
];

test("extension manifests use App Store-safe product metadata", async () => {
  for (const manifestUrl of MANIFEST_PATHS) {
    const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

    assert.equal(manifest.name, "FocusView", `${manifestUrl.pathname} uses the short product name`);
    assert.equal(manifest.short_name, "FocusView", `${manifestUrl.pathname} uses the short display name`);
    assert.equal(
      manifest.description,
      "Zoom, rotate, and mirror YouTube videos.",
      `${manifestUrl.pathname} uses concise platform-specific wording`,
    );
  }
});

test("player controls use user-facing wording for reset and minimap labels", async () => {
  for (const contentUrl of CONTENT_SCRIPT_PATHS) {
    const content = await readFile(contentUrl, "utf8");

    assert.match(content, /"Video position preview"/, `${contentUrl.pathname} labels the minimap as a video position preview`);
    assert.match(content, /"Reset view and turn off zoom mode"/, `${contentUrl.pathname} explains Reset also turns zoom mode off`);
    assert.doesNotMatch(content, /"Reset video transform"/, `${contentUrl.pathname} avoids implementation terms in reset wording`);
  }
});

test("toolbar zoom trigger tooltips describe click and double-click outcomes", async () => {
  for (const contentUrl of CONTENT_SCRIPT_PATHS) {
    const content = await readFile(contentUrl, "utf8");

    assert.match(content, /"Double-click to reset view and turn off zoom mode"/, `${contentUrl.pathname} explains double-click reset outcome`);
    assert.match(content, /"Turn on zoom mode"/, `${contentUrl.pathname} describes the off-state click outcome`);
    assert.match(content, /"Turn off zoom mode"/, `${contentUrl.pathname} describes the on-state click outcome`);
    assert.doesNotMatch(content, /"Double-click to reset"/, `${contentUrl.pathname} avoids vague double-click reset wording`);
    assert.doesNotMatch(content, /"Zoom mode on"/, `${contentUrl.pathname} avoids state-only on wording`);
    assert.doesNotMatch(content, /"Zoom mode off"/, `${contentUrl.pathname} avoids state-only off wording`);
  }
});

test("fill action uses concise button text with a descriptive tooltip", async () => {
  for (const contentUrl of CONTENT_SCRIPT_PATHS) {
    const content = await readFile(contentUrl, "utf8");

    assert.match(content, /fill\.textContent = "Fill"/, `${contentUrl.pathname} uses concise Fill button text`);
    assert.match(content, /fill\.title = "Zoom to fill the player"/, `${contentUrl.pathname} explains the Fill action in the tooltip`);
    assert.doesNotMatch(content, /fill\.textContent = "Fill Screen"/, `${contentUrl.pathname} avoids longer Fill Screen button text`);
  }
});

test("wheel zoom animates by measured zoom steps", async () => {
  for (const contentUrl of CONTENT_SCRIPT_PATHS) {
    const content = await readFile(contentUrl, "utf8");

    assert.match(content, /getWheelZoomAnimationStep/, `${contentUrl.pathname} uses measured wheel zoom steps`);
    assert.match(content, /wheelZoomFrame = requestAnimationFrame\(animate\)/, `${contentUrl.pathname} animates wheel zoom across frames`);
    assert.match(content, /cancelWheelZoomAnimation\(\);/, `${contentUrl.pathname} cancels stale wheel zoom animation`);
  }
});

test("Safari app page points users to Safari Settings Extensions", async () => {
  const html = await readFile(new URL("../platforms/safari/FocusView/FocusView/Resources/Base.lproj/Main.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../platforms/safari/FocusView/FocusView/Resources/Script.js", import.meta.url), "utf8");

  assert.match(html, /Safari Settings &gt; Extensions/, "Safari app fallback copy uses the current Settings path");
  assert.match(script, /Safari Settings > Extensions/, "Safari app runtime copy uses the current Settings path");
  assert.doesNotMatch(html, /Safari Extensions preferences/, "Safari app fallback copy avoids old preferences wording");
  assert.doesNotMatch(script, /Safari Extensions preferences/, "Safari app runtime copy avoids old preferences wording");
});

test("Safari wrapper uses the shipped extension bundle identifier", async () => {
  const viewController = await readFile(new URL("../platforms/safari/FocusView/FocusView/ViewController.swift", import.meta.url), "utf8");
  const xcodeProject = await readFile(new URL("../platforms/safari/FocusView/FocusView.xcodeproj/project.pbxproj", import.meta.url), "utf8");

  assert.match(viewController, /let extensionBundleIdentifier = "com\.kodingai\.focusview\.Extension"/);
  assert.match(xcodeProject, /PRODUCT_BUNDLE_IDENTIFIER = com\.kodingai\.focusview\.Extension;/);
});

test("Safari toolbar button opens a visible popup", async () => {
  const manifestText = await readFile(new URL("../platforms/safari/FocusView/FocusView Extension/Resources/manifest.json", import.meta.url), "utf8");
  const popup = await readFile(new URL("../platforms/safari/FocusView/FocusView Extension/Resources/popup.html", import.meta.url), "utf8");
  const popupCss = await readFile(new URL("../platforms/safari/FocusView/FocusView Extension/Resources/popup.css", import.meta.url), "utf8");
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.action.default_popup, "popup.html");
  assert.match(popup, /<header class="brand">[\s\S]*<h1>FocusView<\/h1>/);
  assert.match(popup, /Zoom, rotate, and mirror YouTube videos\./);
  assert.match(popup, /Option<\/kbd>[\s\S]*Shift<\/kbd>[\s\S]*Z<\/kbd>/);
  assert.match(popup, /<span class="zoom-icon"/);
  assert.match(popup, /<circle cx="15" cy="15" r="8"><\/circle>/);
  assert.doesNotMatch(popup, /Zoom for YouTube/);
  assert.match(popup, /width="40" height="40"/);
  assert.match(popupCss, /width: 300px;/);
  assert.match(popupCss, /font: -apple-system-headline;/);
  assert.match(popupCss, /padding: 16px;/);
});
