---
name: github-pr-proposer
description: |
  Reads fix entries from a Notion database, inspects the target GitHub repo,
  and proposes changes as pull requests. Never writes to main — only creates
  koda/fix/* feature branches and opens PRs for human review.
  Triggered manually or from a Heartbeat check.
metadata:
  author: koda
  version: "3.2"
  requires:
    env:
      - GITHUB_TOKEN
      - NOTION_API_KEY
---

# GitHub PR Proposer

This skill is an unattended automation contract for Docker and cron-driven PR proposal runs.

It must behave like a strict state machine, not a conversational best-effort assistant.

## Runtime Profiles

This skill supports two runtime profiles:

- `shared-strict`: shared `.agents` durable artifacts and strict one-phase fail-closed execution.
- `openclaw-local`: read-only shared `.agents` inputs with OpenClaw-local durable artifacts and bounded best-effort execution.

Unless the runtime explicitly sets `GITHUB_PR_PROPOSER_RUNTIME_PROFILE=openclaw-local`, follow `shared-strict`.

## Operating Model

- Process at most one actionable Notion item per run.
- In `shared-strict`, advance that item by at most one durable phase per run.
- In `openclaw-local`, the same item may advance across multiple phases in one run when each gate passes.
- Fail closed on missing core dependencies, unsafe artifact paths, failed verification, or partial implementation.
- In `shared-strict`, store durable artifacts only under the shared `.agents` hub.
- In `openclaw-local`, store durable artifacts only under the OpenClaw workspace namespace.
- Use temporary workspace paths only for ephemeral repo execution.
- Always leave a resumable failure artifact when a phase fails after selecting an item.
- Never open a PR from an incomplete plan execution.
- In `openclaw-local`, allow bounded best-effort recovery with up to 3 attempts per phase before writing `Error`.

## Runtime Preconditions

Before selecting an item, the runtime must confirm:

- `/home/node/.agents` is mounted read-only from the host shared hub.
- `/home/node/.agents/scripts/github-pr-proposer` exists.
- in `shared-strict`, the configured shared artifact roots are writable.
- in `openclaw-local`, `/home/node/.openclaw/workspace/autonomy/github-pr-proposer` is writable.
- `git`, `node`, `npm`, and the detected package manager are available.
- `GITHUB_TOKEN` and `NOTION_API_KEY` are present.

If any precondition fails, stop immediately without selecting or mutating a Notion item.

## Required Helpers

These helpers are the only allowed remote I/O and artifact resolution surface for this skill:

- `~/.agents/scripts/github-pr-proposer/notion.mjs`
- `~/.agents/scripts/github-pr-proposer/github-read.mjs`
- `~/.agents/scripts/github-pr-proposer/github-write.mjs`
- `~/.agents/scripts/github-pr-proposer/artifacts.mjs`

Each helper invocation must:

- perform one logical action
- print one JSON object to stdout on success
- print one JSON object to stderr on failure
- exit non-zero on failure
- avoid prose output
- avoid shell-constructed JSON payloads
- be invoked only as `node ~/.agents/scripts/github-pr-proposer/<helper>.mjs ...`
- never rely on direct executable script invocation from `~/.agents`, because that mount may be read-only and non-executable in `openclaw-local`

Helper command surface:

- `notion.mjs`
  - `select-oldest-actionable --data-source-id <id> [--statuses Ready,Researching,Planning,Coding]`
  - `get-item --page-id <id>`
  - `update-fields --page-id <id> --properties <json>`
  - `set-status --page-id <id> --status <value>`
  - `append-feedback --page-id <id> --message <text>`
- `github-read.mjs`
  - `normalize-repo --repo owner/name`
  - `repo-access --repo owner/name`
  - `default-branch --repo owner/name`
  - `clone-url --repo owner/name`
- `github-write.mjs`
  - `create-pr --repo owner/name --title <text> --head <branch> --base <branch> [--body <text>] [--draft true|false]`
  - `get-pr-by-head --repo owner/name --head <branch>`
- `artifacts.mjs`
  - `resolve-research --repo owner/name --page-id <id>`
  - `resolve-plan --repo owner/name --page-id <id>`
  - `resolve-handoff --repo owner/name --page-id <id>`
  - `validate-canonical-path --path <path>`

## Queue Contract

### Required Notion Fields

- `Name` (`Title`)
- `Task` (`Text`)
- `Repo` (`Text`)
- `Feedback` (`Text`)
- `Last Error` (`Text`)
- `Base Branch` (`Text`)
- `Branch` (`Text`)
- `PR URL` (`URL`)
- `Research Path` (`Text`)
- `Plan Path` (`Text`)
- `Status` (`Status`)
- `Task Type` (`Select`)
- `Date` (`Date`)
- `Updated At` (`Last edited time`)

### Optional Notion Fields

- `Description` (`Text`)

### Allowed Status Values

- `Inbox`
- `Ready`
- `Researching`
- `Planning`
- `Coding`
- `Review`
- `PR Opened`
- `Done`
- `Error`

### Canonical Runtime Statuses

This skill writes only these values:

- `Ready`
- `Researching`
- `Planning`
- `Coding`
- `PR Opened`
- `Error`

### Legacy Read Compatibility

When reading existing items, map:

- `Research Complete` -> `Planning`
- `Planning Complete` -> `Coding`
- `In Progress` -> `Coding`

Do not write those legacy statuses back out.

## Artifact Contract

### `shared-strict`

Durable artifacts must live under these canonical roots:

- Research: `.agents/thoughts/research/github-pr-proposer/...`
- Plan: `.agents/thoughts/plans/github-pr-proposer/...`
- Error handoff: `.agents/thoughts/shared/handoffs/github-pr-proposer/...`

### `openclaw-local`

Durable artifacts must live under these OpenClaw-local roots:

- Research: `.openclaw/workspace/autonomy/github-pr-proposer/items/<page-id>/research.md`
- Plan: `.openclaw/workspace/autonomy/github-pr-proposer/items/<page-id>/plan.md`
- Error handoff: `.openclaw/workspace/autonomy/github-pr-proposer/items/<page-id>/handoff.md`
- Local state: `.openclaw/workspace/autonomy/github-pr-proposer/items/<page-id>/state.json`
- Attempt log: `.openclaw/workspace/autonomy/github-pr-proposer/items/<page-id>/attempt-log.jsonl`

Never write durable artifacts under:

- `.openclaw/workspace/research/...`
- `.openclaw/workspace/plans/...`
- any other `.openclaw/workspace/*` artifact location

Artifact paths must be deterministic for a given queue item and phase.

## Temporary Execution Paths

Temporary execution state may live only under:

- `/home/node/.openclaw/workspace/runs/github-pr-proposer/<page-id>/repo`
- `/home/node/.openclaw/workspace/runs/github-pr-proposer/<page-id>/tmp`

This directory must be removed during cleanup on both success and failure.

## Phase Routing

Select the oldest actionable item in this order:

1. `Coding`
2. `Planning`
3. `Researching`
4. `Ready`

Ignore terminal or non-actionable statuses.

Use a single-flight lock so concurrent cron runs cannot process two items at once.

## Phase Rules

### `Ready`

Goal: create the canonical research artifact and advance to `Planning`.

Actions:

1. Select one actionable item.
2. Compute deterministic branch slug `koda/fix/{slug}`.
3. Reuse that exact branch string in every later artifact, Notion update, commit, push, handoff, and summary for the same queue item.
4. Verify repo access with `github-read.mjs repo-access`.
5. Resolve canonical research path with `artifacts.mjs resolve-research`.
6. Update Notion with:
   - `Branch`
   - `Research Path`
   - `Status = Researching`
7. Produce the research artifact at the resolved canonical path.
8. Validate that the path is canonical and the artifact is structurally complete.
9. Update `~/.agents/contexts/research-index.md`.
10. Update Notion with:
   - `Status = Planning`
   - `Research Path = <canonical path>`

Stop after the research artifact exists and the item is in `Planning`.

In `openclaw-local`, this phase may continue directly into `Planning` if the research artifact is complete and the current run budget allows it.

### `Planning`

Goal: create the canonical plan artifact and advance to `Coding`.

Actions:

1. Read the research artifact from the canonical path stored in Notion.
2. If the artifact is missing or non-canonical, set `Status = Error` and stop.
3. Resolve the deterministic plan path with `artifacts.mjs resolve-plan`.
4. Produce the plan artifact at the canonical path.
5. Validate that the plan includes:
   - implementation overview
   - files to add
   - files to modify
   - files to delete or replace
   - verification commands
   - cleanup requirements
   - completion gates
6. Update Notion with:
   - `Status = Coding`
   - `Plan Path = <canonical path>`

Stop after the plan artifact exists and the item is in `Coding`.

In `openclaw-local`, this phase may continue directly into `Coding` if the plan is complete and the current run budget allows it.

### `Coding`

Goal: implement the full plan, verify it locally, clean up, and then open a PR.

Required sequence:

1. Read the canonical plan artifact.
2. If the plan artifact is missing or non-canonical, set `Status = Error` and stop.
3. Create the temporary run directory.
4. Clone the repo with native `git`.
5. Configure repo-local git identity:
   - `user.name=Koda`
   - `user.email=koda@openclaw.ai`
6. Detect the package manager from repo files.
7. Install dependencies using the repo's deterministic install command.
8. Execute the implementation.
9. Execute cleanup requirements from the plan.
10. Run every required local verification command from the plan.
11. Confirm all completion gates pass.
12. Commit, push, and create the PR.
13. Update Notion with:
   - `PR URL`
   - `Status = PR Opened`

If any step fails:

- do not commit
- do not push
- do not create a PR
- write a handoff artifact
- set `Status = Error`

In `openclaw-local`, recoverable failures may trigger up to 3 attempts within the same phase before the final `Error` transition.

### `Error`

Goal: fail in a resumable, inspectable way.

Actions:

1. Resolve deterministic handoff path with `artifacts.mjs resolve-handoff`.
2. Write a handoff artifact containing:
   - page id
   - repo
   - branch
   - current status
   - failing phase
   - failing command
   - exit code
   - stderr excerpt
   - artifact paths
   - recommended next command
3. Update Notion with:
   - `Status = Error`
   - `Last Error = <concise summary>`

Stop immediately afterward.

## Partial Implementation Policy

Partial implementation is an error, not a success.

Treat the run as partial if any of the following is true:

- a plan checklist item remains incomplete
- a required file deletion or replacement was skipped
- a required cleanup step was skipped
- a verification command failed
- a completion gate failed
- the final result is described as "foundation complete", "partial implementation", or equivalent incomplete language

If the run is partial:

- do not open a PR
- do not set `PR Opened`
- write a handoff artifact
- set `Status = Error`

## Git and PR Safety

- Never write to `main`, `master`, or any protected branch.
- Never force-push.
- Never merge PRs.
- Never open more than one PR for the same queue item in a single run.
- Use native `git` for clone, branch, commit, and push.
- Use `github-write.mjs` for PR creation and PR lookup.
- Do not require `gh`.

## Cleanup Requirements

Always clean:

- temporary repo clone
- temporary auth files such as askpass helpers
- run-local temp logs or intermediate files

Do not clean:

- canonical artifacts under `.agents/thoughts/...`
- Notion status history

## Logging Requirements

Each durable phase transition should emit structured logs containing:

- `run_id`
- `page_id`
- `repo`
- `phase`
- `status_before`
- `status_after`
- `artifact_path`
- `verification_commands`
- `result`

## Completion Rule

This skill is successful only when one queue item advances one durable phase with canonical artifacts and explicit state.

In `openclaw-local`, this skill is successful when one queue item advances as far as safely possible in a single run, persists local artifacts and attempt state, and opens a PR only after complete cleanup and verification.

It is not successful when it writes local fallback artifacts, opens a partial PR, or leaves temporary workspace state behind.
