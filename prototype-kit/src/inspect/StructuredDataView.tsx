import type { ReactNode } from "react";
import { formatLabel } from "./classify.ts";
import { reconcile, type FieldSpec } from "./schema.ts";
import {
  walkValue,
  type StructuredDataOptions,
  type WalkNode,
} from "./walk.ts";

import "./inspect.css";
export type StructuredDataViewProps = {
  data: unknown;
  schema?: readonly FieldSpec[];
  options?: StructuredDataOptions;
  title?: string;
};

function primitiveValue(node: WalkNode): ReactNode {
  if (node.kind === "null" || node.kind === "undefined") {
    return <span className="sdata-value sdata-no-value">no value</span>;
  }
  if (node.kind === "opaque") {
    return <span className="sdata-value sdata-opaque">{node.label}</span>;
  }
  if (node.kind !== "primitive") return null;
  if (node.presentation === "status") {
    return <span className={`sdata-value sdata-status sdata-tone-${node.tone ?? "neutral"}`}>{node.label}</span>;
  }
  if (node.presentation === "url") {
    return (
      <a className="sdata-value sdata-link" href={node.label} target="_blank" rel="noreferrer noopener">
        {node.label}
      </a>
    );
  }
  return <span className={`sdata-value sdata-${node.presentation ?? "plain"}`}>{node.label}</span>;
}

function nodeContents(node: WalkNode, options: StructuredDataOptions, schema?: readonly FieldSpec[], data?: unknown): ReactNode {
  if (node.kind === "cycle") return <span className="sdata-notice">cycle detected</span>;
  if (node.kind === "depth-limit" || node.truncated) return <span className="sdata-notice">depth limit reached</span>;
  if (node.kind === "primitive" || node.kind === "null" || node.kind === "undefined" || node.kind === "opaque") {
    return primitiveValue(node);
  }

  const entries = node.entries ?? [];
  const schemaResult = schema === undefined ? undefined : reconcile(schema, data);
  const renderedEntries = schemaResult?.isObject
    ? schemaResult.fields.map(({ spec, example }) => {
        const fieldNode = example.present ? walkValue(example.value, options) : { kind: "undefined" as const, label: "no value" };
        return (
          <div className="sdata-entry" key={`field-${spec.name}`}>
            <span className="sdata-key">{formatLabel(spec.name)}{spec.required ? " *" : ""}</span>
            {!example.present ? <span className="sdata-field-meta">no example</span> : null}
            <NodeView node={fieldNode} options={options} />
            {spec.values !== undefined && spec.values.length > 0 ? <span className="sdata-field-meta">allowed: {spec.values.join(", ")}</span> : null}
          </div>
        );
      })
    : entries.map((entry) => (
        <div className="sdata-entry" key={entry.id}>
          <span className="sdata-key">{entry.key}</span>
          <NodeView node={entry.node} options={options} />
        </div>
      ));
  const unlisted = schemaResult?.unlisted.map(({ key, value }) => (
    <div className="sdata-entry sdata-unlisted" key={`unlisted-${key}`}>
      <span className="sdata-key">{formatLabel(key)}</span>
      <span className="sdata-field-meta">not in schema</span>
      <NodeView node={walkValue(value, options)} options={options} />
    </div>
  ));
  return (
    <>
      <div className="sdata-entries">{renderedEntries}{unlisted}</div>
      {node.remainder !== undefined ? <div className="sdata-remainder">{node.remainder} more</div> : null}
      {node.dropped !== undefined ? <div className="sdata-dropped">Not shown: {node.dropped.symbolKeys} symbol keys, {node.dropped.nonEnumerable} non-enumerable properties.</div> : null}
    </>
  );
}

function NodeView({ node, options, schema, data }: { node: WalkNode; options: StructuredDataOptions; schema?: readonly FieldSpec[]; data?: unknown }): ReactNode {
  if (node.kind === "object" || node.kind === "array" || node.kind === "map" || node.kind === "set") {
    const label = node.kind === "array" ? "Array" : formatLabel(node.kind);
    const body = nodeContents(node, options, schema, data);
    if (node.collapsed) {
      return <details className="sdata-group"><summary className="sdata-group-summary">{label}</summary><div className="sdata-group-body">{body}</div></details>;
    }
    return <div className="sdata-group"><div className="sdata-group-summary">{label}</div><div className="sdata-group-body">{body}</div></div>;
  }
  return <span className="sdata-value-wrap">{nodeContents(node, options)}</span>;
}

export function StructuredDataView({ data, schema, options = {}, title }: StructuredDataViewProps): ReactNode {
  const root = walkValue(data, options);
  return (
    <section className="sdata-view" aria-label={title ?? "Structured data"}>
      {title ? <h2 className="sdata-title">{title}</h2> : null}
      <div className="sdata-root"><NodeView node={root} options={options} schema={schema} data={data} /></div>
    </section>
  );
}
