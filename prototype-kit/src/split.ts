export type RatioClampInput = {
  ratio: number;
  containerWidth: number;
  minPrimary: number;
  minSecondary: number;
};

export const RATIO_STEP = 0.05;

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function boundedRatio(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

export function clampRatio(input: RatioClampInput): number {
  const ratio = boundedRatio(input.ratio);
  const width = input.containerWidth;
  if (!Number.isFinite(width) || width <= 0) return ratio;

  const minPrimary = finiteNonNegative(input.minPrimary);
  const minSecondary = finiteNonNegative(input.minSecondary);
  const lower = Math.min(1, minPrimary / width);
  const upper = Math.max(0, 1 - minSecondary / width);

  if (lower > upper) return lower;
  return Math.min(upper, Math.max(lower, ratio));
}

export function ratioFromPointer(input: {
  pointerX: number;
  trackLeft: number;
  trackWidth: number;
  minPrimary: number;
  minSecondary: number;
}): number {
  const width = input.trackWidth;
  if (!Number.isFinite(width) || width <= 0) {
    return clampRatio({ ratio: 0.5, containerWidth: width, minPrimary: input.minPrimary, minSecondary: input.minSecondary });
  }
  const pointerX = Number.isFinite(input.pointerX) ? input.pointerX : input.trackLeft;
  const trackLeft = Number.isFinite(input.trackLeft) ? input.trackLeft : 0;
  return clampRatio({
    ratio: (pointerX - trackLeft) / width,
    containerWidth: width,
    minPrimary: input.minPrimary,
    minSecondary: input.minSecondary,
  });
}
