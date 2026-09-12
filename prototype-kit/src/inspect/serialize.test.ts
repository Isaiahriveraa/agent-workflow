import assert from "node:assert/strict";
import test from "node:test";
import { serializeValue } from "./serialize.ts";

test("serializes a plain object with stable pretty JSON", () => {
  assert.deepEqual(serializeValue({ name: "Ada", count: 2 }), {
    ok: true,
    text: '{\n  "name": "Ada",\n  "count": 2\n}',
  });
});

test("reports no JSON representation while preserving undefined coercion", () => {
  assert.deepEqual(serializeValue(undefined), {
    ok: false,
    reason: "not-json-compatible",
    fallback: "undefined",
  });
});

test("reports a cycle as not JSON-compatible with its display fallback", () => {
  const value: { self?: unknown } = {};
  value.self = value;
  const result = serializeValue(value);
  assert.deepEqual(result, { ok: false, reason: "not-json-compatible", fallback: "[object Object]" });
});

test("reports BigInt as not JSON-compatible with its display fallback", () => {
  assert.deepEqual(serializeValue(123n), { ok: false, reason: "not-json-compatible", fallback: "123" });
});

test("reports a throwing toJSON as not JSON-compatible with its display fallback", () => {
  const value = { toJSON: () => { throw new Error("cannot serialize"); } };
  const result = serializeValue(value);
  assert.deepEqual(result, { ok: false, reason: "not-json-compatible", fallback: "[object Object]" });
});
