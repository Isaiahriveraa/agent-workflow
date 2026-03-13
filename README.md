# Agents Workflow Hub

This repo is the shareable starter for the workflow system. Reusable policy, prompts, commands, adapters, skills, capsules, scripts, and tests live here. Machine-local secrets and runtime state do not.

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

## System Design

This repo is easiest to understand if you think of it as a workflow control plane:

- tracked assets define the rules, prompts, commands, adapters, and helper scripts
- project-local runtime files hold the current working state for the repo being worked on
- the main commands move work through a strict research -> plan -> implement -> validate loop
- supporting scripts persist context, grade artifacts, make strategy decisions, and record learning

### Workflow Map

```text
                               AGENTS WORKFLOW HUB

  tracked workflow policy                                      project-local runtime
+--------------------------------------+         +------------------------------------------+
| prompts/ commands/ rules/ contexts/  |         | [project]/.agents/contexts/             |
| adapters/ hooks/ skills/ scripts/    |         | - state.md                              |
| tests/ manifest.json                  |         | - research-index.md                     |
+-------------------+------------------+         | - session-index.md                      |
                    |                            |                                          |
                    |                            | [project]/.planning/                     |
                    |                            | - intake/                                |
                    |                            | - research/                              |
                    |                            +-------------------+----------------------+
                    |                                                ^
                    v                                                |
        +-----------+-----------------------------+                  |
        | 1. intake + route                       |                  |
        | workflow-router-tools.mjs               |                  |
        | - activate strict workflow?             |                  |
        | - classify task size                    |                  |
        | - score readiness                       |                  |
        | - capture intake artifact               |                  |
        +-----------+-----------------------------+                  |
                    |                                                |
                    | if substantial                                 |
                    v                                                |
        +-----------+-----------------------------+                  |
        | 2. research + working set               |------------------+
        | /research_codebase                      |
        | artifact-tools.mjs                      |
        | workflow-artifact-tools.mjs             |
        | project-context.mjs                     |
        +-----------+-----------------------------+
                    |
                    v
        +-----------+-----------------------------+
        | 3. command entry                        |
        | /create-plan                            |
        | /implement_plan                         |
        | /validate_plan                          |
        |                                         |
        | each command loads:                     |
        | - canonical state + decisions           |
        | - selected artifacts                    |
        | - artifact grades                       |
        | - verification evidence                 |
        | - optional advisory memory recall       |
        +-----------+-----------------------------+
                    |
                    v
        +-----------+-----------------------------+
        | 4. shared decision layer                |
        | workflow-command-decision.mjs           |
        |                                         |
        | create-plan can:                        |
        | - continue                              |
        | - do_more_research                      |
        | - run_critic                            |
        | - request_user_decision                 |
        |                                         |
        | implement-plan can:                     |
        | - continue                              |
        | - replan                                |
        | - capture_lesson                        |
        | - request_user_decision                 |
        |                                         |
        | validate-plan can:                      |
        | - continue                              |
        | - capture_lesson                        |
        | - request_user_decision                 |
        +-----------+-----------------------------+
                    |
                    v
        +-----------+-----------------------------+
        | 5. artifactized decision output         |
        | autonomy-dispatcher.mjs                 |
        | self-improvement-artifacts.mjs          |
        |                                         |
        | writes:                                 |
        | - trace artifact                        |
        | - eval artifact                         |
        | - strategy artifact                     |
        +-----------+-----------------------------+
                    |
         +----------+-----------+----------------------------+
         |                      |                            |
         v                      v                            v
+--------+---------+  +---------+----------+   +-------------+-------------+
| continue          |  | request_user_     |   | capture_lesson            |
| command proceeds  |  | decision          |   | lesson-tools.mjs          |
| to next workflow  |  | stop and ask      |   | update lessons/patterns   |
| step              |  | for human input   |   | optionally mirror memory  |
+--------+---------+  +---------+----------+   +-------------+-------------+
         |                      |                            |
         +----------------------+----------------------------+
                                |
                                v
                 +--------------+------------------+
                 | 6. persistence + continuity     |
                 | artifact-tools.mjs              |
                 | project-context.mjs             |
                 | hooks/gsd-context-monitor.js    |
                 | - persist working set           |
                 | - checkpoint on warning         |
                 | - handoff on critical pressure  |
                 +--------------+------------------+
                                |
                                v
                 +--------------+------------------+
                 | 7. verification + next pass     |
                 | contexts/verification.md         |
                 | npm run validate:ssot            |
                 | npm test                         |
                 | next command re-enters loop      |
                 +----------------------------------+
```

### What Owns What

- `commands/` define the human-facing workflow steps.
- `rules/common/` define gating policy such as strict-workflow activation and readiness.
- `scripts/workflow-router-tools.mjs` decides whether work must go through the full workflow and whether readiness is high enough to proceed.
- `scripts/workflow-command-decision.mjs` is the shared decision layer for the main workflow commands.
- `scripts/autonomy-dispatcher.mjs` turns those decisions into trace/eval/strategy artifacts.
- `scripts/artifact-tools.mjs` and `scripts/project-context.mjs` keep the active working set and project runtime state in sync.
- `scripts/lesson-tools.mjs` records durable lessons and can mirror them into advisory memory.
- project-local `.agents/contexts/state.md` is the canonical resumable state for active work.
- advisory memory is optional input only. It can help, but it does not outrank explicit artifacts or runtime state.

### Mental Model

If you want one sentence for the whole system, it is this:

```text
commands move work through the workflow, scripts enforce and persist it, runtime state keeps continuity, and lessons improve the next pass without becoming the source of truth
```
