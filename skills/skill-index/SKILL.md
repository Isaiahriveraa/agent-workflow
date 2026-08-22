---
name: skill-index
description: Ask which skill or flow fits your situation. A router over all your skills.
disable-model-invocation: true
---

# Skill Index

You don't remember every skill, so ask.

## The main flow: idea → ship

Most work travels this route:

1. **`/plan`** — the canonical planning entry point. Use it for feature/engineering planning, messy product intent, repository research for a planned change, concern decomposition, dependencies, parallelism, stacking analysis, and plan-file generation. The output is a plan file for human approval.
2. **Plan approved?** → **`/skill:to-tickets`** — converts the approved plan into focused tickets, each sized for one reviewable PR.
3. **Sharpening an idea first?** → **`/skill:grill-with-docs`** — interview against the codebase. Writes glossary and ADRs to the plan server.
4. **Need a prototype?** → **`/skill:prototype`** — throwaway code to answer a design question. Route findings to the plan.
5. **Need a spec issue?** → **`/skill:to-spec`** — synthesize the conversation into a GitHub spec issue (Problem/Stories/Decisions/OutOfScope) — no code/file-path planning.
6. **External cited research?** → **`/skill:research`** — background agent, primary sources, one cited Markdown output.
7. **Ready GitHub issue to ship?** → **`/skill:issue-delivery`** — isolated worktree → verified draft PR (a separate issue-to-PR path, not part of the planning flow).
8. **Ready to build?** → Build it. Use TDD (`/skill:tdd`), review changes (`/skill:code-review`), commit (`/skill:commit`).

## Debugging & diagnosis

- **Bug or regression?** → **`/skill:diagnose`** — disciplined diagnosis loop: reproduce → hypothesise → fix → regression test.
- **Weird behavior with no repro?** → **`/skill:diagnose`** — evidence-driven hypothesis loop with competing hypotheses.

## Code quality & review

- **Full code review** → **`/skill:code-review`** — parallel specialist agents auditing the diff.
- **Full code review** → **`/skill:code-review`** — three independent reviewers (behavioral, contract/spec, maintainability) + adjudicator. Covers both coding standards AND the spec/issue.
- **Security audit** → **`/skill:security-review`**.

## Architecture & design

- **Codebase survey → implementation plans** → **`/skill:improve`** — read-only audit, prioritized findings, executor-ready plans in `plans/`. Audit only — planning lives in `/plan`.
- **Deep module design vocabulary** → **`/skill:codebase-design`** — reference for designing good interfaces.
- **Domain language** → **`/skill:domain-modeling`** — pin down fuzzy terms, sharpen the domain model.

## Frontend implementation

- **Build frontend with the main agent implementing** → **`/skill:frontend-implement`** — the main agent is the sole writer of UI code; sub-agents only research, gather context, and propose plans (never write code). User-invoked.

## Planning & execution

- **Plan work** → **`/plan`** — feature/engineering planning, messy product intent, concern decomposition, dependencies, parallelism, stacking; writes a plan file for approval.
- **Approved plan → tickets** → **`/skill:to-tickets`** — converts the approved plan into focused tickets, one per reviewable PR.
- **Publish an existing plan** → **`/skill:plan-server`** — explicitly writes the plan to the plan server and returns its URL.
- **Decision issues (compat)** → **`/skill:issue-discovery`** — ambiguous ideas → decision GitHub issues; planning now lives in `/plan`.
- **External cited research** → **`/skill:research`** — background agent, primary sources, one cited Markdown output.
- **Agent too verbose** → say **`wait-what`** — forces a short, direct answer (3 lines).
## Session management

- **Handoff to new session** → **`/skill:handoff`** — compact conversation into handoff doc. Shorthand: **`/skill:ch`** — same flow, optional description.
- **Resume from handoff** → **`/skill:recall`** — pick up where a handoff left off.

## Testing

- **TDD cycle** → **`/skill:tdd`** — red-green-refactor, one test at a time. Reference [tests.md](tdd/tests.md) and [mocking.md](tdd/mocking.md).
- **E2E testing** → **`/skill:e2e-testing-patterns`** — Playwright/Cypress patterns.

## Productivity

- **Learning sessions** → **`/skill:learn-plan`** — planning protocol for learning sessions.
- **Capture a future idea** → **`/skill:later`** — record a future improvement note in `future/` without implementing.
- **Commit + PR in one flow** → **`/skill:wf`** — commit skill then pr-workflow, two approval gates.

## Quick utilities

- **Resolve merge conflicts** → **`/skill:resolving-merge-conflicts`** — structured conflict resolution.
- **Commit** → **`/skill:commit`** — runs an informational pre-commit review gate (unless the diff was already reviewed), then atomic commit messages with single-story enforcement. Splits mixed concerns automatically.
- **PR workflow** → **`/skill:pr-workflow`** — break work into PR-sized chunks.
