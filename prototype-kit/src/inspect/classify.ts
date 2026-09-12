import type { Tone } from "../tone.ts";

export type { Tone } from "../tone.ts";

export const DEFAULT_STATUS_TONES: Readonly<Record<string, Tone>> = {
  ready: "good",
  complete: "good",
  completed: "good",
  success: "good",
  pending: "warn",
  waiting: "warn",
  processing: "warn",
  failed: "stop",
  failure: "stop",
  error: "stop",
  rejected: "stop",
};

export type StringClassification = {
  kind: "status" | "url" | "date" | "plain-text";
  tone?: Tone;
  original: string;
  formatted?: string;
};

export type ValueClassification =
  | { kind: "null"; value: null }
  | { kind: "undefined"; value: undefined }
  | { kind: "boolean" | "number" | "bigint"; value: boolean | number | bigint }
  | { kind: "string"; value: string; presentation: StringClassification }
  | { kind: "date"; value: Date; original: string; formatted: string }
  | { kind: "object" | "array" | "map" | "set"; value: object }
  | { kind: "opaque"; value: unknown; label: string };

export type ClassificationOptions = {
  statuses?: Record<string, Tone>;
  detectStatuses?: boolean;
  detectUrls?: boolean;
  detectDates?: boolean;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

export function isLinkableUrl(value: string): boolean {
  if (!/^[A-Za-z][A-Za-z\d+.-]*:/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol !== "javascript:" && url.protocol !== "data:";
  } catch {
    return false;
  }
}

export function formatDate(value: string | Date): { formatted: string; original: string } {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return { formatted: "Invalid date", original: "Invalid date" };
  const original = value instanceof Date ? date.toISOString() : value;
  return { formatted: date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }), original };
}

export function classifyString(value: string, options: ClassificationOptions = {}): StringClassification {
  const statuses = options.statuses ?? DEFAULT_STATUS_TONES;
  const token = value.trim().toLowerCase();
  if (options.detectStatuses !== false && /^\S+$/.test(token) && Object.hasOwn(statuses, token)) {
    return { kind: "status", tone: statuses[token], original: value };
  }
  if (options.detectUrls !== false && isLinkableUrl(value.trim())) return { kind: "url", original: value };
  if (options.detectDates !== false && DATE_PATTERN.test(value.trim())) {
    const parsed = new Date(value.trim());
    if (!Number.isNaN(parsed.getTime())) {
      const date = formatDate(value.trim());
      return { kind: "date", original: value, formatted: date.formatted };
    }
  }
  return { kind: "plain-text", original: value };
}

export function formatLabel(key: string): string {
  return key
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)(\p{L})/gu, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

export function classifyValue(value: unknown, options: ClassificationOptions = {}): ValueClassification {
  if (value === null) return { kind: "null", value };
  if (value === undefined) return { kind: "undefined", value };
  if (typeof value === "string") return { kind: "string", value, presentation: classifyString(value, options) };
  if (typeof value === "boolean") return { kind: "boolean", value };
  if (typeof value === "number") return { kind: "number", value };
  if (typeof value === "bigint") return { kind: "opaque", value, label: "bigint" };
  if (value instanceof Date) {
    const formatted = formatDate(value);
    return { kind: "date", value, original: formatted.original, formatted: formatted.formatted };
  }
  if (value instanceof Map) return { kind: "map", value };
  if (value instanceof Set) return { kind: "set", value };
  if (Array.isArray(value)) return { kind: "array", value };
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) return { kind: "object", value };
    return { kind: "opaque", value, label: Object.prototype.toString.call(value) };
  }
  return { kind: "opaque", value, label: typeof value };
}
