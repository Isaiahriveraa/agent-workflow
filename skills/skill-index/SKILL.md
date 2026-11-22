---
name: skill-index
description: Ask which skill or flow fits your situation. A router over all your skills.
disable-model-invocation: true
---

# Skill Index

You don't remember every skill, so ask.

## Session profiles come first

The shared `AGENTS.md` selects interaction before delivery skills. Use `sprint`
for short attempt-first engineering, `ideation` for attempt-first problem and
option discovery, `school-learn` for course practice, `school-fast` for assignment
completion, `research` for concise evidence-based answers, and `tutor` when I
want to write the code myself with coaching. These are profiles
under `profiles/`, not additional skill pipelines. `coding` retains agent-written
delivery. Terminal launchers select one session; conversational mode changes do
not rewrite shared files. Research is also an activity within every mode.

Do not load this index at startup when the selected profile already owns the task.
The main delivery flow below applies to software delivery, not ordinary schoolwork,
standalone research, or ideation. Sprint's attempt-first ownership takes precedence
over default agent-written reasoning; coding safety and checks still apply.

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

1. **`/design`** — frame the problem (a brief that ends in invest, explore, defer, or stop), then write the what-and-why overview: vision, goals, scope, MoSCoW, flow, domain, and ordered slices. Brief and overview become the parent issue. Never an implementation plan.
2. **`/skill:to-issues`** — split the approved overview into delivery issues (user story, flow, edge cases, acceptance criteria), run the CRUD check, and on approval of the split create them as sub-issues on the product's GitHub Project.
3. **`/plan [issue]`** — when an issue is taken, plan how to answer it against today's code; approval means build. `/research` answers a Research issue's question. Nothing is planned before an issue is taken.
4. **`/implement [issue]`** — build the taken issue from its approved plan, moving its card on the Project. Commit and PR approval stay with the user.
5. **Small, obvious fix?** → follow AGENTS.md **Pick the speed before coding** (Quick or Small); the full design/issue/plan path is for work that benefits from those handoffs.
6. **Sharpening an idea first?** → **`/skill:grill-with-docs`** — interview against the codebase. Writes glossary and ADRs to `context/`.
7. **Need to see or try the experience?** → **`/skill:prototype`** — discovery mode explores one flow cheaply; visual-comparison mode presents finished-quality alternatives when appearance or motion is the question. Record observations and return to design or the selected plan; selection does not authorize production work.
8. **Standalone cited research?** → **`/skill:research`** — answer a concrete question using local evidence and primary sources; a standalone question needs no delivery queue.
9. **Ready to build?** → Build it. Use TDD (`/skill:tdd`), clean the diff (`/skill:code-judgment`), let the `hardener` agent add failure tests, review changes (`/skill:code-review`), then ship with `/wf-auto` for agent-built work or `/wf` when the user reviews.

Each stage owns a different question: design says what problem to solve, an issue records the agreed behavior, a plan chooses how to change this repository, and delivery implements one approved issue. Downstream stages reuse upstream intent and investigate only what their stage needs.

For how to choose the next issue, read [the shared workflow contract](../../references/workflow.md). The product's GitHub Project is the source of truth; Ready issues are not automatically safe to run in parallel. After feedback and integration, refresh the evidence and hand off the next item without starting it.

## Creative output

- **Make a project launch video** → **`/skill:brag`** — reads the project, plans a short project-specific storyboard, and uses Hyperframes to create and render a shareable video. Native skill dispatch may also expose it as `/brag`.

## Debugging & diagnosis

- **Bug or regression?** → **`/skill:diagnose`** — disciplined diagnosis loop: reproduce → hypothesise → fix → regression test.
- **Weird behavior with no repro?** → **`/skill:diagnose`** — evidence-driven hypothesis loop with competing hypotheses.

## Code quality & review

- **Clean and simplify a diff before review** → **`/skill:code-judgment`** — behavior-preserving cleanup: dead code, YAGNI, names, comments, module shape, cohesion/coupling. Includes authorized automatic test cleanup with retrospective Keep / Rewrite / Delete evidence and behavior contracts over implementation pins. Runs after implementation, before `code-review`.

- **Full code review** → **`/skill:code-review`** — start at `SKILL.md`, which routes by mode and loads stage-specific references only as needed. Choose `--runner subagents|opencode|omp` (default: ask). Independent reviewers and an adjudicator validate behavioral and concrete readability/design findings; the existing `complexity-reviser` directly performs authorized scoped test cleanup with retrospective Keep / Rewrite / Delete evidence. Unrelated design revisions retain proposal first, parent evaluation and authorization, behavior-preserving implementation, tests, then fresh independent validation. Fresh independent validation also follows automatic cleanup. No overlapping cleaner agent. Review-only and `--no-revise` skip cleanup; implementation ownership stays unchanged. Behavior-changing fixes require the user's decision, including during hardening. External OpenCode/OMP runs use `--review-only --report <path>`; OpenCode has `scripts/opencode-review.mjs`, while OMP uses verified installed Herdr/CLI dispatch.
- **Question what a branch's code means, or critique it interactively** → **`/skill:pair-reviewer <branch-or-worktree>`** — resolves the target, gathers its plan, commit history, and code, then answers the current question in short plain conversation and stops, critiquing only when asked. Invokes `codebase-design` for a proportional design lens; ask to learn a principle for a concrete example from the target. Depth follows you: evidence, provenance, and the review method in `REVIEW-THINKING.md` come on request. Ask it to "probe me" and it hints at a defect instead of naming it, so you guess first. Read-only on the target; available to Claude when requested by name.
- **Security audit** → **`/skill:security-review`**.

## Architecture & design

- **Codebase survey → implementation plans** → **`/skill:improve`** — read-only audit, prioritized findings, executor-ready plans in `plans/`. Audit only — planning lives in `/plan`.
- **Module, backend, schema, or architecture design** → **`/skill:codebase-design`** — ownership, invariants, information hiding, two real design alternatives, failure/change probes, and verification. Use for meaningful interface or dependency changes; routine CRUD/local fixes need only a quick existing-owner check. Technical guidance within the active workflow, not permission to implement or bypass approval.

## Frontend implementation

- For overlapping visual guidance, choose one primary design skill for the task; supporting skills supply focused checks, not a second direction or approval loop. User choices and the project's design system take precedence over generic defaults. These design skills do not change the active implementation ownership mode.
- **Familiar UI behavior and visual craft** → **`/skill:ui-design`** — recognizable controls, mental models, useful skeuomorphism, hierarchy, layout, and rendered behavior critique; supplements existing frontend skills and approval gates.
- **Explore an experience or compare visual directions** → **`/skill:prototype`** — choose a lightweight discovery walkthrough for an unsettled flow, or two or more finished-quality visual directions, one per URL, when visual comparison is needed. Visual comparisons load `ui-design`; production still requires selection and its own approval gates.
- **Generic-looking page or redesign of an existing site** → **`/skill:ui-design`** — its `references/anti-slop.md` lists the templated-output tells to ban and the redesign protocol.
- **Animation and micro-interactions** → **`/skill:animate`** — decide whether and how to animate, then build it.
- **Slow site** → **`/skill:performance`** — web performance audit and fixes for load time.

## Planning & execution

- **Plan work** → **`/plan [issue]`** — the implementation plan for a taken issue or a direct Full request, answering each acceptance criterion against current code.
- **Overview → issues** → **`/skill:to-issues`** — splits an approved overview into delivery issues and creates them on the GitHub Project once the split is approved.
- **Research next work or a named question** → **`/skill:research`** — reuse local evidence, investigate only the missing facts, and link the findings to the selected item.
- **Split a big task across parallel subagents** → **`/skill:orchestration`** — propose the split, get approval, give each worker a self-contained prompt, review every result, and send corrections back to the worker.
- **Agent too verbose** → say **`wait-what`** — forces a short, direct answer (3 lines).
## Session management

- **Handoff to new session** → **`/skill:handoff`** — compact conversation into handoff doc. Shorthand: **`/skill:ch`** — same flow, optional description.
- **Stop an active mode or workflow** → **`/skill:cancel`** — triggered by "cancel", "stop", or "abort".
- **Resume from handoff** → **`/skill:recall`** — pick up where a handoff left off.
- **Recall dirty work without a handoff** → **`/rw [worktree-path]`** / **`/skill:recall-worktree`** — a lightweight read-only subagent returns the detailed story, changed-file evidence, and context freshness assessment to the main agent. Does not resume implementation.

## Testing

- **TDD cycle** → **`/skill:tdd`** — red-green-refactor, one test at a time. Reference [tests.md](../tdd/tests.md) and [mocking.md](../tdd/mocking.md).
- **E2E testing** → **`/skill:e2e-testing-patterns`** — Playwright/Cypress patterns.

## Productivity

- **Practice navigating an unfamiliar repo (OA-style)** → **`/skill:codebase-drill`** — writes a spec of what the system must do and coaches me through implementing it; it never implements for me.
- **Organize or update Jira work (Codex only, `~/.codex/skills`)** → **`jira-tpm`** — inspect the live project, write actionable tickets, set real priorities and blockers, and verify the board after edits.
- **Re-derive a codebase's design decisions** → **`/skill:rederive`** — user-invoked only; learn through Socratic problems and incremental constraints using repository history and structure.
- **Capture a future idea** → **`/skill:later`** — record a future improvement note in `future/` without implementing.
- **Show what this Herdr tab is doing on the Board** → **`/skill:board`** — record goal, current step, next steps and blockers for this tab's card. Model-invoked during work; it does not replace the plan.
- **Commit + PR in one flow** → **`/wf`** command (commit skill, then pr skill) when I reviewed the work; **`/wf-auto`** (commit-review, then pr) for agent-produced work.

## Quick utilities

- **Resolve merge conflicts** → **`/skill:resolving-merge-conflicts`** — structured conflict resolution.
- **Dirty tree too big to commit** → **`/skill:split-dirty-worktree`** — inventory uncommitted changes and group them into concerns; dependent concerns require `gh stack` and a named branch-stack proposal, while independent concerns may use separate worktrees. Plan the commits for each branch. Read-only until approved, or end to end when the user says to just split it (autonomous mode); every PR opens as a draft. Hands the plan to `commit` and `pr`.
- **Commit (you review)** → **`/skill:commit`**: fast atomic commits with no subagents.
- **Commit (agent work, independent check)** → **`/skill:commit-review`**: same grouping, plus commit-pr-reviewer approval and an optional code-review gate. Stage whole files when all changes belong to one concern and use hunk staging only for mixed-concern files. Splitting is responsibility-first: the plan opens with a responsibility inventory, and a subject that joins two stories with "and" is a failure condition.
- **PR** → **`/skill:pr`** — auto-detects strategy (single PR, gh stack, or parallel worktrees) and generates review-ready PR descriptions focused on rationale and behavior.
- **Herdr terminal multiplexer** → **`/skill:herdr`** — inspect and control workspaces, tabs, panes, and coding agents inside Herdr.
- **Keep chatting while work runs in a subagent** → **`/skill:orchestration`** — assess a bounded assignment together, obtain approval, then dispatch a subagent (default). Use an isolated Herdr pane/worktree CLI worker only when the user explicitly asks for Herdr or a separate agent session; details in the skill's `references/herdr.md`.
