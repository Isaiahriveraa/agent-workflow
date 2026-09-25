import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSchema,
  reconcile,
  type FieldSpec,
} from "./schema.ts";

test("reconciles every declared field with its example", () => {
  const schema: readonly FieldSpec[] = [
    { name: "title", type: "string" },
    { name: "count", type: "number" },
  ];

  assert.deepEqual(reconcile(schema, { title: "hello", count: 3 }), {
    fields: [
      {
        spec: { name: "title", type: "string", values: [] },
        example: { present: true, value: "hello" },
      },
      {
        spec: { name: "count", type: "number", values: [] },
        example: { present: true, value: 3 },
      },
    ],
    unlisted: [],
    isObject: true,
  });
});

test("reports a declared field with no example as absent", () => {
  const result = reconcile([{ name: "title", type: "string" }], {});

  assert.deepEqual(result.fields[0]?.example, { present: false });
});

test("surfaces example keys that are not declared", () => {
  const result = reconcile([{ name: "title", type: "string" }], {
    title: "hello",
    extra: true,
  });

  assert.deepEqual(result.unlisted, [{ key: "extra", value: true }]);
});

test("preserves declared schema order", () => {
  const result = reconcile(
    [
      { name: "third", type: "string" },
      { name: "first", type: "string" },
      { name: "second", type: "string" },
    ],
    { first: 1, second: 2, third: 3 },
  );

  assert.deepEqual(
    result.fields.map(({ spec }) => spec.name),
    ["third", "first", "second"],
  );
});

test("preserves example key order for unlisted values", () => {
  const result = reconcile([], { later: 2, earlier: 1, final: 3 });

  assert.deepEqual(result.unlisted, [
    { key: "later", value: 2 },
    { key: "earlier", value: 1 },
    { key: "final", value: 3 },
  ]);
});

test("handles an empty schema", () => {
  assert.deepEqual(reconcile([], { extra: "value" }), {
    fields: [],
    unlisted: [{ key: "extra", value: "value" }],
    isObject: true,
  });
});

test("marks non-object values as an empty example state", () => {
  const result = reconcile(
    [{ name: "title", type: "string" }],
    ["not", "an", "object"],
  );

  assert.equal(result.isObject, false);
  assert.deepEqual(result.fields, [
    {
      spec: { name: "title", type: "string", values: [] },
      example: { present: false },
    },
  ]);
  assert.deepEqual(result.unlisted, []);
});

test("handles null and undefined values as non-object examples", () => {
  const schema = [{ name: "title", type: "string" }];

  assert.equal(reconcile(schema, null).isObject, false);
  assert.equal(reconcile(schema, undefined).isObject, false);
  assert.deepEqual(reconcile(schema, null).fields[0]?.example, {
    present: false,
  });
});

test("normalizes required only when explicitly true", () => {
  assert.deepEqual(
    normalizeSchema([
      { name: "yes", type: "string", required: true },
      { name: "no", type: "string", required: false },
      { name: "unset", type: "string" },
    ]),
    [
      { name: "yes", type: "string", required: true, values: [] },
      { name: "no", type: "string", values: [] },
      { name: "unset", type: "string", values: [] },
    ],
  );
});

test("normalizes absent permitted values to an empty readonly list", () => {
  const result = normalizeSchema([{ name: "title", type: "string" }]);

  assert.deepEqual(result[0]?.values, []);
  assert.equal(Object.isFrozen(result[0]?.values), true);
});

test("is deterministic and does not mutate input", () => {
  const schema: FieldSpec[] = [
    { name: "title", type: "string", values: ["a", "b"], required: true },
  ];
  const values = { extra: { nested: true }, title: "a" };
  const schemaBefore = structuredClone(schema);
  const valuesBefore = structuredClone(values);

  const first = reconcile(schema, values);
  const second = reconcile(schema, values);

  assert.deepEqual(first, second);
  assert.deepEqual(schema, schemaBefore);
  assert.deepEqual(values, valuesBefore);
});
