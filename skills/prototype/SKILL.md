---
name: prototype
description: Build a disposable browser prototype to answer a design, logic, schema, or visual question with the shared Excalidraw whiteboard and live-preview workspace.
---

# Prototype

A prototype is **throwaway code that answers a question**. The default workspace is a browser shell with an editable Excalidraw whiteboard and one or more live React previews. It is deliberately separate from production code and is clearly marked as disposable.

## Choose the question

- **Logic, state, schema, or data model** → read [LOGIC.md](LOGIC.md). Map entities, fields, relationships, constraints, and proposed migrations on the whiteboard; expose proposed behavior with browser controls and live state where useful.
- **Visual or interaction design** → read [UI.md](UI.md). Use author-local variants when comparing materially different structures.

When the question is ambiguous, state the assumption in the prototype and choose the branch that best matches the surrounding code.

## Browser workspace setup

`Prototype Kit` is permanent hub-owned software; each attached prototype is disposable project-local source. You can attach it directly to the current branch checkout, or to a dedicated linked worktree when you want stronger isolation. The CLI accepts either kind of Git checkout; it refuses only paths outside a Git repository.

1. Choose the project directory. By default, commands run against the current working directory; use `--project <path>` when operating from elsewhere. A dedicated worktree is optional:

   ```sh
   rtk proxy bash ~/.agents/scripts/new-worktree.sh <branch>
   ```

2. Once per hub checkout, install the Prototype Kit dependencies:

   ```sh
   npm ci --prefix <hub>/prototype-kit
   ```

3. From the current checkout or selected worktree, attach a named prototype:

   ```sh
   node ~/.agents/scripts/prototype.mjs init <slug>
   ```

   To target another checkout, append `--project <path>`.

4. Start it in the foreground (or supervise it with the process tooling):

   ```sh
   node ~/.agents/scripts/prototype.mjs dev <slug> [--port <number>]
   ```

   Append `--project <path>` when the prototype lives outside the current directory. When done, remove the disposable prototype and its local links with one command:

   ```sh
   node ~/.agents/scripts/prototype.mjs clean <slug>
   ```

   `clean` also accepts `--project <path>`, removes the prototype folder safely, and removes the now-empty `prototypes/` parent.

The initializer creates `prototypes/<slug>/prototype.tsx`, an entry HTML file, and local `.kit` and `node_modules` links to Prototype Kit. The generated `prototype.tsx` is project-owned and editable. Add local components and assets beside it as needed.

The authoring contract is intentionally small:

- `prototype.tsx` default-exports a `PrototypeDefinition` with a nonempty `title`, `question`, and one or more `variants`.
- Each variant has a unique `id`, a display `title`, and a React `component`.
- Import `Panel`, `ActionButton`, `StateInspector`, Excalidraw conversion helpers, and related types from `@prototype-kit`.
- Select variants with `?variant=<id>`. Unknown or missing IDs use the first variant; switching variants intentionally resets that preview while preserving the whiteboard.

The `.kit` and `node_modules` entries are symlinks into Prototype Kit. **Never edit files through those links.** Changes to the reusable workspace belong in the hub's `prototype-kit` directory; changes to an experiment belong in the attached worktree's visible source files.

## Whiteboard and state boundaries

Use the whiteboard for diagrams, labels, connections, and spatial alternatives. It is not synchronized with preview code or simulation state. Save and load are explicit diagram-only actions:

- **Save diagram** downloads a local `.excalidraw` scene, including image data.
- **Load diagram** validates a selected scene, asks before replacing an edited canvas, and leaves the current canvas untouched on cancellation or invalid input.

There is no automatic persistence or recovery. Preview interactions and state remain in memory, and reloading the page starts from the authored scene and initial preview state.

## Rules for useful experiments

1. Write down the question and the expected observation before coding.
2. Keep the relevant model portable and the browser controls thin; render the complete relevant state after actions.
3. Make variants structurally different when the question is comparative, not merely different colors or copy.
4. Use the host app's native framework only for a prototype that genuinely depends on its layout, auth, or data; otherwise use Prototype Kit's shared browser workspace.
5. Mark the workspace and source as disposable. Do not add production integrations, persistence, or backend claims unless those are the question.
6. Polish and verification are allowed when they help answer the question. Do not skip meaningful interaction checks merely because the code is throwaway.

The Prototype Kit itself is permanent maintained software: its behavior, security boundaries, and tests deserve normal engineering care. An attached prototype is disposable: after the question is answered, delete it or fold the validated decision into production.

## Capture the answer

Keep the question and observed answer in a durable artifact before deleting the experiment:

- Logic/state decision: `python3 ~/.agents/scripts/new-artifact.py --type decisions --topic "<verdict>"`
- Design decision: `python3 ~/.agents/scripts/new-artifact.py --type designs --topic "<verdict>"`
- Research finding: `python3 ~/.agents/scripts/new-artifact.py --type research --topic "<finding>"`

Never invent findings or claim an outcome without user or runtime evidence.
