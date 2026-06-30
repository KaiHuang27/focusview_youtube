import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const CONTENT_SCRIPT_PATHS = [
  new URL("./content.js", import.meta.url),
  new URL("../platforms/safari/FocusView/FocusView Extension/Resources/src/content.js", import.meta.url),
];

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

test("Safari app page points users to Safari Settings Extensions", async () => {
  const html = await readFile(new URL("../platforms/safari/FocusView/FocusView/Resources/Base.lproj/Main.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../platforms/safari/FocusView/FocusView/Resources/Script.js", import.meta.url), "utf8");

  assert.match(html, /Safari Settings &gt; Extensions/, "Safari app fallback copy uses the current Settings path");
  assert.match(script, /Safari Settings > Extensions/, "Safari app runtime copy uses the current Settings path");
  assert.doesNotMatch(html, /Safari Extensions preferences/, "Safari app fallback copy avoids old preferences wording");
  assert.doesNotMatch(script, /Safari Extensions preferences/, "Safari app runtime copy avoids old preferences wording");
});
