# Sharing Model

This repo is split into two layers: tracked workflow assets and local runtime state.

## Tracked Shared Layer
- Reusable workflow assets: `commands/`, `skills/`, `agents/`, `adapters/`, `hooks/`
- Helper scripts, tests, `manifest.json`, `package.json`, `sync.sh`
- Shared contexts under `contexts/`
- Onboarding and setup docs such as `README.md`, `SHARING.md`, and `.env.example`

## Local Runtime Layer
- Root-local files ignored in this repo:
  - `.env`
  - `.env.local`
  - `.agents-memory/`
  - `memory.db`
  - `.planning/`
  - `thoughts/`
  - `projects/`
  - `node_modules/`
- Per-project runtime generated inside the target repo:
  - `[project]/.planning/`
  - `[project]/.sisyphus/run-continuation/`

The local runtime layer is intentionally untracked so a clone starts clean and so public publication does not expose credentials or active project state.

## Classification
- Share as-is: `commands/`, `skills/`, `agents/`, `adapters/`, `hooks/`, `scripts/`, `tests/`, `get-shit-done/`, `manifest.json`, `package.json`, `package-lock.json`
- Keep tracked but generic: `contexts/*.md` and `.env.example`
- Keep local only: `.env`, `.env.local`, `.agents-memory/`, `memory.db`, `.planning/`, `thoughts/`, `projects/`, and per-project `.omx/` runtime files
- Generate on first setup: repo-local starter directories from `npm run init:local-state` and per-project context files from `node ~/.agents/scripts/project-context.mjs current`

## Safety Checklist
- Do not commit `.env`, `.env.local`, `memory.db`, `.agents-memory/`, or force-added files from ignored runtime paths
- Keep tracked `contexts/` generic and free of live operator history
- Keep docs and examples on `~/.agents` or repo-relative paths, not personal home-directory paths
- Review `git status --ignored` if your working copy has local `thoughts/` artifacts you do not want lingering on disk

## Safest Publish Path
- Do not push the full existing git history if earlier commits may contain private runtime state
- Export a fresh public snapshot with `npm run export:public -- --dest ../agents-workflow-hub-public --init-git`
- Publish the exported directory as a new repo or from a fresh root commit

## Verification Before Publishing
Run the repo's actual checks:
1. `npm run validate:ssot`
2. `npm test`
