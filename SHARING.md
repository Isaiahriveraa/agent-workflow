# Sharing Model

This repo is split into two layers: tracked workflow assets and local runtime state.

## Tracked Shared Layer
- Reusable workflow assets: `commands/`, `skills/`, `agents/`, `adapters/`
- Helper scripts and `manifest.json`, `package.json`, `sync.sh`
- Onboarding docs: `README.md`, `SHARING.md`, `.env.example`

## Local Runtime Layer
Things that stay local and are gitignored:
- `.env`, `.env.local`
- `node_modules/`
- Tool runtime state: `.omc/`, `.omo/`, `.omx/`, `.sisyphus/`, `.opencode/node_modules/`
- Per-worktree documentation: `context/` at the Git worktree root

The local runtime layer is intentionally untracked so a clone starts clean and public publication does not expose credentials or active project state.

## Classification
- Share as-is: `commands/`, `skills/`, `agents/`, `adapters/`, `scripts/`, `manifest.json`, `package.json`
- Keep local only: `.env`, `.env.local`, `node_modules/`, tool runtime state directories
- Generate on first setup: `npm run init:local-state`

## Safety Checklist
- Do not commit `.env`, `.env.local`, or tool runtime state directories
- Keep docs and examples on repo-relative paths, not personal home-directory paths
- Review `git status --ignored` before publishing

## Safest Publish Path
- Do not push the full existing git history if earlier commits may contain private runtime state
- Export a fresh public snapshot with a shallow clone or fresh root commit

## Verification Before Publishing
Run the hub's validation:
```bash
npm run validate:ssot
```
