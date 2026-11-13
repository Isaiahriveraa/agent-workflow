# Tracking, Verification, and Synthesis

## Status

Keep a compact status view for any run with more than one concern. Subagent runs can list their state in the conversation; CLI runs keep it in `status.md` (see `herdr.md`).

```text
Concern        Route        State           Latest update / next action
api-search     subagent     ready-for-review  report read; diff pending verify
ui-filters     subagent     working           —
```

States: `proposed`, `working`, `blocked`, `failed`, `timeout`, `ready-for-review`, `verified`. `timeout` means completion was not observed in the window; it is not failure and not success.

Read a worker's transcript only for `blocked`, `failed`, or a concrete diagnostic. Do not poll while the user is talking.

## Verification before "verified"

A concern is `verified` only after all of these:

1. Its report exists and has been read.
2. The actual diff or artifacts were checked against the acceptance criteria and scope.
3. The declared checks were run, or the gap is named.
4. Parent-level gates for the mode are met.

Mode-specific barriers:

- Source artifact and exact output root: always.
- Audit completion: only when an audit was requested, and it must finish before conversion.
- Issue-set approval and publication: only for those actions, each with its own authorization.

A prompt sent, an idle state, or a report alone never completes a concern.

## Notifications

A subagent's result returns to the main agent when it finishes; that result is the signal. For CLI workers, a Herdr toast alerts the user only; it does not wake the coordinator or inject into its context. Without a verified event route, say that results are collected on the next user turn or a requested status check. Do not claim automatic monitoring while idle.

## Final report

```markdown
## Completed

### <concern>
- State: verified | ready-for-review | blocked | failed | timeout
- Deliverables: <paths>
- Verification: <evidence>
- Risks: <none or explicit risk>

## Cross-Concern Decisions
- <layout, dependency, or interface decisions>

## Verification
- <commands and observed outcomes>

## Remaining Risks / Follow-ups
- <only real unresolved items>
```

Never claim the whole run is complete while any required concern is working, blocked, failed, timed out, missing its report, or unverified. Do not claim publication from a draft run.
