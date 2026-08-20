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

The pipeline routes work through stages. Depth depends on complexity:

```
lightweight:   implement → tdd → code-review → commit

moderate:      to-tickets → implement → tdd → code-review → commit

team/huge:     issue-discovery → to-tickets → implement → tdd → code-review → commit

spec-driven:   grill-with-docs → to-spec → implement → tdd → code-review → commit
```

### Pipeline stages

| Stage | Skill | What it produces | Where |
|-------|-------|------------------|-------|
| Clarify | `grill-with-docs` + `domain-modeling` | Glossary, ADRs, sharpened plan | Plan server |
| Spec | `to-spec` | Spec issue (Problem/Stories/Decisions/OutOfScope) | GitHub Issue |
| Prototype | `prototype` | Throwaway code answering a design question | In-repo |
| Plan + tickets | `to-tickets` | Implementation plan + focused tickets (one per PR) | Plan server + local drafts |
| Issue discovery | `issue-discovery` | Ambiguous ideas → decision issues | GitHub Issues |
| Audit | `improve` | Read-only codebase survey → prioritized executor-ready plans | `plans/` in repo |
| Implement | `implement` | Working code (orchestrates tdd + code-review) | Git branch |
| TDD | `tdd` | Tests + implementation, one red-green cycle | Source + test files |
| Review | `code-review` | Code review report | Plan server |
| Commit | `commit` | Atomic commit message | Git commit |

### How to choose

1. **Small, known fix** → `/skill:implement`
2. **Need a plan first** → `/skill:to-tickets` → `/skill:implement`
3. **Need a prototype** → `/skill:prototype`
4. **Writing a spec** → `/skill:to-spec`
5. **Breaking work into tickets** → `/skill:to-tickets`
6. **Huge foggy effort** → `/skill:issue-discovery`
7. **Sharpening an idea** → `/skill:grill-with-docs`
8. **Ask me which skill** → `/skill:ask-yonie`

## Commands

Slash commands in `commands/` extend the tool's native surface:

| Command | Description |
|---------|-------------|
| `/ch` | Create a handoff document to resume work in a future session |
| `/later` | Record a future improvement idea as a scannable note in `future/` |
| `/wf` | Commit the current work (commit skill), then push and open a PR (pr-workflow) |

Workflow skills (`spawn`, `enforce`, `pr-workflow`, `to-tickets`) are invoked via `skill(name="skill-name")`, not slash commands.

Worktree tooling in `scripts/` supports the one-concern-per-branch discipline: `new-worktree.sh <branch>` creates an isolated worktree per branch, `cleanup-worktree.sh <branch>` tears it down after merge.

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
| `prototype/` | Throwaway code to answer a design question |
| `to-tickets/` | Implementation plan + focused tickets (one per PR) |
| `issue-discovery/` | Ambiguous ideas → decision GitHub issues |
| `to-spec/` | Conversation → spec issue |
| `improve/` | Read-only codebase survey → prioritized executor-ready plans |
| `research/` | Background-agent research → single cited Markdown file |
| `issue-delivery/` | One GitHub issue → isolated sibling worktree, verified draft PR |
| `implement/` | Orchestrator: tdd → code-review → commit |
| `wait-what/` | 3-line verbosity corrective |
| `spawn/` | Max-context sub-agent decomposition |
| `subagent-implementation-review/` | Rule gate for delegated subagent work |
| `tdd/` | Red-green-refactor with seam discipline |
| `code-review/` | Adversarial review — three reviewers (behavioral, contract/spec, maintainability), one adjudicator |
| `grill-with-docs/` | Relentless interview, glossary + ADRs |
| `grill-with-docs/` | Relentless interview, glossary + ADRs |
| `domain-modeling/` | Sharpen terminology, ADR management |
| `commit/` | Atomic commit messages (mandatory before any commit) |
| `pr-workflow/` | PR discipline (mandatory before any PR) |
| `handoff/` | Session handoff documents |
| `recall/` | Resume from handoff |
| `plan-server/` | Local MDX plan server |
| `codebase-design/` | Deep module design |
| `codebase-drill/` | OA-style codebase navigation training |
| `learn-plan/` | Learning-session planning protocol |
| `tutor/` | Technical mentor workflow |
| `diagnose/` | Bug and performance diagnosis |
| `security-review/` | Team-mode vulnerability research |
| `e2e-testing-patterns/` | Playwright/Cypress testing standards |
| `enforce/` | Enforce hub AGENTS.md rules on a project |
| `cancel/` | Cancel active modes |
| `prompt-master/` | Prompt engineering |
| `split-plan/` | Break big plans into smaller phases |
| `resolving-merge-conflicts/` | Merge conflict resolution |
| `frontend-design/` | Visual design guidance |
| `ui-ux-pro-max/` | UI/UX design intelligence |
| `impeccable/` | AI agent design guidance (pbakaus/impeccable) |
| `framer-motion-animator/` | Framer Motion animations |
| `shadcn/` | shadcn/ui component management |
| `next-best-practices/` | Next.js best practices |
| `performance/` | Web performance optimization |
| `supabase-postgres-best-practices/` | Postgres optimization from Supabase |
| `ask-yonie/` | Skill router — ask which skill fits |

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
│   ├── to-tickets/
│   ├── issue-discovery/
│   ├── implement/
│   ├── tdd/
│   ├── code-review/
│   ├── commit/
│   ├── pr-workflow/
│   ├── grill-with-docs/
│   ├── domain-modeling/
│   ├── to-spec/
│   ├── improve/
│   ├── handoff/
│   ├── recall/
│   ├── plan-server/
│   ├── codebase-drill/
│   ├── learn-plan/
│   ├── diagnose/
│   ├── split-plan/
│   ├── codebase-design/
│   ├── resolving-merge-conflicts/
│   ├── research/
│   ├── prompt-master/
│   ├── frontend-design/
│   ├── ui-ux-pro-max/
│   ├── impeccable/
│   ├── framer-motion-animator/
│   ├── shadcn/
│   ├── wait-what/
│   └── ...                # Additional domain skills
├── scripts/               # Tooling (init/reset, plan-server-path, worktree helpers, model router)
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
- Per-project runtime: plan server content at `<plan-server>/projects/{project}/`, where `<plan-server>` is resolved via `~/.agents/scripts/plan-server-path`

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
