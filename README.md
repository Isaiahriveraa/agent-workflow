# Agents Workflow Hub

This repo is the shareable starter for the workflow system. Reusable policy, prompts, commands, adapters, skills, capsules, scripts, and tests live here. Machine-local secrets and runtime state do not.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AI CODING TOOLS                                    │
│    ┌──────────────┐   ┌────────────┐   ┌──────────┐   ┌────────────┐          │
│    │ Claude Code  │   │ Codex CLI  │   │ OpenCode │   │ Antigravity│  ...     │
│    └──────┬───────┘   └─────┬──────┘   └────┬─────┘   └─────┬──────┘          │
└───────────┼─────────────────┼──────────────┼───────────────┼──────────────────┘
            │                 │              │               │
            └─────────────────┴──────────────┴───────────────┘
                                     │
                              ┌──────▼──────┐
                              │  ADAPTERS  │
                              │ /adapters/ │
                              │  - claude   │
                              │  - codex    │
                              │  - opencode │
                              │  - etc      │
                              └──────┬──────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────────┐
│                                    │           CORE SYSTEM                     │
│     ┌──────────────────────────────▼──────────────────────────┐                  │
│     │                    WORKFLOW ENGINE                       │                  │
│     │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │                  │
│     │  │ Commands   │  │  Agents    │  │   Skills   │        │                  │
│     │  │ (43 cmds)  │  │ (43 agents)│  │ (46 skills)│        │                  │
│     │  └────────────┘  └────────────┘  └────────────┘        │                  │
│     │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │                  │
│     │  │   Hooks    │  │   Rules    │  │ Capsules   │        │                  │
│     │  │ (17 hooks) │  │ (16 rules) │  │ (2 packs)  │        │                  │
│     │  └────────────┘  └────────────┘  └────────────┘        │                  │
│     └────────────────────────────────────────────────────────┘                  │
│                                    │                                            │
│     ┌──────────────────────────────▼──────────────────────────┐                  │
│     │                   WORKFLOW ROUTER                       │                  │
│     │     Tier 1 (trivial) → Tier 2 (moderate) → Tier 3      │                  │
│     └────────────────────────────────────────────────────────┘                  │
└────────────────────────────────────┼────────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
              ┌─────▼─────┐    ┌──────▼──────┐  ┌──────▼──────┐
              │  LanceDB  │    │   SQLite    │  │   Sessions  │
              │ (vectors) │    │  (history)  │  │   (state)   │
              └───────────┘    └─────────────┘  └─────────────┘
```

## Tiered Workflow System

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              TASK INTAKE                                       │
│                    User Request → AI Tool → Commands                          │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      WORKFLOW ROUTER        │
                    │   (workflow-router-tools)   │
                    └──────────────┬───────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
   ┌─────────────┐          ┌───────────────┐        ┌──────────────┐
   │   TIER 1    │          │    TIER 2     │        │    TIER 3    │
   │   Trivial   │          │   Moderate    │        │ Substantial │
   │  Direct     │          │  Plan +       │        │   Strict     │
   │  Execute    │          │  Implement    │        │   Workflow   │
   └─────────────┘          └───────────────┘        └───────┬──────┘
                                                             │
                                              ┌──────────────▼──────────────┐
                                              │      TIER 3 FLOW            │
                                              │  1. Optimize Prompt         │
                                              │  2. Brainstorm (if vague)   │
                                              │  3. Research (research)     │
                                              │  4. Readiness Gate (70/15)  │
                                              │  5. Plan (create-plan)      │
                                              │     └─► RPI Critique        │
                                              │  6. Implement (implement)   │
                                              │  7. Validate (verification) │
                                              └─────────────────────────────┘
```

## Memory Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MEMORY ARCHITECTURE                                │
│                                                                          │
│   ┌─────────┐    ┌──────────────┐    ┌─────────────────┐                │
│   │  Hooks  │───▶│    mem0ai    │───▶│    LanceDB      │                │
│   │ Capture │    │ Orchestration│    │  (vector store) │                │
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
├── commands/             # 29 command definitions (workflow commands)
│   └── gsd/              # 43 GSD subcommands
├── agents/               # 43 workflow expert agents
├── skills/               # 46 skill packs
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
└── .agents-memory/      # Local vector memory (LanceDB)
```

## Data Flow

```
User Input
    │
    ▼
┌─────────────────┐
│  AI Tool        │
│ (Claude/Codex)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Command Router  │────▶│  Workflow Tier  │
│ (commands/)     │     │  (1/2/3)        │
└─────────────────┘     └────────┬────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────┐          ┌─────────────┐         ┌─────────────┐
│   Execute   │          │   Plan +    │         │   Full RPI  │
│   Direct    │          │  Implement  │         │   Workflow  │
└─────────────┘          └─────────────┘         └──────┬──────┘
                                                        │
                              ┌─────────────────────────┼─────────────┐
                              │                         │             │
                              ▼                         ▼             ▼
                        ┌──────────┐            ┌──────────┐  ┌──────────┐
                        │  Memory  │            │  Verify  │  │  Result  │
                        │  Store   │            │  Check   │  │  Output  │
                        └──────────┘            └──────────┘  └──────────┘
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
  - `[project]/.agents/contexts/`
  - `[project]/.agents/sessions/`

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
