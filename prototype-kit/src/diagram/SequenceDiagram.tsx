import type { KeyboardEvent, ReactNode } from "react";
import {
  computeLayout,
  type DiagramParticipant,
  type DiagramStep,
  type SequenceHop,
  type SequenceLine,
  type SequencePath,
} from "./sequence.ts";
import "./diagram.css";

export type SequenceDiagramProps = {
  participants: Record<string, DiagramParticipant>;
  steps: readonly DiagramStep[];
  currentStep?: number;
  onSelectStep?: (index: number) => void;
  title?: string;
};

/** The board grows on a large screen but never past this, so the type stays a type size. */
const MAX_SCALE = 1.35;

function pathForHop(path: SequencePath): string {
  if (path.kind === "line") {
    return `M ${path.x1} ${path.y} L ${path.x2} ${path.y}`;
  }
  // A self-hop leaves the lane, drops, and returns with a rounded corner so it reads as one gesture.
  const radius = Math.min(8, path.width / 2, path.height / 2);
  const right = path.x + path.width;
  const bottom = path.y + path.height;
  return [
    `M ${path.x} ${path.y}`,
    `H ${right - radius}`,
    `Q ${right} ${path.y} ${right} ${path.y + radius}`,
    `V ${bottom - radius}`,
    `Q ${right} ${bottom} ${right - radius} ${bottom}`,
    `H ${path.x}`,
  ].join(" ");
}

function arrowPoints(hop: SequenceHop): string | null {
  const arrow = hop.arrow;
  if (arrow === null) return null;
  const back = arrow.x - arrow.direction * 9;
  return `${arrow.x},${arrow.y} ${back},${arrow.y - 5} ${back},${arrow.y + 5}`;
}

function activateOnKey(event: KeyboardEvent<SVGGElement>, onSelectStep: () => void): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelectStep();
  }
}

/** Renders positioned lines as one text element; the geometry already decided every baseline. */
function textLines(lines: readonly SequenceLine[], x: number, className: string): ReactNode {
  return (
    <text className={className} x={x} textAnchor="middle">
      {lines.map((line) => (
        <tspan key={line.id} x={x} y={line.y}>
          {line.text}
        </tspan>
      ))}
    </text>
  );
}

function renderHop(hop: SequenceHop, index: number, currentStep: number | undefined, onSelectStep?: (index: number) => void): ReactNode {
  const state = hop.current ? "current" : currentStep !== undefined && index < currentStep ? "past" : "future";
  const accessibleName = hop.error !== undefined
    ? `${hop.label.accessibleName}; ${hop.error}`
    : hop.built ? hop.label.accessibleName : `${hop.label.accessibleName}; not built`;
  const interactive = onSelectStep !== undefined;
  const pathClass = hop.built ? "seq-hop-path" : "seq-hop-path seq-hop-path-not-built";
  const arrow = arrowPoints(hop);
  return (
    <g
      key={hop.id}
      className={`seq-hop seq-hop-${state}${hop.error === undefined ? "" : " seq-hop-error"}`}
      aria-label={accessibleName}
      {...(interactive ? {
        tabIndex: 0,
        role: "button",
        "aria-current": hop.current ? "step" : undefined,
        onClick: () => onSelectStep(index),
        onKeyDown: (event: KeyboardEvent<SVGGElement>) => activateOnKey(event, () => onSelectStep(index)),
      } : {})}
    >
      {hop.path === null || arrow === null ? (
        <path className="seq-hop-halt" d={`M ${hop.label.x} ${hop.baselineY + 6} h 26`} />
      ) : (
        <>
          <path className={pathClass} d={pathForHop(hop.path)} />
          <polygon className="seq-hop-arrow" points={arrow} />
        </>
      )}
      {textLines(hop.label.lines, hop.label.x, "seq-hop-label")}
      {hop.errorY === null ? null : (
        <text className="seq-hop-error-text" x={hop.label.x} y={hop.errorY} textAnchor="middle">{hop.error ?? "Unable to render step"}</text>
      )}
      {hop.affordanceY === null ? null : (
        <text className="seq-hop-affordance" x={hop.label.x} y={hop.affordanceY} textAnchor="middle">not built</text>
      )}
    </g>
  );
}

export function SequenceDiagram({ participants, steps, currentStep, onSelectStep, title }: SequenceDiagramProps): ReactNode {
  const layout = computeLayout(participants, steps, { currentStep });
  const current = currentStep !== undefined && steps[currentStep] !== undefined ? steps[currentStep].label : "none";
  const diagramTitle = title === undefined ? "Sequence diagram" : title;
  const accessibleTitle = `${diagramTitle}; current step: ${current}`;
  return (
    <div className="seq-board">
      {/* Drawn at design size so text never shrinks, and capped so a huge monitor does not zoom it. */}
      <svg
        className="seq-svg"
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        style={{ minWidth: layout.width, maxWidth: Math.round(layout.width * MAX_SCALE) }}
        role="img"
        aria-label={accessibleTitle}
      >
        {layout.lanes.map((lane) => (
          <g key={lane.id}>
            {textLines(lane.nameLines, lane.x, "seq-lane-name")}
            {textLines(lane.subLines, lane.x, "seq-lane-sub")}
            <line className="seq-lane-rule" x1={lane.x} x2={lane.x} y1={layout.ruleTop} y2={layout.ruleBottom} />
          </g>
        ))}
        {layout.empty === null ? layout.hops.map((hop, index) => renderHop(hop, index, currentStep, onSelectStep)) : (
          <text className="seq-empty" x={layout.width / 2} y={layout.height / 2} textAnchor="middle">
            {layout.empty.reason === "no-participants" ? "No participants to display" : "No steps to display"}
          </text>
        )}
      </svg>
    </div>
  );
}
