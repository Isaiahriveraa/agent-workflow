# Agents Workflow Hub

Shared operating contract for AI-assisted coding across multiple tools. Commands, agents, skills, and adapters live here. Machine-local state does not.

## About

This is an opinionated delivery workflow — adapters bridge tool ergonomics, `AGENTS.md` governs agent behavior, and skill pipelines route work from fuzzy idea to clean commit.

The hub serves Claude Code, Codex CLI, OpenCode, Antigravity/Gemini, OpenClaw, and Pi from the same commands, agents, and skills.

```
┌──────────────────────────────┐
│  Claude Code                 │
│  Codex CLI / OpenCode        │
│  Antigravity / OpenClaw / Pi │
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

moderate:      to-plan → implement → tdd → code-review → commit

team/huge:     issue-discovery → to-issues → implement → tdd → code-review → commit

spec-driven:   grill-with-docs → to-spec → implement → tdd → code-review → commit
```

### Pipeline stages

| Stage | Skill | What it produces | Where |
|-------|-------|------------------|-------|
| Clarify | `grill-with-docs` + `domain-modeling` | Glossary, ADRs, sharpened plan | Plan server |
| Spec | `to-spec` | Spec issue (Problem/Stories/Decisions/OutOfScope) | GitHub Issue |
| Prototype | `prototype` | Throwaway code answering a design question | In-repo |
| Plan | `to-plan` | Phased implementation plan | Plan server |
| Issue discovery | `issue-discovery` | Ambiguous ideas → decision issues | GitHub Issues |
| Issues | `to-issues` | Tracer-bullet issues with blocking edges | Local issue drafts + YAML manifest |
| Implement | `implement` | Working code (orchestrates tdd + code-review) | Git branch |
| TDD | `tdd` | Tests + implementation, one red-green cycle | Source + test files |
| Review | `code-review` / `review` | Code review report | Plan server |
| Commit | `commit` | Atomic commit message | Git commit |

### How to choose

1. **Small, known fix** → `/skill:implement`
2. **Need a plan first** → `/skill:to-plan` → `/skill:implement`
3. **Need a prototype** → `/skill:prototype`
4. **Writing a spec** → `/skill:to-spec`
5. **Splitting work for the team** → `/skill:to-issues`
6. **Huge foggy effort** → `/skill:issue-discovery`
7. **Sharpening an idea** → `/skill:grill-with-docs`
8. **Ask me which skill** → `/skill:ask-yonie`

## Commands

Slash commands in `commands/` extend the tool's native surface:

| Command | Description |
|---------|-------------|
| `/ch` | Create a handoff document to resume work in a future session |
| `/later` | Record a future improvement idea as a scannable note in `future/` |

Workflow skills (`spawn`, `enforce`, `pr-workflow`, `to-plan`) are invoked via `skill(name="skill-name")`, not slash commands.

## Adapters

Each AI tool connects through an adapter directory:

| Adapter | Tool | Entry Point |
|---------|------|-------------|
| `adapters/claude-code/` | Claude Code | `CLAUDE.md` → `AGENTS.md` |
| `adapters/codex-cli/` | Codex CLI | Config under `~/.codex/` |
| `adapters/opencode/` | OpenCode | Native config discovery |
| `adapters/antigravity/` | Antigravity / Gemini | `GEMINI.md` bridge |
| `adapters/openclaw/` | OpenClaw | Workspace wrapper templates |

Adapters change ergonomics, not behavior. Source of truth stays in this repo.

`sync.sh migrate` regenerates all adapter outputs and verifies parity.

## Skills

Skills live in `skills/` covering the full pipeline and domain specialties. Key pipeline skills:

| Skill | Role |
|-------|------|
| `prototype/` | Throwaway code to answer a design question |
| `to-plan/` | Phased implementation plan |
| `issue-discovery/` | Ambiguous ideas → decision GitHub issues |
| `to-spec/` | Conversation → spec issue |
| `to-issues/` | Plan/spec → tracer-bullet issues |
| `issue-delivery/` | One GitHub issue → isolated sibling worktree, verified draft PR |
| `implement/` | Orchestrator: tdd → code-review → commit |
| `tdd/` | Red-green-refactor with seam discipline |
| `code-review/` | Parallel specialist agent review |
| `review/` | Two-axis review (standards + spec) |
| `grill-with-docs/` | Relentless interview, glossary + ADRs |
| `domain-modeling/` | Sharpen terminology, ADR management |
| `commit/` | Atomic commit messages |
| `handoff/` | Session handoff documents |
| `recall/` | Resume from handoff |
| `plan-server/` | Local MDX plan server |
| `codebase-design/` | Deep module design |
| `pr-workflow/` | PR discipline |
| `diagnose/` | Bug and performance diagnosis |
| `cancel/` | Cancel active modes |
| `herdr/` | herdr workspace management |
| `prompt-master/` | Prompt engineering |
| `split-plan/` | Break big plans into smaller phases |
| `resolving-merge-conflicts/` | Merge conflict resolution |
| `improve-codebase-architecture/` | Codebase deepening |
| `frontend-design/` | Visual design guidance |
| `ui-ux-pro-max/` | UI/UX design intelligence |
| `impeccable/` | AI agent design guidance (pbakaus/impeccable) |
| `framer-motion-animator/` | Framer Motion animations |
| `shadcn/` | shadcn/ui component management |

Plus agent skills (`agents/`) for specialist roles: continuity-manager, codebase-analyzer, claim-verifier, diff-auditor, artifact-reviewer, and more.

## Directory Structure

```
~/.agents/
├── AGENTS.md              # Source of truth — workflow contract
├── manifest.json          # Hub manifest — symlinks, capabilities
├── package.json           # Node package — scripts
├── sync.sh                # Multi-CLI sync pipeline
├── .skill-lock.json       # Skill registry
├── commands/              # Slash commands (ch, later)
├── agents/                # Specialist expert agents
├── skills/                # Workflow + domain skill packs
│   ├── _shared/           # Shared utility modules
│   ├── prototype/          # Pipeline skills
│   ├── issue-discovery/
│   ├── implement/
│   ├── tdd/
│   ├── code-review/
│   ├── review/
│   ├── commit/
│   ├── grill-with-docs/
│   ├── domain-modeling/
│   ├── to-spec/
│   ├── to-issues/
│   ├── handoff/
│   ├── recall/
│   ├── plan-server/
│   ├── diagnose/
│   ├── split-plan/
│   ├── codebase-design/
│   ├── resolving-merge-conflicts/
│   ├── pr-workflow/
│   ├── prompt-master/
│   ├── frontend-design/
│   ├── ui-ux-pro-max/
│   ├── impeccable/
│   ├── framer-motion-animator/
│   ├── shadcn/
│   ├── herdr/
│   └── ...                # Additional domain skills
├── scripts/               # Tooling scripts (init, reset, memory sync, etc.)
├── adapters/              # 6 CLI adapter configs
└── .omc/                  # OH MY PI runtime state
```

## What Gets Shared

- `commands/`, `agents/`, `skills/`, `adapters/`
- `scripts/`, `manifest.json`, `package.json`, `sync.sh`
- Onboarding docs (`README.md`, `SHARING.md`)

## What Stays Local

- Secrets: `.env`, `.env.local`
- Dependencies: `node_modules/`, `.skill-lock.json`
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
