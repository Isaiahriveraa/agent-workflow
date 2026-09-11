# UI Prototype

Use the shared browser workspace to explore visual hierarchy, interactions, and layout. It provides an editable Excalidraw whiteboard plus a live React preview. Standalone exploration defaults to the shared shell with author-local variants; it does not require rebuilding a host application's runtime.

If the question is about logic or state transitions rather than appearance, use [LOGIC.md](LOGIC.md).

## Choose the context

### Standalone exploration (default)

Use the attached prototype's `prototype.tsx` and define local variants under the shared shell. A variant is a real interactive React component, not a screenshot. Keep the whiteboard for spatial alternatives and use preview controls to test the design.

When comparing options, make them structurally different: change layout, hierarchy, density, or primary affordance—not just color and copy. Three variants is a useful default; use fewer when the question is narrow and more only when the comparison remains legible.

The shell's selector is shareable through `?variant=<id>`. It preserves unrelated query parameters, falls back to the first variant for an unknown ID, and intentionally remounts the selected preview so its disposable local state starts clean. The whiteboard remains mounted and preserved while switching variants or narrow-screen panels.

### In-host-page exploration (preserved exception)

Use the host app's existing route and native framework when the question genuinely depends on that app's layout, auth, data, routing, or responsive context and the user requests that context. Keep existing data and authentication above the variant switcher; swap only the rendering under test. Do not symlink an alien React runtime into a host application.

## Browser workspace behavior

On desktop the canvas is alongside the live preview. At narrow widths, accessible Whiteboard and Preview tabs select the visible panel without unmounting either one. Canvas editing, preview interactions, and variant state are separate concerns. Save and Load diagram are explicit actions using Excalidraw's native scene format; there is no automatic persistence.

Avoid global keyboard shortcuts. Excalidraw owns canvas editing shortcuts, and a prototype-level key handler must not steal them. Prefer visible buttons, native form controls, and scoped handlers inside the active component. Keep focus styles and contrast clear enough for the actual browser proof.

## Process

1. State the visual question and the structures being compared.
2. Sketch alternatives on the whiteboard, then implement the smallest meaningful local variants.
3. Exercise the variants in the browser at desktop and narrow widths. Check empty, loading, error, and interaction states that affect the decision.
4. Share the variant URL and record which evidence supports the decision.
5. Delete losing variants or fold the winner into the host application; capture the decision with `new-artifact.py` before cleanup.

## Anti-patterns

- Variants that differ only by color, copy, or border radius.
- A standalone page when the answer depends on real host density, auth, or data.
- A host-page prototype that imports the shared kit's isolated runtime into production.
- A custom drawing engine, diagram-to-code promise, automatic persistence, or a global keyboard listener that conflicts with the canvas.
