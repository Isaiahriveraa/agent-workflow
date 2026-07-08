# Agents Workflow Hub

Shared operating contract for AI-assisted software development across multiple coding tools. Policy, commands, agents, skills, adapters, scripts, hooks, and tests live here. Machine-local secrets and runtime state do not.

## About

This is not a prompt pack. It is an **opinionated delivery workflow** — a layered system where adapters bridge tool ergonomics, a shared contract (`AGENTS.md`) governs behavior, and skill-driven pipelines make every session start fresh and finish clean.

The hub works across Claude Code, Codex CLI, OpenCode, Antigravity, OpenClaw, Pi, and Claurst — all consuming the same commands, agents, skills, and hooks through tool-specific adapters.

```
                  ┌──────────────────────┐
                  │   Claude Code        │
                  │   Codex CLI          │
                  │   OpenCode           │
                  │   Antigravity/Gemini │
                  │   OpenClaw           │
                  │   Pi                 │
                  │   Claurst            │
                  └────────┬─────────────┘
                           │
                  ┌────────▼─────────────┐
                  │      ADAPTER         │  ergonomics, same contract
                  │   (adapters/)        │
                  └────────┬─────────────┘
                           │
                  ┌────────▼─────────────┐
                  │      AGENTS.md       │  single source of truth
                  │   commands/ agents/  │  shared workflow contract
                  │   skills/ scripts/   │
                  └──────────────────────┘
```

## Workflow

The pipeline routes work through stages. Depth depends on complexity — a trivial fix goes straight to implement; a feature uses the full chain; a huge foggy effort starts with wayfinder.

```
lightweight:   implement → tdd → code-review → commit

moderate:      research → plan → implement → tdd → code-review → commit

full:          discover → research → explore → plan → implement → tdd → code-review → commit

team/huge:     wayfinder → to-tickets → (team works tickets) → implement → tdd → code-review → commit

spec-driven:   grill-with-docs → to-spec → implement → tdd → code-review → commit
```

### Pipeline stages

| Stage | Skill | What it produces | Where |
|-------|-------|------------------|-------|
| **Clarify** | `grill-with-docs` + `domain-modeling` | Sharpened plan, glossary terms, ADRs | Plan server |
| **Spec** | `to-spec` | Spec issue with Problem/Stories/Decisions/OutOfScope | GitHub Issue (`spec` label) |
| **Discover** | `discover` | Feature Requirements Document (FRD) | Plan server (`frd/`) |
| **Research** | `research` | Background subagent investigates, main agent writes findings | Plan server (`research/`) |
| **Explore** | `explore` | Solution options with pros/cons/trade-offs | Plan server (`solutions/`) |
| **Prototype** | `prototype` | Throwaway code answering a design question | In-repo + plan server |
| **Plan** | `plan` | Phased implementation plan with success criteria | Plan server (`plans/`) |
| **Wayfinder** | `wayfinder` | Investigation ticket map for huge/foggy efforts | GitHub Issues (`wayfinder:*` labels) |
| **Tickets** | `to-tickets` | Tracer-bullet tickets with blocking edges | GitHub Issues (`ticket` label) |
| **Implement** | `implement` | Working code (orchestrates tdd + code-review) | Git branch |
| **TDD** | `tdd` | Tests + implementation, one red-green cycle at a time | Test files + source |
| **Review** | `code-review` / `review` | Code review report | Plan server (`reviews/`) |
| **Commit** | `commit` | Atomic commit message | Git commit |

### How to choose

1. **I know what to build, it's small** → `/skill:implement`. Use `/skill:tdd` at seams, `/skill:code-review` when done, `/skill:commit` to land it.
2. **I know the feature but need a plan** → `/skill:research` → `/skill:plan` → `/skill:implement`.
3. **I need to clarify requirements first** → `/skill:discover` → research → explore → plan → implement.
4. **I need to compare approaches** → `/skill:explore` (feeds directly into plan).
5. **I need a prototype to answer a design question** → `/skill:prototype`.
6. **I need a spec for the team** → `/skill:to-spec` → publishes as a GitHub Issue.
7. **I need to split work for the team** → `/skill:to-tickets` → publishes tracer-bullet issues with blocking edges.
8. **It's a huge foggy effort, more than one session** → `/skill:wayfinder` — creates a map issue on GitHub, work one investigation ticket per session.
9. **I want to sharpen my idea against the codebase** → `/skill:grill-with-docs` — live interview, writes glossary and ADRs.
10. **Ask me which skill to use** → `/skill:ask-yonie`.

### Artifact locations

| What | Where |
|------|-------|
| Research docs, plans, solutions, designs, reviews | `~/Documents/plan-server/projects/{project}/` (MDX/MD, served at `localhost:3456`) |
| Specs, tickets, wayfinder maps | GitHub Issues on the project repo |
| Prototype code | In-repo, next to what it's prototyping |
| Glossary, ADRs, grill transcripts | Plan server (`glossary/`, `adr/`, `grill/`) |
| Session handoffs | Plan server (`handoffs/`) |

## Adapters

Each AI coding tool connects through an adapter directory:

| Adapter | Tool | Entry Point |
|---------|------|-------------|
| `adapters/claude-code/` | Claude Code | `CLAUDE.md` → `AGENTS.md` |
| `adapters/codex-cli/` | Codex CLI | `~/.codex/AGENTS.md → AGENTS.md` |
| `adapters/opencode/` | OpenCode | Native config discovery |
| `adapters/antigravity/` | Antigravity/Gemini | `GEMINI.md` → `AGENTS.md` |
| `adapters/openclaw/` | OpenClaw | Workspace wrapper templates |
| `adapters/pi/` | Pi | Pi-specific integration |

The adapter changes ergonomics, not workflow behavior. The source of truth stays in this repo.

## Memory: MemPalace

Persistent memory uses **MemPalace** (Python), not ChromaDB.

- **Hooks**: `hooks/mempalace-hook.cjs` captures lifecycle events; `hooks/mempalace-context.cjs` injects wake-up context at session start.
- **CLI**: `bin/agents-memory` — `status \| recall \| flush \| inject`
- **Config**: `mempalace.yaml` defines rooms (contexts, commands, skills, agents) with keyword maps.
- **Backend**: `scripts/memory-mempalace-backend.mjs`, `scripts/mempalace-bridge.mjs`

Memory flows: hooks capture signals → MemPalace processes → recall feeds context back into sessions. Compatible with Claude Code, Codex CLI, and OpenCode session lifecycles.

## Day-to-Day Commands

| Command | Description |
|---------|-------------|
| `/pr` | PR workflow — generate descriptions, split branches by concern, or refine dirty branches into stacked draft PRs (`/pr split`, `/pr refine`) |
| `/plan` | Yonie writes the design, you critique it |
| `/elite-mode` | TDD + SOLID + senior SWE workflow |
| `/capture-decision` | Document architectural decisions at decision time |

## Skills

61 skill packs in `skills/` covering the full workflow — discover, research, explore, prototype, plan, implement, tdd, code-review, review, commit, grill-with-docs, domain-modeling, wayfinder, to-spec, to-tickets — plus domain-specific packs for Flutter, testing, UI/UX, security, performance, and more.

Key skills and their role in the pipeline:

| Skill | Role |
|-------|------|
| `discover/` | Requirements extraction → FRD |
| `research/` | Subagent-enforced codebase investigation → plan-server doc |
| `explore/` | Solution option comparison → trade-off analysis |
| `prototype/` | Throwaway code to answer a design question |
| `plan/` | Research/explore → phased implementation plan |
| `wayfinder/` | Huge foggy efforts → GitHub Issues map |
| `to-spec/` | Conversation → spec issue on GitHub |
| `to-tickets/` | Plan/spec → tracer-bullet issues with blocking edges |
| `implement/` | Thin orchestrator: tdd → code-review → commit |
| `tdd/` | Red-green-refactor with seam discipline |
| `code-review/` | Parallel specialist agent review |
| `review/` | Two-axis review (standards + spec) |
| `grill-with-docs/` | Relentless interview, writes glossary + ADRs to plan server |
| `domain-modeling/` | Sharpen terminology, ADR management |
| `commit/` | Atomic commit message generation |

## Sync Pipeline

`sync.sh` manages adapter outputs across all supported CLIs:

- Generates agent files, command wrappers, and configs per adapter
- Registers hub-local skills into `.skill-lock.json`
- Repairs symlinks and verifies parity across all 7 adapters
- Entry point: `sync.sh migrate` — fixes everything, then verifies

`manifest.json` is the single source of truth for symlink contracts, adapter capabilities, and generated surfaces.

## Directory Structure

```
~/.agents/
├── AGENTS.md              # Source of truth — workflow contract
├── manifest.json          # Hub manifest — symlinks, capabilities
├── mempalace.yaml         # MemPalace room definitions
├── package.json           # Node package — test runner + scripts
├── sync.sh                # Multi-CLI sync pipeline
├── .skill-lock.json       # Skill registry
├── commands/              # Workflow commands
├── agents/                # Expert agents
├── skills/                # 61 skill packs
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
│   ├── wayfinder/         # Team / large-effort skills
│   ├── to-spec/
│   ├── to-tickets/
│   └── ...                # Domain-specific skills
├── scripts/               # Node.js tooling scripts
├── hooks/                 # Lifecycle hooks
├── bin/                   # CLI wrappers
├── tests/                 # Test suites
├── adapters/              # 7 CLI adapters
└── thoughts/              # Legacy — content migrated to plan server
```

## What Gets Shared

- `commands/`, `agents/`, `skills/`, `adapters/`, `hooks/`
- `scripts/`, `tests/`, `manifest.json`, `mempalace.yaml`, `package.json`, `sync.sh`
- Onboarding docs (`README.md`, `SHARING.md`, `.env.example`)

## What Stays Local

- Secrets and caches: `.env`, `.env.local`, `.agents-memory/`, `memory.db`, `node_modules/`
- Per-project runtime: plan server content at `~/Documents/plan-server/projects/{project}/`

The public repo is intended to be inspectable. Credentials, databases, handoffs, live plans, and active project runtime state are not.

## Testing

```bash
npm test                         # Run all test suites
npm run test:workflows           # Workflow contract + handoff + agent tests
npm run test:adapters            # Adapter generation + memory tests
npm run test:sessions            # Session + continuity tests
npm run test:tooling             # Package manager + lesson + artifact tests
npm run test:verification        # Verification + doctor + autonomy tests
```

## Quick Start

```bash
# Clone into ~/.agents
git clone <this-repo> ~/.agents

# Run sync to set up adapter symlinks
cd ~/.agents && bash sync.sh migrate

# Verify with tests
npm test
```

Each adapter's README covers tool-specific setup. Start with your tool's adapter directory in `adapters/`.
