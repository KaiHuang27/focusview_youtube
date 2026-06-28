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

async function getMenuActionGap(cssUrl) {
  const css = await readFile(cssUrl, "utf8");
  const fill = css.match(/\.ytvt-menu-fill\s*\{(?<rules>[^}]+)\}/);
  const zoomPanel = css.match(/\.ytvt-zoom-panel\s*\{(?<rules>[^}]+)\}/);
  assert.ok(fill, `${cssUrl.pathname} has .ytvt-menu-fill rules`);
  assert.ok(zoomPanel, `${cssUrl.pathname} has .ytvt-zoom-panel rules`);

  const actionTop = fill.groups.rules.match(/top:\s*(?<value>\d+)px;/);
  const actionLineHeight = fill.groups.rules.match(/font:\s*[^;]+\/(?<value>\d+)px\s/);
  const panelPaddingTop = zoomPanel.groups.rules.match(/padding:\s*(?<value>\d+)px\s/);
  assert.ok(actionTop, `${cssUrl.pathname} defines fill action top in pixels`);
  assert.ok(actionLineHeight, `${cssUrl.pathname} defines fill action line height in pixels`);
  assert.ok(panelPaddingTop, `${cssUrl.pathname} defines zoom panel top padding in pixels`);

  return Number(panelPaddingTop.groups.value) - (Number(actionTop.groups.value) + Number(actionLineHeight.groups.value));
}

test("zoom controls keep the slider thumb clear of step buttons", async () => {
  for (const cssUrl of OVERLAY_CSS_PATHS) {
    assert.ok((await getZoomControlsColumnGap(cssUrl)) >= 14, `${cssUrl.pathname} uses at least 14px column gap`);
  }
});

test("zoom value sits comfortably below menu actions", async () => {
  for (const cssUrl of OVERLAY_CSS_PATHS) {
    assert.ok((await getMenuActionGap(cssUrl)) >= 12, `${cssUrl.pathname} keeps at least 12px between actions and zoom value`);
  }
});
