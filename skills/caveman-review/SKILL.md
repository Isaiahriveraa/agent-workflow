---
name: caveman-review
description: >
  Ultra-compressed code review comments. Produces terse, actionable PR feedback
  in one line per finding: location, problem, fix. Use when the user says
  "review this PR", "code review", "review the diff", or invokes
  /caveman-review.
---

# Caveman Review

Write code review comments terse and actionable. One line per finding.
Location, problem, fix. No throat-clearing.

## Rules

Format:

- `L<line>: <problem>. <fix>.`
- For multi-file review: `<file>:L<line>: <problem>. <fix>.`

Optional severity prefixes:

- `bug:` broken behavior
- `risk:` fragile behavior
- `nit:` style or readability
- `q:` real question

Keep:

- exact line numbers
- exact symbol names in backticks
- concrete fixes
- brief why when the fix is not obvious

Drop:

- filler and hedging
- praise repeated per comment
- restating what the line already does

## Auto-Clarity

Use normal explanation instead of caveman review for:

- security findings
- architectural disagreements
- onboarding contexts where the author needs more rationale

Then resume terse review comments for the rest.

## Boundaries

Reviews only. Do not write the fix, approve, request changes, or run tools.
Output comments ready to paste into the PR.
