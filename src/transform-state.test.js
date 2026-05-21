import assert from "node:assert/strict";
import test from "node:test";

await import("./transform-state.js");

const {
  applyZoomDelta,
  createDefaultState,
  createTransformStyle,
  normalizeRotation,
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

test("normalizeRotation only accepts right-angle rotations", () => {
  assert.equal(normalizeRotation(0), 0);
  assert.equal(normalizeRotation(90), 90);
  assert.equal(normalizeRotation(180), 180);
  assert.equal(normalizeRotation(270), 270);
  assert.throws(() => normalizeRotation(45), /Unsupported rotation/);
});

test("applyZoomDelta changes zoom and clamps it to the supported range", () => {
  assert.equal(applyZoomDelta(100, 1), 110);
  assert.equal(applyZoomDelta(100, -1), 90);
  assert.equal(applyZoomDelta(295, 1), 300);
  assert.equal(applyZoomDelta(55, -1), 50);
});
