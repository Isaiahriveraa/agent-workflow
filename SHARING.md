# Sharing Model

This repo is split into two layers.

## Shared Layer
- Reusable workflow assets: prompts, commands, rules, skills, adapters, agents
- Helper scripts and tests
- Starter global contexts under `contexts/`
- Onboarding and setup docs

## Local Runtime Layer
- `.planning/` for repo-local intake, plan, and research artifacts
- `sessions/` for repo-local lightweight session artifacts
- `thoughts/` for plans, research, handoffs, and session artifacts
- `projects/` for per-project runtime `state.md`, `session-index.md`, and `artifacts.md`

The local runtime layer is intentionally gitignored so a clone starts clean.

## Classification
- Share as-is: `prompts/`, `commands/`, `rules/`, `skills/`, `agents/`, `adapters/`, `hooks/`, `scripts/`, `tests/`, `get-shit-done/`, `manifest.json`, `package.json`
- Replace with starter content: `contexts/decisions.md`, `contexts/state.md`, `contexts/research-index.md`, `contexts/session-index.md`, `contexts/tooling.md`, `contexts/verification.md`, `contexts/artifacts.md`, `contexts/ui-ux.md`
- Keep local only: `.planning/`, `sessions/`, `thoughts/`, `projects/`
- Generate on first setup: local runtime directories created by `npm run init:local-state` and per-project context files created by `node ./scripts/project-context.mjs current`

## Safety Checklist
- Do not commit files under `.planning/`, `sessions/`, `thoughts/`, or `projects/`
- Keep tracked `contexts/` generic and free of personal history or absolute machine-specific paths
- Prefer repo-relative or `~/.agents` references in docs; do not use a personal home-directory path in shareable files

## Safest Publish Path
- Do not push the full existing git history if earlier commits may contain private runtime state
- Export a fresh public snapshot with `npm run export:public -- --dest ../agents-workflow-hub-public --init-git`
- Publish the exported directory as a new repo or from a fresh root commit
