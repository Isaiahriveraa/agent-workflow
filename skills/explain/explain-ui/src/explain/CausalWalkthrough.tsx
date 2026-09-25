import type { HTMLAttributes, ReactNode } from "react";
import "./explain.css";

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
export function CausalWalkthrough({ steps, title = "Causal walkthrough", className, ...props }: CausalWalkthroughProps) {
  return (
    <section className={["causal-walkthrough", className].filter(Boolean).join(" ")} aria-label={title} {...props}>
      <h2>{title}</h2>
      <ol className="causal-steps">
        {steps.map((step, index) => (
          <li className="causal-step" key={step.id}>
            <span className="causal-step-marker" aria-hidden="true">{index + 1}</span>
            <div className="causal-step-body">
              <h3>{step.title}</h3>
              {step.actor ? <p><strong>Actor:</strong> {step.actor}</p> : null}
              <div className="causal-step-description">{step.description}</div>
              {step.outcome ? <p><strong>Outcome:</strong> {step.outcome}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
