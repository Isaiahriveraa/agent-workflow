import assert from "node:assert/strict";
import test from "node:test";
import { classifyString, classifyValue, formatDate, formatLabel, isLinkableUrl } from "./classify.ts";

test("status detection uses exact tokens and unknown values stay neutral", () => {
  assert.equal(classifyString("ready").tone, "good");
  assert.equal(classifyString("the gate is ready to sell").tone, undefined);
  assert.equal(classifyString("mystery").tone, undefined);
  assert.equal(classifyString("ready", { statuses: { ready: "stop" } }).tone, "stop");
});

test("URL classification accepts absolute URLs and refuses dangerous or relative values", () => {
  assert.equal(isLinkableUrl("https://example.test/path"), true);
  assert.equal(isLinkableUrl("mailto:user@example.test"), true);
  assert.equal(isLinkableUrl("/relative/path"), false);
  assert.equal(isLinkableUrl("javascript:alert(1)"), false);
  assert.equal(isLinkableUrl("data:text/plain,hello"), false);
  assert.equal(classifyString("https://example.test").kind, "url");
});

test("date recognition is conservative and preserves the source", () => {
  assert.equal(classifyString("2026-09-12").kind, "date");
  assert.equal(classifyString("September 12, 2026").kind, "plain-text");
  const rendered = formatDate("2026-09-12");
  assert.equal(rendered.original, "2026-09-12");
  assert.notEqual(rendered.formatted, rendered.original);
});

test("labels format camel, snake, and kebab casing", () => {
  assert.equal(formatLabel("camelCase"), "Camel Case");
  assert.equal(formatLabel("snake_case"), "Snake Case");
  assert.equal(formatLabel("kebab-case"), "Kebab Case");
});

test("an invalid date is labelled instead of throwing", () => {
  const result = classifyValue(new Date(Number.NaN));
  assert.equal(result.kind, "date");
  assert.equal(result.formatted, "Invalid date");
  assert.equal(result.original, "Invalid date");
});

test("class instances are opaque and toJSON is never called", () => {
  let called = false;
  class Value {
    toJSON(): string {
      called = true;
      return "bad";
    }
  }
  const result = classifyValue(new Value());
  assert.equal(result.kind, "opaque");
  assert.equal(called, false);
});
