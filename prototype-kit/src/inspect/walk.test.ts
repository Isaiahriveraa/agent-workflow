import assert from "node:assert/strict";
import test from "node:test";
import { walkValue } from "./walk.ts";

test("walks arrays, maps, sets, and difficult primitive values", () => {
  const value = { list: [null, undefined, NaN, Infinity, -0, 1n], map: new Map([["x", 1]]), set: new Set(["a"]) };
  const result = walkValue(value);
  assert.equal(result.kind, "object");
  assert.equal(result.entries?.find((entry) => entry.key === "List")?.node.kind, "array");
  assert.equal(result.entries?.find((entry) => entry.key === "Map")?.node.kind, "map");
  assert.equal(result.entries?.find((entry) => entry.key === "Set")?.node.kind, "set");
  assert.equal(result.entries?.[0]?.node.entries?.[0]?.node.kind, "null");
});

test("terminates cyclic objects and does not mutate input", () => {
  const value: { name: string; self?: unknown } = { name: "x" };
  value.self = value;
  const before = JSON.stringify({ name: value.name });
  const first = walkValue(value);
  const second = walkValue(value);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify({ name: value.name }), before);
  assert.equal(first.entries?.find((entry) => entry.key === "Self")?.node.kind, "cycle");
});

test("depth limit is labelled and zero renders only the root", () => {
  const value = { child: { leaf: true } };
  const limited = walkValue(value, { maxDepth: 1 });
  assert.equal(limited.entries?.[0]?.node.label, "depth limit reached");
  const rootOnly = walkValue(value, { maxDepth: 0 });
  assert.equal(rootOnly.kind, "object");
  assert.equal(rootOnly.label, "depth limit reached");
});

test("collapse threshold at or beyond depth limit is a no-op", () => {
  const value = { child: { leaf: true } };
  const result = walkValue(value, { maxDepth: 2, collapseAfterDepth: 2 });
  assert.equal(result.collapsed, false);
  assert.equal(result.entries?.[0]?.node.collapsed, false);
});

test("entry cap reports the remainder", () => {
  const value: Record<string, number> = {};
  for (let index = 0; index < 52; index += 1) value[`field_${index}`] = index;
  const result = walkValue(value);
  assert.equal(result.entries?.length, 50);
  assert.equal(result.remainder, 2);
});

test("symbol and non-enumerable properties are reported as dropped", () => {
  const symbol = Symbol("hidden");
  const value: Record<string | symbol, string> = { visible: "yes", [symbol]: "no" };
  Object.defineProperty(value, "secret", { value: "no", enumerable: false });
  const result = walkValue(value);
  assert.deepEqual(result.dropped, { symbolKeys: 1, nonEnumerable: 1 });
  assert.equal(result.entries?.length, 1);
});

test("entry ids stay unique when two keys format to the same label", () => {
  const result = walkValue({ a_b: 1, "a-b": 2 });
  const entries = result.entries ?? [];
  assert.equal(entries.length, 2);
  assert.equal(entries[0].key, entries[1].key);
  assert.equal(new Set(entries.map((entry) => entry.id)).size, 2);
});

test("non-finite depth options cannot disable the depth cap", () => {
  let value: unknown = 1;
  for (let index = 0; index < 500; index += 1) value = { next: value };

  const walked = walkValue(value, { maxDepth: Number.NaN, collapseAfterDepth: Number.NaN });
  let levels = 0;
  let node = walked;
  while (node.entries?.[0]?.node.kind === "object" && levels <= 600) {
    node = node.entries[0].node;
    levels += 1;
  }
  assert.ok(levels < 100, `walk should stop near the default depth, went ${levels} levels`);
  assert.equal(node.label, "depth limit reached");
});

test("an invalid date renders as a labelled value", () => {
  const walked = walkValue({ when: new Date(Number.NaN) });
  assert.equal(walked.entries?.[0]?.node.label, "Invalid date");
});

test("arrays never report their own length as dropped content", () => {
  assert.equal(walkValue([1, 2, 3]).dropped, undefined);
  const array: number[] & { secret?: string } = [1, 2];
  Object.defineProperty(array, "secret", { value: "no", enumerable: false });
  assert.deepEqual(walkValue(array).dropped, { symbolKeys: 0, nonEnumerable: 1 });
});

test("opaque instances remain opaque while ordinary values are deterministic", () => {
  class Value { field = "hidden"; }
  const value = { opaque: new Value(), ready: "ready" };
  const first = walkValue(value);
  const second = walkValue(value);
  assert.deepEqual(first, second);
  assert.equal(first.entries?.find((entry) => entry.key === "Opaque")?.node.kind, "opaque");
  assert.equal(first.entries?.find((entry) => entry.key === "Ready")?.node.tone, "good");
});
