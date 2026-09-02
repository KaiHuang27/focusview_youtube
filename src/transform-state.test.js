import assert from "node:assert/strict";
import test from "node:test";

await import("./transform-state.js");

const {
  applyZoomDelta,
  applyWheelZoomDelta,
  clampPanStateToViewport,
  createDisplayedSourceSize,
  createCursorCenteredZoomState,
  createViewportCenteredZoomState,
  createFillScreenZoom,
  createViewportIndicator,
  createViewportIndicatorRect,
  createViewportOverlayLayout,
  createMinimapSize,
  createTransformMenuTop,
  createDefaultState,
  createImportantTransformCssText,
  formatZoomPercent,
  getZoomFromSliderKey,
  getZoomFromPointerPosition,
  parseZoomPercentInput,
  createTransformStyle,
  getRotationFitScale,
  getWheelZoomAnimationStep,
  isPointInsideRect,
  normalizeRotation,
  getViewportControlsActivityAfterPanToggle,
  shouldReapplyTransformAfterMutation,
  shouldInterceptPanWheel,
  shouldUseBlockingWheelListener,
  shouldResetForVideoKey,
  shouldStartPanDrag,
  shouldCancelYouTubeHoldGesture,
  shouldHandlePlayerWheel,
  shouldShowZoomTriggerActive,
  shouldShowZoomTriggerText,
  shouldShowTransientViewportControls,
  shouldSuppressClickAfterPanEnd,
  shouldBlockYouTubeShortcutForZoomInput,
  shouldRestoreYouTubeLongPressPlaybackRate,
  shouldRenderMenuOnToolbarEnsure,
  shouldRenderToolbarOnEnsure,
  shouldTogglePanShortcut,
  resetTransformState,
  toggleMirrorState,
} = globalThis.YTVTTransform;

test("createDefaultState returns reset video transform values", () => {
  assert.deepEqual(createDefaultState(), {
    zoom: 100,
    rotation: 0,
    flipX: false,
    panX: 0,
    panY: 0,
    panMode: false,
  });
});

test("resetTransformState clears every video transform control", () => {
  assert.deepEqual(
    resetTransformState({
      zoom: 250,
      rotation: 90,
      flipX: true,
      panX: 40,
      panY: -24,
      panMode: true,
    }),
    createDefaultState()
  );
});

test("createTransformStyle converts zoom percentage to scale", () => {
  assert.equal(
    createTransformStyle({ ...createDefaultState(), zoom: 150 }).transform,
    "translate(0px, 0px) rotate(0deg) scale(1.5, 1.5)"
  );
});

test("createTransformStyle combines pan, rotation, and horizontal mirror", () => {
  assert.equal(
    createTransformStyle({
      ...createDefaultState(),
      zoom: 200,
      rotation: 90,
      flipX: true,
      panX: 12,
      panY: -8,
    }).transform,
    "translate(12px, -8px) rotate(90deg) scale(-2, 2)"
  );
});

test("getRotationFitScale fits right-angle rotation inside the video frame", () => {
  assert.equal(getRotationFitScale(0, 1920, 1080), 1);
  assert.equal(getRotationFitScale(180, 1920, 1080), 1);
  assert.equal(getRotationFitScale(90, 1920, 1080), 0.5625);
  assert.equal(getRotationFitScale(270, 1080, 1920), 0.5625);
});

test("getRotationFitScale expands a portrait source after rotating into a landscape viewport", () => {
  assert.equal(getRotationFitScale(90, 1080, 1920, 1920, 1080), 1.7778);
  assert.equal(getRotationFitScale(270, 1080, 1920, 1920, 1080), 1.7778);
});

test("createTransformStyle applies rotation fit before user zoom", () => {
  assert.equal(
    createTransformStyle({ ...createDefaultState(), rotation: 90 }, 1920, 1080).transform,
    "translate(0px, 0px) rotate(90deg) scale(0.5625, 0.5625)"
  );
});

test("createTransformStyle expands a portrait source after sideways rotation", () => {
  assert.equal(
    createTransformStyle({ ...createDefaultState(), rotation: 90 }, 1080, 1920, 1920, 1080).transform,
    "translate(0px, 0px) rotate(90deg) scale(1.7778, 1.7778)"
  );
});

test("createImportantTransformCssText makes transform override YouTube inline rewrites", () => {
  assert.equal(
    createImportantTransformCssText({ ...createDefaultState(), zoom: 150 }, 1280, 720),
    "transform: translate(0px, 0px) rotate(0deg) scale(1.5, 1.5) !important; transform-origin: center center !important;"
  );
});

test("normalizeRotation only accepts right-angle rotations", () => {
  assert.equal(normalizeRotation(0), 0);
  assert.equal(normalizeRotation(90), 90);
  assert.equal(normalizeRotation(180), 180);
  assert.equal(normalizeRotation(270), 270);
  assert.throws(() => normalizeRotation(45), /Unsupported rotation/);
});

test("applyZoomDelta changes zoom and clamps it to the supported range", () => {
  assert.equal(applyZoomDelta(100, 1), 105);
  assert.equal(applyZoomDelta(100, -1), 100);
  assert.equal(applyZoomDelta(496, 1), 500);
  assert.equal(applyZoomDelta(104, -1), 100);
});

test("applyWheelZoomDelta scales zoom from wheel pixel delta", () => {
  assert.equal(applyWheelZoomDelta(100, { deltaY: -10, deltaMode: 0 }), 100.803);
  assert.equal(applyWheelZoomDelta(100, { deltaY: 10, deltaMode: 0 }), 100);
  assert.equal(applyWheelZoomDelta(200, { deltaY: 10, deltaMode: 0 }), 198.406);
});

test("applyWheelZoomDelta preserves fractional trackpad input", () => {
  assert.equal(applyWheelZoomDelta(150, { deltaY: -1, deltaMode: 0 }), 150.12);
  assert.equal(applyWheelZoomDelta(150, { deltaY: 1, deltaMode: 0 }), 149.88);
  assert.equal(applyWheelZoomDelta(100, { deltaY: 1, deltaMode: 0 }), 100);
  assert.equal(applyWheelZoomDelta(500, { deltaY: -1, deltaMode: 0 }), 500);
});

test("applyWheelZoomDelta makes larger wheel deltas zoom faster", () => {
  assert.equal(applyWheelZoomDelta(100, { deltaY: -40, deltaMode: 0 }), 103.252);
  assert.equal(applyWheelZoomDelta(100, { deltaY: -80, deltaMode: 0 }), 106.609);
  assert.equal(applyWheelZoomDelta(100, { deltaY: -120, deltaMode: 0 }), 109.199);
});

test("applyWheelZoomDelta normalizes delta modes and clamps extreme events", () => {
  assert.equal(applyWheelZoomDelta(100, { deltaY: -3, deltaMode: 1 }), 103.915);
  assert.equal(applyWheelZoomDelta(100, { deltaY: -1, deltaMode: 2 }), 109.199);
  assert.equal(applyWheelZoomDelta(490, { deltaY: -1000, deltaMode: 0 }), 500);
  assert.equal(applyWheelZoomDelta(101, { deltaY: 1000, deltaMode: 0 }), 100);
});

test("rapid wheel deltas accumulate without discarding unfinished input", () => {
  let targetZoom = 100;
  for (let index = 0; index < 4; index += 1) {
    targetZoom = applyWheelZoomDelta(targetZoom, { deltaY: -25, deltaMode: 0 });
  }
  assert.ok(targetZoom > 108.3 && targetZoom < 108.4);

  targetZoom = applyWheelZoomDelta(targetZoom, { deltaY: 25, deltaMode: 0 });
  targetZoom = applyWheelZoomDelta(targetZoom, { deltaY: 25, deltaMode: 0 });
  assert.ok(targetZoom > 104 && targetZoom < 104.1);
});

test("getWheelZoomAnimationStep is consistent across display refresh rates", () => {
  const oneFrameAt60Hz = getWheelZoomAnimationStep(150, 180, 1000 / 60);
  const firstFrameAt120Hz = getWheelZoomAnimationStep(150, 180, 1000 / 120);
  const twoFramesAt120Hz = getWheelZoomAnimationStep(firstFrameAt120Hz, 180, 1000 / 120);
  assert.ok(Math.abs(oneFrameAt60Hz - twoFramesAt120Hz) < 1e-10);
  assert.ok(oneFrameAt60Hz > 150 && oneFrameAt60Hz < 180);
  assert.ok(getWheelZoomAnimationStep(160, 150, 1000 / 60) < 160);
  assert.equal(getWheelZoomAnimationStep(150, 150.4), 150.4);
  assert.equal(getWheelZoomAnimationStep(150, 150), 150);
});

test("wheel zoom settles a full-range gesture within 100 milliseconds at 60 Hz", () => {
  let zoom = 100;
  for (let frame = 0; frame < 6; frame += 1) {
    zoom = getWheelZoomAnimationStep(zoom, 500, 1000 / 60);
  }
  assert.equal(zoom, 500);
});

test("createViewportCenteredZoomState preserves the viewport-center content while zooming", () => {
  assert.deepEqual(
    createViewportCenteredZoomState({ ...createDefaultState(), zoom: 200, panX: 160, panY: -90 }, 300),
    { ...createDefaultState(), zoom: 300, panX: 240, panY: -135 }
  );
});

test("createViewportCenteredZoomState recenters when returning to 100 percent", () => {
  assert.deepEqual(
    createViewportCenteredZoomState({ ...createDefaultState(), zoom: 200, panX: 160, panY: -90 }, 100),
    createDefaultState()
  );
});

test("createViewportCenteredZoomState preserves the viewport-center content while zooming out", () => {
  assert.deepEqual(
    createViewportCenteredZoomState({ ...createDefaultState(), zoom: 300, panX: 240, panY: -135 }, 200),
    { ...createDefaultState(), zoom: 200, panX: 160, panY: -90 }
  );
});

test("createFillScreenZoom keeps matched aspect ratio at 100 percent", () => {
  assert.equal(createFillScreenZoom(1920, 1080, 1280, 720), 100);
});

test("createFillScreenZoom expands letterboxed video until it covers the viewport", () => {
  assert.equal(createFillScreenZoom(1920, 1080, 1024, 768), 134);
});

test("createFillScreenZoom expands pillarboxed video until it covers the viewport", () => {
  assert.equal(createFillScreenZoom(1080, 1920, 1920, 1080), 317);
});

test("createFillScreenZoom clamps extreme aspect ratios to the supported zoom range", () => {
  assert.equal(createFillScreenZoom(100, 2000, 1920, 1080), 500);
});

test("createFillScreenZoom uses rotated source dimensions", () => {
  assert.equal(createFillScreenZoom(1920, 1080, 1920, 1080, 90), 317);
});

test("createCursorCenteredZoomState matches viewport-centered zoom at the viewport center", () => {
  assert.deepEqual(
    createCursorCenteredZoomState({ ...createDefaultState(), zoom: 200, panX: 160, panY: -90 }, 300, 0, 0),
    createViewportCenteredZoomState({ ...createDefaultState(), zoom: 200, panX: 160, panY: -90 }, 300)
  );
});

test("createCursorCenteredZoomState preserves the cursor content while zooming in", () => {
  assert.deepEqual(
    createCursorCenteredZoomState({ ...createDefaultState(), zoom: 200, panX: 160, panY: -90 }, 300, 200, 120),
    { ...createDefaultState(), zoom: 300, panX: 140, panY: -195 }
  );
});

test("createCursorCenteredZoomState recenters when returning to 100 percent", () => {
  assert.deepEqual(
    createCursorCenteredZoomState({ ...createDefaultState(), zoom: 200, panX: 160, panY: -90 }, 100, 200, 120),
    createDefaultState()
  );
});

test("formatZoomPercent displays zoom as a percentage", () => {
  assert.equal(formatZoomPercent(100), "100%");
  assert.equal(formatZoomPercent(150), "150%");
  assert.equal(formatZoomPercent(145.208), "145%");
});

test("parseZoomPercentInput accepts numeric percent input and clamps it", () => {
  assert.equal(parseZoomPercentInput("150", 100), 150);
  assert.equal(parseZoomPercentInput("175%", 100), 175);
  assert.equal(parseZoomPercentInput("50", 180), 100);
  assert.equal(parseZoomPercentInput("600", 180), 500);
  assert.equal(parseZoomPercentInput("", 180), 180);
  assert.equal(parseZoomPercentInput("abc", 180), 180);
});

test("shouldBlockYouTubeShortcutForZoomInput blocks shortcuts only while zoom input is active", () => {
  const zoomInput = { classList: { contains: (name) => name === "ytvt-zoom-value" } };
  const otherInput = { classList: { contains: () => false } };

  assert.equal(shouldBlockYouTubeShortcutForZoomInput({ target: zoomInput, activeElement: zoomInput }), true);
  assert.equal(shouldBlockYouTubeShortcutForZoomInput({ target: zoomInput, activeElement: otherInput }), false);
  assert.equal(shouldBlockYouTubeShortcutForZoomInput({ target: otherInput, activeElement: zoomInput }), false);
});

test("shouldRenderToolbarOnEnsure renders only when toolbar is newly created", () => {
  assert.equal(shouldRenderToolbarOnEnsure({ hasExistingToolbar: false }), true);
  assert.equal(shouldRenderToolbarOnEnsure({ hasExistingToolbar: true }), false);
});

test("shouldRenderMenuOnToolbarEnsure preserves an existing menu during toolbar remount", () => {
  assert.equal(shouldRenderMenuOnToolbarEnsure({ hasExistingMenu: false }), true);
  assert.equal(shouldRenderMenuOnToolbarEnsure({ hasExistingMenu: true }), false);
});

test("getZoomFromPointerPosition maps pointer x into the supported zoom range", () => {
  assert.equal(getZoomFromPointerPosition({ left: 100, width: 200 }, 50), 100);
  assert.equal(getZoomFromPointerPosition({ left: 100, width: 200 }, 100), 100);
  assert.equal(getZoomFromPointerPosition({ left: 100, width: 200 }, 200), 300);
  assert.equal(getZoomFromPointerPosition({ left: 100, width: 200 }, 300), 500);
  assert.equal(getZoomFromPointerPosition({ left: 100, width: 200 }, 350), 500);
});

test("getZoomFromPointerPosition keeps current zoom for invalid slider geometry", () => {
  assert.equal(getZoomFromPointerPosition({ left: 100, width: 0 }, 200, 175), 175);
});

test("getZoomFromSliderKey maps supported keys to clamped zoom values", () => {
  assert.equal(getZoomFromSliderKey("ArrowLeft", 150), 145);
  assert.equal(getZoomFromSliderKey("ArrowDown", 150), 145);
  assert.equal(getZoomFromSliderKey("ArrowRight", 150), 155);
  assert.equal(getZoomFromSliderKey("ArrowUp", 150), 155);
  assert.equal(getZoomFromSliderKey("ArrowLeft", 100), 100);
  assert.equal(getZoomFromSliderKey("ArrowRight", 500), 500);
  assert.equal(getZoomFromSliderKey("Home", 250), 100);
  assert.equal(getZoomFromSliderKey("End", 250), 500);
});

test("getZoomFromSliderKey ignores unrelated keys", () => {
  assert.equal(getZoomFromSliderKey("Enter", 150), null);
});

test("shouldResetForVideoKey resets only when an existing video key changes", () => {
  assert.equal(shouldResetForVideoKey("", "abc123"), false);
  assert.equal(shouldResetForVideoKey("abc123", "abc123"), false);
  assert.equal(shouldResetForVideoKey("abc123", "def456"), true);
});

test("createViewportIndicator returns full minimap when video is not zoomed in", () => {
  assert.deepEqual(createViewportIndicator(createDefaultState(), 1280, 720), {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
});

test("createViewportIndicator maps zoom and pan into normalized source-video coordinates", () => {
  assert.deepEqual(
    createViewportIndicator({ ...createDefaultState(), zoom: 200, panX: 160, panY: -90 }, 1280, 720),
    {
      x: 0.1875,
      y: 0.3125,
      width: 0.5,
      height: 0.5,
    }
  );
});

test("createMinimapSize follows source video ratio within min and max bounds", () => {
  assert.deepEqual(createMinimapSize(1920, 1080), { width: 160, height: 90 });
  assert.deepEqual(createMinimapSize(1920, 1200), { width: 154, height: 96 });
  assert.deepEqual(createMinimapSize(2560, 1080), { width: 160, height: 68 });
  assert.deepEqual(createMinimapSize(1080, 1920), { width: 54, height: 96 });
  assert.deepEqual(createMinimapSize(100, 1000), { width: 44, height: 96 });
  assert.deepEqual(createMinimapSize(0, 0), { width: 160, height: 90 });
});

test("createDisplayedSourceSize swaps source dimensions for sideways rotation", () => {
  assert.deepEqual(createDisplayedSourceSize(1920, 1080, 0), { width: 1920, height: 1080 });
  assert.deepEqual(createDisplayedSourceSize(1920, 1080, 90), { width: 1080, height: 1920 });
  assert.deepEqual(createDisplayedSourceSize(1920, 1080, 180), { width: 1920, height: 1080 });
  assert.deepEqual(createDisplayedSourceSize(1920, 1080, 270), { width: 1080, height: 1920 });
});

test("createMinimapSize follows the rotated source-video ratio", () => {
  assert.deepEqual(createMinimapSize(1920, 1080, 0), { width: 160, height: 90 });
  assert.deepEqual(createMinimapSize(1920, 1080, 90), { width: 54, height: 96 });
  assert.deepEqual(createMinimapSize(1920, 1080, 180), { width: 160, height: 90 });
  assert.deepEqual(createMinimapSize(1920, 1080, 270), { width: 54, height: 96 });
});

test("createMinimapSize fits the source video inside the player viewport preview", () => {
  assert.deepEqual(createMinimapSize(1920, 1080, 0, 1920, 1080), { width: 160, height: 90 });
  assert.deepEqual(createMinimapSize(1920, 1080, 90, 1920, 1080), { width: 51, height: 90 });
  assert.deepEqual(createMinimapSize(1920, 1080, 0, 2560, 1080), { width: 121, height: 68 });
});

test("createViewportIndicator can exceed the minimap for wider or taller player viewports", () => {
  assert.deepEqual(
    createViewportIndicator(createDefaultState(), 1920, 1080, 1920, 1080),
    { x: 0, y: 0, width: 1, height: 1 }
  );
  assert.deepEqual(
    createViewportIndicator(createDefaultState(), 1920, 1080, 2560, 1080),
    { x: -0.1667, y: 0, width: 1.3333, height: 1 }
  );
  assert.deepEqual(
    createViewportIndicator(createDefaultState(), 1920, 1080, 1080, 1920),
    { x: 0, y: -1.0802, width: 1, height: 3.1605 }
  );
  assert.deepEqual(
    createViewportIndicator(createDefaultState(), 1080, 1920, 1920, 1080),
    { x: -1.0802, y: 0, width: 3.1605, height: 1 }
  );
});

test("createViewportIndicator uses rotated source geometry", () => {
  assert.deepEqual(
    createViewportIndicator({ ...createDefaultState(), rotation: 90 }, 1920, 1080, 1920, 1080),
    { x: -1.0686, y: 0, width: 3.1373, height: 1 }
  );
});

test("createViewportIndicatorRect keeps the viewport preview size stable across rotation", () => {
  const unrotatedMinimapSize = createMinimapSize(1920, 1080, 0, 1920, 1080);
  const rotatedMinimapSize = createMinimapSize(1920, 1080, 90, 1920, 1080);
  const viewportPreviewSize = createMinimapSize(1920, 1080);
  const unrotatedIndicator = createViewportIndicator(createDefaultState(), 1920, 1080, 1920, 1080);
  const rotatedIndicator = createViewportIndicator({ ...createDefaultState(), rotation: 90 }, 1920, 1080, 1920, 1080);

  assert.deepEqual(createViewportIndicatorRect(unrotatedIndicator, unrotatedMinimapSize, viewportPreviewSize), {
    left: 0,
    top: 0,
    width: 160,
    height: 90,
  });
  assert.deepEqual(createViewportIndicatorRect(rotatedIndicator, rotatedMinimapSize, viewportPreviewSize), {
    left: -54,
    top: 0,
    width: 160,
    height: 90,
  });
});

test("createViewportIndicatorRect keeps a portrait player viewport stable across rotation", () => {
  const unrotatedMinimapSize = createMinimapSize(1920, 1080, 0, 1080, 1920);
  const rotatedMinimapSize = createMinimapSize(1920, 1080, 90, 1080, 1920);
  const viewportPreviewSize = createMinimapSize(1080, 1920);
  const unrotatedIndicator = createViewportIndicator(createDefaultState(), 1920, 1080, 1080, 1920);
  const rotatedIndicator = createViewportIndicator({ ...createDefaultState(), rotation: 90 }, 1920, 1080, 1080, 1920);

  assert.deepEqual(createViewportIndicatorRect(unrotatedIndicator, unrotatedMinimapSize, viewportPreviewSize), {
    left: 0,
    top: -26,
    width: 54,
    height: 96,
  });
  assert.deepEqual(createViewportIndicatorRect(rotatedIndicator, rotatedMinimapSize, viewportPreviewSize), {
    left: 0,
    top: 0,
    width: 54,
    height: 96,
  });
});

test("createViewportIndicator scales with zoom and keeps out-of-minimap areas visible", () => {
  assert.deepEqual(
    createViewportIndicator({ ...createDefaultState(), zoom: 200 }, 1080, 1920, 1920, 1080),
    { x: -0.2901, y: 0.25, width: 1.5802, height: 0.5 }
  );
});

test("createViewportIndicator pan is not clamped back into the minimap", () => {
  assert.deepEqual(
    createViewportIndicator({ ...createDefaultState(), zoom: 200, panX: 540, panY: -270 }, 1920, 1080),
    { x: 0.1094, y: 0.375, width: 0.5, height: 0.5 }
  );
});

test("createViewportIndicator falls back to full minimap for invalid dimensions", () => {
  assert.deepEqual(createViewportIndicator({ ...createDefaultState(), zoom: 200 }, 0, 0, 1920, 1080), {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
  assert.deepEqual(createViewportIndicator({ ...createDefaultState(), zoom: 200 }, 1920, 1080, 0, 0), {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
});

test("createViewportOverlayLayout keeps a wider viewport indicator inside the right edge", () => {
  assert.deepEqual(
    createViewportOverlayLayout({
      minimapSize: { width: 160, height: 90 },
      indicator: { x: -0.1667, y: 0, width: 1.3333, height: 1 },
    }),
    { minimapTop: 50, minimapRight: 49, settingsTop: 148, settingsRight: 113 }
  );
});

test("createViewportOverlayLayout keeps a taller viewport indicator inside the top edge", () => {
  assert.deepEqual(
    createViewportOverlayLayout({
      minimapSize: { width: 160, height: 90 },
      indicator: { x: 0, y: -1.0802, width: 1, height: 3.1605 },
    }),
    { minimapTop: 148, minimapRight: 22, settingsTop: 344, settingsRight: 86 }
  );
});

test("createViewportOverlayLayout can anchor position while the viewport indicator zooms", () => {
  const anchorIndicator = createViewportIndicator(createDefaultState(), 1080, 1920, 1920, 1080);
  const zoomedIndicator = createViewportIndicator({ ...createDefaultState(), zoom: 200 }, 1080, 1920, 1920, 1080);

  assert.deepEqual(
    createViewportOverlayLayout({
      minimapSize: { width: 54, height: 96 },
      indicator: zoomedIndicator,
      anchorIndicator,
    }),
    { minimapTop: 50, minimapRight: 81, settingsTop: 154, settingsRight: 92 }
  );
});

test("createViewportOverlayLayout keeps the settings gap stable for rotated source geometry", () => {
  const anchorIndicator = createViewportIndicator(
    { ...createDefaultState(), rotation: 90 },
    1920,
    1080,
    1920,
    1080
  );
  const zoomedIndicator = createViewportIndicator(
    { ...createDefaultState(), rotation: 90, zoom: 200 },
    1920,
    1080,
    1920,
    1080
  );

  assert.deepEqual(
    createViewportOverlayLayout({
      minimapSize: createMinimapSize(1920, 1080, 90, 1920, 1080),
      indicator: zoomedIndicator,
      anchorIndicator,
    }),
    { minimapTop: 50, minimapRight: 77, settingsTop: 148, settingsRight: 86 }
  );
});

test("createViewportOverlayLayout anchors the viewport rect across rotation", () => {
  const unrotatedMinimapSize = createMinimapSize(1920, 1080, 0, 1080, 1920);
  const rotatedMinimapSize = createMinimapSize(1920, 1080, 90, 1080, 1920);
  const viewportPreviewSize = createMinimapSize(1080, 1920);
  const unrotatedIndicator = createViewportIndicator(createDefaultState(), 1920, 1080, 1080, 1920);
  const rotatedIndicator = createViewportIndicator({ ...createDefaultState(), rotation: 90 }, 1920, 1080, 1080, 1920);
  const unrotatedRect = createViewportIndicatorRect(unrotatedIndicator, unrotatedMinimapSize, viewportPreviewSize);
  const rotatedRect = createViewportIndicatorRect(rotatedIndicator, rotatedMinimapSize, viewportPreviewSize);

  assert.deepEqual(
    createViewportOverlayLayout({
      minimapSize: unrotatedMinimapSize,
      indicator: unrotatedIndicator,
      anchorIndicator: unrotatedIndicator,
      indicatorRect: unrotatedRect,
      anchorIndicatorRect: unrotatedRect,
    }),
    { minimapTop: 76, minimapRight: 22, settingsTop: 154, settingsRight: 33 }
  );
  assert.deepEqual(
    createViewportOverlayLayout({
      minimapSize: rotatedMinimapSize,
      indicator: rotatedIndicator,
      anchorIndicator: rotatedIndicator,
      indicatorRect: rotatedRect,
      anchorIndicatorRect: rotatedRect,
    }),
    { minimapTop: 50, minimapRight: 22, settingsTop: 154, settingsRight: 33 }
  );
});

test("createTransformMenuTop positions the menu eight pixels below the settings button", () => {
  assert.equal(createTransformMenuTop({ settingsTop: 148, settingsButtonHeight: 32 }), 188);
});

test("clampPanStateToViewport blocks horizontal pan while vertical source video still has side bars", () => {
  assert.deepEqual(
    clampPanStateToViewport(
      { ...createDefaultState(), zoom: 200, panX: 500, panY: 800 },
      1080,
      1920,
      1920,
      1080
    ),
    { ...createDefaultState(), zoom: 200, panX: 0, panY: 540 }
  );
});

test("clampPanStateToViewport blocks pan into black borders after sideways rotation", () => {
  assert.deepEqual(
    clampPanStateToViewport(
      { ...createDefaultState(), rotation: 90, zoom: 200, panX: 500, panY: 500 },
      1920,
      1080,
      1920,
      1080
    ),
    { ...createDefaultState(), rotation: 90, zoom: 200, panX: 0, panY: 500 }
  );
});

test("clampPanStateToViewport allows horizontal pan after vertical source video fills the player width", () => {
  assert.deepEqual(
    clampPanStateToViewport(
      { ...createDefaultState(), zoom: 400, panX: 500, panY: 2000 },
      1080,
      1920,
      1920,
      1080
    ),
    { ...createDefaultState(), zoom: 400, panX: 255, panY: 1620 }
  );
});

test("clampPanStateToViewport blocks horizontal pan until a wide player is filled", () => {
  assert.deepEqual(
    clampPanStateToViewport(
      { ...createDefaultState(), zoom: 125, panX: 300, panY: 300 },
      1920,
      1080,
      2560,
      1080
    ),
    { ...createDefaultState(), zoom: 125, panX: 0, panY: 135 }
  );
  assert.deepEqual(
    clampPanStateToViewport(
      { ...createDefaultState(), zoom: 150, panX: 300, panY: 300 },
      1920,
      1080,
      2560,
      1080
    ),
    { ...createDefaultState(), zoom: 150, panX: 160, panY: 270 }
  );
});

test("clampPanStateToViewport blocks vertical pan until a tall player is filled", () => {
  assert.deepEqual(
    clampPanStateToViewport(
      { ...createDefaultState(), zoom: 200, panX: 900, panY: 500 },
      1920,
      1080,
      1080,
      1920
    ),
    { ...createDefaultState(), zoom: 200, panX: 540, panY: 0 }
  );
});

test("clampPanStateToViewport matches same-aspect pan bounds", () => {
  assert.deepEqual(
    clampPanStateToViewport(
      { ...createDefaultState(), zoom: 200, panX: 900, panY: -500 },
      1280,
      720,
      1280,
      720
    ),
    { ...createDefaultState(), zoom: 200, panX: 640, panY: -360 }
  );
});

test("clampPanStateToViewport centers pan for invalid viewport geometry", () => {
  assert.deepEqual(
    clampPanStateToViewport({ ...createDefaultState(), zoom: 200, panX: 500, panY: 500 }, 0, 0, 1920, 1080),
    { ...createDefaultState(), zoom: 200, panX: 0, panY: 0 }
  );
});

test("createViewportIndicator reflects viewport-aware clamped pan", () => {
  const clamped = clampPanStateToViewport(
    { ...createDefaultState(), zoom: 200, panX: 500, panY: 800 },
    1080,
    1920,
    1920,
    1080
  );

  assert.deepEqual(createViewportIndicator(clamped, 1080, 1920, 1920, 1080), {
    x: -0.2901,
    y: 0,
    width: 1.5802,
    height: 0.5,
  });
});

test("createViewportIndicator preserves extreme pan instead of clamping to minimap bounds", () => {
  assert.deepEqual(
    createViewportIndicator({ ...createDefaultState(), zoom: 200, panX: 5000, panY: -5000 }, 1280, 720),
    { x: -1.7031, y: 3.7222, width: 0.5, height: 0.5 }
  );
});

test("shouldInterceptPanWheel intercepts wheel events only in Pan mode", () => {
  assert.equal(shouldInterceptPanWheel(createDefaultState()), false);
  assert.equal(shouldInterceptPanWheel({ ...createDefaultState(), panMode: true }), true);
});

test("shouldUseBlockingWheelListener only blocks wheel while Pan mode is active", () => {
  assert.equal(shouldUseBlockingWheelListener(createDefaultState()), false);
  assert.equal(shouldUseBlockingWheelListener({ ...createDefaultState(), panMode: true }), true);
});

test("isPointInsideRect validates cached pointer coordinates independently of zoom mode", () => {
  const rect = { left: 10, top: 20, right: 210, bottom: 120, width: 200, height: 100 };

  assert.equal(isPointInsideRect(100, 80, rect), true);
  assert.equal(isPointInsideRect(9, 80, rect), false);
  assert.equal(isPointInsideRect(Number.NaN, 80, rect), false);
  assert.equal(isPointInsideRect(100, 80, null), false);
});

test("shouldHandlePlayerWheel accepts only active pan-mode wheel points inside the player", () => {
  const rect = { left: 10, top: 20, right: 210, bottom: 120, width: 200, height: 100 };

  assert.equal(shouldHandlePlayerWheel(createDefaultState(), 100, 80, rect), false);
  assert.equal(shouldHandlePlayerWheel({ ...createDefaultState(), panMode: true }, 100, 80, rect), true);
  assert.equal(shouldHandlePlayerWheel({ ...createDefaultState(), panMode: true }, 9, 80, rect), false);
  assert.equal(shouldHandlePlayerWheel({ ...createDefaultState(), panMode: true }, 100, 121, rect), false);
  assert.equal(shouldHandlePlayerWheel({ ...createDefaultState(), panMode: true }, Number.NaN, 80, rect), false);
  assert.equal(shouldHandlePlayerWheel({ ...createDefaultState(), panMode: true }, 100, 80, null), false);
});

test("shouldShowTransientViewportControls keeps controls visible during activity delay", () => {
  assert.equal(
    shouldShowTransientViewportControls({ isPanMode: false, isDragging: true, lastActivityAt: 4999, now: 5000, delayMs: 3000 }),
    false
  );
  assert.equal(
    shouldShowTransientViewportControls({ isPanMode: true, isMenuOpen: true, isDragging: false, lastActivityAt: 0, now: 5000, delayMs: 3000 }),
    true
  );
  assert.equal(
    shouldShowTransientViewportControls({ isPanMode: true, isDragging: true, lastActivityAt: 0, now: 5000, delayMs: 3000 }),
    true
  );
  assert.equal(
    shouldShowTransientViewportControls({ isPanMode: true, isDragging: false, lastActivityAt: 2000, now: 4999, delayMs: 3000 }),
    true
  );
  assert.equal(
    shouldShowTransientViewportControls({ isPanMode: true, isDragging: false, lastActivityAt: 2000, now: 5000, delayMs: 3000 }),
    false
  );
  assert.equal(
    shouldShowTransientViewportControls({ isPanMode: true, isDragging: false, lastActivityAt: 0, now: 1000, delayMs: 3000 }),
    false
  );
});

test("getViewportControlsActivityAfterPanToggle starts activity only when Pan turns on", () => {
  assert.equal(getViewportControlsActivityAfterPanToggle({ isPanMode: true, now: 5000 }), 5000);
  assert.equal(getViewportControlsActivityAfterPanToggle({ isPanMode: false, now: 5000 }), 0);
});

test("shouldStartPanDrag starts only after long press or intentional movement", () => {
  assert.equal(shouldStartPanDrag({ elapsedMs: 80, distancePx: 2, longPressMs: 220, moveThresholdPx: 6 }), false);
  assert.equal(shouldStartPanDrag({ elapsedMs: 220, distancePx: 0, longPressMs: 220, moveThresholdPx: 6 }), true);
  assert.equal(shouldStartPanDrag({ elapsedMs: 80, distancePx: 6, longPressMs: 220, moveThresholdPx: 6 }), true);
});

test("shouldCancelYouTubeHoldGesture cancels native press only once after pan starts", () => {
  assert.equal(shouldCancelYouTubeHoldGesture({ isDragging: true, nativePressCanceled: false }), true);
  assert.equal(shouldCancelYouTubeHoldGesture({ isDragging: false, nativePressCanceled: false }), false);
  assert.equal(shouldCancelYouTubeHoldGesture({ isDragging: true, nativePressCanceled: true }), false);
});

test("shouldRestoreYouTubeLongPressPlaybackRate restores only drag-time hold speed changes", () => {
  assert.equal(
    shouldRestoreYouTubeLongPressPlaybackRate({ isDragging: true, currentRate: 2, panStartRate: 1 }),
    true
  );
  assert.equal(
    shouldRestoreYouTubeLongPressPlaybackRate({ isDragging: false, currentRate: 2, panStartRate: 1 }),
    false
  );
  assert.equal(
    shouldRestoreYouTubeLongPressPlaybackRate({ isDragging: true, currentRate: 1, panStartRate: 1 }),
    false
  );
  assert.equal(
    shouldRestoreYouTubeLongPressPlaybackRate({ isDragging: true, currentRate: 2, panStartRate: Number.NaN }),
    false
  );
});

test("shouldShowZoomTriggerText shows text only when Pan is on or zoom changed", () => {
  assert.equal(shouldShowZoomTriggerText({ ...createDefaultState(), zoom: 100, panMode: false }), false);
  assert.equal(shouldShowZoomTriggerText({ ...createDefaultState(), zoom: 100, panMode: true }), true);
  assert.equal(shouldShowZoomTriggerText({ ...createDefaultState(), zoom: 125, panMode: false }), true);
});

test("shouldShowZoomTriggerActive shows active state only while Pan is on", () => {
  assert.equal(shouldShowZoomTriggerActive({ ...createDefaultState(), zoom: 100, panMode: false }), false);
  assert.equal(shouldShowZoomTriggerActive({ ...createDefaultState(), zoom: 180, panMode: false }), false);
  assert.equal(shouldShowZoomTriggerActive({ ...createDefaultState(), zoom: 100, panMode: true }), true);
});

test("shouldSuppressClickAfterPanEnd suppresses only completed drag gestures", () => {
  assert.equal(shouldSuppressClickAfterPanEnd({ wasDragging: false }), false);
  assert.equal(shouldSuppressClickAfterPanEnd({ wasDragging: true }), true);
});

test("toggleMirrorState toggles horizontal mirror only", () => {
  assert.deepEqual(toggleMirrorState(createDefaultState()), { ...createDefaultState(), flipX: true });
  assert.deepEqual(toggleMirrorState({ ...createDefaultState(), flipX: true }), createDefaultState());
});

test("shouldTogglePanShortcut accepts only Alt Shift Z outside editable targets", () => {
  assert.equal(shouldTogglePanShortcut({ code: "KeyZ", altKey: true, shiftKey: true }), true);
  assert.equal(shouldTogglePanShortcut({ key: "z", altKey: true, shiftKey: true }), true);
  assert.equal(shouldTogglePanShortcut({ code: "KeyP", altKey: true, shiftKey: true }), false);
  assert.equal(shouldTogglePanShortcut({ code: "KeyZ", altKey: true, shiftKey: true, ctrlKey: true }), false);
  assert.equal(shouldTogglePanShortcut({ code: "KeyZ", altKey: true, shiftKey: true, metaKey: true }), false);
  assert.equal(shouldTogglePanShortcut({ code: "KeyZ", altKey: true, shiftKey: true, repeat: true }), false);
  assert.equal(shouldTogglePanShortcut({ code: "KeyZ", shiftKey: true }), false);
  assert.equal(shouldTogglePanShortcut({ code: "KeyZ", altKey: true }), false);
  assert.equal(
    shouldTogglePanShortcut({ code: "KeyZ", altKey: true, shiftKey: true, target: { tagName: "INPUT" } }),
    false
  );
  assert.equal(
    shouldTogglePanShortcut({ code: "KeyZ", altKey: true, shiftKey: true, target: { isContentEditable: true } }),
    false
  );
  assert.equal(
    shouldTogglePanShortcut({
      code: "KeyZ",
      altKey: true,
      shiftKey: true,
      target: { getAttribute: (name) => (name === "role" ? "textbox" : "") },
    }),
    false
  );
});

test("shouldReapplyTransformAfterMutation detects active transform state", () => {
  assert.equal(shouldReapplyTransformAfterMutation(createDefaultState()), false);
  assert.equal(shouldReapplyTransformAfterMutation({ ...createDefaultState(), zoom: 105 }), true);
  assert.equal(shouldReapplyTransformAfterMutation({ ...createDefaultState(), rotation: 90 }), true);
  assert.equal(shouldReapplyTransformAfterMutation({ ...createDefaultState(), flipX: true }), true);
  assert.equal(shouldReapplyTransformAfterMutation({ ...createDefaultState(), panX: 1 }), true);
});
