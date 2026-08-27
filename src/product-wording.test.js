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

test("extension manifests use store-specific product metadata", async () => {
  for (const manifestUrl of MANIFEST_PATHS) {
    const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

    const expectedName = manifestUrl.pathname.includes("platforms/safari")
      ? "FocusView - Zoom for YouTube"
      : "FocusView – Zoom, Rotate & Mirror for YouTube";

    assert.equal(manifest.name, expectedName, `${manifestUrl.pathname} uses the store-specific product name`);
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

test("wheel listener blocks native scrolling only while zoom mode is active", async () => {
  for (const contentUrl of CONTENT_SCRIPT_PATHS) {
    const content = await readFile(contentUrl, "utf8");

    assert.match(content, /syncWheelTargetListenerMode/, `${contentUrl.pathname} syncs the wheel listener mode`);
    assert.match(content, /onDocumentWheel/, `${contentUrl.pathname} catches player wheel events that miss the player listener`);
    assert.match(content, /wheelTarget\.addEventListener\("pointerenter", onPlayerPointerEnter\)/, "enables the global fallback only after entering the player");
    assert.match(content, /wheelTarget\.addEventListener\("pointerleave", onPlayerPointerLeave\)/, "tracks when the pointer leaves the player");
    assert.match(content, /syncDocumentWheelListener\(false\)/, "releases the global fallback after leaving the player");
    assert.match(content, /shouldUseDocumentWheelListener\(state, Boolean\(wheelTarget && isPointerInPlayer\)\)/, "limits the global fallback to active player hover");
    assert.match(content, /if \(!isPointerInPlayer\) \{[\s\S]*syncWheelTargetListenerMode\(\);/, "repairs a missed pointerenter during pointer movement");
    assert.match(content, /function onPlayerPointerEnter\(event\) \{\n  updateLastPointerPosition\(event\);/, "caches pointer coordinates from player boundary events");
    assert.match(content, /syncPointerInPlayerFromLastPosition\(nextPlayer\)/, "restores pointer state after player replacement");
    assert.match(content, /requestAnimationFrame\(\(\) => syncPointerInPlayerFromLastPosition\(\)\)/, "resyncs pointer state after fullscreen geometry settles");
    assert.match(content, /shouldHandlePlayerWheel\(state, event\.clientX, event\.clientY, rect\)/, `${contentUrl.pathname} limits document wheel handling to the player bounds`);
    assert.match(content, /window\.addEventListener\("wheel", onDocumentWheel, \{ capture: true, passive: false \}\)/, `${contentUrl.pathname} catches Safari wheel events before page scrolling`);
    assert.match(content, /document\.addEventListener\("wheel", onDocumentWheel, \{ capture: true, passive: false \}\)/, `${contentUrl.pathname} blocks fallback wheel only while zoom mode is active`);
    assert.match(content, /passive: !shouldBlockWheel/, `${contentUrl.pathname} uses a passive player wheel listener outside zoom mode`);
    assert.match(content, /scheduleWheelUiSync\(\)/, `${contentUrl.pathname} batches wheel UI updates`);
    assert.match(content, /applyTransform\(\{ shouldRenderMinimap: false \}\)/, `${contentUrl.pathname} avoids synchronous minimap rendering during wheel animation`);
    assert.match(content, /shouldUseBlockingWheelListener\(state\)/, `${contentUrl.pathname} derives blocking wheel behavior from zoom mode state`);
    assert.match(content, /state = resetTransformState\(\);\n  syncWheelTargetListenerMode\(\);/, `${contentUrl.pathname} releases blocking wheel behavior on reset`);
    assert.doesNotMatch(content, /addEventListener\("wheel", onWheel, \{ capture: true, passive: false \}\)/, `${contentUrl.pathname} avoids an always-blocking player wheel listener`);
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
  assert.match(xcodeProject, /INFOPLIST_KEY_CFBundleDisplayName = "FocusView - Zoom for YouTube";/);
});

test("Safari toolbar button opens a visible popup", async () => {
  const manifestText = await readFile(new URL("../platforms/safari/FocusView/FocusView Extension/Resources/manifest.json", import.meta.url), "utf8");
  const popup = await readFile(new URL("../platforms/safari/FocusView/FocusView Extension/Resources/popup.html", import.meta.url), "utf8");
  const popupCss = await readFile(new URL("../platforms/safari/FocusView/FocusView Extension/Resources/popup.css", import.meta.url), "utf8");
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.action.default_title, "FocusView - Zoom for YouTube");
  assert.equal(manifest.action.default_popup, "popup.html");
  assert.match(popup, /<h1>FocusView<\/h1>[\s\S]*<p class="summary">Zoom, rotate, and mirror YouTube videos\.<\/p>/);
  assert.match(popup, /Option<\/kbd>[\s\S]*Shift<\/kbd>[\s\S]*Z<\/kbd>[\s\S]*in the player to toggle zoom mode\./);
  assert.match(popup, /<span class="zoom-icon"/);
  assert.match(popup, /<circle cx="15" cy="15" r="8"><\/circle>/);
  assert.match(popup, /width="40" height="40"/);
  assert.match(popup, /<p>Enjoying FocusView\? <a href="https:\/\/apps\.apple\.com\/app\/id0000000000\?action=write-review"[^>]*>Rate it<\/a> or <a href="mailto:kodin\.gai\.apps@gmail\.com\?subject=FocusView%20feedback">share feedback<\/a>\.<\/p>/);
  assert.doesNotMatch(popup, /Rate on App Store|quick rating|Send feedback/);
  assert.match(popup, /mailto:kodin\.gai\.apps@gmail\.com\?subject=FocusView%20feedback/);
  assert.doesNotMatch(popup, /five-star|5-star|5 stars/i);
  assert.match(popupCss, /width: 340px;/);
  assert.match(popupCss, /font-size: 17px;/);
  assert.match(popupCss, /\.brand-copy \{[\s\S]*min-width: 0;/);
  assert.match(popupCss, /\.brand-copy \{/);
  assert.match(popupCss, /\.review \{/);
  assert.match(popupCss, /\.review a \{/);
  assert.match(popupCss, /gap: 4px;/);
  assert.match(popupCss, /color: var\(--accent-color\);/);
  assert.match(popupCss, /--accent-color: #007aff;/);
  assert.match(popupCss, /border-top: 1px solid var\(--separator-color\);/);
  assert.doesNotMatch(popupCss, /\.review-button/);
  assert.doesNotMatch(popupCss, /color-mix/);
  assert.match(popupCss, /padding: 14px;/);
});


test("Chrome toolbar button opens a visible popup", async () => {
  const manifestText = await readFile(new URL("../manifest.json", import.meta.url), "utf8");
  const popup = await readFile(new URL("../popup.html", import.meta.url), "utf8");
  const popupCss = await readFile(new URL("../popup.css", import.meta.url), "utf8");
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.action.default_title, "FocusView – Zoom, Rotate & Mirror for YouTube");
  assert.equal(manifest.action.default_popup, "popup.html");
  assert.match(popup, /<h1>FocusView<\/h1>[\s\S]*<p class="summary">Zoom, rotate, and mirror YouTube videos\.<\/p>/);
  assert.match(popup, /Alt\/Option<\/kbd>[\s\S]*Shift<\/kbd>[\s\S]*Z<\/kbd>[\s\S]*in the player to toggle zoom mode\./);
  assert.match(popup, /<span class="zoom-icon"/);
  assert.match(popup, /<circle cx="15" cy="15" r="8"><\/circle>/);
  assert.match(popup, /<p>Enjoying FocusView\? <a href="https:\/\/chromewebstore\.google\.com\/detail\/jbdndcjclbghkmbiehjigaapembpbgdb\/reviews"[^>]*>Rate it<\/a> or <a href="mailto:kodin\.gai\.apps@gmail\.com\?subject=FocusView%20feedback">share feedback<\/a>\.<\/p>/);
  assert.match(popupCss, /width: 340px;/);
  assert.match(popupCss, /font-size: 17px;/);
  assert.match(popupCss, /\.brand-copy \{[\s\S]*min-width: 0;/);
  assert.match(popupCss, /\.review \{/);
  assert.match(popupCss, /\.review a \{/);
  assert.match(popupCss, /color: var\(--accent-color\);/);
  assert.doesNotMatch(popup, /apps\.apple\.com/);
});

test("Chrome release package includes toolbar popup resources", async () => {
  const releaseScript = await readFile(new URL("../scripts/build-release.sh", import.meta.url), "utf8");

  assert.match(releaseScript, /manifest\.json \\/);
  assert.match(releaseScript, /popup\.html \\/);
  assert.match(releaseScript, /popup\.css \\/);
});
