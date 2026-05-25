# Agents Workflow Hub

This repo is the shared operating contract for AI-assisted software development across multiple coding tools. Policy, commands, agents, skills, adapters, scripts, hooks, and tests live here. Machine-local secrets and runtime state do not.

## About

This is not a prompt pack. It is an **opinionated delivery workflow** — a layered system where adapters bridge tool ergonomics, a router selects the appropriate workflow depth, and a shared runtime makes all work resumable. The single source of truth is `AGENTS.md`, which every adapter points to.

The hub works across Claude Code, Codex CLI, OpenCode, Antigravity, OpenClaw, and pi — all consuming the same commands, agents, skills, and hooks through tool-specific adapters.

## Architecture

```
                            ┌──────────────────┐
            ┌───────────────┤   Claude Code    │
            │               │   Codex CLI      │
            │               │   OpenCode       │
            │               │   Antigravity    │
            │               │   OpenClaw       │
            │               │   Pi             │
            │               └────────┬─────────┘
            │                        │
            │               ┌────────▼─────────┐
            │               │    ADAPTER       │  ergonomics, same workflow
            │               │  (adapters/)     │
            │               └────────┬─────────┘
            │                        │
            │         ┌──────────────┼──────────────────┐
            │         │              │                  │
            │   ┌─────▼─────┐  ┌────▼─────┐    ┌───────▼────────┐
            │   │  Tier 1   │  │  Tier 2  │    │    Tier 3      │
            │   │  Direct   │  │  Plan →  │    │  Discover →    │
            │   │  Execute  │  │  Impl →  │    │  Research →    │
            │   │           │  │  Verify  │    │  Design →      │
            │   │           │  │          │    │  Plan →        │
            │   │           │  │          │    │  Implement →   │
            │   │           │  │          │    │  Validate      │
            │   └───────────┘  └──────────┘    └───────┬────────┘
            │                                          │
            │                                 ┌────────▼────────┐
            │                                 │   OMX RUNTIME   │
            │                                 │  sessions/      │
            │                                 │  plans/         │
            │                                 │  state/         │
            │                                 └─────────────────┘
       ┌────┴────┐
       │  SWE    │
       │  Dev    │
       └─────────┘
```

### 1. Adapter Layer

Each AI coding tool connects to the shared hub through an adapter directory:

| Adapter | Tool | Entry Point |
|---------|------|-------------|
| `adapters/claude-code/` | Claude Code | `CLAUDE.md` → `AGENTS.md` |
| `adapters/codex-cli/` | Codex CLI | `~/.codex/AGENTS.md → AGENTS.md` |
| `adapters/opencode/` | OpenCode | Native config discovery |
| `adapters/antigravity/` | Antigravity/Gemini | `GEMINI.md` → `AGENTS.md` |
| `adapters/openclaw/` | OpenClaw | Workspace wrapper templates |
| `adapters/pi/` | Pi | Pi-specific integration |
| `adapters/claurst/` | Claurst | Claurst-specific integration |

The adapter changes ergonomics, not workflow behavior. The source of truth stays in this repo: `AGENTS.md`, `commands/`, and `scripts/`.

### 2. Primary Delivery Loop: RPI

The RPI workflow is the main pipeline for substantial work:

```
Discover → Research → Design → Plan → Implement → Validate
```

Each phase produces a document or artifact. The depth depends on task complexity — lightweight tasks skip straight to implementation, moderate ones plan first, substantial ones run the full pipeline:

- **Discover** — clarify what we're building and why. Uses `commands/rpi-brainstorm.md` when ambiguity is detected.
- **Research** — understand the current state: what exists, what's possible, what the ecosystem looks like.
- **Design** — high-level architecture before coding. Tradeoffs, interfaces, failure modes.
- **Plan** — concrete implementation steps grounded in the current repo state.
- **Implement** — build it, phase by phase, with verification checkpoints.
- **Validate** — compare the finished implementation against success criteria.

Internal rigor is managed through prompt optimization, clarification gates, readiness gates, critique cycles, artifact grading, and memory recall — all hidden behind the phase-based user interface unless a gate fails.

### 4. OMX Runtime & Continuity

The OMX runtime layer makes work resumable across sessions:

- `.omx/sessions/` — lightweight session checkpoints for normal pause/resume
- `.omx/plans/` — durable plan artifacts (`prd-*.md`, `test-spec-*.md`)
- `.omx/state/` — runtime state (current task, subagent tracking, skill state, team leader nudges)
- `.omx/logs/` — operation logs, turn history, notify fallback
- `thoughts/handoffs/` — deliberate transfer documents for context compaction
- `thoughts/plans/`, `thoughts/research/` — durable project artifacts

### 5. Memory Architecture: MemPalace

The hub uses **MemPalace** (Python) for persistent memory — not ChromaDB.

- **Hooks**: `mempalace-hook.cjs` captures lifecycle events, `mempalace-context.cjs` injects wake-up context at session start.
- **CLI tools** in `bin/`: `agents-memory status | recall | flush | inject`
- **Config**: `mempalace.yaml` defines rooms (contexts, commands, skills, agents, etc.) with keyword maps.
- **Backend**: `scripts/memory-mempalace-backend.mjs`, `scripts/mempalace-bridge.mjs`

Memory flows: hooks capture signals → MemPalace processes → recall feeds context back into sessions. The bridge is compatible with Claude Code, Codex CLI, and OpenCode session-start lifecycles.

### 6. Day-to-Day Commands

These are the 18 workflow commands available through the hub:

| Command | Description |
|---------|-------------|
| `/rpi` | Full workflow front door — discover → research → design → plan → implement → validate |
| `/rpi-brainstorm` | Intake clarification before research |
| `/prime` | Fast repo priming — load minimum useful context before planning |
| `/plan` | Yonie writes the design, you critique it — no code until the plan is solid |
| `/plan-feature` | Lightweight feature planning for scoped work |
| `/review` | Senior PR review — correctness, idiomaticity, structure, failure modes, tests |
| `/review-diff` | Strict diff review — concerns, assumptions, edge cases, regressions |
| `/pr` | Pull request description generator — sized to the actual diff |
| `/pr-split` | Split work into small, reviewable PRs |
| `/fix` | Systematic debugging workflow — identify, reproduce, fix, verify |
| `/elite-mode` | TDD + SOLID + senior SWE workflow for pair programming |
| `/ping-pong` | Two-model debate planning — proposed → critique → refine |
| `/tutor` | Socratic guided web development tutoring |
| `/commit` | Professional commit message generator |
| `/create-handoff` | Create handoff document for session transfer |
| `/resume-handoff` | Resume work from a handoff document |
| `/capture-decision` | Document an architectural decision at decision time |
| `/read-code` | Read and analyze code before changing it |

### 7. Expert Agents

41 expert agents in `agents/` handle specialized roles — from codebase analysis and debugging to architecture design, UI research, plan verification, and workflow auditing. Each agent has a bounded scope and is dispatched by the orchestrator based on task requirements.

### 8. Skills

49 skills in `skills/` bundle reusable instructions and workflows for specific domains — Flutter development, testing patterns (widget, integration, E2E), UI/UX design, security review, performance optimization, commit conventions, code review, architecture improvement, and more.

Key built-in skills include: playwright, frontend-ui-ux, git-master, review-work, ai-slop-remover.

## Directory Structure

```
~/.agents/
├── AGENTS.md              # Source of truth — OS-level workflow contract
├── manifest.json          # Hub manifest — symlinks, adapters, capabilities
├── mempalace.yaml         # MemPalace room definitions
├── package.json           # Node package — test runner + utility scripts
├── commands/              # 18 workflow commands (workflow entry points)
├── agents/                # 41 expert agents (specialist roles)
├── skills/                # 49 skill packs (domain workflows)
├── scripts/               # 40 Node.js tooling scripts
├── hooks/                 # Lifecycle hooks (mempalace, agent state)
│   ├── mempalace-hook.cjs       # MemPalace lifecycle capture
│   ├── mempalace-context.cjs    # Session context injection
│   └── herdr-agent-state.sh     # Agent state tracking
├── bin/                   # CLI wrappers (agents-memory tools)
├── tests/                 # Test suites (workflows, adapters, sessions, etc.)
├── adapters/              # 7 provider adapters
│   ├── claude-code/
│   ├── codex-cli/
│   ├── opencode/
│   ├── antigravity/
│   ├── openclaw/
│   ├── pi/
│   └── claurst/
├── .omx/                  # OMX runtime state (sessions, plans, logs)
│   ├── sessions/
│   ├── plans/
│   ├── state/
│   └── logs/
├── thoughts/              # Research, plans, handoffs, decisions
│   ├── handoffs/
│   ├── plans/
│   ├── research/
│   └── YYYY-Www/         # ISO week decision records
└── projects/              # Per-project working contexts
```

## What Gets Shared

- `commands/`, `agents/`, `skills/`, `adapters/`, `hooks/`
- `scripts/`, `tests/`, `manifest.json`, `mempalace.yaml`, and `package.json`
- Onboarding and sharing docs (`README.md`, `SHARING.md`, `.env.example`)

## What Stays Local

- Root secrets and caches: `.env`, `.env.local`, `.agents-memory/`, `memory.db`, `node_modules/`
- Repo-local scratch and runtime: `.planning/`, `projects/`, `thoughts/`
- Per-project runtime created inside a target repo:
  - `[project]/.planning/`
  - `[project]/.omx/state/`
  - `[project]/.omx/sessions/`

The public repo is intended to be inspectable. Credentials, databases, handoffs, live plans, live research, and active project runtime state are not.

## Testing

```bash
npm test                         # Run all test suites
npm run test:workflows           # Workflow contract + handoff + agent tests
npm run test:adapters            # Adapter generation + memory tests
npm run test:sessions            # Session + continuity + execution state tests
npm run test:tooling             # Router, package manager, memory bridge, etc.
npm run test:verification        # Verification tools + doctor + autonomy
npm run test:artifacts           # Artifact tools
npm run test:plans               # Workflow plan tools
npm run test:model-router        # Model router tests
```

## Validation

```bash
npm run validate:ssot            # Validate single-source-of-truth contracts
npm run memory:health            # Check memory backend health
```

## First-Time Setup

1. Clone the repo into `~/.agents` for default path assumptions.
2. Run `npm install`.
3. Run `npm run init:local-state` to bootstrap local directories.
4. Run `npm run validate:ssot` to verify contracts.
5. Run `npm test` to confirm everything works.

## Sharing Model

See `SHARING.md` for the exact split between tracked workflow assets and local-only runtime surfaces.
