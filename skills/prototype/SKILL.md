---
name: prototype
description: Build a disposable browser prototype to answer a design, logic, schema, or visual question with the shared Excalidraw whiteboard and live-preview workspace.
---

# Prototype

A prototype is **throwaway code that answers a question**. The default workspace is a browser shell with an editable Excalidraw whiteboard and one or more live React previews. It is deliberately separate from production code and clearly marked as disposable.

## Choose and frame the question

Choose one primary prototype shape before coding:

- **Architectural decision:** compare two or more system structures, boundaries, or ownership choices and show why one produces the desired consequences.
- **Current → intended behavior:** make an observed flow, state transition, or interaction concrete, then show the smallest change that leads to the intended result.
- **Schema change:** compare the existing data shape with a proposed shape, including relationships, constraints, migration direction, and affected behavior.

Use [LOGIC.md](LOGIC.md) for logic, state, schema, and data-model questions. Use [UI.md](UI.md) for visual or interaction questions. Either shape may use both diagram and preview, but the question must say what is being decided and what observation would answer it. Record current/proposed labels, assumptions, and an explicit success criterion before implementation. If the question is ambiguous, state the assumption and choose the branch best supported by surrounding code.

## Shared explanation contract

The prototype is an explanation, not a pile of controls or raw scene/state data. Build its narrative in this order:

1. **Decision/question** — what choice or uncertainty matters.
2. **Causal walkthrough** — trigger or input → owner/component → state or data change → consequence/observable outcome.
3. **Progressive evidence** — start with the smallest readable overview; reveal field-level constraints, edge cases, and implementation detail only when needed.
4. **Implementation implication** — name the boundaries, data contracts, migrations, or follow-up work that the evidence implies.

Use a consistent causal diagram grammar: boxes are actors, components, entities, or states; arrows point in time or dependency direction; label arrows with the trigger/action or data crossing the boundary; label state/data boxes with the fields or invariant that matters; annotate consequences with the user-visible or operational effect. Use `?`/dashed notes for assumptions and unresolved questions, and distinguish current from intended with explicit headings or styling. Avoid unlabeled arrows and decorative topology. Raw JSON, serialized Excalidraw scenes, and state inspectors are **supporting evidence, not the main explanation**: pair every important dump with a readable diagram, causal sentence, or visible outcome.

Read diagrams in this order: title/question, legend and current/intended boundary, left-to-right or top-to-bottom trigger flow, then labels/constraints and exception branches, and finally notes and implementation implications. Keep the overview legible at the initial viewport; use progressive disclosure in the preview (details, inspector, or variant controls) rather than shrinking one diagram until it cannot be read.

## Browser workspace setup

`Prototype Kit` is permanent hub-owned software; each attached prototype is disposable project-local source. Attach it directly to the current branch checkout, or use a dedicated linked worktree when stronger isolation is useful. The CLI accepts either kind of Git checkout and refuses only paths outside a Git repository.

1. Choose the project directory. By default, commands run against the current working directory; use `--project <path>` elsewhere. A dedicated worktree is optional:

   ```sh
   rtk proxy bash ~/.agents/scripts/new-worktree.sh <branch>
   ```

2. Once per hub checkout, install Prototype Kit dependencies:

   ```sh
   npm ci --prefix <hub>/prototype-kit
   ```

3. From the current checkout or selected worktree, attach a named prototype:

   ```sh
   node ~/.agents/scripts/prototype.mjs init <slug>
   ```

   Append `--project <path>` to target another checkout.

4. Start it in the foreground (or supervise it with process tooling):

   ```sh
   node ~/.agents/scripts/prototype.mjs dev <slug> [--port <number>]
   ```

   When done, remove disposable source and local links with:

   ```sh
   node ~/.agents/scripts/prototype.mjs clean <slug>
   ```

   `clean` also accepts `--project <path>`, safely removes the prototype folder, and removes an empty `prototypes/` parent.

The initializer creates `prototypes/<slug>/prototype.tsx`, an entry HTML file, and local `.kit` and `node_modules` links. The generated `prototype.tsx` is project-owned and editable; add local components/assets beside it as needed.

The authoring contract is intentionally small:

- `prototype.tsx` default-exports a `PrototypeDefinition` with a nonempty `title`, `question`, and one or more `variants`.
- Each variant has a unique `id`, display `title`, and React `component`.
- Import `ModelOverview`, `CausalWalkthrough`, and `TechnicalDetails` for explanation-first prototypes; use `Panel`, `ActionButton`, and `StateInspector` for focused interaction and evidence. Import Excalidraw conversion helpers and related types from `@prototype-kit`.
- Select variants with `?variant=<id>`. Unknown or missing IDs use the first variant; switching variants resets that preview while preserving the whiteboard.

The `.kit` and `node_modules` entries are symlinks into Prototype Kit. **Never edit files through those links.** Reusable workspace changes belong in the hub's `prototype-kit`; experiment changes belong in the attached checkout's visible source.

## Author and verify

1. Write the question, shape, current/proposed labels, causal chain, and expected observation.
2. Sketch the overview diagram using the grammar above; add only the detail needed to decide.
3. Implement the smallest portable model and thin browser controls; make each control correspond to a trigger in the diagram.
4. Run the intended path, boundary/empty/error cases, reset behavior, and one surprising sequence. For comparisons, exercise each structurally different variant at desktop and narrow widths.
5. Verify the rendered outcome and diagram reading order in the browser. Check that controls do not steal Excalidraw shortcuts, that state resets honestly, and that every conclusion is backed by runtime or user evidence. Do not infer backend equivalence from a JavaScript simulation.
6. Translate the result into an implementation plan: chosen boundary, contracts/invariants, migration or interaction steps, risks, and unanswered questions. Capture it with `new-artifact.py` before cleanup.

## Whiteboard and state boundaries

Use the whiteboard for diagrams, labels, connections, and spatial alternatives. It is not synchronized with preview code or simulation state. Save and load are explicit diagram-only actions:

- **Save diagram** downloads a local `.excalidraw` scene, including image data.
- **Load diagram** validates a selected scene, asks before replacing an edited canvas, and leaves the canvas untouched on cancellation or invalid input.

There is no automatic persistence or recovery. Preview interactions and state remain in memory; reloading starts from the authored scene and initial preview state.

## Restrictions

Keep the relevant model portable and browser controls thin. Do not bind it to React, Excalidraw, a database, or network I/O; do not add production integrations, persistence, backend bridges, or diagram-to-code promises unless they are the question. Do not hide state changes, rely on global keyboard handlers, or let prototype controls intercept canvas shortcuts. Use the host app's native framework only when layout, auth, data, routing, or responsive context genuinely matters and that context is requested. Mark workspace/source disposable. The Prototype Kit itself is permanent maintained software and deserves normal engineering care; an attached prototype must be deleted or folded into production after the question is answered.

## Capture the answer

Keep the question and observed answer in a durable artifact before deleting the experiment:

- Logic/state decision: `python3 ~/.agents/scripts/new-artifact.py --type decisions --topic "<verdict>"`
- Design decision: `python3 ~/.agents/scripts/new-artifact.py --type designs --topic "<verdict>"`
- Research finding: `python3 ~/.agents/scripts/new-artifact.py --type research --topic "<finding>"`

Never invent findings or claim an outcome without user or runtime evidence.
