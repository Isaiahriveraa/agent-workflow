# UI Prototype

Use the shared browser workspace to explore visual hierarchy, interactions, and layout. It provides an editable Excalidraw whiteboard plus a live React preview. Standalone exploration defaults to the shared shell with author-local variants; it does not require rebuilding a host application's runtime.

If the question is about logic or state transitions rather than appearance, use [LOGIC.md](LOGIC.md).

## Frame the decision

Identify the primary prototype shape even for a visual experiment:

- **Architectural decision:** compare page/layout structures, ownership of an interaction, or component boundaries and show their consequences.
- **Current → intended behavior:** show the existing interaction or visual failure, then the intended flow and the outcome that distinguishes it.
- **Schema change:** when UI depends on a changed data shape, show current/proposed fields and the UI states or constraints they enable.

State the visual question, structures being compared, expected observation, and success criterion. A polished screenshot is not an explanation. Raw JSON, serialized scenes, and state inspector output are supporting evidence, not the main explanation; pair them with a readable diagram, causal prose, and an observable preview result.

## Causal diagram and reading order

Use the Excalidraw board for a compact overview: boxes are screens, components, actors, entities, or states; arrows point in interaction/dependency direction and are labeled with the user trigger or data crossing; labels on states identify the relevant affordance, field, or invariant; consequence labels describe what the user sees or what operational behavior follows. Use explicit **Current**/**Intended** headings and `?`/dashed notes for assumptions and open questions. Avoid unlabeled arrows and decorative diagrams.

Read title/question first, then legend and current/intended boundary, then the trigger flow left-to-right or top-to-bottom, followed by constraints and exception branches, and finally notes/implementation implications. Keep this first view legible. Use progressive disclosure in the preview—variants, details, state traces, and edge cases can be opened when relevant—instead of putting every fact on the canvas at once.

## Choose the context

### Standalone exploration (default)

Use the attached prototype's `prototype.tsx` and define local variants under the shared shell. A variant is a real interactive React component, not a screenshot. Keep the whiteboard for spatial alternatives and use preview controls to test the decision.

When comparing options, make them structurally different: change layout, hierarchy, density, or primary affordance—not just color and copy. Three variants are a useful default; use fewer when narrow and more only when the comparison remains legible. Every variant should make the causal difference explicit.

The shell's selector is shareable through `?variant=<id>`. It preserves unrelated query parameters, falls back to the first variant for an unknown ID, and intentionally remounts the selected preview so disposable local state starts clean. The whiteboard remains mounted and preserved while switching variants or narrow-screen panels.

### In-host-page exploration (preserved exception)

Use the host app's existing route and native framework only when the question genuinely depends on that app's layout, auth, data, routing, or responsive context and the user requests that context. Keep existing data and authentication above the variant switcher; swap only the rendering under test. Do not symlink an alien React runtime into a host application.

## Browser workspace behavior

On desktop the canvas is alongside the live preview. At narrow widths, accessible Whiteboard and Preview tabs select the visible panel without unmounting either one. Canvas editing, preview interactions, and variant state are separate concerns. Save and Load diagram are explicit actions using Excalidraw's native scene format; there is no automatic persistence.

Avoid global keyboard shortcuts. Excalidraw owns canvas editing shortcuts, and a prototype-level key handler must not steal them. Prefer visible buttons, native form controls, and scoped handlers inside the active component. Keep focus styles and contrast clear enough for actual browser proof.

## Author and verify

1. Sketch the causal overview and alternatives before coding; name the trigger, owner, state/data change, and visible consequence.
2. Implement the smallest meaningful local variants and controls. Keep controls thin and make empty, loading, error, and disabled states intentional when they affect the decision.
3. Exercise each variant at desktop and narrow widths, including the interaction sequence, reset behavior, and a surprising or boundary case. Confirm the preview and canvas remain separate and shortcuts are not stolen.
4. Verify what is rendered in the browser rather than relying on source structure. Check the diagram's reading order, labels, and current/intended distinction. Record which observations support the chosen structure.
5. Translate the result into an implementation plan: component/ownership boundaries, interaction states, data contracts, accessibility constraints, risks, and unresolved questions. Capture the decision with `new-artifact.py` before cleanup.

## Anti-patterns

- Variants that differ only by color, copy, or border radius.
- A standalone page when the answer depends on real host density, auth, or data.
- A host-page prototype that imports the shared kit's isolated runtime into production.
- A custom drawing engine, diagram-to-code promise, automatic persistence, or a global keyboard listener that conflicts with the canvas.
- A diagram or state dump with no causal trigger, consequence, or implementation implication.
