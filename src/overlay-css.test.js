import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const OVERLAY_CSS_PATHS = [
  new URL("./overlay.css", import.meta.url),
  new URL("../platforms/safari/FocusView/FocusView Extension/Resources/src/overlay.css", import.meta.url),
];

async function getZoomControlsColumnGap(cssUrl) {
  const css = await readFile(cssUrl, "utf8");
  const match = css.match(/\.ytvt-zoom-controls\s*\{(?<rules>[^}]+)\}/);
  assert.ok(match, `${cssUrl.pathname} has .ytvt-zoom-controls rules`);

  const gap = match.groups.rules.match(/column-gap:\s*(?<value>\d+)px;/);
  assert.ok(gap, `${cssUrl.pathname} defines column-gap in pixels`);

  return Number(gap.groups.value);
}

test("zoom controls keep the slider thumb clear of step buttons", async () => {
  for (const cssUrl of OVERLAY_CSS_PATHS) {
    assert.ok((await getZoomControlsColumnGap(cssUrl)) >= 14, `${cssUrl.pathname} uses at least 14px column gap`);
  }
});
