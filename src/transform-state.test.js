import assert from "node:assert/strict";
import test from "node:test";

await import("./transform-state.js");

const {
  applyZoomDelta,
  clampPanState,
  createViewportFrame,
  createDefaultState,
  createTransformStyle,
  getRotationFitScale,
  normalizeRotation,
  shouldInterceptPanWheel,
  shouldResetForVideoKey,
} = globalThis.YTVTTransform;

test("createDefaultState returns reset video transform values", () => {
  assert.deepEqual(createDefaultState(), {
    zoom: 100,
    rotation: 0,
    flipX: false,
    flipY: false,
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

test("createTransformStyle combines pan, rotation, and flips", () => {
  assert.equal(
    createTransformStyle({
      ...createDefaultState(),
      zoom: 200,
      rotation: 90,
      flipX: true,
      flipY: true,
      panX: 12,
      panY: -8,
    }).transform,
    "translate(12px, -8px) rotate(90deg) scale(-2, -2)"
  );
});

test("getRotationFitScale fits right-angle rotation inside the video frame", () => {
  assert.equal(getRotationFitScale(0, 1920, 1080), 1);
  assert.equal(getRotationFitScale(180, 1920, 1080), 1);
  assert.equal(getRotationFitScale(90, 1920, 1080), 0.5625);
  assert.equal(getRotationFitScale(270, 1080, 1920), 0.5625);
});

test("createTransformStyle applies rotation fit before user zoom", () => {
  assert.equal(
    createTransformStyle({ ...createDefaultState(), rotation: 90 }, 1920, 1080).transform,
    "translate(0px, 0px) rotate(90deg) scale(0.5625, 0.5625)"
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

test("shouldResetForVideoKey resets only when an existing video key changes", () => {
  assert.equal(shouldResetForVideoKey("", "abc123"), false);
  assert.equal(shouldResetForVideoKey("abc123", "abc123"), false);
  assert.equal(shouldResetForVideoKey("abc123", "def456"), true);
});

test("createViewportFrame returns full frame when video is not zoomed in", () => {
  assert.deepEqual(createViewportFrame(createDefaultState(), 1280, 720), {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
});

test("createViewportFrame maps zoom and pan into normalized original-video coordinates", () => {
  assert.deepEqual(
    createViewportFrame({ ...createDefaultState(), zoom: 200, panX: 160, panY: -90 }, 1280, 720),
    {
      x: 0.1875,
      y: 0.3125,
      width: 0.5,
      height: 0.5,
    }
  );
});

test("clampPanState centers pan at 100 percent zoom", () => {
  assert.deepEqual(
    clampPanState({ ...createDefaultState(), panX: 240, panY: -120 }, 1280, 720),
    createDefaultState()
  );
});

test("clampPanState centers pan when rotated fit leaves empty side space", () => {
  assert.deepEqual(
    clampPanState({ ...createDefaultState(), rotation: 90, panX: 240, panY: -120 }, 1920, 1080),
    { ...createDefaultState(), rotation: 90 }
  );
});

test("clampPanState uses rotated bounds when zoomed after fit", () => {
  assert.deepEqual(
    clampPanState({ ...createDefaultState(), rotation: 90, zoom: 200, panX: 900, panY: -900 }, 1920, 1080),
    { ...createDefaultState(), rotation: 90, zoom: 200, panX: 0, panY: -540 }
  );
});

test("clampPanState limits pan to the scaled video bounds", () => {
  assert.deepEqual(
    clampPanState({ ...createDefaultState(), zoom: 200, panX: 900, panY: -500 }, 1280, 720),
    { ...createDefaultState(), zoom: 200, panX: 640, panY: -360 }
  );
});

test("clampPanState clamps pan to smaller bounds after zooming out", () => {
  assert.deepEqual(
    clampPanState({ ...createDefaultState(), zoom: 150, panX: 640, panY: 360 }, 1280, 720),
    { ...createDefaultState(), zoom: 150, panX: 320, panY: 180 }
  );
});

test("createViewportFrame keeps extreme pan inside original-video coordinates", () => {
  assert.deepEqual(
    createViewportFrame({ ...createDefaultState(), zoom: 200, panX: 5000, panY: -5000 }, 1280, 720),
    { x: 0, y: 0.5, width: 0.5, height: 0.5 }
  );
});

test("shouldInterceptPanWheel intercepts wheel events only in Pan mode", () => {
  assert.equal(shouldInterceptPanWheel(createDefaultState()), false);
  assert.equal(shouldInterceptPanWheel({ ...createDefaultState(), panMode: true }), true);
});
