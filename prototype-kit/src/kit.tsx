import type {
  ComponentType,
  ButtonHTMLAttributes,
  DetailsHTMLAttributes,
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from "react";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { SceneData as ExcalidrawSceneData } from "@excalidraw/excalidraw/types";

export type { ExcalidrawSceneData };
export { convertToExcalidrawElements };

export interface PrototypeVariant {
  id: string;
  title: string;
  component: ComponentType;
}

export interface PrototypeDefinition {
  title: string;
  question: string;
  scene?: ExcalidrawSceneData;
  variants: readonly PrototypeVariant[];
}

export function Panel({
  title,
  children,
  className,
  ...props
}: PropsWithChildren<{ title: string } & HTMLAttributes<HTMLElement>>) {
  return (
    <section
      className={["prototype-panel", className].filter(Boolean).join(" ")}
      aria-label={title}
      {...props}
    >
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function ActionButton({
  children,
  className,
  type,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={["prototype-action", className].filter(Boolean).join(" ")}
      type={type ?? "button"}
    >
      {children}
    </button>
  );
}

function formatValue(value: unknown): string {
  try {
    const serialized = JSON.stringify(value, null, 2);
    if (serialized === undefined) throw new Error("Value is not JSON-compatible");
    return serialized;
  } catch {
    return "Unable to display this state: value is not JSON-compatible.";
  }
}

export interface StateInspectorProps extends HTMLAttributes<HTMLElement> {
  value: unknown;
}

export function StateInspector({ value, className, ...props }: StateInspectorProps) {
  return (
    <section
      className={["prototype-state", className].filter(Boolean).join(" ")}
      aria-live="polite"
      aria-label="Current state"
      {...props}
    >
      <h3>Current state</h3>
      <pre>{formatValue(value)}</pre>
    </section>
  );
}

export interface ModelOverviewProps extends HTMLAttributes<HTMLElement> {
  title: string;
  summary?: ReactNode;
  children?: ReactNode;
}

/** A compact, semantic explanation of what a prototype model does. */
export function ModelOverview({
  title,
  summary,
  children,
  className,
  ...props
}: ModelOverviewProps) {
  return (
    <section
      className={["prototype-overview", "prototype-model-overview", className].filter(Boolean).join(" ")}
      aria-label={title}
      {...props}
    >
      <h2>{title}</h2>
      {summary ? <p className="prototype-model-summary">{summary}</p> : null}
      {children}
    </section>
  );
}

export interface CausalStep {
  id: string;
  title: string;
  description: ReactNode;
  actor?: ReactNode;
  outcome?: ReactNode;
}

export interface CausalWalkthroughProps extends HTMLAttributes<HTMLElement> {
  steps: readonly CausalStep[];
  title?: string;
}

/** Renders a causal chain as an ordered list so its sequence is understandable without styling. */
export function CausalWalkthrough({
  steps,
  title = "Causal walkthrough",
  className,
  ...props
}: CausalWalkthroughProps) {
  return (
    <section
      className={["causal-walkthrough", "prototype-causal-walkthrough", className].filter(Boolean).join(" ")}
      aria-label={title}
      {...props}
    >
      <h2>{title}</h2>
      <ol className="prototype-causal-steps">
        {steps.map((step) => (
          <li className="prototype-causal-step" key={step.id}>
            <h3>{step.title}</h3>
            {step.actor ? <p className="prototype-causal-actor"><strong>Actor:</strong> {step.actor}</p> : null}
            <div className="prototype-causal-description">{step.description}</div>
            {step.outcome ? <p className="prototype-causal-outcome"><strong>Outcome:</strong> {step.outcome}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export interface TechnicalDetailsProps extends PropsWithChildren<DetailsHTMLAttributes<HTMLDetailsElement>> {
  summary: ReactNode;
}

/** Native disclosure for optional implementation context; keyboard behavior comes from details/summary. */
export function TechnicalDetails({
  summary,
  children,
  className,
  ...props
}: TechnicalDetailsProps) {
  return (
    <details
      className={["technical-details", "prototype-technical-details", className].filter(Boolean).join(" ")}
      {...props}
    >
      <summary>{summary}</summary>
      <div className="prototype-technical-content">{children}</div>
    </details>
  );
}
