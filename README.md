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
