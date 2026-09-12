import type { KeyboardEvent, ReactNode } from "react";
import { computeLayout, type DiagramParticipant, type DiagramStep, type SequenceHop, type SequencePath } from "./sequence.ts";
import "./diagram.css";

export type SequenceDiagramProps = {
  participants: Record<string, DiagramParticipant>;
  steps: readonly DiagramStep[];
  currentStep?: number;
  onSelectStep?: (index: number) => void;
  title?: string;
};

function pathForHop(path: SequencePath): string {
  if (path.kind === "line") {
    return `M ${path.x1} ${path.y} L ${path.x2} ${path.y}`;
  }
  return `M ${path.x} ${path.y} C ${path.x + path.width} ${path.y}, ${path.x + path.width} ${path.y + path.height}, ${path.x} ${path.returnY}`;
}

function arrowPoints(hop: SequenceHop): string | null {
  if (hop.path === null || hop.path.kind === "loop") return null;
  const direction = hop.path.x2 > hop.path.x1 ? 1 : -1;
  const x = hop.path.x2;
  return `${x},${hop.baselineY} ${x - direction * 9},${hop.baselineY - 5} ${x - direction * 9},${hop.baselineY + 5}`;
}

function activateOnKey(event: KeyboardEvent<SVGGElement>, onSelectStep: () => void): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelectStep();
  }
}

function renderHop(hop: SequenceHop, index: number, currentStep: number | undefined, onSelectStep?: (index: number) => void): ReactNode {
  const state = hop.current ? "current" : currentStep !== undefined && index < currentStep ? "past" : "future";
  const stateClass = `seq-hop-${state}`;
  const accessibleName = hop.error === undefined
    ? hop.built ? hop.label.accessibleName : `${hop.label.accessibleName}; not built`
    : `${hop.label.accessibleName}; ${hop.error}`;
  const interactive = onSelectStep !== undefined;
  const pathClass = hop.built ? "seq-hop-path" : "seq-hop-path seq-hop-path-not-built";
  return (
    <g
      key={hop.id}
      className={`seq-hop ${stateClass}${hop.error === undefined ? "" : " seq-hop-error"}`}
      aria-label={accessibleName}
      {...(interactive ? {
        tabIndex: 0,
        role: "button",
        "aria-current": hop.current ? "step" : undefined,
        onClick: () => onSelectStep(index),
        onKeyDown: (event: KeyboardEvent<SVGGElement>) => activateOnKey(event, () => onSelectStep(index)),
      } : {})}
    >
      {hop.path === null ? (
        <text className="seq-hop-error-text" x={hop.label.x} y={hop.baselineY}>{hop.error ?? "Unable to render step"}</text>
      ) : (
        <>
          <path className={pathClass} d={pathForHop(hop.path)} />
          {arrowPoints(hop) === null ? null : <polygon className="seq-hop-arrow" points={arrowPoints(hop) ?? ""} />}
        </>
      )}
      <text className="seq-hop-label" x={hop.label.x} y={hop.label.y} textAnchor="middle">{hop.label.display}</text>
      {!hop.built ? <text className="seq-hop-affordance" x={hop.label.x} y={hop.label.y + 14} textAnchor="middle">not built</text> : null}
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
      <svg className="seq-svg" width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label={accessibleTitle}>
        {layout.currentStepMarker === null ? null : (
          <rect className="seq-current-marker" x={layout.currentStepMarker.x} y={layout.currentStepMarker.y} width={layout.currentStepMarker.width} height={layout.currentStepMarker.height} />
        )}
        {layout.lanes.map((lane) => (
          <g className="seq-lane" key={lane.id}>
            <text className="seq-lane-name" x={lane.x} y={24} textAnchor="middle">{lane.name}</text>
            {lane.sub === undefined ? null : <text className="seq-lane-sub" x={lane.x} y={42} textAnchor="middle">{lane.sub}</text>}
            <line className="seq-lane-rule" x1={lane.x} x2={lane.x} y1={52} y2={layout.height - 18} />
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
