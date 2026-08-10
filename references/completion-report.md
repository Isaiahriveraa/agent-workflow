# Completion Report

Use the smallest report that preserves human ownership. The report answers two questions: what changed, and what evidence proves it works.

## Trivial changes

Outcome, changed files, verification. Three sentences is enough.

## Non-trivial changes

Include only sections that carry information; drop empty ones.

1. **Outcome** — The observable result and why it matters to the requester. State what is now true that wasn't before.
2. **Decisions** — Material choices with rationale and tradeoffs. Include the alternative considered and why it lost. Omit if nothing was decided.
3. **Architecture** — Static structure and runtime flow, with focused Mermaid diagrams only when they clarify. Omit for changes that don't alter structure. Show the new FileTree and the previous FileTree side by side.
4. **Contracts** — Added/changed APIs, interfaces, traits, schemas, events; owners, consumers, failure modes, and tests. Include the exact shape (or pointer to it) so a reader can verify callers still match.
5. **Verification** — For each important claim: the command or method, the observed result, and the behavior it proves. State checks not run and why. Never report a check as passing unless it was executed and its output inspected.
6. **Changed files** — Created, modified, moved, and deleted files with purpose. Group by intent, not chronology.
7. **Risks** — Assumptions, edge cases, non-goals, and required follow-up. End with the state of the work: complete, or what remains.
8. **Rules applied** — Report rules you *broke* or deliberately deviated from, not rules you followed.

## What not to report

- **Naming** — Only significant names or renames and why they fit the domain; fold into Changed files or Decisions otherwise.
- **Process narration** — How the work happened (searches, failed attempts) belongs in the working session, not the report.
- **Empty sections** — A missing section means "nothing to report here", not a defect.
