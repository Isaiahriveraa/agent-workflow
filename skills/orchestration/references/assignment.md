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

## Subagent prompt

For a subagent the prompt is the assignment. Make it self-contained: workers cannot see this conversation. Include the goal, scope, out-of-scope items, the acceptance evidence, any source excerpts, the repository instructions that apply, and the required report shape below. Tell it to stop and report if scope needs to grow.

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
