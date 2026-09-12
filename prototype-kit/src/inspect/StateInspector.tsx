import type { HTMLAttributes } from "react";
import { serializeValue } from "./serialize.ts";

function formatValue(value: unknown): string {
  const result = serializeValue(value);
  return result.ok ? result.text : "Unable to display this state: value is not JSON-compatible.";
}

export interface StateInspectorProps extends HTMLAttributes<HTMLElement> {
  value: unknown;
}

export function StateInspector({ value, className, ...props }: StateInspectorProps) {
  return (
    <section className={["prototype-state", className].filter(Boolean).join(" ")} aria-live="polite" aria-label="Current state" {...props}>
      <h3>Current state</h3>
      <pre>{formatValue(value)}</pre>
    </section>
  );
}
