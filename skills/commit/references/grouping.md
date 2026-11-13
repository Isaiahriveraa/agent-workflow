# Atomic Grouping Rules

Load when deciding how to split a change set into commits, or when a split is disputed.

## The Responsibility Unit

A commit's unit is one responsibility: one behavior change with one reason to
exist.

The commit series is the reviewer's table of contents. If a reviewer must hold
two ideas in their head to approve one commit, the split failed.

A candidate commit is one responsibility only when all three tests hold:

1. One-sentence test — its purpose is one sentence with no conjunction and no
   comma-separated concept list.
2. Alone-revert test — reverting only this commit leaves a coherent repository:
   no dead code, orphaned references, or half-applied concept.
3. Independent-approve test — a reviewer can approve or reject it without
   having an opinion about the other commits in the series.

A pull request concern is a cohesive capability; a commit responsibility is one
behavior change inside it. One pull request normally contains several commits,
and a single pull-request concern is never a reason for one omnibus commit.


## Change Type

Separate different Conventional Commit types when they represent distinct
work:

* `feat`
* `fix`
* `refactor`
* `perf`
* `test`
* `docs`
* `style`
* `build`
* `ci`
* `chore`
* `revert`

A test may remain with its implementation when it directly proves that same
behavior.

A documentation update may remain with its implementation when the docs are
required to use or understand that exact change.

## Scope

Split changes that affect independent areas, such as:

* frontend versus backend
* CLI versus API
* authentication versus billing
* runtime logic versus CI configuration
* application code versus developer tooling

Shared files do not automatically mean shared scope.

## Motivation

Split changes with different reasons, including:

* fixing existing behavior
* introducing new behavior
* restructuring code without changing behavior
* improving performance
* updating dependencies
* cleaning formatting
* adding tests for previously untested behavior

## Revertability

Ask:

> Could a reviewer reasonably want to revert one part without reverting the
> other?

If yes, split them.

## Dependency

Default to splitting. Merge two responsibilities only when you can name the
concrete failure of splitting them — what breaks and which check proves it —
and record it as:

```text
Dependency: <X> cannot land without <Y> because <observed failure>
```

These are not dependencies:

* "they were designed together"
* "the contract only makes sense with its implementation"
* "it is one feature or one vertical slice"
* "the tests are shared"
* "splitting is extra work"

A vertical slice — domain contract, state reducer, wiring — is normally several
responsibilities that land in sequence. Ordering is how a split is made legal:
when the contract, the reducer, and the wiring can be ordered so each
intermediate commit is valid, the split is legal and required.

When an intermediate commit is genuinely unusable until the next one lands,
that is a finding to report with its cost: propose the split and let the user
choose. Only an observed, named failure justifies a merge. If you cannot name
the broken check, split.

## Mixed Files and Hunk-Level Staging

A file whose changes all belong to one reviewed concern may be staged as a
whole, even when it contains multiple Git hunks. Do not split such hunks
merely because there is more than one hunk.

When a file contains multiple independent concerns, or when the reviewed plan
deliberately selects only part of a file, hunk-level staging is required:

1. Inspect each relevant hunk.
2. Assign each hunk to its logical commit.
3. Use patch-based staging.
4. Verify the staged diff before committing.
5. Leave unrelated hunks unstaged for later commits.

Hunk-level staging is therefore required for mixed-concern files and
deliberately partial selection, but not for a one-concern file staged in full.

Preferred tools:

```bash
git add -p path/to/file
git reset -p path/to/file
git restore --staged -p path/to/file
```

Use hunk splitting or manual patch editing when one displayed hunk contains
multiple concerns.

Never stage unrelated lines merely because Git initially groups them into the
same hunk.

If changes are too intertwined to separate safely, report that limitation and
propose one of these approaches:

1. Refactor the working tree before committing.
2. Commit the inseparable dependency together with an explicit explanation.
3. Ask the user to choose between clearly stated tradeoffs.

Do not silently force an artificial split that produces broken commits.

## Commit Ordering

Order commits so each commit leaves the repository in a coherent state.

Prefer this dependency order when applicable:

1. preparatory refactor with no behavior change
2. core implementation
3. tests tied to the implementation
4. documentation
5. build, CI, or tooling changes

Do not create preparatory commits unless the preparation is independently
meaningful.

Every commit should build and pass relevant checks when practical.


## Bundling Anti-Patterns

* Concept-list subject — `feat(domain): add contracts, quote freezing, and
  state reducers` names three concepts, so it is three commits.
* Slice bundle — a contract, its logic, and its wiring committed together
  because they were written together; the inventory lists three lines.
* Layer bundle — `refactor: extract helpers, update callers, adjust tests` when
  each part can land independently.
* While-I-was-there — an unrelated fix riding along with a feature.
* Test coupon — tests for unrelated behaviors in one `test:` commit.

Detection is mechanical: run the one-sentence test on both the subject and the
Purpose. Any conjunction or comma list means split before presenting the plan.

