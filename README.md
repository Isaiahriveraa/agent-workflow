# Agents Workflow Hub

Shared operating contract for AI-assisted coding across multiple tools. Commands, agents, skills, and adapters live here. Machine-local state does not.

## About

This is an opinionated delivery workflow — adapters bridge tool ergonomics, `AGENTS.md` governs agent behavior, and skill pipelines route work from fuzzy idea to clean commit.

The hub serves Claude Code, Codex CLI, OpenCode, and Antigravity/Gemini from the same commands, agents, and skills.

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

The project workflow is intentionally linear at the planning boundary. Each stage owns one concern and passes a durable artifact to the next stage. Local drafts are tracked by their file paths and the plan manifest; once published, work is identified by its GitHub issue number.

```
/design → /plan → to-issues → human approval → issue-delivery

or

/design → /plan → /implement
```
Downstream stages validate and reuse upstream artifacts. They do not repeat upstream design, planning, or ticket decomposition. The supporting skills below remain available for focused needs, but they do not replace this delivery path. ### Pipeline stages | Stage | Skill | What it produces | Where | |-------|-------|------------------|-------| | Design | `/design` | Evidence-backed design: intent, behavior, scope, decisions, and constraints | `context/designs/` | | Plan | `/plan` | Repository-grounded execution plan with concerns, dependencies, parallelism, and verification | `context/plans/<slug>/` | | Issues | `to-issues` | Approved-plan parent/child issue drafts tracked by file path and manifest, with dependency positions | `context/issues/<slug>/` |
| Approval | Human review | Approved ticket set ready for delivery | Conversation or plan record |
| Delivery | `issue-delivery` | One published issue delivered through an isolated worktree to a verified draft PR | GitHub issue number → draft PR |

### How to choose

1. **New product or system work** → `/design` → `/plan` → `to-issues` → human approval → `/skill:issue-delivery`
2. **Already have an approved plan** → `to-issues` → human approval → `/skill:issue-delivery`
3. **Already have a published, ready issue** → `/skill:issue-delivery`
4. **Need to clarify a domain or research question** → use the focused supporting skill, then return to `/design` or `/plan`
5. **Standalone cited research** → `/skill:research` — use it to fill a planning gap, then return to `/plan`
6. **Audit an existing codebase** → `/skill:improve` — read-only survey, then use findings in `/design` or `/plan`
7. **Resolve an ambiguous product decision** → `/skill:issue-discovery` — create a decision issue, then return to `/design` or `/plan`
8. **Sharpen an idea** → `/skill:grill-with-docs`
9. **Ask which skill fits** → `/skill:skill-index`

## Commands

Slash commands in `commands/` extend the tool's native surface:

| Command | Description |
|---------|-------------|
| `/ch` | Create a handoff document to resume work in a future session |
| `/later` | Record a future improvement idea as a scannable note in `future/` |
| `/wf` | Commit the current work, then push and open a PR; `/wf --no` or `/wf --no-review` skips only the nested commit pre-commit code-review gate (all approvals, staging/atomicity, verification, and PR gates remain required) |

Workflow skills (`spawn`, `enforce`, `pr`, `to-issues`) are invoked via `skill(name="skill-name")`, not slash commands.

Worktree tooling in `scripts/` supports the one-concern-per-branch discipline: `new-worktree.sh <branch>` creates an isolated worktree per branch, `cleanup-worktree.sh <branch>` tears it down after merge.

### Prototype Kit browser workspace

`Prototype Kit` provides the default browser workspace for disposable whiteboard, schema, logic, and visual-design experiments. Attach it directly to the current Git checkout, or use a linked worktree when stronger isolation is useful:

```sh
npm ci --prefix <hub>/prototype-kit
node ~/.agents/scripts/prototype.mjs init <slug> [--project <path>]
node ~/.agents/scripts/prototype.mjs dev <slug> [--project <path>] [--port <number>]
```

Edit only the generated project source (`prototypes/<slug>/prototype.tsx` and local files). `.kit` and `node_modules` are links to the central Prototype Kit and must not be edited through a prototype. Save and load diagrams explicitly from the workspace; preview state is disposable and not automatically persisted.

## Adapters

Each AI tool connects through an adapter directory:

| Adapter | Tool | Entry Point |
|---------|------|-------------|
| `adapters/claude-code/` | Claude Code | `CLAUDE.md` → `AGENTS.md` |
| `adapters/codex-cli/` | Codex CLI | Config under `~/.codex/` |
| `adapters/opencode/` | OpenCode | Native config discovery |
| `adapters/antigravity/` | Antigravity / Gemini | `GEMINI.md` bridge |

Adapters change ergonomics, not behavior. Source of truth stays in this repo.

`sync.sh migrate` regenerates all adapter outputs and verifies parity.

## Skills

Skills live in `skills/` covering the full pipeline and domain specialties. Key pipeline skills:

| Skill | Role |
|-------|------|
| `prototype/` | Default browser workspace for disposable Excalidraw diagrams, schema/data-model and logic exploration, and visual variants |
| `design/` | Shape intent and design-level decisions into an evidence-backed artifact for `/plan` |
| `plan/` | Validate upstream artifacts, investigate only research gaps, and decompose a canonical execution plan → local plan files in `context/plans/<slug>/` |
| `plan-standup-notes/` | Existing plan → compact iPad learning notes, standup narrative, and production tradeoffs |
| `to-issues/` | Mechanically compile an approved plan into local parent/child drafts under `context/issues/<slug>/`, tracked by path and manifest while preserving dependencies; after approval, optionally publish ready child issues (or explicitly single-concern issues) to GitHub, where they are identified by issue number |
| `issue-discovery/` | Ambiguous ideas → decision GitHub issues for discovery (compat — planning lives in `/plan`) |
| `to-spec/` | Conversation → spec issue |
| `improve/` | Read-only codebase survey → prioritized executor-ready plans |
| `research/` | Background-agent research → single cited Markdown file |
| `issue-delivery/` | Terminal follow-up to `to-issues`: takes one published issue number (or URL), reads the issue and its `## Plan reference`, and delivers it through an isolated worktree, TDD, quality code, review, atomic commits, and a human-approved draft PR; one issue = one branch = one PR; does not create issues or schedule batches |
| `implement/` | Orchestrator: tdd → code-review → commit |
| `wait-what/` | 3-line verbosity corrective |
| `spawn/` | Max-context sub-agent decomposition |
| `tdd/` | Red-green-refactor with seam discipline |
| `code-review/` | Adversarial review — three reviewers (behavioral, contract/spec, maintainability), one adjudicator |
| `grill-with-docs/` | Relentless interview, glossary + ADRs |
| `domain-modeling/` | Sharpen terminology, ADR management |
| `commit/` | Normal `commit` invocation runs the pre-commit code-review gate; `commit --no` or `commit --no-review` explicitly skips that gate only. Atomic staging uses whole-file staging for files belonging entirely to one concern and hunk staging only for mixed-concern files. Splitting is responsibility-first: the plan opens with a responsibility inventory, and a subject that joins two stories with "and" is a failure condition. |
| `pr/` | Senior developer PR workflow: auto-detects single PR, stacked PRs (gh stack), or parallel worktrees; generates review-ready descriptions focused on rationale and behavior |
| `handoff/` | Session handoff documents |
| `ch/` | Handoff shorthand — /ch as a skill |
| `recall/` | Resume from handoff |
| `later/` | Future improvement notes in `future/` |
| `wf/` | Commit + PR in one flow (commit → pr); supports `wf --no` and `wf --no-review` as passthroughs to skip only the nested commit review gate. |
| `codebase-design/` | Deep module design |
| `codebase-drill/` | OA-style codebase navigation training |
| `learn-plan/` | Learning-session planning protocol |
| `tutor/` | Technical mentor workflow |
| `diagnose/` | Bug and performance diagnosis |
| `security-review/` | Team-mode vulnerability research |
| `e2e-testing-patterns/` | Playwright/Cypress testing standards |
| `enforce/` | Review what needs to change (what/why rationale table) → apply it. Gate for delegated work; hygiene pass for existing code |
| `cancel/` | Cancel active modes |
| `prompt-master/` | Prompt engineering |
| `resolving-merge-conflicts/` | Merge conflict resolution |
| `frontend-design/` | Visual design guidance |
| `frontend-implement/` | Frontend implementation mode — main agent writes, sub-agents research only |
| `ui-ux-pro-max/` | UI/UX design intelligence |
| `impeccable/` | AI agent design guidance (pbakaus/impeccable) |
| `framer-motion-animator/` | Framer Motion animations |
| `shadcn/` | shadcn/ui component management |
| `next-best-practices/` | Next.js best practices |
| `performance/` | Web performance optimization |
| `supabase-postgres-best-practices/` | Postgres optimization from Supabase |
| `herdr/` | Control Herdr terminal multiplexer for coding agents |
| `orchestration/` | Generalized Herdr orchestration across workspaces, tabs, and panes; prompt-file dispatch and status-only supervision |
| `skill-index/` | Skill router — ask which skill fits |

Plus agent skills (`agents/`) for specialist roles: continuity-manager, codebase-analyzer, claim-verifier, diff-auditor, roadmap, ui-auditor, and more.

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
│   ├── prototype/          # Pipeline skills
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
│   ├── ui-ux-pro-max/
│   ├── impeccable/
│   ├── framer-motion-animator/
│   ├── shadcn/
│   ├── wait-what/
│   └── ...                # Additional domain skills
├── scripts/               # Tooling (init/reset, context paths, worktree helpers, model router)
├── adapters/              # 4 CLI adapter configs
└── .omc/                  # OpenCode project memory (regenerated)
```

## What Gets Shared

- `commands/`, `agents/`, `skills/`, `adapters/`
- `scripts/`, `manifest.json`, `package.json`, `sync.sh`
- Onboarding docs (`README.md`, `SHARING.md`)

## What Stays Local

- Secrets: `.env`, `.env.local`
- Dependencies: `node_modules/`
- Worktree context: `context/` at the Git worktree root (plans, handoffs, ADRs, and research)

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
