import {
  classifyValue,
  formatLabel,
  type ClassificationOptions,
  type Tone,
} from "./classify.ts";

export type StructuredDataOptions = {
  maxDepth?: number;
  collapseAfterDepth?: number;
  detectStatuses?: boolean;
  detectUrls?: boolean;
  detectDates?: boolean;
  statuses?: Record<string, Tone>;
};

export const DEFAULT_MAX_DEPTH = 4;
export const DEFAULT_COLLAPSE_AFTER_DEPTH = 2;
export const DEFAULT_ENTRY_CAP = 50;
export const DEFAULT_STRUCTURED_DATA_OPTIONS: Required<Pick<StructuredDataOptions, "maxDepth" | "collapseAfterDepth" | "detectStatuses" | "detectUrls" | "detectDates">> = {
  maxDepth: DEFAULT_MAX_DEPTH,
  collapseAfterDepth: DEFAULT_COLLAPSE_AFTER_DEPTH,
  detectStatuses: true,
  detectUrls: true,
  detectDates: true,
};

export type WalkNode = {
  kind: "object" | "array" | "map" | "set" | "primitive" | "null" | "undefined" | "opaque" | "cycle" | "depth-limit";
  label: string;
  value?: unknown;
  entries?: WalkEntry[];
  collapsed?: boolean;
  truncated?: boolean;
  remainder?: number;
  dropped?: { symbolKeys: number; nonEnumerable: number };
  tone?: Tone;
  presentation?: "status" | "url" | "date" | "plain-text";
};

export type WalkEntry = {
  /** Stable within its node: the key a renderer lists by. */
  id: string;
  /** Display label; two different keys can format to the same label. */
  key: string;
  node: WalkNode;
};

/** A depth option is a count: anything non-finite, negative or fractional falls back to the default. */
function boundedDepth(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function optionsWithDefaults(options: StructuredDataOptions): StructuredDataOptions & typeof DEFAULT_STRUCTURED_DATA_OPTIONS {
  return {
    ...DEFAULT_STRUCTURED_DATA_OPTIONS,
    ...options,
    maxDepth: boundedDepth(options.maxDepth, DEFAULT_MAX_DEPTH),
    collapseAfterDepth: boundedDepth(options.collapseAfterDepth, DEFAULT_COLLAPSE_AFTER_DEPTH),
  };
}

function classificationOptions(options: StructuredDataOptions): ClassificationOptions {
  return {
    statuses: options.statuses,
    detectStatuses: options.detectStatuses,
    detectUrls: options.detectUrls,
    detectDates: options.detectDates,
  };
}

function droppedPropertyCounts(value: object): { symbolKeys: number; nonEnumerable: number } {
  const isArray = Array.isArray(value);
  let symbolKeys = 0;
  let nonEnumerable = 0;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") {
      symbolKeys += 1;
    } else if (!(isArray && key === "length")) {
      // An array's own length is structure, not content the reader lost.
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor !== undefined && !descriptor.enumerable) nonEnumerable += 1;
    }
  }
  return { symbolKeys, nonEnumerable };
}

function hasDropped(counts: { symbolKeys: number; nonEnumerable: number }): boolean {
  return counts.symbolKeys > 0 || counts.nonEnumerable > 0;
}

export function walkValue(value: unknown, options: StructuredDataOptions = {}): WalkNode {
  const resolved = optionsWithDefaults(options);
  return walkNode(value, 0, resolved, new WeakSet<object>());
}

export const walk = walkValue;

function walkNode(value: unknown, depth: number, options: StructuredDataOptions & typeof DEFAULT_STRUCTURED_DATA_OPTIONS, ancestors: WeakSet<object>): WalkNode {
  const classified = classifyValue(value, classificationOptions(options));
  if (classified.kind === "null") return { kind: "null", label: "no value", value: null };
  if (classified.kind === "undefined") return { kind: "undefined", label: "no value", value: undefined };
  if (classified.kind === "opaque") return { kind: "opaque", label: classified.label, value: classified.value };
  if (classified.kind === "string") {
    return {
      kind: "primitive",
      label: classified.value,
      value: classified.value,
      tone: classified.presentation.tone,
      presentation: classified.presentation.kind,
    };
  }
  if (classified.kind === "boolean" || classified.kind === "number" || classified.kind === "bigint") {
    const label = typeof classified.value === "number" && Object.is(classified.value, -0) ? "-0" : String(classified.value);
    return { kind: "primitive", label, value: classified.value };
  }
  if (classified.kind === "date") return { kind: "primitive", label: classified.formatted, value: classified.original, presentation: "date" };

  const reference = classified.value;
  if (typeof reference !== "object" || reference === null) return { kind: "opaque", label: "opaque value", value: reference };
  if (ancestors.has(reference)) return { kind: "cycle", label: "cycle detected" };
  const kind = classified.kind;
  const node: WalkNode = { kind, label: kind, entries: [] };
  if (depth >= options.maxDepth) {
    node.truncated = true;
    node.label = "depth limit reached";
    return node;
  }
  node.collapsed = options.collapseAfterDepth < options.maxDepth && depth >= options.collapseAfterDepth;
  ancestors.add(reference);
  if (kind === "map") {
    if (!(reference instanceof Map)) return { kind: "opaque", label: "opaque value", value: reference };
    const all = [...reference.entries()];
    appendEntries(node, all.slice(0, DEFAULT_ENTRY_CAP).map(([key, entry]) => ({ key: String(key), value: entry })), all.length);
  } else if (kind === "set") {
    if (!(reference instanceof Set)) return { kind: "opaque", label: "opaque value", value: reference };
    const all = [...reference.values()];
    appendEntries(node, all.slice(0, DEFAULT_ENTRY_CAP).map((entry, index) => ({ key: String(index), value: entry })), all.length);
  } else {
    const counts = droppedPropertyCounts(reference);
    if (hasDropped(counts)) node.dropped = counts;
    const all = Object.entries(reference);
    appendEntries(node, all.slice(0, DEFAULT_ENTRY_CAP).map(([key, entry]) => ({ key, value: entry })), all.length);
  }
  for (const entry of node.entries ?? []) {
    const original = entry.node.value;
    entry.node = walkNode(original, depth + 1, options, ancestors);
  }
  ancestors.delete(reference);
  return node;
}

type PendingEntry = { key: string; value: unknown };

function appendEntries(node: WalkNode, entries: PendingEntry[], total: number): void {
  node.entries = entries.map(({ key, value }, index) => ({ id: `${key}#${index}`, key: formatLabel(key), node: { kind: "primitive", label: "", value } }));
  if (total > entries.length) node.remainder = total - entries.length;
}
