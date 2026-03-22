---
description: Router for the GSD command namespace
---

# GSD Router

This command makes the GSD workflow a first-class command namespace in the hub.

## Resolution

Route these forms to the matching file under `commands/gsd/`:
- `/gsd:<subcommand>`
- `gsd <subcommand>`
- `gsd-<subcommand>`

For top-level workflow commands outside the `gsd` namespace, the shared workflow resolver also accepts underscore and hyphen variants when they map to one unambiguous command file. The canonical stored command name should still match the on-disk file name.

Examples:
- `/gsd:help` -> `commands/gsd/help.md`
- `gsd help` -> `commands/gsd/help.md`
- `gsd-plan-phase` -> `commands/gsd/plan-phase.md`
- `gsd memory-sync` -> `commands/gsd/memory-sync.md`
- `/gsd:memory-sync status` -> `commands/gsd/memory-sync.md`

If the user omits the subcommand, route to `commands/gsd/help.md`.

## Guardrails

- Do not invent behavior for a GSD request when `commands/gsd/<subcommand>.md` exists.
- Follow the matched `commands/gsd/<subcommand>.md` document exactly.
- If the subcommand is ambiguous, ask a focused question or list the closest matches from `commands/gsd/`.
