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

async function getZoomPanelSpacing(cssUrl) {
  const css = await readFile(cssUrl, "utf8");
  const zoomPanel = css.match(/\.ytvt-zoom-panel\s*\{(?<rules>[^}]+)\}/);
  const zoomValue = css.match(/\.ytvt-zoom-value\s*\{(?<rules>[^}]+)\}/);
  assert.ok(zoomPanel, `${cssUrl.pathname} has .ytvt-zoom-panel rules`);
  assert.ok(zoomValue, `${cssUrl.pathname} has .ytvt-zoom-value rules`);

  const panelPadding = zoomPanel.groups.rules.match(/padding:\s*(?<top>\d+)px\s+(?<inline>\d+)px\s+(?<bottom>\d+)px;/);
  const valueMargin = zoomValue.groups.rules.match(/margin:\s*0\s+auto\s+(?<bottom>\d+)px;/);
  assert.ok(panelPadding, `${cssUrl.pathname} defines zoom panel padding in pixels`);
  assert.ok(valueMargin, `${cssUrl.pathname} defines zoom value bottom margin in pixels`);

  return {
    panelTop: Number(panelPadding.groups.top),
    panelInline: Number(panelPadding.groups.inline),
    panelBottom: Number(panelPadding.groups.bottom),
    valueBottom: Number(valueMargin.groups.bottom),
  };
}

async function getMenuActionGap(cssUrl) {
  const css = await readFile(cssUrl, "utf8");
  const fill = css.match(/\.ytvt-menu-fill\s*\{(?<rules>[^}]+)\}/);
  const zoomPanel = css.match(/\.ytvt-zoom-panel\s*\{(?<rules>[^}]+)\}/);
  assert.ok(fill, `${cssUrl.pathname} has .ytvt-menu-fill rules`);
  assert.ok(zoomPanel, `${cssUrl.pathname} has .ytvt-zoom-panel rules`);

  const actionTop = fill.groups.rules.match(/top:\s*(?<value>\d+)px;/);
  const panelPaddingTop = zoomPanel.groups.rules.match(/padding:\s*(?<value>\d+)px\s/);
  assert.ok(actionTop, `${cssUrl.pathname} defines fill action top in pixels`);
  assert.ok(panelPaddingTop, `${cssUrl.pathname} defines zoom panel top padding in pixels`);

  return Number(panelPaddingTop.groups.value) - Number(actionTop.groups.value);
}

async function getMenuInlineAlignment(cssUrl) {
  const css = await readFile(cssUrl, "utf8");
  const fill = css.match(/\.ytvt-menu-fill\s*\{(?<rules>[^}]+)\}/);
  const reset = css.match(/\.ytvt-menu-reset\s*\{(?<rules>[^}]+)\}/);
  const zoomPanel = css.match(/\.ytvt-zoom-panel\s*\{(?<rules>[^}]+)\}/);
  const menuRow = css.match(/\.ytvt-menu-row\s*\{(?<rules>[^}]+)\}/);
  assert.ok(fill, `${cssUrl.pathname} has .ytvt-menu-fill rules`);
  assert.ok(reset, `${cssUrl.pathname} has .ytvt-menu-reset rules`);
  assert.ok(zoomPanel, `${cssUrl.pathname} has .ytvt-zoom-panel rules`);
  assert.ok(menuRow, `${cssUrl.pathname} has .ytvt-menu-row rules`);

  const fillLeft = fill.groups.rules.match(/left:\s*(?<value>\d+)px;/);
  const resetRight = reset.groups.rules.match(/right:\s*(?<value>\d+)px;/);
  const panelPadding = zoomPanel.groups.rules.match(/padding:\s*\d+px\s+(?<inline>\d+)px\s+\d+px;/);
  const rowMargin = menuRow.groups.rules.match(/margin:\s*0\s+(?<inline>\d+)px;/);
  const rowPadding = menuRow.groups.rules.match(/padding:\s*(?<block>\d+)px\s+(?<inline>\d+)px;/);
  assert.ok(fillLeft, `${cssUrl.pathname} defines Fill left offset`);
  assert.ok(resetRight, `${cssUrl.pathname} defines Reset right offset`);
  assert.ok(panelPadding, `${cssUrl.pathname} defines zoom panel inline padding`);
  assert.ok(rowMargin, `${cssUrl.pathname} defines menu row inline margin`);
  assert.ok(rowPadding, `${cssUrl.pathname} defines menu row padding`);

  return {
    fillLeft: Number(fillLeft.groups.value),
    resetRight: Number(resetRight.groups.value),
    panelInline: Number(panelPadding.groups.inline),
    rowMarginInline: Number(rowMargin.groups.inline),
    rowPaddingInline: Number(rowPadding.groups.inline),
    rowContentInline: Number(rowMargin.groups.inline) + Number(rowPadding.groups.inline),
  };
}

async function getMenuTypography(cssUrl) {
  const css = await readFile(cssUrl, "utf8");
  const fill = css.match(/\.ytvt-menu-fill\s*\{(?<rules>[^}]+)\}/);
  const reset = css.match(/\.ytvt-menu-reset\s*\{(?<rules>[^}]+)\}/);
  const label = css.match(/\.ytvt-menu-label\s*\{(?<rules>[^}]+)\}/);
  assert.ok(fill, `${cssUrl.pathname} has .ytvt-menu-fill rules`);
  assert.ok(reset, `${cssUrl.pathname} has .ytvt-menu-reset rules`);
  assert.ok(label, `${cssUrl.pathname} has .ytvt-menu-label rules`);

  const fillFont = fill.groups.rules.match(/font:\s*(?<weight>\d+)\s+(?<size>\d+)px\/(?<lineHeight>\d+)px/);
  const resetFont = reset.groups.rules.match(/font:\s*(?<weight>\d+)\s+(?<size>\d+)px\/(?<lineHeight>\d+)px/);
  const labelSize = label.groups.rules.match(/font-size:\s*(?<size>\d+)px;/);
  const labelLineHeight = label.groups.rules.match(/line-height:\s*(?<lineHeight>\d+)px;/);
  assert.ok(fillFont, `${cssUrl.pathname} defines Fill font shorthand`);
  assert.ok(resetFont, `${cssUrl.pathname} defines Reset font shorthand`);
  assert.ok(labelSize, `${cssUrl.pathname} defines menu label font size`);
  assert.ok(labelLineHeight, `${cssUrl.pathname} defines menu label line height`);

  return {
    fill: {
      weight: Number(fillFont.groups.weight),
      size: Number(fillFont.groups.size),
      lineHeight: Number(fillFont.groups.lineHeight),
    },
    reset: {
      weight: Number(resetFont.groups.weight),
      size: Number(resetFont.groups.size),
      lineHeight: Number(resetFont.groups.lineHeight),
    },
    label: {
      size: Number(labelSize.groups.size),
      lineHeight: Number(labelLineHeight.groups.lineHeight),
    },
  };
}

test("zoom controls keep the slider thumb clear of step buttons", async () => {
  for (const cssUrl of OVERLAY_CSS_PATHS) {
    assert.ok((await getZoomControlsColumnGap(cssUrl)) >= 14, `${cssUrl.pathname} uses at least 14px column gap`);
  }
});

test("menu action text matches setting label size", async () => {
  for (const cssUrl of OVERLAY_CSS_PATHS) {
    const typography = await getMenuTypography(cssUrl);
    assert.equal(typography.fill.size, typography.label.size, `${cssUrl.pathname} keeps Fill the same size as setting labels`);
    assert.equal(typography.reset.size, typography.label.size, `${cssUrl.pathname} keeps Reset the same size as setting labels`);
    assert.equal(typography.fill.lineHeight, typography.label.lineHeight, `${cssUrl.pathname} keeps Fill line height aligned with setting labels`);
    assert.equal(typography.reset.lineHeight, typography.label.lineHeight, `${cssUrl.pathname} keeps Reset line height aligned with setting labels`);
    assert.equal(typography.fill.weight, 500, `${cssUrl.pathname} keeps Fill visually actionable`);
    assert.equal(typography.reset.weight, 500, `${cssUrl.pathname} keeps Reset visually actionable`);
  }
});

test("menu rows share one left and right alignment system", async () => {
  for (const cssUrl of OVERLAY_CSS_PATHS) {
    const alignment = await getMenuInlineAlignment(cssUrl);
    assert.equal(alignment.fillLeft, alignment.resetRight, `${cssUrl.pathname} aligns Fill and Reset to the same inset`);
    assert.equal(alignment.fillLeft, alignment.panelInline, `${cssUrl.pathname} aligns zoom controls with menu actions`);
    assert.equal(alignment.fillLeft, alignment.rowContentInline, `${cssUrl.pathname} aligns setting row content with menu actions`);
    assert.ok(alignment.rowPaddingInline > 0, `${cssUrl.pathname} keeps inset for menu row hover backgrounds`);
  }
});

test("zoom panel keeps a compact gap below menu actions", async () => {
  for (const cssUrl of OVERLAY_CSS_PATHS) {
    assert.ok((await getMenuActionGap(cssUrl)) >= 10, `${cssUrl.pathname} keeps at least 10px between action top and zoom value start`);
  }
});

test("zoom value and slider read as one compact control group", async () => {
  for (const cssUrl of OVERLAY_CSS_PATHS) {
    const spacing = await getZoomPanelSpacing(cssUrl);
    assert.ok(spacing.panelTop >= 20, `${cssUrl.pathname} leaves room for top menu actions`);
    assert.ok(spacing.panelInline >= 12, `${cssUrl.pathname} keeps content aligned with menu actions`);
    assert.ok(spacing.panelBottom >= 6, `${cssUrl.pathname} separates zoom controls from rows below`);
    assert.ok(spacing.valueBottom <= 2, `${cssUrl.pathname} keeps the zoom value close to the slider`);
  }
});

test("review prompt is a compact non-blocking macOS-style card", async () => {
  for (const cssUrl of OVERLAY_CSS_PATHS) {
    const css = await readFile(cssUrl, "utf8");

    assert.match(css, /\.ytvt-review-card\s*\{[\s\S]*right: 16px;[\s\S]*bottom: 64px;/);
    assert.match(css, /width: min\(300px, calc\(100% - 32px\)\);/);
    assert.match(css, /padding: 16px;/);
    assert.match(css, /border-radius: 14px;/);
    assert.match(css, /\.ytvt-review-actions\s*\{[\s\S]*display: flex;/);
    assert.match(css, /\.ytvt-review-primary,[\s\S]*\.ytvt-review-secondary\s*\{[\s\S]*min-height: 36px;/);
    assert.match(css, /background: rgb\(0, 122, 255\);/);
    assert.match(css, /@media \(prefers-color-scheme: dark\)/);
    assert.match(css, /\.ytvt-review-primary:focus-visible/);
    assert.doesNotMatch(css, /\.ytvt-review-overlay/);
  }
});
