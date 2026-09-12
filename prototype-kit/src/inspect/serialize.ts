export type SerializationResult =
  | { ok: true; text: string }
  | { ok: false; reason: "not-json-compatible"; fallback: string }
  | { ok: false; reason: "coercion-threw" };

export function serializeValue(value: unknown): SerializationResult {
  try {
    const text = JSON.stringify(value, null, 2);
    if (text !== undefined) return { ok: true, text };
  } catch {
    // Try the same non-serializing coercion used by the schema display.
  }

  try {
    return { ok: false, reason: "not-json-compatible", fallback: String(value) };
  } catch {
    return { ok: false, reason: "coercion-threw" };
  }
}
