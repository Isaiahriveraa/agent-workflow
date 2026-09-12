import assert from "node:assert/strict";
import test from "node:test";
import { clampRatio, ratioFromPointer, RATIO_STEP } from "./split.ts";

const bounds = { containerWidth: 500, minPrimary: 100, minSecondary: 150 };

test("leaves a ratio inside the bounds unchanged", () => {
  assert.equal(clampRatio({ ratio: 0.4, ...bounds }), 0.4);
});

test("clamps ratios at both pane extremes", () => {
  assert.equal(clampRatio({ ratio: -1, ...bounds }), 0.2);
  assert.equal(clampRatio({ ratio: 2, ...bounds }), 0.7);
});

test("uses the primary minimum when the container is too narrow", () => {
  assert.equal(clampRatio({ ratio: 0, containerWidth: 180, minPrimary: 120, minSecondary: 120 }), 2 / 3);
  assert.equal(clampRatio({ ratio: 1, containerWidth: 80, minPrimary: 120, minSecondary: 120 }), 1);
});

test("handles zero, negative, and NaN container widths", () => {
  assert.equal(clampRatio({ ratio: 0.7, containerWidth: 0, minPrimary: 100, minSecondary: 100 }), 0.7);
  assert.equal(clampRatio({ ratio: -1, containerWidth: -20, minPrimary: 100, minSecondary: 100 }), 0);
  assert.equal(clampRatio({ ratio: Number.NaN, containerWidth: Number.NaN, minPrimary: 100, minSecondary: 100 }), 0.5);
});

test("converts pointer positions at and outside the track ends", () => {
  const input = { trackLeft: 100, trackWidth: 500, minPrimary: 100, minSecondary: 150 };
  assert.equal(ratioFromPointer({ pointerX: 100, ...input }), 0.2);
  assert.equal(ratioFromPointer({ pointerX: 600, ...input }), 0.7);
  assert.equal(ratioFromPointer({ pointerX: -100, ...input }), 0.2);
  assert.equal(ratioFromPointer({ pointerX: 900, ...input }), 0.7);
});

test("expresses keyboard step and Home/End outcomes through pure clamping", () => {
  const current = 0.4;
  assert.ok(Math.abs(clampRatio({ ratio: current - RATIO_STEP, ...bounds }) - 0.35) < Number.EPSILON);
  assert.ok(Math.abs(clampRatio({ ratio: current + RATIO_STEP, ...bounds }) - 0.45) < Number.EPSILON);
  assert.equal(clampRatio({ ratio: 0, ...bounds }), 0.2);
  assert.equal(clampRatio({ ratio: 1, ...bounds }), 0.7);
});

test("is deterministic and never produces an invalid ratio", () => {
  const inputs = [
    { ratio: Number.NaN, containerWidth: Number.NaN, minPrimary: 40, minSecondary: 60 },
    { ratio: 0.2, containerWidth: 20, minPrimary: 100, minSecondary: 100 },
    { ratio: 0.55, containerWidth: 800, minPrimary: 100, minSecondary: 200 },
  ];
  const first = inputs.map((input) => clampRatio(input));
  const second = inputs.map((input) => clampRatio(input));
  assert.deepEqual(first, second);
  assert.ok(first.every((ratio) => Number.isFinite(ratio) && ratio >= 0 && ratio <= 1));
});
