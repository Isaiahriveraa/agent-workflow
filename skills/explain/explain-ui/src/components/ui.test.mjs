import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("renders each segment as a pressed button instead of a hidden radio label", async (context) => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true } });
  context.after(() => vite.close());
  const { SegmentedControl } = await vite.ssrLoadModule("/src/components/ui.tsx");
  const markup = renderToStaticMarkup(
    createElement(SegmentedControl, {
      label: "View mode",
      options: [{ value: "preview", label: "Preview" }, { value: "split", label: "Split" }],
      value: "preview",
      onChange: () => undefined,
    }),
  );

  assert.match(markup, /<button[^>]*aria-pressed="true"[^>]*>Preview<\/button>/);
  assert.match(markup, /<button[^>]*aria-pressed="false"[^>]*>Split<\/button>/);
  assert.doesNotMatch(markup, /<(fieldset|input|label)\b/);
});
