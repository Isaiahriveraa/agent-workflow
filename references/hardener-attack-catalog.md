# Attack testing catalog

An independently worded summary of testing techniques highlighted in
[Jeremy Kamber's attack catalog](https://github.com/jeremykamber/jnk-skills/blob/main/skills/attack/references/attack-catalog.md).
This reference supplies test ideas, not a second hardening workflow; the
hardener's existing method, scope, and approval boundaries still apply.

## Choose attacks for the actual contract

Start with the required behavior and invariants. Identify what crosses a trust
boundary, what state survives calls, and which dependencies can fail. Choose
attacks most likely to expose a consequential defect in the changed behavior.
Do not feed impossible internal states into a typed interface unless a real
external entry point can produce them. If expected behavior is unclear, report
the missing decision rather than inventing an oracle.

## Inputs and calculations

- **Limits:** test just below, at, and just above a documented boundary;
  include zero and negative values when the public interface can receive them.
- **Invalid classes:** try malformed or missing fields, unsupported values,
  and wrong types at the boundary responsible for validation.
- **Strings:** try empty and whitespace-only input, combining characters,
  emoji, and limits whose byte count differs from the character count.
- **Collections:** use zero, one, and multiple items; duplicates; reordered
  input; and sizes that cross a batch or pagination boundary.
- **Formats:** try truncated records, extra fields, incompatible versions,
  and partial writes where the feature reads external data.
- **Numbers:** probe overflow, truncation, rounding, division by zero, NaN,
  and infinity where the runtime and contract make them reachable. For money,
  derive expected totals from the product's rounding rule, not current output.
- **Scale:** test a realistic larger input when the change can introduce
  excessive work, resource use, or pagination loss. Avoid arbitrary huge loads.

## State, time, and dependencies

- **Lifecycle:** test first use, an empty store, deleting the final item,
  repeated requests, and operations performed in a different valid order.
- **Interruption:** fail between side effects; check rollback, cleanup, and
  recovery after a retry or restart.
- **Shared state:** check that one request, user, session, or test does not
  leak data or mutable state into another.
- **Resources:** repeat an operation when it owns files, connections, or locks;
  verify that failure paths release what they acquire.
- **Time:** cross an expiry, month/year boundary, leap day, or daylight-saving
  transition only when that calendar or clock behavior belongs to the feature.
- **Environment:** remove a required file, deny access, interrupt the network,
  or exhaust a relevant quota using controlled fixtures rather than real systems.
- **Concurrency:** exercise reachable double submissions, check-then-write
  races, or competing updates with controlled interleavings. Passing a unit
  test is not proof of production behavior under load; name that limitation.

## Properties across many inputs

Use properties only when the contract promises them:

- **Round-trip:** decoding an encoded value preserves the promised data.
- **Idempotence:** repeating the operation produces no additional effect.
- **Inverse:** performing and undoing an operation restores the relevant state.
- **Ordering:** permuting input preserves the result when order is irrelevant.
- **Conservation:** totals, membership, uniqueness, or balances remain valid.
- **Monotonicity:** increasing an input cannot decrease a promised result.
- **Robustness:** supported inputs cannot cause an undocumented exception or
  corrupt state; invalid inputs follow the specified rejection path.

## Challenge the tests too

Check that the test reaches the public behavior, executes its assertions,
and derives its expected result from the requirement rather than the code.
Watch for swallowed exceptions and fixtures that never enter the target path.

Where existing project tooling supports mutation testing, use it to challenge
the assertions. Inspect timeouts and runner errors before interpreting a score.
Confirm a survivor against the full relevant suite before calling it a missing
assertion: a scoped run may have omitted the test that catches it. Do not add
mutation tooling or weaken thresholds as part of hardening without approval.

Report the concrete attacks exercised and the relevant limits of the evidence.
An all-green run covers those attacks in that environment, not every possible
failure or a guarantee that the feature has no bugs.
