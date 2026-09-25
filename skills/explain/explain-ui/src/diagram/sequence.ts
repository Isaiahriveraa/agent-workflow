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

/** One rendered line of text, already positioned. Identity is positional but stable, so React keys stay content-free. */
export type SequenceLine = {
  id: string;
  text: string;
  /** Baseline for this line. */
  y: number;
};

export type SequenceLane = {
  id: string;
  x: number;
  width: number;
  /** Header text wrapped to the lane and positioned; never abbreviated. */
  nameLines: readonly SequenceLine[];
  subLines: readonly SequenceLine[];
};

export type SequencePath =
  | { kind: "line"; x1: number; x2: number; y: number }
  | { kind: "loop"; x: number; y: number; width: number; height: number };

export type SequenceArrow = {
  /** Where the head lands. */
  x: number;
  y: number;
  /** 1 points right, -1 points left. */
  direction: 1 | -1;
};

export type SequenceLabel = {
  /** The full label; what a screen reader reads instead of the wrapped glyphs. */
  accessibleName: string;
  /** The label broken into positioned lines. Joining their text with a space restores it. */
  lines: readonly SequenceLine[];
  /** Centre the lines are anchored on. */
  x: number;
};

export type SequenceRow = {
  id: string;
  index: number;
  /** Top of the row's band; rows never overlap. */
  y: number;
  height: number;
  /** The arrow line this row is built around. */
  baselineY: number;
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
  arrow: SequenceArrow | null;
  built: boolean;
  /** Baseline of the "not built" marker, or null when the hop exists. */
  affordanceY: number | null;
  /** Baseline of the failure text, or null when the hop resolved. */
  errorY: number | null;
  /** True for the step under review; the component distinguishes past and future by index. */
  current: boolean;
  row: SequenceRow;
  error?: string;
};

export type SequenceLayout = {
  width: number;
  height: number;
  lanes: readonly SequenceLane[];
  hops: readonly SequenceHop[];
  rows: readonly SequenceRow[];
  errors: readonly { id: string; message: string }[];
  empty: { reason: "no-participants" | "no-steps" } | null;
  /** Where lane rules start and stop, so the view never hardcodes a y. */
  ruleTop: number;
  ruleBottom: number;
};

export type SequenceLayoutOptions = {
  /** Index of the step under review; absent means no step is current. */
  currentStep?: number;
};

const LANE_WIDTH = 190;
const LANE_GAP = 24;
const LANE_HEADER_GUTTER = 24;
const BOARD_TOP_PADDING = 16;
const LANE_NAME_LINE_HEIGHT = 20;
const LANE_SUB_LINE_HEIGHT = 17;
const SUB_BASELINE_OFFSET = 12;
const LANE_HEADER_GAP = 22;
const DEFAULT_LEFT_MARGIN = 24;
const ROW_TOP_PADDING = 14;
const LABEL_LINE_HEIGHT = 20;
const LABEL_BASELINE_OFFSET = 15;
const LABEL_GAP_TO_ARROW = 14;
const ROW_GAP = 28;
const LOOP_WIDTH = 42;
const LOOP_HEIGHT = 28;
const BOARD_BOTTOM_MARGIN = 24;
const LABEL_WRAP_WIDTH = 300;
const LABEL_CHAR_WIDTH = 7.2;
const NAME_CHAR_WIDTH = 7.4;
const SUB_CHAR_WIDTH = 6.7;
const MIN_BOARD_WIDTH = 120;
const MIN_BOARD_HEIGHT = 120;

/*
 * @behavior  Splits a token into pieces that fit the budget, iterating code points so a surrogate
 *            pair is never cut in half and every piece stays within the budget.
 * @param     word — the token to split, already known to be wider than the budget
 * @param     size — the most UTF-16 code units a piece may hold; at least 1
 * @returns   Two or more pieces whose concatenation is the original token.
 * @exceptions A single code point wider than the budget becomes its own piece rather than splitting.
 */
function chunk(word: string, size: number): string[] {
  const pieces: string[] = [];
  let piece = "";
  for (const character of word) {
    if (piece !== "" && piece.length + character.length > size) {
      pieces.push(piece);
      piece = "";
    }
    piece += character;
  }
  if (piece !== "") pieces.push(piece);
  return pieces;
}

/*
 * @behavior  Fills lines up to a character budget. A word that cannot fit a line of its own is
 *            broken at the budget, so every line stays inside the column instead of overflowing.
 * @param     words — the words to place, already split on whitespace
 * @param     budget — the most characters a line may hold; at least 1
 * @returns   One or more lines; concatenating them ignores only the spaces added at a break.
 * @exceptions Never returns an empty array.
 */
function wrapAt(words: readonly string[], budget: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    for (const piece of word.length > budget ? chunk(word, budget) : [word]) {
      const candidate = line === "" ? piece : `${line} ${piece}`;
      if (line === "" || candidate.length <= budget) {
        line = candidate;
      } else {
        lines.push(line);
        line = piece;
      }
    }
  }
  lines.push(line);
  return lines;
}

/*
 * @behavior  Breaks text into lines that fit a pixel column, so an SVG label can wrap instead of
 *            being cut off; the lines are evened out so a wrapped label leaves no orphan word.
 * @param     text — the label to break, collapsed to single spaces between words
 * @param     maxWidth — the width the lines are measured against, in px
 * @param     charWidth — the estimated advance per character for the intended font size
 * @returns   One or more lines. For text whose words all fit, joining the lines with a space
 *            reproduces the trimmed input exactly; a word wider than the column is broken, so then
 *            only the non-space characters are preserved. The caller keeps the original text as
 *            the accessible name either way.
 * @exceptions Never returns an empty array; an empty label yields one empty line.
 */
function wrapText(text: string, maxWidth: number, charWidth: number): string[] {
  const trimmed = text.trim();
  if (trimmed === "") return [""];
  const words = trimmed.split(/\s+/);
  const budget = Math.max(1, Math.floor(maxWidth / charWidth));
  const lines = wrapAt(words, budget);
  if (lines.length < 2) return lines;
  // Even out the lines so a wrapped label leaves no orphan word. The evened budget is capped at the
  // column: `trimmed.length` counts the spaces that the wrap turns into line breaks, so the division
  // can round above the budget and emit a line wider than the column it was wrapped for.
  const even = wrapAt(words, Math.min(budget, Math.ceil(trimmed.length / lines.length)));
  return even.length <= lines.length ? even : lines;
}

export function computeLayout(
  participants: Record<string, DiagramParticipant>,
  steps: readonly DiagramStep[],
  options: SequenceLayoutOptions = {},
): SequenceLayout {
  const leftMargin = DEFAULT_LEFT_MARGIN;
  const participantIds = Object.keys(participants);
  const wrapWidth = LANE_WIDTH - LANE_HEADER_GUTTER;
  const nameLines = participantIds.map((id) => wrapText(participants[id].name, wrapWidth, NAME_CHAR_WIDTH));
  const subLinesOf = participantIds.map((id) => {
    const sub = participants[id].sub;
    return sub === undefined ? [] : wrapText(sub, wrapWidth, SUB_CHAR_WIDTH);
  });
  // Every lane shares one header grid, so a two-line name never pushes its own sub-line out of step.
  const headerNameLines = Math.max(1, ...nameLines.map((lines) => lines.length));
  const headerSubLines = Math.max(0, ...subLinesOf.map((lines) => lines.length));
  const nameY = BOARD_TOP_PADDING + LABEL_BASELINE_OFFSET;
  const subY = BOARD_TOP_PADDING + headerNameLines * LANE_NAME_LINE_HEIGHT + SUB_BASELINE_OFFSET;
  const ruleTop = BOARD_TOP_PADDING + headerNameLines * LANE_NAME_LINE_HEIGHT + headerSubLines * LANE_SUB_LINE_HEIGHT + LANE_HEADER_GAP;
  const lanes = participantIds.map((id, index): SequenceLane => {
    const x = leftMargin + index * (LANE_WIDTH + LANE_GAP) + LANE_WIDTH / 2;
    return {
      id,
      x,
      width: LANE_WIDTH,
      nameLines: nameLines[index].map((text, line) => ({ id: `${id}-name-${line}`, text, y: nameY + line * LANE_NAME_LINE_HEIGHT })),
      subLines: subLinesOf[index].map((text, line) => ({ id: `${id}-sub-${line}`, text, y: subY + line * LANE_SUB_LINE_HEIGHT })),
    };
  });
  const lanePositions = new Map(lanes.map((lane) => [lane.id, lane.x]));
  const width = Math.max(
    MIN_BOARD_WIDTH,
    participantIds.length === 0
      ? leftMargin * 2
      : leftMargin * 2 + participantIds.length * LANE_WIDTH + (participantIds.length - 1) * LANE_GAP,
  );
  const labelColumn = Math.min(LABEL_WRAP_WIDTH, width - leftMargin * 2);
  const errors: { id: string; message: string }[] = [];
  const currentStep = options.currentStep ?? -1;
  let rowTop = ruleTop;
  const hops = steps.map((step, index): SequenceHop => {
    const fromX = lanePositions.get(step.from) ?? null;
    const toX = lanePositions.get(step.to) ?? null;
    const error = fromX === null || toX === null ? `Unknown participant in step “${step.id}”` : undefined;
    if (error !== undefined) errors.push({ id: step.id, message: error });
    const direction: HopDirection =
      fromX === null || toX === null ? "forward" : fromX === toX ? "self" : fromX < toX ? "forward" : "backward";
    // The label is a block of `labelColumn` centred on its anchor, so the anchor is clamped to keep
    // the block inside the board: a self-hop on an edge lane would otherwise paint past the viewBox.
    const anchored =
      fromX === null || toX === null
        ? labelColumn / 2
        : direction === "self"
          ? fromX + LOOP_WIDTH / 2
          : (fromX + toX) / 2;
    const labelX = Math.min(Math.max(anchored, leftMargin + labelColumn / 2), width - leftMargin - labelColumn / 2);
    const wrapped = wrapText(step.label, labelColumn, LABEL_CHAR_WIDTH);
    const firstLineY = rowTop + ROW_TOP_PADDING + LABEL_BASELINE_OFFSET;
    const annotations = (error === undefined ? 0 : 1) + (step.built ?? false ? 0 : 1);
    const baselineY = rowTop + ROW_TOP_PADDING + (wrapped.length + annotations) * LABEL_LINE_HEIGHT + LABEL_GAP_TO_ARROW;
    const label: SequenceLabel = {
      accessibleName: step.label,
      lines: wrapped.map((text, line) => ({ id: `${step.id}-line-${line}`, text, y: firstLineY + line * LABEL_LINE_HEIGHT })),
      x: labelX,
    };
    const path: SequencePath | null =
      fromX === null || toX === null
        ? null
        : direction === "self"
          ? { kind: "loop", x: fromX, y: baselineY, width: LOOP_WIDTH, height: LOOP_HEIGHT }
          : { kind: "line", x1: fromX, x2: toX, y: baselineY };
    const arrow: SequenceArrow | null =
      fromX === null || toX === null
        ? null
        : direction === "self"
          ? { x: fromX, y: baselineY + LOOP_HEIGHT, direction: -1 }
          : { x: toX, y: baselineY, direction: fromX < toX ? 1 : -1 };
    const annotationY = firstLineY + wrapped.length * LABEL_LINE_HEIGHT;
    const affordanceY = step.built ?? false ? null : annotationY;
    const errorY = error === undefined ? null : annotationY + (affordanceY === null ? 0 : LABEL_LINE_HEIGHT);
    const rowHeight = baselineY - rowTop + (direction === "self" ? LOOP_HEIGHT : 0) + ROW_GAP;
    const row: SequenceRow = {
      id: step.id,
      index,
      y: rowTop,
      height: rowHeight,
      baselineY,
      accessibleName: step.label,
      ...(error === undefined ? {} : { error }),
    };
    rowTop += rowHeight;
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
      arrow,
      built: step.built ?? false,
      affordanceY,
      errorY,
      current: index === currentStep,
      row,
      ...(error === undefined ? {} : { error }),
    };
  });
  const rows = hops.map((hop) => hop.row);
  const height = Math.max(MIN_BOARD_HEIGHT, rowTop + BOARD_BOTTOM_MARGIN);
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
    ruleTop,
    ruleBottom: height - BOARD_BOTTOM_MARGIN,
  };
}
