import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { clampRatio, ratioFromPointer, RATIO_STEP } from "./split.ts";
import "./split.css";

export type SplitProps = {
  primary: ReactNode;
  secondary: ReactNode;
  ratio: number;
  onRatioChange: (ratio: number) => void;
  minPrimary?: number;
  minSecondary?: number;
  label?: string;
};

const DEFAULT_MINIMUM = 240;

function minimum(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : DEFAULT_MINIMUM;
}

export function Split({ primary, secondary, ratio, onRatioChange, minPrimary, minSecondary, label }: SplitProps): ReactNode {
  const primaryMinimum = minimum(minPrimary);
  const secondaryMinimum = minimum(minSecondary);
  const splitRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointerId = useRef<number | null>(null);

  useEffect(() => {
    const element = splitRef.current;
    if (element === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setTrackWidth(entry.contentRect.width);
    });
    observer.observe(element);
    setTrackWidth(element.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const effectiveRatio = clampRatio({
    ratio,
    containerWidth: trackWidth,
    minPrimary: primaryMinimum,
    minSecondary: secondaryMinimum,
  });
  const columns = `minmax(${primaryMinimum}px, ${effectiveRatio}fr) var(--split-divider-width) minmax(${secondaryMinimum}px, ${1 - effectiveRatio}fr)`;
  const style: CSSProperties = { gridTemplateColumns: columns };
  const dividerLabel = label ?? "Resize panes";
  const changeBy = (amount: number): void => {
    onRatioChange(clampRatio({
      ratio: effectiveRatio + amount,
      containerWidth: trackWidth,
      minPrimary: primaryMinimum,
      minSecondary: secondaryMinimum,
    }));
  };
  const finishPointer = (event: PointerEvent<HTMLHRElement>): void => {
    if (pointerId.current !== event.pointerId) return;
    pointerId.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const handlePointerDown = (event: PointerEvent<HTMLHRElement>): void => {
    pointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const handlePointerMove = (event: PointerEvent<HTMLHRElement>): void => {
    const track = splitRef.current;
    if (pointerId.current !== event.pointerId || track === null) return;
    const bounds = track.getBoundingClientRect();
    onRatioChange(ratioFromPointer({
      pointerX: event.clientX,
      trackLeft: bounds.left,
      trackWidth: bounds.width,
      minPrimary: primaryMinimum,
      minSecondary: secondaryMinimum,
    }));
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLHRElement>): void => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      changeBy(-RATIO_STEP);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      changeBy(RATIO_STEP);
    } else if (event.key === "Home") {
      event.preventDefault();
      onRatioChange(clampRatio({ ratio: 0, containerWidth: trackWidth, minPrimary: primaryMinimum, minSecondary: secondaryMinimum }));
    } else if (event.key === "End") {
      event.preventDefault();
      onRatioChange(clampRatio({ ratio: 1, containerWidth: trackWidth, minPrimary: primaryMinimum, minSecondary: secondaryMinimum }));
    }
  };

  return (
    <div ref={splitRef} className="split" style={style}>
      <div className="split-primary">{primary}</div>
      <hr
        className={`split-divider${dragging ? " split-divider-dragging" : ""}`}
        aria-orientation="vertical"
        aria-label={dividerLabel}
        aria-valuenow={Math.round(effectiveRatio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
      />
      <div className="split-secondary">{secondary}</div>
    </div>
  );
}
