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

moderate:      research → plan → implement → tdd → code-review → commit

full:          discover → research → explore → plan → implement → tdd → code-review → commit

team/huge:     wayfinder → to-issues → implement → tdd → code-review → commit

spec-driven:   grill-with-docs → to-spec → implement → tdd → code-review → commit
```

### Pipeline stages

| Stage | Skill | What it produces | Where |
|-------|-------|------------------|-------|
| Clarify | `grill-with-docs` + `domain-modeling` | Glossary, ADRs, sharpened plan | Plan server |
| Spec | `to-spec` | Spec issue (Problem/Stories/Decisions/OutOfScope) | GitHub Issue |
| Discover | `discover` | Feature Requirements Document (FRD) | Plan server |
| Research | `research` | Subagent codebase investigation | Plan server |
| Explore | `explore` | Solution options with pros/cons/trade-offs | Plan server |
| Prototype | `prototype` | Throwaway code answering a design question | In-repo |
| Plan | `to-plan` | Phased implementation plan | Plan server |
| Wayfinder | `wayfinder` | Investigation ticket map for huge/foggy efforts | GitHub Issues |
58:| Issues | `to-issues` | Tracer-bullet issues with blocking edges | Local issue drafts + YAML manifest |
| Implement | `implement` | Working code (orchestrates tdd + code-review) | Git branch |
| TDD | `tdd` | Tests + implementation, one red-green cycle | Source + test files |
| Review | `code-review` / `review` | Code review report | Plan server |
| Commit | `commit` | Atomic commit message | Git commit |

### How to choose

1. **Small, known fix** → `/skill:implement`
2. **Need a plan first** → `/skill:research` → `/skill:to-plan` → `/skill:implement`
3. **Need to clarify requirements** → `/skill:discover` → research → explore → plan → implement
4. **Comparing approaches** → `/skill:explore`
5. **Need a prototype** → `/skill:prototype`
6. **Writing a spec** → `/skill:to-spec`
7. **Splitting work for the team** → `/skill:to-issues`
8. **Huge foggy effort** → `/skill:wayfinder`
9. **Sharpening an idea** → `/skill:grill-with-docs`
10. **Ask me which skill** → `/skill:ask-yonie`

## Commands

Slash commands in `commands/` extend the tool's native surface:

| Command | Description |
|---------|-------------|
| `/pr` | PR workflow — descriptions, branch splitting, stacked draft PRs (`/pr split`, `/pr stack`) |
| `/plan` | Design interview — critique the developer's plan before they code |
| `/ch` | Create a handoff document to resume work in a future session |
| `/spawn` | Decompose complex work into parallel sub-agents with full context |
| `/enforce` | Enforce hub operating rules from AGENTS.md on the current project |

## Adapters

Each AI tool connects through an adapter directory:

| Adapter | Tool | Entry Point |
|---------|------|-------------|
| `adapters/claude-code/` | Claude Code | `CLAUDE.md` → `AGENTS.md` |
| `adapters/codex-cli/` | Codex CLI | Config under `~/.codex/` |
| `adapters/opencode/` | OpenCode | Native config discovery |
| `adapters/antigravity/` | Antigravity / Gemini | `GEMINI.md` bridge |
| `adapters/openclaw/` | OpenClaw | Workspace wrapper templates |
| `adapters/pi/` | Pi | Pi-specific integration |

Adapters change ergonomics, not behavior. Source of truth stays in this repo.

`sync.sh migrate` regenerates all adapter outputs and verifies parity.

## Skills

Skills live in `skills/` covering the full pipeline and domain specialties. Key pipeline skills:

| Skill | Role |
|-------|------|
| `discover/` | Requirements extraction → FRD |
| `research/` | Subagent codebase investigation → plan-server doc |
| `explore/` | Solution option comparison → trade-off analysis |
| `prototype/` | Throwaway code to answer a design question |
| `to-plan/` | Research/explore → phased implementation plan |
| `wayfinder/` | Huge foggy efforts → GitHub Issues map |
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
| `explain/` | Visual explanations with Mermaid |
| `revise/` | Surgical plan updates |
| `codebase-design/` | Deep module design |
| `pr-workflow/` | PR discipline |
| `diagnose/` | Bug and performance diagnosis |
| `learning-mode/` | Socratic learning workflow |
| `cancel/` | Cancel active modes |
| `herdr/` | herdr workspace management |
| `omc-reference/` | OMC agent/tool catalog |
| `prompt-master/` | Prompt engineering |
| `split-plan/` | Break big plans into smaller phases |
| `resolving-merge-conflicts/` | Merge conflict resolution |
| `improve-codebase-architecture/` | Codebase deepening |
| `frontend-design/` | Visual design guidance |
| `ui-ux-pro-max/` | UI/UX design intelligence |
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
├── commands/              # Slash commands (pr, plan, ch, spawn, enforce)
├── agents/                # Specialist expert agents
├── skills/                # Workflow + domain skill packs
│   ├── _shared/           # Shared utility modules
│   ├── discover/          # Pipeline skills
│   ├── research/
│   ├── explore/
│   ├── prototype/
│   ├── plan/
│   ├── implement/
│   ├── tdd/
│   ├── code-review/
│   ├── review/
│   ├── commit/
│   ├── grill-with-docs/
│   ├── domain-modeling/
│   ├── wayfinder/
│   ├── to-spec/
│   ├── to-issues/
│   ├── handoff/
│   ├── recall/
│   ├── plan-server/
│   ├── diagnose/
│   ├── explain/
│   ├── revise/
│   ├── split-plan/
│   ├── codebase-design/
│   ├── resolving-merge-conflicts/
│   ├── pr-workflow/
│   ├── learning-mode/
│   ├── omc-reference/
│   ├── prompt-master/
│   ├── frontend-design/
│   ├── ui-ux-pro-max/
│   ├── framer-motion-animator/
│   ├── shadcn/
│   ├── herdr/
│   ├── ultrawork/
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
- Per-project runtime: plan server content at `~/Documents/plan-server/projects/{project}/`

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
