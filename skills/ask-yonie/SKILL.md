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
4. **Need a plan with tickets?** → **`/skill:to-tickets`** — turn the request/plan/spec into a short implementation plan plus focused tickets, each sized for one reviewable PR.
5. **Huge foggy effort?** → **`/skill:issue-discovery`** — turn into decision issues on GitHub, resolve one per session.
6. **Ready to build?** → Build it. Use TDD (`/skill:tdd`), review changes (`/skill:code-review`), commit (`/skill:commit`).

## Debugging & diagnosis

- **Bug or regression?** → **`/skill:diagnose`** — disciplined diagnosis loop: reproduce → hypothesise → fix → regression test.
- **Weird behavior with no repro?** → **`/skill:diagnose`** — evidence-driven hypothesis loop with competing hypotheses.

## Code quality & review

- **Full code review** → **`/skill:code-review`** — parallel specialist agents auditing the diff.
- **Full code review** → **`/skill:code-review`** — three independent reviewers (behavioral, contract/spec, maintainability) + adjudicator. Covers both coding standards AND the spec/issue.
- **Security audit** → **`/skill:security-review`**.

## Architecture & design

- **Codebase survey → implementation plans** → **`/skill:improve`** — read-only audit, prioritized findings, executor-ready plans in `plans/`.
- **Deep module design vocabulary** → **`/skill:codebase-design`** — reference for designing good interfaces.
- **Domain language** → **`/skill:domain-modeling`** — pin down fuzzy terms, sharpen the domain model.

## Planning & execution

- **Make a plan with tickets** → **`/skill:to-tickets`** — plan + focused tickets for reviewable PRs.
- **Split a plan** → **`/skill:split-plan`** — break a big plan into simpler phases.
- **Issue discovery** → **`/skill:issue-discovery`** — huge effort too big for one session. Turn into decision issues on GitHub, work one ticket per session.
- **Research a topic** → **`/skill:research`** — background agent, primary sources, one cited Markdown output.
- **Agent too verbose** → say **`wait-what`** — forces a short, direct answer (3 lines).
## Session management

- **Handoff to new session** → **`/skill:handoff`** — compact conversation into handoff doc.
- **Resume from handoff** → **`/skill:recall`** — pick up where a handoff left off.

## Testing

- **TDD cycle** → **`/skill:tdd`** — red-green-refactor, one test at a time. Reference [tests.md](tdd/tests.md) and [mocking.md](tdd/mocking.md).
- **E2E testing** → **`/skill:e2e-testing-patterns`** — Playwright/Cypress patterns.

## Productivity

- **Learning sessions** → **`/skill:learn-plan`** — planning protocol for learning sessions.

## Quick utilities

- **Resolve merge conflicts** → **`/skill:resolving-merge-conflicts`** — structured conflict resolution.
- **Commit** → **`/skill:commit`** — atomic commit messages with single-story enforcement. Splits mixed concerns automatically.
- **PR workflow** → **`/skill:pr-workflow`** — break work into PR-sized chunks.
