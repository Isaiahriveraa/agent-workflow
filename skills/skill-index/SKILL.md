---
name: skill-index
description: Ask which skill or flow fits your situation. A router over all your skills.
disable-model-invocation: true
---

# Skill Index

You don't remember every skill, so ask.

## The main flow: idea → ship

Most work travels this route:

1. **`/design`** — user-invoked intent shaping: make the desired behavior and design-level decisions explicit in an evidence-backed design artifact for `/plan`.
2. **`/plan`** — the canonical planning entry point. Validate the design artifact and repository state, investigate only missing or stale evidence (including targeted external research), decompose concerns and dependencies, and produce a canonical execution plan for human approval.
3. **Plan approved?** → **`/skill:to-issues`** — mechanically compile only the approved plan into local parent/child issue drafts. Track drafts by file path and the plan manifest; preserve dependencies, work position, and acceptance criteria. After human approval of the issue set, publish a ready child issue (or explicitly single-concern issue) to GitHub, where published work is identified by its issue number; incomplete issues return to **`/skill:to-issues`** for enrichment before entering **`/skill:issue-delivery`**.
4. **Published issue ready?** → **`/skill:issue-delivery`** — receives one published, ready child issue (or explicitly single-concern issue), identified by its GitHub issue number, verifies dependencies and readiness, and delivers it through an isolated worktree to a verified draft PR; incomplete issues return to **`/skill:to-issues`** for enrichment. It does not create issues or schedule batches.
5. **Sharpening an idea first?** → **`/skill:grill-with-docs`** — interview against the codebase. Writes glossary and ADRs to `context/`.
6. **Need a prototype?** → **`/skill:prototype`** — throwaway code to answer a design question. Route findings to the plan.
7. **Need a spec issue?** → **`/skill:to-spec`** — synthesize the conversation into a GitHub spec issue (Problem/Stories/Decisions/OutOfScope) — no code/file-path planning.
8. **Standalone cited research?** → **`/skill:research`** — background-agent research using web search and primary sources, producing one cited Markdown evidence artifact; use it to fill a gap or independently when no upstream artifact exists.
9. **Ready to build?** → Build it. Use TDD (`/skill:tdd`), review changes (`/skill:code-review`), commit (`/skill:commit`).

Downstream stages validate and reuse upstream artifacts; they investigate only gaps and do not duplicate upstream design or research.

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

- **Plan work** → **`/plan`** — feature/engineering planning with proportionate, durable production decisions; records tradeoffs, guardrails, escalation signals, dependencies, and reviewable delivery steps.
- **Understand or present an existing plan** → **`/skill:plan-standup-notes <plan-path>`** — turns the plan into compact iPad handwriting notes, a 30-second standup, and senior-level tradeoffs; explanation only, not implementation.
- **Approved plan → issues** → **`/skill:to-issues`** — converts the approved plan into local parent/child issue drafts; after human approval, optionally publishes a ready child issue (or explicitly single-concern issue) to GitHub.
- **Decision issues (compat)** → **`/skill:issue-discovery`** — ambiguous ideas → decision GitHub issues for discovery, not implementation tickets; planning now lives in `/plan`.
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
- **Commit** → **`/skill:commit`** — normal `commit` invocation runs the pre-commit code-review gate; `commit --no` explicitly skips that gate only. Atomic staging uses whole-file staging for files belonging entirely to one concern and hunk staging only for mixed-concern files.
- **PR workflow** → **`/skill:pr-workflow`** — break work into PR-sized chunks.
- **Herdr terminal multiplexer** → **`/skill:herdr`** — inspect and control workspaces, tabs, panes, and coding agents inside Herdr.
- **Multi-context Herdr layout** → **`/skill:orchestration`** — propose a nested workspace/tab/pane tree, dispatch prompt-file-backed OMP agents, and supervise through lifecycle status
