# Assignment and Child Report

## Assignment proposal (shown to the user before dispatch)

```text
Assignment: <stable-id>
Goal: <observable outcome>
Route: subagent | isolated CLI worker (Herdr only if requested)
Owner: <subagent_type or CLI kind>
Allowed changes: <paths, systems, behavior>
Non-goals: <other concerns, prohibited changes>
Start point: <commit or "read-only">   Worktree: <absolute path or n/a>
Checks: <commands or tests>
Report: <absolute path, or "final response">
Blocks: <dependencies, or none>
```

For a split, show one block per unit plus the integration order and any shared interface the units must agree on.

## Subagent prompt

For a subagent the prompt is the assignment. Use the shared brief in `~/.agents/references/agent-handoff.md`; workers cannot see this conversation. For implementation work, write these sections:

1. **Task** — one bounded deliverable, the stage it belongs to, and why it is needed now.
2. **Expected output** — exact file paths, signatures, and data shapes. The worker writes the bodies.
3. **Context** — relevant file paths with excerpts, existing patterns with exact references, sibling implementations, types, constants, and prior decisions.
4. **Conventions** — naming, error handling, imports, and testing patterns, with a reference file for each.
5. **Must do** — the edge cases to handle, the behavior to validate, and the pattern to match.
6. **Must not do** — files outside scope, new dependencies, type suppression, unrelated refactors, placeholders or TODOs.
7. **Done when** — a pass or fail checklist: outputs exist, tests pass, diagnostics are clean on changed files, scope held.

Tell the worker to stop and report if scope needs to grow, and to end with the report shape below.

Before dispatching, read each prompt literally, as the worker will:

- **It stands alone.** No "as discussed", no pronouns pointing at this conversation, no shorthand coined in this session.
- **Every word carries weight.** Use the project's canonical terms and exact names for files, symbols, commands, and flags. A worker guesses at ambiguity, and the guess becomes code.
- **Verbatim where exact.** Paths, identifiers, commands, and code fragments stay character for character.

If a worker would still need to ask where something lives or which pattern to follow, add that context before dispatch.

## Child completion report

Every child ends with this exact schema, in its response or at the declared report path. If the report is large, write it to the path and reply with only that path.

```text
Concern: <stable concern id>
State: done | blocked | failed
Result: <one sentence>
Source status: <the owning artifact's actual status, or none>
Issue-set status: draft | needs-review | blocked | none
Changed paths: <paths or none>
Verification: <commands and observed results, or not run with reason>
Assumptions/risks: <none or explicit items>
Handoff: <next agent, durable artifact path, or none>
```

Copy the owning artifact's status as-is; never translate it into a second execution state. A missing or malformed report keeps the concern unverified.

## Durable files (CLI workers and multi-run work only)

Subagents do not need files. When a run must persist (CLI workers, or work spanning sessions), use `context/orchestration/<run-id>/` in the coordinator checkout, or the repository's established coordination location if one exists. Keep secrets and unrelated conversation out. Do not commit runtime logs by default.
