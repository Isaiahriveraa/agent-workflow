# Agents Workflow Hub

Shared operating contract for thinking, learning, research, and coding across terminal agents. Commands, agents, skills, and adapters live here. Machine-local state does not.

## About

`AGENTS.md` selects a session profile before loading a workflow. Adapters bridge tool ergonomics; coding delivery loads its detailed contract only when needed. The previous coding rules are preserved in `references/coding-contract.md`.

The hub serves Claude Code, Codex CLI, OpenCode, Antigravity/Gemini, and Cursor CLI from the same commands, agents, and skills.

```
┌──────────────────────────────┐
│  Claude Code                 │
│  Codex CLI / OpenCode        │
│  Antigravity / Gemini        │
└──────────┬───────────────────┘
           │
┌──────────▼───────────────────┐
│  adapters/                   │  tool-specific ergonomics
│  (symlinks, wrappers, gen)   │  same contract underneath
└──────────┬───────────────────┘
           │
┌──────────▼───────────────────┐
│  AGENTS.md                   │  single source of truth
│  commands/  agents/ skills/  │  shared workflow contract
│  scripts/  manifest.json     │
└──────────────────────────────┘
```

## Session modes

Run these from the directory you want to work in. Each starts an independent
session; it does not swap shared files or change another terminal's mode.

```sh
sprint                    # attempt-first engineering, defaults to Pi
ideation                  # attempt-first problems and solution options
school-learn              # attempt-first course learning
school-fast               # organize and complete assignment work
research                  # concise, evidence-based answers
coding                    # ordinary agent-written software delivery
sprint --harness claude    # Claude Code
sprint --harness codex     # Codex CLI
```

The executable aliases point to `scripts/workflow-session.mjs`. Without aliases,
use `node ~/.agents/scripts/workflow-session.mjs sprint`, or `aw sprint`.
Set `AGENT_HARNESS=pi|claude|codex` to choose a default. Place `--harness` immediately
after the mode (or first after an alias); remaining arguments pass through to the
harness. The launcher appends only the mode's profile; the harness already loads
`AGENTS.md` itself.

Sprint and Ideation use one 3–5 minute attempt at a time, capped at 10 minutes
unless requested. The agent gives one concrete task and waits before revealing a
solution. Your existing voice dump or notes can count as the attempt. Afterward,
it synthesizes your reasoning, identifies one gap, and helps you revise. Explicit
hints, examples, and bounded delegation remain available. School Learn adapts
this loop to course material; School Fast does not impose tutoring.

Inside a session, say "switch to sprint", "school learn", "school fast",
"research mode", "ideation mode", or "coding mode". A bounded request such as
"research this API" stays inside the current mode and returns to the pending
question. Switching is instruction-based, not a harness-native command or a
mechanical guarantee that a model will obey. Existing sessions may retain older
loaded instructions; explicitly ask them to reread `~/.agents/AGENTS.md`.

For an actual local countdown, open `~/.agents/profiles/timer.html` in a browser
(`open ~/.agents/profiles/timer.html` on macOS), select the duration, and click
Start. It needs no server or dependencies. It does not send system notifications
or communicate with the agent. HTML flow diagrams should likewise stay small and
self-contained rather than launching the full Explain UI for every sketch.

The launchers add the shared contract and selected profile to Pi/Claude system
instructions or Codex developer instructions. They do not disable project rules,
permissions, hooks, extensions, or skill discovery. Other installed hooks and
stale adapter copies can still add context; this is not a claim that all harness
startup overhead has been removed. Relevant repository safety still applies.

## Coding workflow

The coding workflow is experience-first and risk-aware: understand the user problem, make uncertain interactions visible, agree on behavior, then derive essential features and plan one end-to-end slice. System, behavior, feature, architecture, and implementation are views to move between, not whole-product phases. A PRD is optional; building the whole frontend before backend is not the goal. Local drafts are tracked by file path; published work is identified by GitHub issue number.

```
/design: user problem + experience walkthrough
↔ /prototype discovery when needed → agreed behavior + essential features
→ local tickets + dependency queue
→ /research [item] when needed → /plan [item] → human plan approval
→ /implement [item] → TDD → cleanup → code review → human feedback
→ approved commit / draft PR → verified integration → refresh queue

or

/implement (for a small, obvious fix that does not need the full workflow)
```
Design captures intent, task observations, assumptions, behavior examples, prerequisites, and provisional parallel groups. Discovery can return to earlier questions at any time; it does not authorize production work. The ticket index owns execution state. Research, planning, and implementation honor a named item or resolve the next eligible one from current evidence. Only that small slice is planned; implementation requires its matching approved, fresh plan. Each invocation stops at the requested stage. Publication, commits, PRs, and merge keep their separate human gates.

Choose the next activity by uncertainty: investigate users for an unclear need, sketch or prototype an unclear interaction, and research a concrete feasibility gap before promising it. Examine costly decisions such as permissions, sensitive data, payments, and migrations early. Once behavior and feasibility are understood, stop exploring and build one tested flow across the necessary layers. Borrow rapid prototyping from RAD, feedback cycles from Agile, and upfront analysis for expensive commitments; do not impose every stage on a small fix.

Humans own product priorities, experience judgment, and consequential decisions. AI challenges assumptions, compares flows, explains architecture from the user action backward, and implements agreed behavior. Prototype approval is not evidence of demand or production correctness; record what users actually tried and what remains untested.

For UI product work, start from the frontend experience and discuss meaningful
backend needs together before coding them. One agreed direction goes directly to
production code once implementation is requested and approved. Use disposable
prototypes only to understand an unclear flow or compare UI designs. Show the
actual feature when useful; not every change needs a demo or a throwaway version.
The agent writes code unless the user explicitly requests hands-on tutor mode.

The shared [workflow contract](references/workflow.md) defines the Markdown queue, reconciliation, and the read-only `scripts/workflow.py` selection/approval/drift gate. A draft PR is `in-review`, not `done`; parallel candidates require a fresh overlap check. After feedback or integration, refresh the owning artifacts and identify the next item without automatically starting it.

### Pipeline stages

| Stage | Skill | What it produces | Where |
|-------|-------|------------------|-------|
| Design | `/design` + `grill-with-docs` | Numbered behavior cards, meaningful scenarios, dependencies, and provisional parallel groups | `context/designs/<slug>/` |
| Discovery, when needed | `prototype` discovery mode | Sketch or focused interactive flow, task observations, and unresolved assumptions | Linked from the owning design card |
| Tickets | `to-issues` | Behavior-focused local tickets; review drafts, then separately approve publication | `context/issues/<slug>/` → GitHub issue numbers |
| Research | `/research [item or question]` | Only the missing facts for an explicit or next eligible item; standalone questions supported | `context/research/` linked from queue |
| Plan | `/plan [ticket]` | One current-code-based slice, test seams, Git baseline, and verification; awaiting approval | `context/plans/<slug>/` |
| Delivery | `/implement [ticket]` or `issue-delivery <issue> [--plan <path>]` | One approved concern through an isolated worktree, TDD, cleanup, review, and human gates | Queue → branch/worktree → draft PR |

### How to choose

1. **New behavior or feature** → `/design`: user problem and walkthrough → discovery prototype if needed → agreed behavior and essential features → local ticket queue → risk-driven research → `/plan` → approve plan → `/implement`; publish tickets separately when GitHub delivery is wanted
2. **Already have a published issue** → `/plan <issue>` → approve the plan → `/skill:issue-delivery <issue> --plan <path>`
3. **Small, obvious fix** → `/skill:tdd` and `/skill:implement`; skip design and planning when they add no value
4. **Need to clarify behavior** → `/design`; **need to record a decision** → `/skill:issue-discovery`
5. **Standalone cited research** → `/skill:research` — use only when a concrete evidence gap needs it
6. **Audit an existing codebase** → `/skill:improve` — read-only survey, then use findings in design or a selected ticket's plan
7. **Sharpen an idea** → `/skill:grill-with-docs`
8. **Ask which skill fits** → `/skill:skill-index`

## Commands

Slash commands in `commands/` extend the tool's native surface:

| Command | Description |
|---------|-------------|
| `/ch` | Create a handoff document to resume work in a future session |
| `/rw [worktree-path]` | Recall dirty work through a detailed read-only subagent report; flag outdated context without resuming implementation |
| `/later` | Record a future improvement idea as a scannable note in `future/` |
| `/wf` | Commit the current work with `commit-review`, then push and open a draft PR. |

Workflow skills (`spawn`, `enforce`, `pr`, `to-issues`) are invoked via `skill(name="skill-name")`, not slash commands.

Worktree tooling in `scripts/` supports the one-concern-per-branch discipline: `new-worktree.sh <branch>` creates an isolated worktree per branch under `<repo>-worktrees/<branch path>` (e.g. `iuga-worktrees/feat/merch-page`), `cleanup-worktree.sh <branch>` tears it down after merge. New branch names must follow `<type>/<short-description>` with lowercase words joined by hyphens — `scripts/branch-name-rules.sh` rejects process words and dates (override: `WORKTREE_SKIP_NAME_CHECK=1`).

`scripts/slop-lint.py` flags AI-slop words and phrases in Markdown prose; run `python3 ~/.agents/scripts/slop-lint.py <file-or-dir>` over docs you write. The `design` and `plan` skills check their output with it.

`scripts/plan-lint.py` checks plan step files declare their interface impact — a `new` or `changed` boundary needs an interface sketch and a rejected alternative (design it twice); run `python3 ~/.agents/scripts/plan-lint.py <file-or-dir>` over plan outputs. The `plan` skill checks its output with it.

`scripts/workflow.py select <queue-index> [--target <id>]` reports the next eligible item and blockers as JSON. `check <queue-index> --target <id> --plan <path> [--base <ref>]` validates approval, identity, and scoped Git drift before execution. Both are read-only; neither grants consent or proves behavior from status labels.

### Explain UI browser workspace

`Explain UI` provides the default browser workspace for disposable whiteboard, schema, logic, and visual-design experiments. Attach it directly to the current Git checkout, or use a linked worktree when stronger isolation is useful:

```sh
npm ci --prefix <hub>/skills/explain/explain-ui
node ~/.agents/scripts/explain.mjs init <slug> [--project <path>]
node ~/.agents/scripts/explain.mjs dev <slug> [--project <path>] [--port <number>]
```

Edit only the generated project source (`explanations/<slug>/explanation.tsx` and local files). `.kit` and `node_modules` are links to the central Explain UI and must not be edited through an explanation. Save and load diagrams explicitly from the workspace; preview state is disposable and not automatically persisted.

## Adapters

Each AI tool connects through an adapter directory:

| Adapter | Tool | Entry Point |
|---------|------|-------------|
| `adapters/claude-code/` | Claude Code | `~/.claude/CLAUDE.md` → adapter bridge → `~/.agents/AGENTS.md` |
| `adapters/codex-cli/` | Codex CLI | Config under `~/.codex/` |
| `adapters/opencode/` | OpenCode | Native config discovery |
| `adapters/antigravity/` | Antigravity / Gemini | `GEMINI.md` bridge |
| `adapters/cursor-cli/` | Cursor CLI | `~/.cursor/rules/hub-contract.mdc` → `AGENTS.md` |

Adapters change ergonomics, not behavior. Source of truth stays in this repo.

`sync.sh migrate` regenerates all adapter outputs and verifies parity.

## Herdr app

I run my agents inside [Herdr](https://herdr.dev), a desktop app for terminals and coding agents (`herdr-app` for the window, `hc` for herdr-core). This repo holds the Herdr pieces my workflow depends on:

| Path | What it is | Installed as |
|---|---|---|
| `herdr/mods/board/` | Board mod: a catch-up panel with one row per tab (goal, current step, next step, blockers, a short log of milestones and decisions) plus an archive of closed tabs. | symlink `~/.config/herdr-app/mods/board` |
| `herdr/scripts/board.mjs` | The command agents use to write a tab's board (`set --goal --now --log --decision ...`) | symlink `~/.config/herdr/scripts/board.mjs` |
| `skills/board/` | Tells agents when to update the board and what is worth logging | via the skills symlink |
| `hooks/board-stamp.sh` | UserPromptSubmit hook: stamps each prompt on the tab's board | via the hooks symlink; registered in `~/.claude/settings.json` |
| `herdr/opencode/board-stamp.js` | The same prompt stamp for opencode, as a plugin | symlink `~/.config/opencode/plugins/board-stamp.js` |

Install the board in your own Herdr:

```bash
ln -s ~/.agents/herdr/mods/board ~/.config/herdr-app/mods/board
mkdir -p ~/.config/herdr/scripts && ln -s ~/.agents/herdr/scripts/board.mjs ~/.config/herdr/scripts/board.mjs
herdr-app check ~/.config/herdr-app/mods/board
```

Then add a `board` block to one of your layouts, beside the tab block (use your panes' border color so it matches them):

```json
{ "id": "board", "type": "block", "content": { "mod": "board" }, "size": { "px": 360 },
  "background": "background", "border": { "width": 1, "color": "#33363b" }, "radius": 12 }
```

And register `hooks/board-stamp.sh` as a UserPromptSubmit hook in your agent's settings. Tests: `node --test herdr/scripts/board.test.mjs herdr/mods/board/tests/`.

## Skills

Skills live in `skills/` covering the full pipeline and domain specialties. Key pipeline skills:

| Skill | Role |
|-------|------|
| `caveman/` | Explicit concise, answer-first style; ordinary chat uses the shared contract's concise defaults without mandatory skill reads. `normal mode` disables the style; `/caveman` enables it |
| `human/` | Explicit natural-writing guidance; `/human` writes, rewrites, or audits text while preserving facts and voice. Ordinary chat uses natural defaults without mandatory skill reads |
| `explain/` | Default browser workspace for disposable Excalidraw diagrams, schema/data-model and logic exploration, and visual variants (Explain UI lives at `skills/explain/explain-ui/`) |
| `prototype/` | Optional discovery for an unclear flow or finished-quality comparisons of competing UI designs; not required for an agreed production direction. Keep production approval separate |
| `design/` | Frame user problems, visualize uncertain experiences, and derive essential features and numbered behavior cards; preserve evidence, assumptions, dependencies, and deferred ideas |
| `to-issues/` | Turn design topics into behavior-focused local tickets under `context/issues/<slug>/`; after review and separate approval, optionally publish them to GitHub |
| `jira-tpm/` (`~/.codex/skills`) | Organize Jira backlogs with actionable tickets, meaningful priorities, appropriate subtasks, real dependencies, and verified status |
| `plan/` | Discuss meaningful backend choices from the frontend experience, then plan one current-code-based slice with test seams and Git baseline for approval |
| `plan-standup-notes/` | Existing plan → compact iPad learning notes, standup narrative, and production tradeoffs |
| `issue-discovery/` | Record a product or engineering decision as a GitHub decision issue; behavior changes go through `/design` |
| `to-spec/` | Conversation → local spec draft; issue publication requires separate exact-content approval |
| `improve/` | Read-only codebase survey → prioritized executor-ready plans |
| `research/` | Standalone questions use the concise Research profile without a delivery queue; queued coding investigations retain their selection and evidence rules |
| `brag/` | Create a project-specific launch video with Hyperframes (`/skill:brag`) |
| `issue-delivery/` | One published ready issue with an explicit or uniquely linked approved, fresh plan → isolated worktree, TDD, cleanup, review, and human-approved draft PR |
| `implement/` | Explicit or next eligible approved slice → worktree → TDD → code-judgment → code-review → human gates; refresh queue |
| `wait-what/` | 3-line verbosity corrective |
| `spawn/` | Max-context sub-agent decomposition |
| `tdd/` | Red-green-refactor with seam discipline |
| `code-review/` | Start at `SKILL.md` for shared policy and stage-specific references. Adversarial review that triages the diff and spawns only the reviewers it needs (`--runner subagents\|opencode\|omp`, default: ask), and adjudication of behavioral and evidenced readability/design findings. The existing `complexity-reviser` directly performs authorized scoped test cleanup with retrospective evidence; unrelated design revisions retain proposal → parent evaluation/authorization → behavior-preserving implementation → tests and fresh independent validation. Fresh independent validation also follows automatic cleanup. No overlapping agent; review-only, `--no-revise`, and implementation ownership boundaries remain. Behavior changes need user approval, including hardener fixes. External runners return observe-only reports; OpenCode uses `scripts/opencode-review.mjs`, OMP uses verified installed Herdr/CLI dispatch |
| `code-judgment/` | Behavior-preserving cleanup before review: dead code, YAGNI, names, comments, module shape, cohesion/coupling; includes authorized automatic test cleanup with retrospective Keep / Rewrite / Delete evidence and behavior contracts over implementation pins |
| `pair-reviewer/` | Interactive reading partner for a branch or worktree the user names: resolves the target, gathers its plan, commit history, and code, then talks through the answers in 2-5 sentences and stops, critiquing only on request (`/skill:pair-reviewer <branch-or-worktree>`); depth follows you — evidence, provenance, and the `REVIEW-THINKING.md` method come when asked; "probe me" withholds a finding behind a location hint so you guess it first; read-only, hands off to `code-review/` for a full adversarial pass |
| `grill-with-docs/` | Relentless interview, glossary + ADRs |
| `domain-modeling/` | Sharpen terminology, ADR management |
| `commit/` | Fast atomic commits, no subagents, for when you are the reviewer. Rules live in `references/` (grouping, messages, edge cases). |
| `commit-review/` | Atomic commits for agent-built work: commit-pr-reviewer approves the exact plan, and an optional code-review gate runs first. Reuses `commit/references/`. |
| `pr/` | Senior developer PR workflow: auto-detects single PR, stacked PRs (gh stack), or parallel worktrees; generates review-ready descriptions focused on rationale and behavior |
| `split-dirty-worktree/` | Oversized dirty tree → mandatory `gh stack` for dependent concerns with a named branch-stack proposal; independent concerns may use separate worktrees. Includes commits per branch; read-only until approved (or end to end in autonomous mode), every PR a draft, then hands off to `commit/` and `pr/` |
| `handoff/` | Session handoff documents |
| `ch/` | Handoff shorthand — /ch as a skill |
| `recall/` | Resume from handoff |
| `recall-worktree/` | Reconstruct dirty work, history, and context freshness for the main agent through a lightweight subagent |
| `later/` | Future improvement notes in `future/` |
| `board/` | Keep each Herdr tab's Board card current: goal, step, next, blockers, and a short log of milestones and decisions |
| `wf/` | Commit + PR in one flow (commit-review → pr). |
| `codebase-design/` | Proportionate module, backend, and schema design: ownership, invariants, information hiding, tradeoffs, testability, and cited practitioner guidance |
| `codebase-drill/` | OA-style codebase navigation training |
| `learn-plan/` | Learning-session planning and explanation; human coding practice only when explicitly requested |
| `rederive/` | User-invoked only: re-derive a codebase's design decisions through Socratic problems, repository history, and incremental constraints (`/skill:rederive`) |
| `tutor/` | User-invoked only: adaptive coaching to diagnose the specific gap, trace real code, and use focused explanations or closely matched worked examples |
| `diagnose/` | Bug and performance diagnosis |
| `security-review/` | Team-mode vulnerability research |
| `e2e-testing-patterns/` | Playwright/Cypress testing standards |
| `enforce/` | Review what needs to change (what/why rationale table) → apply it. Gate for delegated work; hygiene pass for existing code |
| `cancel/` | Cancel active modes |
| `prompt-master/` | Prompt engineering |
| `resolving-merge-conflicts/` | Merge conflict resolution |
| `frontend-design/` | Page and application visual direction; prototypes only for unresolved choices |
| `ui-design/` | Familiar interactions, useful skeuomorphism, and visual UI craft |
| `frontend-implement/` | Main agent builds agreed production UI directly; research specialists, checks, cleanup, review, and useful human feedback; prototypes only for uncertainty |
| `design-taste-frontend/` | Anti-slop landing pages, portfolios, and redesigns — brief-first aesthetic inference, strict pre-flight check (leonxlnx/taste-skill) |
| `ui-ux-pro-max/` | Searchable cross-stack UI patterns and accessibility guidance; agreed directions go to authorized production |
| `impeccable/` | Product-interface design, audit, and polish playbooks; comparisons only when useful (pbakaus/impeccable) |
| `framer-motion-animator/` | Framer Motion animations |
| `shadcn/` | shadcn/ui component management |
| `next-best-practices/` | Next.js best practices |
| `performance/` | Web performance optimization |
| `supabase-postgres-best-practices/` | Postgres optimization from Supabase |
| `herdr/` | Control Herdr terminal multiplexer for coding agents |
| `orchestration/` | Approval-gated background subagents or isolated CLI workers in Herdr panes/worktrees, with a conversational coordinator, progress logs, and verified handoffs |
| `skill-index/` | Skill router — ask which skill fits |

Plus specialist agents (`agents/`): hardener, qa-runner, codebase-analyzer, codebase-locator, reviewer-behavioral, reviewer-contract, reviewer-maintainability, security-reviewer, adjudicator, fixer, complexity-reviser.

## Directory Structure

```
~/.agents/
├── AGENTS.md              # Source of truth — workflow contract
├── manifest.json          # Hub manifest — symlinks, capabilities
├── package.json           # Node package — scripts
├── sync.sh                # Multi-CLI sync pipeline
├── .skill-lock.json       # Skill registry (tracked)
├── commands/              # Slash commands (ch, later, wf)
├── agents/                # Specialist expert agents
├── skills/                # Workflow + domain skill packs
│   ├── _shared/           # Shared utility modules
│   ├── explain/            # Explain UI browser explanation workspace
│   ├── prototype/          # Throwaway UI prototyping
│   ├── brag/               # Project launch video workflow
│   ├── plan/
│   ├── to-issues/
│   ├── issue-discovery/
│   ├── implement/
│   ├── tdd/
│   ├── code-review/
│   ├── commit/
│   ├── pr/
│   ├── grill-with-docs/
│   ├── domain-modeling/
│   ├── to-spec/
│   ├── improve/
│   ├── handoff/
│   ├── recall/
│   ├── codebase-drill/
│   ├── learn-plan/
│   ├── diagnose/
│   ├── codebase-design/
│   ├── resolving-merge-conflicts/
│   ├── research/
│   ├── prompt-master/
│   ├── frontend-design/
│   ├── frontend-implement/
│   ├── design-taste-frontend/
│   ├── ui-ux-pro-max/
│   ├── impeccable/
│   ├── framer-motion-animator/
│   ├── shadcn/
│   ├── wait-what/
│   └── ...                # Additional domain skills
├── scripts/               # Tooling (init/reset, context paths, worktree helpers, model router)
├── herdr/                 # Herdr app mods and scripts (board)
├── adapters/              # 5 CLI adapter configs
└── .omc/                  # OpenCode project memory (regenerated)
```

## What Gets Shared

- `commands/`, `agents/`, `skills/`, `adapters/`
- `scripts/`, `herdr/`, `manifest.json`, `package.json`, `sync.sh`
- Onboarding docs (`README.md`, `SHARING.md`)

## What Stays Local

- Secrets: `.env`, `.env.local`
- Dependencies: `node_modules/`
- Worktree context: `context/` at the Git worktree root (designs, issue drafts, plans, handoffs, ADRs, and research)

The public repo is inspectable. Credentials, handoffs, live plans, and active project runtime state are intentionally excluded.

## Quick Start

```bash
# Clone into ~/.agents
git clone <this-repo> ~/.agents

# Set up adapter symlinks
cd ~/.agents && bash sync.sh migrate

# Initialize local state
npm run init:local-state
```

Each adapter's README covers tool-specific setup. Start with your tool's directory under `adapters/`.
