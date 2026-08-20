# Technical Spec Template

Copy this format when writing a feature spec. The spec must reflect the actual repo — its real language, framework, layer names, and conventions — not generic advice. Fill every section from repo evidence; never assume field names or abstractions.

A spec gives enough to know **what** the system must do, and not enough to know **how** to implement it. Document behavior; never the implementation.

## Spec format

```markdown
# <Feature Name>

## Overview
One or two sentences: what this feature is and why.

## Current Repo State
What already exists, in the repo's own layer names (entry points, business logic,
data access, schema, helpers, cross-cutting concerns, tests, presentation if any).

## Current Problems
What is broken, missing, or incomplete.

## Task
The specific change to implement — stated as the target behavior, not the code.

## Expected API Behavior
Method + endpoint / command / event, and the observable result.
For a non-API repo, describe the entry point's observable behavior instead
(return value, output, side effect).

## Inputs
Path params, query params, body, auth, relevant types — in the repo's own terms.
Note type conversions that matter (e.g. a query param arriving as a string).

## Business Rules
Rules in plain English. Which layer owns each rule.

## Success Response
Exact response shape or observable result.

## Error Responses
Every expected failure mapped to its result and condition:
- `not found` — record missing
- `invalid input` — which field, which rule
- `not allowed` — record belongs to another owner
- `conflict` — duplicate / invalid state transition
Only the "unexpected" error for the truly unhandled case.
For an HTTP API, map each to a status code (400/401/403/404/409/429/500).

## Edge Cases
Boundary conditions and inputs outside the happy path.
See the Edge Cases checklist below when relevant.

## Existing Code to Study
- `path/to/similar/<entry-point>` — why it is relevant
- `path/to/similar/<business-logic>` — pattern to copy conceptually
- `path/to/<helper>` — reusable logic
- `path/to/<schema-or-model>` — fields/relationships to understand
- `path/to/similar/<presentation>` — how the UI fetches/renders (only if a UI exists)
- `path/to/<client-or-seam>` — how one layer calls the next (only if applicable)

Do NOT explain the final implementation.

## Files Likely Involved
List only files supported by repo evidence, grouped by layer using the repo's own names.

## Implementation Checklist
- [ ] ...
- [ ] ...

## Testing
The narrowest relevant test command.
What behavior the tests should assert (behavior, not implementation).

## Debugging Notes
Symptoms the user should be able to observe.
Do not reveal root causes before they investigate.
```

## Edge Cases (consult when relevant)

Use these in specs and tests — do not hand them over every time:

- missing identifier
- missing query/input parameter
- invalid identifier format
- string ↔ number conversion (query params arrive as strings)
- 0 / negative / decimal quantity
- resource not found
- resource belongs to another owner/parent
- unauthenticated
- unauthorized / forbidden
- invalid state transition
- duplicate operation
- capacity / rate exceeded
- boundary thresholds (off-by-one, `>` vs `>=`)
- stale cache after mutation
- pagination extremes
- unexpected enum / unknown value

Client-side and async edge cases (only if the app has a UI or async flows):

- network failure / timeout → error state
- loading / empty / error states
- optimistic update that fails → rollback
- race condition (rapid requests, out-of-order response)
- stale closure / captured old value
- missing/duplicate list key
- encoding / special characters in input
- null vs undefined vs missing field in a response

## Debug Bug Catalog

Plant 1–3 of these in practice drills. Bugs must be realistic, locally debuggable, visible through tests/logs, and tied to patterns the user needs to learn:

General:

- wrong relative import / reference path
- missing file extension
- chain step not forwarded (a "next"-style call omitted, or an async call not awaited)
- wrong helper name
- wrong model field
- generic error used where a specific error type belongs (a 500 where a 404 was intended)
- incorrect parent/child database query (missing ownership/filter constraint)
- query parameter left as a string
- wrong boundary condition (`>` vs `>=`)
- unit conversion bug (0.8 vs 80)
- stale cache after mutation
- incorrect response property (shape mismatch)
- off-by-one pagination
- incorrect status/state transition

Client-side / async (only if applicable):

- missing `await` on an async call
- stale closure capturing an old value
- race condition from an out-of-order response
- missing key on a rendered list
- optimistic update without rollback on failure
- wrong error surfaced to the UI

Never reveal the bug location. Hand over a symptom instead: a failing test, a runtime error, a request/response mismatch, or log output.
