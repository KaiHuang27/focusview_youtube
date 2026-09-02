import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
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

test("toolbar zoom trigger keeps one immediate click action", async () => {
  for (const contentUrl of CONTENT_SCRIPT_PATHS) {
    const content = await readFile(contentUrl, "utf8");

    assert.match(content, /"Turn on zoom mode"/, `${contentUrl.pathname} describes the off-state click outcome`);
    assert.match(content, /"Turn off zoom mode"/, `${contentUrl.pathname} describes the on-state click outcome`);
    assert.doesNotMatch(content, /addEventListener\("dblclick"/, `${contentUrl.pathname} avoids duplicate toggle actions`);
    assert.match(content, /reset\.addEventListener\("click", \(\) => resetState\(\)\)/, `${contentUrl.pathname} keeps reset as an explicit settings action`);
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

test("wheel zoom accumulates input in one frame-rate-independent animation", async () => {
  for (const contentUrl of CONTENT_SCRIPT_PATHS) {
    const content = await readFile(contentUrl, "utf8");

    assert.match(content, /applyWheelZoomDelta\(wheelTargetZoom \?\? state\.zoom, event\)/, `${contentUrl.pathname} accumulates every wheel delta on the pending target`);
    assert.match(content, /getWheelZoomAnimationStep\(state\.zoom, wheelTargetZoom, elapsedMs\)/, `${contentUrl.pathname} smooths zoom by elapsed time`);
    assert.match(content, /wheelZoomFrame = requestAnimationFrame\(animateWheelZoom\)/, `${contentUrl.pathname} keeps one wheel animation controller`);
    assert.doesNotMatch(content, /cancelWheelZoomAnimation\(\);\n  const cursorOffset/, `${contentUrl.pathname} does not cancel unfinished input for every wheel event`);
  }
});

test("wheel listener blocks native scrolling only while zoom mode is active", async () => {
  for (const contentUrl of CONTENT_SCRIPT_PATHS) {
    const content = await readFile(contentUrl, "utf8");

    assert.match(content, /syncWheelTargetListenerMode/, "syncs the wheel listener mode");
    assert.match(content, /syncDocumentWheelListener\(shouldBlockWheel\)/, "keeps the global fallback aligned with Zoom mode");
    assert.match(content, /onDocumentWheel/, "catches player wheel events that miss the player listener");
    assert.match(content, /isEventInPlayer/, "recognizes player event paths during fallback wheel handling");
    assert.match(content, /isPointerInPlayer/, "keeps a stable pointer-in-player fallback signal");
    assert.match(content, /shouldHandlePlayerWheel\(state, event\.clientX, event\.clientY, rect\)/, `${contentUrl.pathname} limits document wheel handling to the player bounds`);
    assert.match(content, /window\.addEventListener\("wheel", onDocumentWheel, \{ capture: true, passive: false \}\)/, `${contentUrl.pathname} catches Safari wheel events before page scrolling`);
    assert.match(content, /document\.addEventListener\("wheel", onDocumentWheel, \{ capture: true, passive: false \}\)/, `${contentUrl.pathname} blocks fallback wheel only while zoom mode is active`);
    assert.match(content, /if \(shouldBlockWheel\) \{[\s\S]*wheelTarget\.addEventListener\("wheel", onWheel, \{ capture: true, passive: false \}\)/, `${contentUrl.pathname} binds the player wheel listener only while zoom mode is active`);
    assert.doesNotMatch(content, /passive: !shouldBlockWheel/, `${contentUrl.pathname} does not invoke an idle player wheel listener`);
    assert.match(content, /WHEEL_UI_UPDATE_INTERVAL_MS = 1000 \/ 30/, `${contentUrl.pathname} throttles auxiliary wheel UI to 30 fps`);
    assert.match(content, /applyTransform\(\{ shouldRenderMinimap: false, geometry \}\)/, `${contentUrl.pathname} reuses one geometry snapshot during wheel animation`);
    assert.match(content, /shouldUseBlockingWheelListener\(state\)/, `${contentUrl.pathname} derives blocking wheel behavior from zoom mode state`);
    assert.match(content, /state = resetTransformState\(\);\n  syncWheelTargetListenerMode\(\);/, `${contentUrl.pathname} releases blocking wheel behavior on reset`);
  }
});

test("player lifecycle is event-driven without idle polling", async () => {
  for (const contentUrl of CONTENT_SCRIPT_PATHS) {
    const content = await readFile(contentUrl, "utf8");

    assert.doesNotMatch(content, /setInterval\(sync/, contentUrl.pathname + " does not poll while the tab is idle");
    assert.match(content, /new MutationObserver\(\(mutations\) =>/, contentUrl.pathname + " detects player replacement from DOM changes");
    assert.match(content, /scheduleSync\(\)/, contentUrl.pathname + " batches structural synchronization into one animation frame");
    assert.match(content, /if \(!isWatchPage\(\) \|\| !document\.documentElement \|\| playerStructureObserver\)/, contentUrl.pathname + " observes player structure only on watch pages");
    assert.match(content, /if \(!isWatchPage\(\)\) \{[\s\S]*stopObservingPlayerStructure\(\)/, contentUrl.pathname + " disconnects the player observer after leaving a watch page");
    assert.match(content, /function stopObservingPlayerStructure\(\) \{[\s\S]*playerStructureObserver\?\.disconnect\(\)/, contentUrl.pathname + " releases the page observer");
    assert.match(content, /resizeObserver\.observe\(nextPlayer\)/, contentUrl.pathname + " observes only the active player size");
    assert.doesNotMatch(content, /resizeObserver\.observe\(document\.documentElement\)/, contentUrl.pathname + " avoids observing the entire page size");
  }
});

test("high-frequency pointer activity avoids redundant work", async () => {
  for (const contentUrl of CONTENT_SCRIPT_PATHS) {
    const content = await readFile(contentUrl, "utf8");

    assert.match(content, /if \(viewportControlsHideTimer\) \{\n    return;/, contentUrl.pathname + " reuses one controls-hide timer");
    assert.match(content, /remainingDelayMs = Math\.max/, contentUrl.pathname + " reschedules from the latest activity time");
    assert.match(content, /const shouldTrackPointer = state\.panMode && isWatchPage\(\)/, contentUrl.pathname + " tracks pointer location only during watch-page Zoom mode");
    assert.match(content, /const eventName = "PointerEvent" in window \? "pointermove" : "mousemove"/, contentUrl.pathname + " chooses one supported pointer event path");
    assert.match(content, /window\.addEventListener\(eventName, updateLastPointerPosition, \{ passive: true \}\)/, contentUrl.pathname + " binds one passive pointer tracking listener");
    assert.doesNotMatch(content, /wheelTarget\.addEventListener\("pointermove"/, contentUrl.pathname + " does not duplicate pointer movement work on the player");
    assert.match(content, /syncPointerTracking\(\);\n  viewportControlsLastActivityAt/, contentUrl.pathname + " updates pointer tracking with Zoom mode");
  }
});

test("transform and slider updates avoid repeated layout work", async () => {
  for (const contentUrl of CONTENT_SCRIPT_PATHS) {
    const content = await readFile(contentUrl, "utf8");

    assert.match(content, /geometry = getViewportGeometry\(\)/, contentUrl.pathname + " accepts one shared viewport geometry snapshot");
    assert.match(content, /renderMinimap\(geometry\)/, contentUrl.pathname + " reuses the transform geometry for the minimap");
    assert.match(content, /video\.style\.setProperty\(TRANSFORM_PROPERTY, transformValue\)/, contentUrl.pathname + " updates only the active video's transform variable");
    assert.doesNotMatch(content, /function clampCurrentPanState/, contentUrl.pathname + " avoids a duplicate pan-clamp geometry read");
    assert.match(content, /sliderDragRect = sliderHitArea\.getBoundingClientRect\(\)/, contentUrl.pathname + " captures slider geometry once when dragging starts");
    assert.match(content, /sliderZoomFrame = requestAnimationFrame/, contentUrl.pathname + " batches slider movement into animation frames");
    assert.doesNotMatch(content, /getZoomFromPointerPosition\(sliderHitArea\.getBoundingClientRect\(\)/, contentUrl.pathname + " does not force a layout read for every slider move");
  }
});

test("transform refresh stays event driven without frame retry loops", async () => {
  for (const contentUrl of CONTENT_SCRIPT_PATHS) {
    const content = await readFile(contentUrl, "utf8");

    assert.doesNotMatch(content, /videoStyleObserver/, contentUrl.pathname + " does not observe YouTube inline style churn");
    assert.doesNotMatch(content, /scheduleTransformReapply|remainingFrames/, contentUrl.pathname + " does not retry identical transforms across frames");
    assert.match(content, /new ResizeObserver\(\(\) => applyTransform\(\)\)/, contentUrl.pathname + " reapplies transforms from player size changes");
    assert.match(content, /addEventListener\("fullscreenchange", scheduleSync\)/, contentUrl.pathname + " resynchronizes once when fullscreen changes");
    assert.doesNotMatch(content, /video\.style\.transform = ""/, contentUrl.pathname + " does not clear YouTube-owned inline transforms");
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

test("Safari wrapper handles resources and messages without unsafe assumptions", async () => {
  const viewController = await readFile(new URL("../platforms/safari/FocusView/FocusView/ViewController.swift", import.meta.url), "utf8");
  const nativeHandler = await readFile(new URL("../platforms/safari/FocusView/FocusView Extension/SafariWebExtensionHandler.swift", import.meta.url), "utf8");
  const appDelegate = await readFile(new URL("../platforms/safari/FocusView/FocusView/AppDelegate.swift", import.meta.url), "utf8");

  assert.match(viewController, /let mainURL = Bundle\.main\.url[\s\S]*let resourceURL = Bundle\.main\.resourceURL/);
  assert.match(viewController, /guard message\.body as\? String == "open-preferences" else/);
  assert.match(viewController, /title: "Unable to check the Safari extension"/);
  assert.match(viewController, /\[weak self, weak webView\]/);
  assert.doesNotMatch(viewController, /Bundle\.main\.(?:url|resourceURL)[^\n]*!/);
  assert.doesNotMatch(viewController, /as!/);

  assert.match(nativeHandler, /completeRequest\(returningItems: \[\], completionHandler: nil\)/);
  assert.doesNotMatch(nativeHandler, /os_log|SFExtensionMessageKey|"echo"/);
  assert.doesNotMatch(appDelegate, /applicationDidFinishLaunching/);
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
  assert.doesNotMatch(popup, /review|rate us|share feedback|mailto:/i);
  assert.match(popupCss, /width: 340px;/);
  assert.match(popupCss, /font-size: 17px;/);
  assert.match(popupCss, /\.brand-copy \{[\s\S]*min-width: 0;/);
  assert.match(popupCss, /\.brand-copy \{/);
  assert.doesNotMatch(popupCss, /\.review|--accent-color|--button-text/);
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
  assert.doesNotMatch(popup, /review|rate us|share feedback|mailto:/i);
  assert.match(popupCss, /width: 340px;/);
  assert.match(popupCss, /font-size: 17px;/);
  assert.match(popupCss, /\.brand-copy \{[\s\S]*min-width: 0;/);
  assert.doesNotMatch(popupCss, /\.review|--accent-color|--button-text/);
  assert.doesNotMatch(popup, /apps\.apple\.com/);
});

test("Chrome release package includes toolbar popup resources", async () => {
  const releaseScript = await readFile(new URL("../scripts/build-release.sh", import.meta.url), "utf8");

  assert.match(releaseScript, /manifest\.json \\/);
  assert.match(releaseScript, /popup\.html \\/);
  assert.match(releaseScript, /popup\.css \\/);
});


test("review solicitation is fully removed across stores", async () => {
  for (const manifestUrl of MANIFEST_PATHS) {
    const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

    assert.deepEqual(manifest.content_scripts[0].js, ["src/transform-state.js", "src/content.js"]);
    assert.equal(manifest.permissions, undefined, `${manifestUrl.pathname} requests no review storage permission`);
    assert.equal(manifest.web_accessible_resources, undefined, `${manifestUrl.pathname} exposes no review assets`);
  }

  for (const contentUrl of CONTENT_SCRIPT_PATHS) {
    const content = await readFile(contentUrl, "utf8");

    assert.doesNotMatch(content, /ReviewPrompt|review-prompt|ytvt-review|Rate FocusView|No thanks/);
  }

  await assert.rejects(access(new URL("./review-prompt-state.js", import.meta.url)));
  await assert.rejects(access(new URL("../platforms/safari/FocusView/FocusView Extension/Resources/src/review-prompt-state.js", import.meta.url)));
});
