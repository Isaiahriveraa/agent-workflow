import type { ComponentType, ButtonHTMLAttributes, PropsWithChildren } from "react";
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

export function Panel({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section className="prototype-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function ActionButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className="prototype-action" type="button" {...props}>{children}</button>;
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

export function StateInspector({ value }: { value: unknown }) {
  return (
    <div className="prototype-state">
      <strong>Current state</strong>
      <pre>{formatValue(value)}</pre>
    </div>
  );
}
