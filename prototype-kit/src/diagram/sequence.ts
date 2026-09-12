export type DiagramParticipant = {
  name: string;
  sub?: string;
};

export type DiagramStep = {
  id: string;
  from: string;
  to: string;
  label: string;
  built?: boolean;
};

export type HopDirection = "forward" | "backward" | "self";

export type SequenceLane = {
  id: string;
  x: number;
  width: number;
  name: string;
  sub?: string;
};

export type SequencePath =
  | { kind: "line"; x1: number; x2: number; y: number }
  | { kind: "loop"; x: number; y: number; width: number; height: number; returnY: number };

export type SequenceLabel = {
  display: string;
  accessibleName: string;
  x: number;
  y: number;
  collided: boolean;
};

export type SequenceRow = {
  id: string;
  index: number;
  y: number;
  accessibleName: string;
  error?: string;
};

export type SequenceHop = {
  id: string;
  from: string;
  to: string;
  fromX: number | null;
  toX: number | null;
  direction: HopDirection;
  baselineY: number;
  label: SequenceLabel;
  path: SequencePath | null;
  built: boolean;
  /** True for the step under review; the component distinguishes past and future by index. */
  current: boolean;
  row: SequenceRow;
  error?: string;
};

export type CurrentStepMarker = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SequenceLayout = {
  width: number;
  height: number;
  lanes: readonly SequenceLane[];
  hops: readonly SequenceHop[];
  rows: readonly SequenceRow[];
  errors: readonly { id: string; message: string }[];
  empty: { reason: "no-participants" | "no-steps" } | null;
  currentStepMarker: CurrentStepMarker | null;
};

export type SequenceLayoutOptions = {
  laneGap?: number;
  stepGap?: number;
  topMargin?: number;
  leftMargin?: number;
  /** Index of the step under review; absent means no step is current. */
  currentStep?: number;
};

const LANE_WIDTH = 180;
const DEFAULT_LANE_GAP = 32;
const DEFAULT_STEP_GAP = 72;
const DEFAULT_TOP_MARGIN = 56;
const DEFAULT_LEFT_MARGIN = 24;
const BOARD_BOTTOM_MARGIN = 40;
const MIN_BOARD_WIDTH = 120;
const MIN_BOARD_HEIGHT = 120;
const LABEL_MAX_LENGTH = 32;
const LABEL_CHAR_WIDTH = 6.5;
const LABEL_HORIZONTAL_PADDING = 12;
const LABEL_ABOVE_OFFSET = 18;
const COLLIDED_LABEL_ABOVE_OFFSET = 30;

function truncateLabel(label: string): string {
  if (label.length <= LABEL_MAX_LENGTH) return label;
  return `${label.slice(0, LABEL_MAX_LENGTH - 1)}…`;
}

export function computeLayout(
  participants: Record<string, DiagramParticipant>,
  steps: readonly DiagramStep[],
  options: SequenceLayoutOptions = {},
): SequenceLayout {
  const laneGap = options.laneGap ?? DEFAULT_LANE_GAP;
  const stepGap = options.stepGap ?? DEFAULT_STEP_GAP;
  const topMargin = options.topMargin ?? DEFAULT_TOP_MARGIN;
  const leftMargin = options.leftMargin ?? DEFAULT_LEFT_MARGIN;
  const participantIds = Object.keys(participants);
  const lanes = participantIds.map((id, index): SequenceLane => ({
    id,
    x: leftMargin + index * (LANE_WIDTH + laneGap) + LANE_WIDTH / 2,
    width: LANE_WIDTH,
    name: participants[id].name,
    ...(participants[id].sub === undefined ? {} : { sub: participants[id].sub }),
  }));
  const lanePositions = new Map(lanes.map((lane) => [lane.id, lane.x]));
  const width = Math.max(
    MIN_BOARD_WIDTH,
    participantIds.length === 0
      ? leftMargin * 2
      : leftMargin * 2 + participantIds.length * LANE_WIDTH + (participantIds.length - 1) * laneGap,
  );
  const height = Math.max(
    MIN_BOARD_HEIGHT,
    topMargin + steps.length * stepGap + BOARD_BOTTOM_MARGIN,
  );
  const errors: { id: string; message: string }[] = [];
  const currentStep = options.currentStep ?? -1;
  const hops = steps.map((step, index): SequenceHop => {
    const fromX = lanePositions.get(step.from) ?? null;
    const toX = lanePositions.get(step.to) ?? null;
    const baselineY = topMargin + index * stepGap;
    const error = fromX === null || toX === null ? `Unknown participant in step “${step.id}”` : undefined;
    if (error !== undefined) errors.push({ id: step.id, message: error });
    const display = truncateLabel(step.label);
    const direction: HopDirection =
      fromX === null || toX === null ? "forward" : fromX === toX ? "self" : fromX < toX ? "forward" : "backward";
    // A label only collides when it is wider than the run it sits above; a self-hop's loop
    // never reaches the next lane, so its label stays at the base offset.
    const collided =
      fromX !== null && toX !== null && direction !== "self" && Math.abs(toX - fromX) < display.length * LABEL_CHAR_WIDTH + LABEL_HORIZONTAL_PADDING;
    const label: SequenceLabel = {
      display,
      accessibleName: step.label,
      x: fromX === null || toX === null ? leftMargin : (fromX + toX) / 2,
      y: baselineY - (collided ? COLLIDED_LABEL_ABOVE_OFFSET : LABEL_ABOVE_OFFSET),
      collided,
    };
    const path: SequencePath | null =
      fromX === null || toX === null
        ? null
        : direction === "self"
          ? { kind: "loop", x: fromX, y: baselineY, width: 34, height: 24, returnY: baselineY + 12 }
          : { kind: "line", x1: fromX, x2: toX, y: baselineY };
    const row: SequenceRow = {
      id: step.id,
      index,
      y: baselineY,
      accessibleName: step.label,
      ...(error === undefined ? {} : { error }),
    };
    return {
      id: step.id,
      from: step.from,
      to: step.to,
      fromX,
      toX,
      direction,
      baselineY,
      label,
      path,
      built: step.built ?? false,
      current: index === currentStep,
      row,
      ...(error === undefined ? {} : { error }),
    };
  });
  const rows = hops.map((hop) => hop.row);
  const currentHop = hops.find((hop) => hop.current);
  const currentStepMarker =
    currentHop === undefined
      ? null
      : { x: leftMargin / 2, y: currentHop.baselineY - 16, width: width - leftMargin, height: 32 };
  return {
    width,
    height,
    lanes,
    hops,
    rows,
    errors,
    empty: participantIds.length === 0
      ? { reason: "no-participants" }
      : steps.length === 0
        ? { reason: "no-steps" }
        : null,
    currentStepMarker,
  };
}
