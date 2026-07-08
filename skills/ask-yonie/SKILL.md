---
name: ask-yonie
description: Ask which skill or flow fits your situation. A router over all your skills.
disable-model-invocation: true
---

# Ask Yonie

You don't remember every skill, so ask.

## The main flow: idea → ship

Most work travels this route:

1. **`/skill:grill-with-docs`** — sharpen the idea by interview against the codebase. Writes to plan server glossary and ADRs.
2. **Need a prototype?** → **`/skill:prototype`** — throwaway code to answer a design question. Route findings to plan server.
3. **Need a spec?** → **`/skill:to-spec`** — synthesize conversation into a spec issue on GitHub.
4. **Need tickets?** → **`/skill:to-tickets`** — break the plan/spec into vertical-slice issues with blocking edges.
5. **Need a phased plan?** → **`/skill:plan`** — decompose research/explore docs into phases with success criteria.
6. **Need discovery first?** → **`/skill:discover`** → **`/skill:research`** → **`/skill:explore`** → **`/skill:plan`**
7. **Huge foggy effort?** → **`/skill:wayfinder`** — map as investigation tickets on GitHub Issues, resolve one per session.
8. **Ready to build?** → Build it. Use TDD (`/skill:tdd`), review changes (`/skill:code-review` or `/skill:review`), commit (`/skill:commit`).

## Debugging & diagnosis

- **Bug or regression?** → **`/skill:diagnose`** — disciplined diagnosis loop: reproduce → hypothesise → fix → regression test.
- **Weird behavior with no repro?** → **`/skill:trace`** — evidence-driven causal tracing with competing hypotheses.

## Code quality & review

- **Full code review** → **`/skill:code-review`** — parallel specialist agents auditing the diff.
- **Two-axis review** → **`/skill:review`** — checks against BOTH coding standards AND the spec/issue.
- **Security audit** → **`/skill:security-review`**.

## Architecture & design

- **Explore architecture friction** → **`/skill:improve-codebase-architecture`** — scan for deepening opportunities, present HTML report.
- **Deep module design vocabulary** → **`/skill:codebase-design`** — reference for designing good interfaces.
- **Domain language** → **`/skill:domain-modeling`** — pin down fuzzy terms, sharpen the domain model.

## Planning & execution

- **Interview requirements** → **`/skill:discover`** — one-question-at-a-time interview → FRD on plan server.
- **Research the codebase** → **`/skill:research`** — background subagent → synthesized findings on plan server.
- **Explore solution options** → **`/skill:explore`** — compare approaches with pros/cons/tradeoffs.
- **Make a phased plan** → **`/skill:plan`** — decompose research/explore into phases with success criteria.
- **Revise a plan** → **`/skill:revise`** — surgically update an existing plan.
- **Split a plan** → **`/skill:split-plan`** — break a big plan into simpler phases.
- **Wayfinder** → **`/skill:wayfinder`** — huge effort too big for one session. Map on GitHub Issues, work one ticket per session.

## Session management

- **Handoff to new session** → **`/skill:handoff`** — compact conversation into handoff doc.
- **Resume from handoff** → **`/skill:recall`** — pick up where a handoff left off.

## Testing

- **TDD cycle** → **`/skill:tdd`** — red-green-refactor, one test at a time. Reference [tests.md](tdd/tests.md) and [mocking.md](tdd/mocking.md).
- **E2E testing** → **`/skill:e2e-testing-patterns`** — Playwright/Cypress patterns.

## Productivity

- **Learning mode** → **`/skill:learning-mode`** — structured learning contract.
- **Ping-pong technique** → **`/skill:ping-pong`** — two AI models debate a plan.
- **Plow ahead** → **`/skill:plow-ahead`** — autonomous progress without routine stops.
- **Ralph** → **`/skill:ralph`** — persistence loop until 100% completion.

## Quick utilities

- **Resolve merge conflicts** → **`/skill:resolving-merge-conflicts`** — structured conflict resolution.
- **Prime a repo** → **`/skill:prime`** — load minimum context before planning.
- **Commit** → **`/skill:commit`** — atomic commit messages with single-story enforcement. Splits mixed concerns automatically.
- **PR workflow** → **`/skill:pr-workflow`** — break work into PR-sized chunks.
