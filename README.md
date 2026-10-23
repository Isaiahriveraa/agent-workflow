# Agents Workflow Hub

Shared operating contract for AI-assisted coding across multiple tools. Commands, agents, skills, and adapters live here. Machine-local state does not.

## About

This is an opinionated delivery workflow — adapters bridge tool ergonomics, `AGENTS.md` governs agent behavior, and skill pipelines route work from fuzzy idea to clean commit.

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

## Workflow

The workflow is experience-first and risk-aware: understand the user problem, make uncertain interactions visible, agree on behavior, then derive essential features and plan one end-to-end slice. System, behavior, feature, architecture, and implementation are views to move between, not whole-product phases. A PRD is optional; building the whole frontend before backend is not the goal. Local drafts are tracked by file path; published work is identified by GitHub issue number.

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
| `/later` | Record a future improvement idea as a scannable note in `future/` |
| `/wf` | Commit the current work, then push and open a PR; `/wf --no` or `/wf --no-review` skips only the nested commit pre-commit code-review gate (all approvals, staging/atomicity, verification, and PR gates remain required) |

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
| `adapters/claude-code/` | Claude Code | `CLAUDE.md` → `AGENTS.md` |
| `adapters/codex-cli/` | Codex CLI | Config under `~/.codex/` |
| `adapters/opencode/` | OpenCode | Native config discovery |
| `adapters/antigravity/` | Antigravity / Gemini | `GEMINI.md` bridge |
| `adapters/cursor-cli/` | Cursor CLI | `~/.cursor/rules/hub-contract.mdc` → `AGENTS.md` |

Adapters change ergonomics, not behavior. Source of truth stays in this repo.

`sync.sh migrate` regenerates all adapter outputs and verifies parity.

## Skills

Skills live in `skills/` covering the full pipeline and domain specialties. Key pipeline skills:

| Skill | Role |
|-------|------|
| `caveman/` | Default session chat style: concise, answer-first replies; normal prose for persisted writing, full detail when requested. `normal mode` disables it for the session; `/caveman` re-enables it. Skill only, no proxy or telemetry |
| `explain/` | Default browser workspace for disposable Excalidraw diagrams, schema/data-model and logic exploration, and visual variants (Explain UI lives at `skills/explain/explain-ui/`) |
| `prototype/` | Optional discovery for an unclear flow or finished-quality comparisons of competing UI designs; not required for an agreed production direction. Keep production approval separate |
| `design/` | Frame user problems, visualize uncertain experiences, and derive essential features and numbered behavior cards; preserve evidence, assumptions, dependencies, and deferred ideas |
| `to-issues/` | Turn design topics into behavior-focused local tickets under `context/issues/<slug>/`; after review and separate approval, optionally publish them to GitHub |
| `plan/` | Discuss meaningful backend choices from the frontend experience, then plan one current-code-based slice with test seams and Git baseline for approval |
| `plan-standup-notes/` | Existing plan → compact iPad learning notes, standup narrative, and production tradeoffs |
| `issue-discovery/` | Record a product or engineering decision as a GitHub decision issue; behavior changes go through `/design` |
| `to-spec/` | Conversation → local spec draft; issue publication requires separate exact-content approval |
| `improve/` | Read-only codebase survey → prioritized executor-ready plans |
| `research/` | Explicit question or next eligible item → missing facts only, local code first, linked cited evidence |
| `brag/` | Create a project-specific launch video with Hyperframes (`/skill:brag`) |
| `issue-delivery/` | One published ready issue with an explicit or uniquely linked approved, fresh plan → isolated worktree, TDD, cleanup, review, and human-approved draft PR |
| `implement/` | Explicit or next eligible approved slice → worktree → TDD → code-judgment → code-review → human gates; refresh queue |
| `wait-what/` | 3-line verbosity corrective |
| `spawn/` | Max-context sub-agent decomposition |
| `tdd/` | Red-green-refactor with seam discipline |
| `code-review/` | Start at `SKILL.md` for shared policy and mode-based loading of stage-specific references. Adversarial review with `--runner subagents\|opencode\|omp` (default: ask), independent reviewers, adjudication, main-model-supervised complexity revision, and human QA prep. The original harness owns communication and implementation: refactors proceed with verification and a brief report; behavior-changing fixes need user approval, including hardener fixes. External runners review observe-only and return the same report contract; OpenCode uses `scripts/opencode-review.mjs`, OMP uses verified installed Herdr/CLI dispatch |
| `code-judgment/` | Behavior-preserving cleanup before review — dead code, YAGNI, names, comments, module shape, cohesion/coupling |
| `pair-reviewer/` | Interactive reading partner for a branch or worktree the user names: resolves the target, gathers its plan, commit history, and code, then talks through the answers in 2-5 sentences and stops, critiquing only on request (`/skill:pair-reviewer <branch-or-worktree>`); depth follows you — evidence, provenance, and the `REVIEW-THINKING.md` method come when asked; "probe me" withholds a finding behind a location hint so you guess it first; read-only, hands off to `code-review/` for a full adversarial pass |
| `grill-with-docs/` | Relentless interview, glossary + ADRs |
| `domain-modeling/` | Sharpen terminology, ADR management |
| `commit/` | Normal `commit` invocation runs the pre-commit code-review gate; `commit --no` or `commit --no-review` explicitly skips that gate only. Stage whole files when all changes belong to one concern and use hunk staging only for mixed-concern files. Splitting is responsibility-first: the plan opens with a responsibility inventory, and a subject that joins two stories with "and" is a failure condition. |
| `pr/` | Senior developer PR workflow: auto-detects single PR, stacked PRs (gh stack), or parallel worktrees; generates review-ready descriptions focused on rationale and behavior |
| `split-dirty-worktree/` | Oversized dirty tree → mandatory `gh stack` for dependent concerns with a named branch-stack proposal; independent concerns may use separate worktrees. Includes commits per branch; read-only until approved, then hands off to `commit/` and `pr/` |
| `handoff/` | Session handoff documents |
| `ch/` | Handoff shorthand — /ch as a skill |
| `recall/` | Resume from handoff |
| `later/` | Future improvement notes in `future/` |
| `wf/` | Commit + PR in one flow (commit → pr); supports `wf --no` and `wf --no-review` as passthroughs to skip only the nested commit review gate. |
| `codebase-design/` | Proportionate module, backend, and schema design: ownership, invariants, information hiding, tradeoffs, testability, and cited practitioner guidance |
| `codebase-drill/` | OA-style codebase navigation training |
| `learn-plan/` | Learning-session planning and explanation; human coding practice only when explicitly requested |
| `tutor/` | Adaptive coaching: diagnose the specific gap, trace real code, and use focused explanations or closely matched worked examples |
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
├── adapters/              # 5 CLI adapter configs
└── .omc/                  # OpenCode project memory (regenerated)
```

## What Gets Shared

- `commands/`, `agents/`, `skills/`, `adapters/`
- `scripts/`, `manifest.json`, `package.json`, `sync.sh`
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
