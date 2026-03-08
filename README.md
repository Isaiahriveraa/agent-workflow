# Agents Workflow Hub

This repo is the shareable starter for the workflow system: prompts, commands, rules, skills, adapters, scripts, and tests live here. Personal runtime state does not.

## What Gets Shared
- `prompts/`, `commands/`, `rules/`, `skills/`, `agents/`, `adapters/`
- `scripts/`, `tests/`, `get-shit-done/`
- starter `contexts/*.md`
- onboarding and sharing docs

## What Stays Local
- `.planning/`
- `sessions/`
- `thoughts/`
- `projects/`
- session checkpoints, handoffs, live plans, live research, and per-project runtime state

`.planning/`, `sessions/`, `thoughts/`, and `projects/` are gitignored. The repo ships only the reusable workflow and starter context documents.

## First-Time Setup
1. Clone the repo.
2. Run `npm run init:local-state`.
3. Run `npm test` to verify the install.
4. Start using the workflow; runtime state will be created locally under `.planning/`, `sessions/`, `thoughts/`, and `projects/`.

## Safe Public Export
If you want to publish a clean public version without carrying this repo's old history:

1. Finish the cleanup on your working branch.
2. Run `npm run export:public -- --dest ../agents-workflow-hub-public --init-git`.
3. `cd` into the exported directory.
4. Review the contents, commit there, and push that directory as a new GitHub repo.

## Sharing Rule
Before pushing changes, check `git status` and confirm nothing under ignored runtime directories was force-added. See `SHARING.md` for the exact sharing model.
