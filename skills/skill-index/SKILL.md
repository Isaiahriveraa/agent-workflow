---
name: skill-index
description: Ask which skill or flow fits your situation. A router over all your skills.
disable-model-invocation: true
---

# Skill Index

You don't remember every skill, so ask.

## The main flow: idea → ship

Start with the user problem and one intended outcome. Follow the experience-first,
risk-aware loop in [the workflow contract](../../references/workflow.md): system,
behavior, features, architecture, and implementation are views to move between,
not whole-product phases. No mandatory PRD or complete frontend before backend.
Investigate costly technical uncertainty early; skip discovery for settled fixes.

For UI product work, start from the frontend experience and discuss meaningful
backend needs together before implementation. One agreed direction goes directly
to production code once requested and approved; use disposable prototypes only
for unclear flows or competing UI designs. Showing the real feature is useful
feedback, not a mandatory separate demo. The agent codes unless hands-on practice
is requested.

Use the parts of this route that answer the current question:

1. **`/design`** — frame the user, problem, and current workaround; walk one experience before deriving essential features. Use `grill-with-docs` for unresolved decisions and `/prototype` discovery mode when the flow needs to be seen or tried. Record evidence and assumptions in numbered behavior cards under `context/designs/<slug>/`, not future implementation plans.
2. **`/skill:to-issues`** — turn the selected design topics into behavior-focused local tickets under `context/issues/<slug>/`. Review the drafts, then separately approve publication. New work does not require an implementation plan before a ticket exists.
3. **`/research` or `/plan [ticket]`** — resolve the next eligible item unless one is named. Research only missing facts; plan only one small end-to-end slice against current code, then obtain approval. Do not plan the backlog up front.
4. **`/implement [ticket]`** or **`/skill:issue-delivery <issue-number> [--plan <path>]`** — implement one ready item with its matching approved, fresh plan in an isolated worktree. Published delivery retains its delivery and publication gates; local implementation retains commit and PR approval. Never treat selection as permission to start a later stage.
5. **Small, obvious fix?** → implement directly with `/skill:tdd` and `/skill:implement`; the full design/ticket/plan path is for work that benefits from those handoffs.
6. **Sharpening an idea first?** → **`/skill:grill-with-docs`** — interview against the codebase. Writes glossary and ADRs to `context/`.
7. **Need to explain a question?** → **`/skill:explain`** — visual browser workspace with an Excalidraw whiteboard and live previews for schema, data-model, design, and logic questions. Route findings to the plan.
8. **Need to see or try the experience?** → **`/skill:prototype`** — discovery mode explores one flow cheaply; visual-comparison mode presents finished-quality alternatives when appearance or motion is the question. Record observations and return to design or the selected plan; selection does not authorize production work.
9. **Need a spec draft or issue?** → **`/skill:to-spec`** — synthesize the conversation locally (Problem/Stories/Decisions/OutOfScope); review before separate exact-content publication approval. No code/file-path planning.
10. **Standalone cited research?** → **`/skill:research`** — answer a concrete question using local evidence and primary sources; a standalone question needs no delivery queue.
11. **Ready to build?** → Build it. Use TDD (`/skill:tdd`), clean the diff (`/skill:code-judgment`), review changes (`/skill:code-review`), commit (`/skill:commit`).

Each stage owns a different question: design says what problem to solve, a ticket records the agreed behavior, a plan chooses how to change this repository, and delivery implements one approved ticket. Downstream stages reuse upstream intent and investigate only what their stage needs.

For next-item selection and reconciliation, read [the shared workflow contract](../../references/workflow.md). The ticket index is the sole execution queue. Verify prerequisites against live code before using the read-only CLI; ready candidates are not automatically parallel-safe. After feedback and integration, refresh the evidence and hand off the next item without starting it.

## Creative output

- **Make a project launch video** → **`/skill:brag`** — reads the project, plans a short project-specific storyboard, and uses Hyperframes to create and render a shareable video. Native skill dispatch may also expose it as `/brag`.

## Debugging & diagnosis

- **Bug or regression?** → **`/skill:diagnose`** — disciplined diagnosis loop: reproduce → hypothesise → fix → regression test.
- **Weird behavior with no repro?** → **`/skill:diagnose`** — evidence-driven hypothesis loop with competing hypotheses.

## Code quality & review

- **Clean and simplify a diff before review** → **`/skill:code-judgment`** — behavior-preserving cleanup: dead code, YAGNI, names, comments, module shape, cohesion/coupling. Runs after implementation, before `code-review`.

- **Full code review** → **`/skill:code-review`** — start at `SKILL.md`, which routes by mode and loads stage-specific references only as needed. Choose `--runner subagents|opencode|omp` (default: ask). Independent reviewers and an adjudicator return findings to the original harness; the specialized reviser proposes behavior-preserving simplification under main-model supervision, with a brief report. Behavior-changing fixes require the user's decision, including during hardening. External OpenCode/OMP runs use `--review-only --report <path>`; OpenCode has `scripts/opencode-review.mjs`, while OMP uses verified installed Herdr/CLI dispatch.
- **Question what a branch's code means, or critique it interactively** → **`/skill:pair-reviewer <branch-or-worktree>`** — resolves the target, gathers its plan, commit history, and code, then answers the current question in short plain conversation and stops, critiquing only when asked. Depth follows you: evidence, provenance, and the review method in `REVIEW-THINKING.md` come on request. Ask it to "probe me" and it hints at a defect instead of naming it, so you guess first. Read-only on the target; user-invoked.
- **Security audit** → **`/skill:security-review`**.

## Architecture & design

- **Codebase survey → implementation plans** → **`/skill:improve`** — read-only audit, prioritized findings, executor-ready plans in `plans/`. Audit only — planning lives in `/plan`.
- **Module, backend, schema, or architecture design** → **`/skill:codebase-design`** — ownership, invariants, information hiding, two real design alternatives, failure/change probes, and verification. Use for meaningful interface or dependency changes; routine CRUD/local fixes need only a quick existing-owner check. Technical guidance within the active workflow, not permission to implement or bypass approval.
- **Domain language** → **`/skill:domain-modeling`** — pin down fuzzy terms, sharpen the domain model.

## Frontend implementation

- **Page or application design guidance** → **`/skill:frontend-design`** — visual direction and design-system guidance for full layouts; use the shared uncertainty-driven prototype rule, not a mandatory demo.
- **Design, audit, or polish a product interface** → **`/skill:impeccable`** — broad UI craft and focused playbooks; compare alternatives only for an unresolved choice.
- **UI patterns across styles and stacks** → **`/skill:ui-ux-pro-max`** — searchable guidance for accessibility, layout, typography, and interaction; an agreed direction goes directly to authorized implementation.
- For overlapping visual guidance, choose one primary design skill for the task; supporting skills supply focused checks, not a second direction or approval loop. User choices and the project's design system take precedence over generic defaults. These design skills do not change the active implementation ownership mode.
- **Familiar UI behavior and visual craft** → **`/skill:ui-design`** — recognizable controls, mental models, useful skeuomorphism, hierarchy, layout, and rendered behavior critique; supplements existing frontend skills and approval gates.
- **Build frontend with the main agent implementing** → **`/skill:frontend-implement`** — the main agent is the sole writer of UI code; sub-agents only research, gather context, and propose plans (never write code). User-invoked.
- **Explore an experience or compare visual directions** → **`/skill:prototype`** — choose a lightweight discovery walkthrough for an unsettled flow, or two or more finished-quality visual directions, one per URL, when visual comparison is needed. Visual comparisons load `ui-design`; production still requires selection and its own approval gates.
- **Anti-slop landing page, portfolio, or redesign** → **`/skill:design-taste-frontend`** — reads the brief, infers the aesthetic direction, then ships with strict anti-pattern bans and a mandatory pre-flight check; not for dashboards or data-heavy product UI.
- **Explain a design/logic/schema question** → **`/skill:explain`** — the hub's Explain UI browser workspace (Excalidraw whiteboard + live previews).

## Planning & execution

- **Plan work** → **`/plan [ticket]`** — explicit target or next eligible ticket, inspected against current code: one reviewable outcome, test seams, baseline, and verification.
- **Understand or present an existing plan** → **`/skill:plan-standup-notes <plan-path>`** — turns the plan into compact iPad handwriting notes, a 30-second standup, and senior-level tradeoffs; explanation only, not implementation.
- **Design brief → tickets** → **`/skill:to-issues`** — drafts behavior-focused tickets without waiting for an implementation plan; after review and separate approval, optionally publishes them to GitHub.
- **Decision issues (compat)** → **`/skill:issue-discovery`** — ambiguous ideas → decision GitHub issues for discovery, not implementation tickets; planning now lives in `/plan`.
- **Research next work or a named question** → **`/skill:research`** — reuse local evidence, investigate only the missing facts, and link the findings to the selected item.
- **Agent too verbose** → say **`wait-what`** — forces a short, direct answer (3 lines).
## Session management

- **Default chat style** → **`caveman`** — load at session start for concise, answer-first replies. Keep learning and decision explanations useful; persisted writing stays normal. Say `normal mode` to disable it for the session or `/caveman` to re-enable it.

- **Handoff to new session** → **`/skill:handoff`** — compact conversation into handoff doc. Shorthand: **`/skill:ch`** — same flow, optional description.
- **Resume from handoff** → **`/skill:recall`** — pick up where a handoff left off.

## Testing

- **TDD cycle** → **`/skill:tdd`** — red-green-refactor, one test at a time. Reference [tests.md](../tdd/tests.md) and [mocking.md](../tdd/mocking.md).
- **E2E testing** → **`/skill:e2e-testing-patterns`** — Playwright/Cypress patterns.

## Productivity

- **Understand current code or practice reasoning** → **`/skill:tutor`** — diagnose the specific gap, trace real code, and choose a hint, focused explanation, or closely matched worked example. Hands-on practice does not complete the learner's task; ordinary delivery stays agent-written.
- **Learning sessions** → **`/skill:learn-plan`** — optional planning and explanation overlay; hands-on coding practice only when explicitly requested. Understanding while building does not require this skill. Ordinary backend collaboration stays in `/plan`.
- **Capture a future idea** → **`/skill:later`** — record a future improvement note in `future/` without implementing.
- **Commit + PR in one flow** → **`/skill:wf`** — commit skill then pr skill, two approval gates.

## Quick utilities

- **Resolve merge conflicts** → **`/skill:resolving-merge-conflicts`** — structured conflict resolution.
- **Dirty tree too big to commit** → **`/skill:split-dirty-worktree`** — inventory uncommitted changes and group them into concerns; dependent concerns require `gh stack` and a named branch-stack proposal, while independent concerns may use separate worktrees. Plan the commits for each branch. Read-only until approved, or end to end when the user says to just split it (autonomous mode); every PR opens as a draft. Hands the plan to `commit` and `pr`.
- **Commit** → **`/skill:commit`** — normal `commit` invocation runs the pre-commit code-review gate; `commit --no` explicitly skips that gate only. Stage whole files when all changes belong to one concern and use hunk staging only for mixed-concern files. Splitting is responsibility-first: the plan opens with a responsibility inventory, and a subject that joins two stories with "and" is a failure condition.
- **PR** → **`/skill:pr`** — auto-detects strategy (single PR, gh stack, or parallel worktrees) and generates review-ready PR descriptions focused on rationale and behavior.
- **Herdr terminal multiplexer** → **`/skill:herdr`** — inspect and control workspaces, tabs, panes, and coding agents inside Herdr.
- **Keep chatting while work runs in the background** → **`/skill:orchestration`** — assess a bounded assignment together, obtain approval, then use a background subagent or an independent CLI in its own Herdr pane/worktree. Keep coordinator focus, progress logs, and report-first handoffs; a Herdr notice is not an automatic model wake-up.
