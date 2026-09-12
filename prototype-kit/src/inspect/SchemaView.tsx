import type { ReactNode } from "react";
import { serializeValue } from "./serialize.ts";
import { formatLabel } from "./classify.ts";
import { reconcile, type FieldSpec, type ReconciledField } from "./schema.ts";
import "./schema.css";

export type SchemaViewProps = { schema: readonly FieldSpec[]; values?: unknown; title?: string };

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  const result = serializeValue(value);
  if (result.ok) return result.text;
  if (result.reason === "not-json-compatible") return result.fallback;
  return "Unable to display value";
}

function FieldMetadata({ spec }: { spec: FieldSpec }): ReactNode {
  return (
    <div className="schema-metadata">
      <span className="schema-type">{spec.type}</span>
      <span className="schema-required">{spec.required === true ? "required" : "optional"}</span>
      {spec.values && spec.values.length > 0 ? (
        <span className="schema-permitted">Permitted: {spec.values.join(", ")}</span>
      ) : null}
      {Object.hasOwn(spec, "default") ? (
        <span className="schema-default">Default: {formatValue(spec.default)}</span>
      ) : null}
      {spec.note ? <span className="schema-note">{spec.note}</span> : null}
    </div>
  );
}

function ReconciledFieldRow({ field }: { field: ReconciledField }): ReactNode {
  const { spec, example } = field;
  return (
    <div className="schema-row">
      <div className="schema-field">
        <div className="schema-field-name">{formatLabel(spec.name)}</div>
        <FieldMetadata spec={spec} />
      </div>
      <div className="schema-example">
        {example.present ? (
          <code className="schema-example-value">{formatValue(example.value)}</code>
        ) : (
          <span className="schema-empty-example">no example</span>
        )}
      </div>
    </div>
  );
}

export function SchemaView({ schema, values, title = "Schema" }: SchemaViewProps): ReactNode {
  const result = reconcile(schema, values);
  return (
    <section className="schema-view" aria-label={title}>
      <h2 className="schema-title">{title}</h2>
      {result.fields.length === 0 ? (
        <p className="schema-empty-state">Schema has no fields.</p>
      ) : (
        <div className="schema-fields">
          {result.fields.map((field) => <ReconciledFieldRow field={field} key={field.spec.name} />)}
        </div>
      )}
      {!result.isObject ? <p className="schema-values-empty">Values are not a plain object; no examples available.</p> : null}
      {result.unlisted.map(({ key, value }) => (
        <div className="schema-unlisted" key={key}>
          <span className="schema-unlisted-name">{formatLabel(key)}</span>
          <code className="schema-unlisted-value">{formatValue(value)}</code>
          <span className="schema-unlisted-status">not in schema</span>
        </div>
      ))}
    </section>
  );
}
