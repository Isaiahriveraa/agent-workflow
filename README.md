# Agents Workflow Hub

This repo is the shareable starter for the workflow system. Reusable policy, prompts, commands, adapters, skills, capsules, scripts, and tests live here. Machine-local secrets and runtime state do not.

## SWE Workflow

This hub is not just a prompt pack. It is an opinionated software delivery workflow for AI-assisted development.

From a developer perspective, the workflow works like this:

1. Your AI tool enters through an adapter.
2. The shared router classifies the task.
3. The task runs through the lightest safe workflow tier.
4. Project-local state and artifacts are updated so work can resume cleanly later.
5. Verification is expected before work is considered done.

```
                          ┌──────────────────┐
          ┌───────────────┤   Claude Code    │
          │               │   Codex CLI      │
          │               │   OpenCode       │
          │               │   Antigravity    │
          │               └────────┬─────────┘
          │                        │
          │               ┌────────▼─────────┐
          │               │    ADAPTER       │  ergonomics, same workflow
          │               │  (adapters/)     │
          │               └────────┬─────────┘
          │                        │
          │               ┌────────▼─────────┐
          │               │    ROUTER        │
          │               │  (scripts/)      │  classify → pick tier
          │               └────────┬─────────┘
          │                        │
          │         ┌──────────────┼──────────────────┐
          │         │              │                  │
          │   ┌─────▼─────┐  ┌────▼─────┐    ┌───────▼────────┐
          │   │  Tier 1   │  │  Tier 2  │    │    Tier 3      │
          │   │  Direct   │  │  Plan →  │    │  Research →    │
          │   │  Execute  │  │  Impl →  │    │  Plan → Impl →│
          │   │           │  │  Verify  │    │  Verify        │
          │   └───────────┘  └──────────┘    └───────┬────────┘
          │                                          │
          │                                 ┌────────▼────────┐
          │                                 │  CONTINUITY     │
          │                                 │  state.md,      │
          │                                 │  sessions/,     │
          │                                 │  artifacts/     │
          │                                 └─────────────────┘
     ┌────┴────┐
     │  SWE    │
     │  Dev    │
     └─────────┘
```

### 1. Entry Point: Adapter Layer

Each coding tool points at the same shared workflow hub:

- Claude Code: native commands, hooks, agents, MCP
- Codex CLI: shared workflow docs plus bridged continuity and memory helpers
- OpenCode, Antigravity, OpenClaw: adapter-specific integration boundaries with the same shared policy core

The adapter should change ergonomics, not workflow behavior. The source of truth stays in this repo: `AGENTS.md`, `prompts/`, `commands/`, `rules/common/`, `contexts/`, and `scripts/`.

### 2. Task Routing: Pick The Smallest Safe Process

The workflow router (`scripts/workflow-router-tools.mjs`) pushes work into one of three paths:

1. Tier 1, trivial:
Direct execution. Use this for small, clear, low-risk changes.
2. Tier 2, moderate:
Create a focused plan, implement, then validate.
3. Tier 3, substantial:
Use the strict workflow: normalize intake, research the current state, pass a readiness gate, create a decision-complete plan, implement, then validate.

In practice, that means:

- Small fix: edit directly.
- Clear multi-file feature: `/create-plan` -> `/implement_plan` -> `/validate_plan`.
- Workflow change, large refactor, vague request, or cross-subsystem work: do the full research and planning loop first.

### 3. Primary Delivery Loop

For ordinary SWE work, the main loop is:

```text
intake -> route -> research if needed -> plan -> implement -> verify -> resume or handoff
```

The command surfaces map to that loop like this:

- `/research_codebase`
Document the codebase as it exists today. This is the read-only discovery pass.
- `/create-plan`
Turn a request into a concrete implementation plan grounded in the current repo state.
- `/implement_plan`
Execute the plan incrementally, phase by phase, with explicit verification checkpoints.
- `/validate_plan`
Compare the finished implementation against the plan and success criteria.

### 4. Project-Local Continuity Model

The workflow is designed so a developer or agent can stop and resume without re-discovering context.

Every git repo using the hub gets a project-local runtime area:

- `.omx/state/contexts/state.md`
Canonical workflow state for the current project.
- `.omx/state/contexts/research-index.md`
Index of reusable research artifacts.
- `.omx/state/contexts/session-index.md`
Index of lightweight resumable sessions.
- `.omx/state/contexts/artifacts.md`
Registry of relevant plan, research, session, and handoff artifacts.
- `.omx/sessions/`
Lightweight session checkpoints for normal pause/resume.
- `.omx/runtime/execution/active.json`
Execution sidecar that tracks where implementation is within a plan.
- `thoughts/plans/`, `thoughts/research/`, `thoughts/handoffs/`
Durable project artifacts for plans, research, and richer transfer docs.

This split is important:

- `state.md` is the workflow authority.
- Execution JSON is only the execution-position sidecar.
- Session artifacts are for ordinary continuity.
- Handoffs are for deliberate transfer or compaction.

### 5. Day-To-Day Commands

These are the commands that make the workflow practical for SWE use:

- `/session-start`
Create or refresh a lightweight working session.
- `/pause-session`
Checkpoint ordinary work without writing a full handoff.
- `/resume-session`
Recover from the latest lightweight session artifact.
- `/start-work`
Attach to the active implementation plan and continue from the current task, not from the top.
- `/project-artifacts`
Ask the system which artifacts matter most right now.
- `/project-story`
Explain the project in plain English from evidence.
- `/project-doctor`
Run diagnostics across workflow state, execution state, routing, adapters, and memory health.
- `/create-handoff` and `/resume-handoff`
Use these only when lightweight session continuity is not enough.

### 6. Large Project Mode: GSD

There is also a phase-oriented workflow system under `get-shit-done/` and `commands/gsd/`.

This is the heavier project-program-management layer. Use it when the work needs phased delivery, roadmap artifacts, or deeper orchestration:

1. `/gsd:new-project`
2. `/gsd:plan-phase <n>`
3. `/gsd:execute-phase <n>`
4. `/gsd:verify-work` or related verification commands

GSD creates and manages `.planning/` artifacts like `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, and phase directories. The newer continuity layer then helps agents resume and execute that work cleanly inside the repo.

### 7. What A Developer Should Remember

If you only remember the operating model, remember this:

1. The adapter gets you into the shared hub.
2. The router decides how heavy the workflow should be.
3. Plans, research, and validation are first-class artifacts, not side effects.
4. `state.md` plus session and execution artifacts make the work resumable.
5. Verification is part of completion, not an optional last step.

## Memory Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MEMORY ARCHITECTURE                                │
│                                                                          │
│   ┌─────────┐    ┌──────────────┐    ┌─────────────────┐                │
 │   │  Hooks  │───▶│  MemPalace   │───▶│    ChromaDB     │                │
 │   │ Capture │    │ 4-Layer Stack│    │  (vector store) │                │
 │   └─────────┘    └──────────────┘    └─────────────────┘                │
 │        │                                       │                         │
 │        │         ┌──────────────┐               │                         │
 │        └────────▶│   Recall    │◀──────────────┘                         │
│                  │  (semantic) │                                          │
│                  └──────────────┘                                         │
│                        │                                                   │
│                        ▼                                                   │
│               ┌────────────────┐                                           │
│               │ Context +      │                                           │
│               │ Planning       │                                           │
│               └────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
/Users/isaiahrivera/.agents/
├── prompts/              # System prompt (core AI behavior)
├── commands/             # Command definitions (workflow commands)
│   └── gsd/              # 43 GSD subcommands
├── agents/               # 43 workflow expert agents
├── skills/               # Shared skill packs
├── capsules/             # 2 task-class operating packs
├── rules/common/         # 16 reusable rule cards
├── contexts/             # Shared workspace state
├── scripts/              # 36 Node.js tools
├── hooks/                # 17 hook scripts
├── adapters/             # 5 provider adapters
│   ├── claude-code/
│   ├── codex-cli/
│   ├── opencode/
│   ├── antigravity/
│   └── openclaw/
├── tests/                # 27 test files
├── get-shit-done/        # GSD workflow system
│   ├── workflows/        # 43 workflows
│   └── templates/
├── bin/                  # CLI wrappers
├── .agents/              # Global agent state
│   ├── contexts/
│   └── sessions/
└── .agents-memory/      # Local vector memory (MemPalace/ChromaDB)
```


## What Gets Shared
- `prompts/`, `commands/`, `rules/`, `agents/`, `skills/`, `adapters/`, `hooks/`
- `capsules/` for task-class operating packs
- `contexts/` for shared starter context and canonical workflow metadata
- `scripts/`, `tests/`, `manifest.json`, and `sync.sh`
- onboarding and sharing docs

## What Stays Local
- Root secrets and caches: `.env`, `.env.local`, `.agents-memory/`, `memory.db`, `node_modules/`
- Repo-local scratch/runtime: `.planning/`, `projects/`, and `thoughts/`
- Per-project runtime created inside a target repo:
  - `[project]/.planning/`
  - `[project]/.omx/state/contexts/`
  - `[project]/.omx/sessions/`

The public repo is intended to be inspectable. Credentials, databases, handoffs, live plans, live research, and active project runtime state are not.

## First-Time Setup
1. Clone the repo into `~/.agents` if you want the default path assumptions used throughout the hub.
2. Run `npm install`.
3. Run `npm run init:local-state`.
4. Run `npm run validate:ssot`.
5. Run `npm test`.

`npm run init:local-state` bootstraps the local directories this repo expects for plans, research, and handoffs. Project-specific runtime files are created later from the target project via `node ~/.agents/scripts/project-context.mjs current`.

## Public Release Checklist
1. Confirm `git ls-files '.env*'` only shows `.env.example`.
2. Confirm `git ls-files 'memory.db' '.agents-memory/**'` returns nothing.
3. Review `git status --short` and make sure ignored runtime files were not force-added.
4. Run `npm run validate:ssot`.
5. Run `npm test`.

## Export A Clean Public Snapshot
If you want a fresh public repo without carrying older git history:

1. Finish the cleanup on your working branch.
2. Run `npm run export:public -- --dest ../agents-workflow-hub-public --init-git`.
3. Review the exported directory before publishing it.

The export script copies tracked files only. Ignored local files such as `.env`, `memory.db`, `.agents-memory/`, and project runtime state are not included.

## Sharing Model
See `SHARING.md` for the exact split between tracked workflow assets and local-only runtime surfaces.
