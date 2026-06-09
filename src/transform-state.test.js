import assert from "node:assert/strict";
import test from "node:test";

await import("./transform-state.js");

const {
  applyZoomDelta,
  clampPanStateToViewport,
  createDisplayedSourceSize,
  createViewportCenteredZoomState,
  createViewportIndicator,
  createViewportOverlayLayout,
  createViewportMapSize,
  createTransformMenuTop,
  createDefaultState,
  createImportantTransformCssText,
  formatZoomPercent,
  getZoomFromSliderKey,
  getZoomFromPointerPosition,
  parseZoomPercentInput,
  createTransformStyle,
  getRotationFitScale,
  normalizeRotation,
  getViewportControlsActivityAfterPanToggle,
  shouldReapplyTransformAfterMutation,
  shouldInterceptPanWheel,
  shouldResetForVideoKey,
  shouldStartPanDrag,
  shouldShowZoomTriggerActive,
  shouldShowZoomTriggerText,
  shouldShowTransientViewportControls,
  shouldSuppressClickAfterPanEnd,
  shouldBlockYouTubeShortcutForZoomInput,
  shouldRenderMenuOnToolbarEnsure,
  shouldRenderToolbarOnEnsure,
  shouldTogglePanShortcut,
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

test("formatZoomPercent displays zoom as a percentage", () => {
  assert.equal(formatZoomPercent(100), "100%");
  assert.equal(formatZoomPercent(150), "150%");
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

test("createViewportIndicator returns full source map when video is not zoomed in", () => {
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

test("createViewportMapSize follows source video ratio within min and max bounds", () => {
  assert.deepEqual(createViewportMapSize(1920, 1080), { width: 160, height: 90 });
  assert.deepEqual(createViewportMapSize(1920, 1200), { width: 154, height: 96 });
  assert.deepEqual(createViewportMapSize(2560, 1080), { width: 160, height: 68 });
  assert.deepEqual(createViewportMapSize(1080, 1920), { width: 54, height: 96 });
  assert.deepEqual(createViewportMapSize(100, 1000), { width: 44, height: 96 });
  assert.deepEqual(createViewportMapSize(0, 0), { width: 160, height: 90 });
});

test("createDisplayedSourceSize swaps source dimensions for sideways rotation", () => {
  assert.deepEqual(createDisplayedSourceSize(1920, 1080, 0), { width: 1920, height: 1080 });
  assert.deepEqual(createDisplayedSourceSize(1920, 1080, 90), { width: 1080, height: 1920 });
  assert.deepEqual(createDisplayedSourceSize(1920, 1080, 180), { width: 1920, height: 1080 });
  assert.deepEqual(createDisplayedSourceSize(1920, 1080, 270), { width: 1080, height: 1920 });
});

test("createViewportMapSize follows the rotated source-video ratio", () => {
  assert.deepEqual(createViewportMapSize(1920, 1080, 0), { width: 160, height: 90 });
  assert.deepEqual(createViewportMapSize(1920, 1080, 90), { width: 54, height: 96 });
  assert.deepEqual(createViewportMapSize(1920, 1080, 180), { width: 160, height: 90 });
  assert.deepEqual(createViewportMapSize(1920, 1080, 270), { width: 54, height: 96 });
});

test("createViewportIndicator can exceed the source map for wider or taller player viewports", () => {
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
    { x: -1.0802, y: 0, width: 3.1605, height: 1 }
  );
});

test("createViewportIndicator scales with zoom and keeps out-of-source-map areas visible", () => {
  assert.deepEqual(
    createViewportIndicator({ ...createDefaultState(), zoom: 200 }, 1080, 1920, 1920, 1080),
    { x: -0.2901, y: 0.25, width: 1.5802, height: 0.5 }
  );
});

test("createViewportIndicator pan is not clamped back into the source map", () => {
  assert.deepEqual(
    createViewportIndicator({ ...createDefaultState(), zoom: 200, panX: 540, panY: -270 }, 1920, 1080),
    { x: 0.1094, y: 0.375, width: 0.5, height: 0.5 }
  );
});

test("createViewportIndicator falls back to full source map for invalid dimensions", () => {
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
      mapSize: { width: 160, height: 90 },
      indicator: { x: -0.1667, y: 0, width: 1.3333, height: 1 },
    }),
    { mapTop: 50, mapRight: 49, settingsTop: 148, settingsRight: 113 }
  );
});

test("createViewportOverlayLayout keeps a taller viewport indicator inside the top edge", () => {
  assert.deepEqual(
    createViewportOverlayLayout({
      mapSize: { width: 160, height: 90 },
      indicator: { x: 0, y: -1.0802, width: 1, height: 3.1605 },
    }),
    { mapTop: 148, mapRight: 22, settingsTop: 344, settingsRight: 86 }
  );
});

test("createViewportOverlayLayout can anchor position while the viewport indicator zooms", () => {
  const anchorIndicator = createViewportIndicator(createDefaultState(), 1080, 1920, 1920, 1080);
  const zoomedIndicator = createViewportIndicator({ ...createDefaultState(), zoom: 200 }, 1080, 1920, 1920, 1080);

  assert.deepEqual(
    createViewportOverlayLayout({
      mapSize: { width: 54, height: 96 },
      indicator: zoomedIndicator,
      anchorIndicator,
    }),
    { mapTop: 50, mapRight: 81, settingsTop: 154, settingsRight: 92 }
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
      mapSize: createViewportMapSize(1920, 1080, 90),
      indicator: zoomedIndicator,
      anchorIndicator,
    }),
    { mapTop: 50, mapRight: 81, settingsTop: 154, settingsRight: 92 }
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

test("createViewportIndicator preserves extreme pan instead of clamping to source-map bounds", () => {
  assert.deepEqual(
    createViewportIndicator({ ...createDefaultState(), zoom: 200, panX: 5000, panY: -5000 }, 1280, 720),
    { x: -1.7031, y: 3.7222, width: 0.5, height: 0.5 }
  );
});

test("shouldInterceptPanWheel intercepts wheel events only in Pan mode", () => {
  assert.equal(shouldInterceptPanWheel(createDefaultState()), false);
  assert.equal(shouldInterceptPanWheel({ ...createDefaultState(), panMode: true }), true);
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
