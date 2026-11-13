# Triage: Pick the Reviewers the Diff Needs

Read after setup (Steps 1-2) and before any subagent is spawned. The main agent
reads the diff itself and decides which reviewers run. Most diffs need fewer
than the full roster. Spawn nothing a diff gives no reason for.

### Step 3a: Read the diff and split it into concerns

1. Read `.git/code-review.changed-files` and `git diff --stat` for the scope,
   then skim the patch.
2. Group the changed files into **concerns**: sets of changes with one reason
   to exist (for example "retry logic in the queue worker", "docs for the CLI").
   Note each concern's kind: logic, interface/contract, structure, tests only,
   docs/prose only, config/build, dependencies.

### Step 3b: Choose lenses per concern

Pick from this roster using the triggers. A lens runs only when a trigger is
actually in the diff.

| Lens | Agent | Trigger |
|---|---|---|
| Behavioral | `reviewer-behavioral` | Any changed executable logic: branches, loops, state, error handling, data transforms. |
| Contract | `reviewer-contract` | Changed signatures, exported names, CLI flags, schemas, file formats, or anything other files call or depend on; also docs/specs that claim a behavior the code must match. |
| Maintainability | `reviewer-maintainability` | New or restructured code that is non-trivial (new module, new abstraction, roughly 40+ new lines of logic, or a moved responsibility). |
| Security | `security-reviewer` | Trust boundaries, auth, queries, shell/process execution, filesystem paths from input, deserialization, secrets, crypto, outbound URLs, raw HTML. |
| Concurrency | generic subagent with the Concurrency section of `deep-review.md` | Shared mutable state, async handlers, queues/retries, locks, transactions, caches, background jobs. |
| Persistence & compatibility | generic subagent with that section of `deep-review.md` | Schemas, migrations, stored/serialized data, public API or protocol types. |
| Dependencies | generic subagent with that section of `deep-review.md` | A manifest or lockfile changed. |
| Hardener (Step 3) | `hardener` | Full mode only, and only when a concern changes executable logic that tests can exercise. |

Shortcuts:

- **Docs/prose/comments only, or formatting only:** no reviewer subagents.
  Read it yourself for claims that contradict the code (the Contract lens's
  question), and report.
- **Tests only:** Behavioral lens only (do the tests assert what they claim?).
- **Config/build only:** Contract lens only, plus Dependencies or Security when
  triggered.
- **Small, single-concern logic change** (roughly under 40 changed lines):
  Behavioral only, plus any triggered specialist.

### Step 3c: Shape the dispatch

- **One reviewer per lens by default.** Each sees the whole patch.
- **Split by concern only when it helps.** If the diff is large (roughly 400+
  changed lines) and has independent concerns, give a lens one subagent per
  concern that triggers it, each scoped to that concern's files. Never spawn a
  lens for a concern that does not trigger it.
- **Cap it.** Aim for 1-3 reviewer subagents and rarely more than 5. If triggers
  ask for more, merge the closest lenses into one reviewer prompt rather than
  spawning another agent.
- **Adjudicator only when needed.** Spawn it only if reviewers returned at least
  one candidate finding. Zero candidates means no adjudication pass.

### Step 3d: Say the plan in one block, then go

Before spawning, state the plan briefly. Don't wait for approval:

```text
Review plan
- Concerns: <n> — <one line each>
- Spawning: <lens> (<concern or "whole diff">) — <trigger seen>
- Skipped: <lens> — <why not triggered>
```

Report the same plan in the final result so the user can see why each agent ran.
