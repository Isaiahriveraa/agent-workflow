# Agents Workflow Hub

Shared operating contract for AI-assisted software development across multiple coding tools. Policy, commands, agents, skills, adapters, scripts, hooks, and tests live here. Machine-local secrets and runtime state do not.

## About

This is not a prompt pack. It is an **opinionated delivery workflow** — a layered system where adapters bridge tool ergonomics, a shared contract (`AGENTS.md`) governs behavior, and project-local artifacts make all work resumable.

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

## Primary Delivery Loop: RPIV

The workflow runs a six-phase pipeline for substantial work. Depth depends on task complexity — lightweight tasks skip straight to implementation, moderate ones plan first, substantial ones run the full loop:

```
Discover → Research → Design → Plan → Implement → Validate
```

- **Discover** — clarify what we're building and why. Uses `commands/rpi-brainstorm.md` when ambiguity is detected.
- **Research** — understand current state: what exists, what's possible, what the ecosystem looks like.
- **Design** — high-level architecture before coding. Tradeoffs, interfaces, failure modes.
- **Plan** — concrete implementation steps grounded in the current repo state.
- **Implement** — build it, phase by phase, with verification checkpoints.
- **Validate** — compare finished implementation against success criteria.

Each phase is backed by an rpiv skill in `skills/`. Internal gates handle prompt optimization, clarification, readiness checks, critique, artifact grading, and memory recall — hidden behind the phase interface unless a gate fails.

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
- **CLI**: `bin/agents-memory` — `status | recall | flush | inject`
- **Config**: `mempalace.yaml` defines rooms (contexts, commands, skills, agents) with keyword maps.
- **Backend**: `scripts/memory-mempalace-backend.mjs`, `scripts/mempalace-bridge.mjs`

Memory flows: hooks capture signals → MemPalace processes → recall feeds context back into sessions. Compatible with Claude Code, Codex CLI, and OpenCode session lifecycles.

## Day-to-Day Commands

| Command | Description |
|---------|-------------|
| `/rpi` | Full workflow front door — discover → research → design → plan → implement → validate |
| `/rpi-brainstorm` | Intake clarification before research |
| `/prime` | Fast repo priming — load minimum useful context before planning |
| `/plan` | Yonie writes the design, you critique it |
| `/plan-feature` | Lightweight feature planning for scoped work |
| `/review` | Senior PR review — correctness, structure, failure modes, tests |
| `/review-diff` | Strict diff review — concerns, assumptions, edge cases |
|| `/pr` | PR description generator — sized to the actual diff |
|| `/pr-split` | Split work into small, reviewable PRs |
|| `/pr-refine` | **NEW** — Split a dirty branch into clean stacked draft PRs with `gh` CLI |
| `/fix` | Systematic debugging — identify, reproduce, fix, verify |
| `/elite-mode` | TDD + SOLID + senior SWE workflow |
| `/ping-pong` | Two-model debate planning |
| `/tutor` | Guided web development tutoring |
| `/commit` | Professional commit message generator |
| `/handoff` | Create handoff document for session transfer |
| `/recall` | Resume work from a handoff document |
| `/capture-decision` | Document architectural decisions at decision time |
| `/read-code` | Read and analyze code before changing it |

## Expert Agents

42 expert agents in `agents/` handle specialized roles — codebase analysis, debugging, architecture design, UI research, plan verification, workflow auditing, and more. Each agent has a bounded scope and is dispatched by the orchestrator based on task requirements.

## Skills

53 skill packs in `skills/` bundle reusable instructions for specific domains — Flutter, testing (widget, integration, E2E), UI/UX design, security review, performance, commit conventions, code review, architecture improvement, and the full rpiv pipeline (discover, research, design, plan, implement, validate, explore, blueprint, revise).

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
├── .skill-lock.json       # Skill registry for OpenCode
├── commands/              # 18 workflow commands
├── agents/                # 42 expert agents
├── skills/                # 53 skill packs
│   ├── _shared/           # Shared utility modules
│   ├── blueprint/         # RPIV pipeline skills
│   ├── discover/
│   ├── research/
│   ├── design/
│   ├── plan/
│   ├── implement/
│   ├── validate/
│   └── ...                # Domain-specific skills
├── scripts/               # Node.js tooling scripts
├── hooks/                 # Lifecycle hooks (mempalace, agent state)
├── bin/                   # CLI wrappers (agents-memory)
├── tests/                 # Test suites
├── adapters/              # 7 CLI adapters
│   ├── claude-code/
│   ├── codex-cli/
│   ├── opencode/
│   ├── antigravity/
│   ├── openclaw/
│   ├── pi/
└── thoughts/              # Research, plans, handoffs, decisions
    ├── {Month-Name}-{Year}/W{week-num}/handoffs/
    ├── {Month-Name}-{Year}/W{week-num}/reflections/
    ├── {Month-Name}-{Year}/W{week-num}/grill/
    └── YYYY-Www/          # ISO week decision records
```

## What Gets Shared

- `commands/`, `agents/`, `skills/`, `adapters/`, `hooks/`
- `scripts/`, `tests/`, `manifest.json`, `mempalace.yaml`, `package.json`, `sync.sh`
- Onboarding docs (`README.md`, `SHARING.md`, `.env.example`)

## What Stays Local

- Secrets and caches: `.env`, `.env.local`, `.agents-memory/`, `memory.db`, `node_modules/`
- Per-project runtime inside a target repo:
  - `[project]/thoughts/{Month-Name}-{Year}/W{week-num}/handoffs/`
  - `[project]/thoughts/plans/`
  - `[project]/thoughts/research/`

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
