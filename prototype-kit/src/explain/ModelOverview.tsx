import type { HTMLAttributes, ReactNode } from "react";
import "./explain.css";

export interface ModelOverviewProps extends HTMLAttributes<HTMLElement> {
  title: string;
  summary?: ReactNode;
  children?: ReactNode;
}

/** A compact, semantic explanation of what a prototype model does. */
export function ModelOverview({ title, summary, children, className, ...props }: ModelOverviewProps) {
  return (
    <section className={["prototype-overview", className].filter(Boolean).join(" ")} aria-label={title} {...props}>
      <h2>{title}</h2>
      {summary ? <p>{summary}</p> : null}
      {children}
    </section>
  );
}
