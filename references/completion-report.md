# Completion Report

The report answers two questions: **what changed** that the requester didn't know before, and **what evidence proves it works** that the requester can trust. The session transcript is not the report.

Target length: trivial changes ≤3 sentences; non-trivial work ≤30 lines unless the change genuinely spans more.

## Trivial changes

Outcome, changed files, verification. Three sentences is enough.

## Non-trivial changes

Include only the blocks below that carry information; omit the rest — a missing block means "nothing to report here", not a defect.

### Outcome

2–3 sentences: what is now true that wasn't before, stated observably — not what you did. ("`X` now validates `Y` and returns 409 on duplicates", not "I added a validation function".)

### Verification

The block the requester actually checks. One compact line per important claim — command or method, observed result, and the behavior it proves:

- `cargo test validation` → 12 passed → duplicate-insert path returns 409
- `npm run typecheck` → clean → contract change is type-safe
- Not run: e2e suite (no browser env this session)

Never report a check as passing unless it was executed and its output inspected.

### Changed files

Group by intent, not chronology — one line per group, with purpose:

- Added `src/validation.ts` (rule engine)
- Removed `src/legacy-check.ts` (replaced by the engine)
- Touched `api/routes.ts` (wiring only)

### Risks and decisions

Only what needs the requester's call or awareness: assumptions, edge cases, follow-ups, and tradeoffs the human owns (contracts, auth, migrations, dependencies, deletions). End with the state of the work: complete, or what remains. Omit the block entirely if nothing qualifies — do not write "no risks".

## Optional blocks — only when they clarify

- **Architecture** — when the structure actually changed; focused Mermaid diagrams only.
- **Contracts** — when APIs or interfaces changed; include the exact shape or a pointer to it so callers can be verified.
- **Decisions** — material choices with the alternative considered and why it lost; omit if nothing was decided.
- **Rules deviated from** — rules you deliberately broke or deviated from, and why; not rules you followed.

## What not to report

- **Process narration** — how the work happened (searches, failed attempts) belongs in the working session, not the report.
- **Naming minutiae** — only significant names or renames and why they fit the domain; fold into Changed files otherwise.
- **Restating the diff** — the diff shows what changed; the report says why it exists and that it works.
- **Empty sections** — a missing section means "nothing to report here", not a defect.
