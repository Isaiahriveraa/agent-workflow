---
name: to-issues
description: Convert an approved plan, spec, issue, or conversation into concise GitHub Issues for human engineers and coding agents, with verified codebase context, one implementation issue per PR, explicit dependencies, and optional Mermaid diagrams.
disable-model-invocation: true
---

# To Issues

Convert an approved plan, specification, GitHub issue, or conversation into a small graph of **self-contained, implementation-ready GitHub Issues**.

The issues serve two equal audiences:

- A human engineer who should understand the issue in roughly 30 seconds.
- A fresh coding-agent session that needs enough verified context to implement it safely.

Optimize for **load-bearing context**, not maximum detail. Include information only when it affects scope, correctness, coordination, or verification.

## Hard contracts

### Issue-to-PR contract

- Every **implementation issue** MUST produce exactly one focused PR.
- A PR MUST resolve one implementation issue only.
- A **parent issue** is a tracking container and requires no PR.
- A parent closes when all implementation sub-issues close.
- If work cannot fit into one reviewable PR, split it automatically before presenting the draft.
- Do not split one coherent change merely because it touches multiple files or layers.

### Boundary contract

Prefer a narrow, complete vertical slice through every required layer.

Create a separate foundation issue only when later issues cannot safely start or be verified without a shared prerequisite, such as a contract, migration, fixture, public interface, compatibility layer, or required setup.

Foundation issues MUST stay limited to the prerequisite. They MUST NOT absorb feature behavior.

### Context contract

Every implementation issue must explain:

1. What changes and why.
2. The exact behavior owned by this PR.
3. What is in and out of scope.
4. What proves completion.
5. Which verified systems, interfaces, or constraints matter.
6. Which issues genuinely block or are blocked by it.

Do not require the assignee to know this skill, the original chat, or plan-server conventions.

### Authority contract

- The approved plan or specification is the authority for **intended behavior**.
- The codebase is the authority for **current implementation reality**.
- Codebase inspection may refine issue boundaries but MUST NOT silently change product intent.
- When the source and codebase conflict, mark it `Needs decision` and explain the impact.

### Approval contract

Draft and present the complete issue graph first. Do not publish or modify GitHub Issues until the user approves it.

## Resolve the repository

Use this order:

1. First argument in `owner/repo` form.
2. `git remote get-url origin` from the current working directory.
3. Ask for `owner/repo` before publishing if neither works.

Drafting may continue without a resolved repository when enough source context exists.

## Gather the source

Prefer the most concrete source available:

1. `to-plan` artifact or plan-server URL
2. Folder-bundle plan
3. GitHub issue number or URL
4. Specification or requirements document
5. Current conversation

For a plan artifact:

- Read the full file.
- For a bundle, read `index.mdx` and every linked concern file in numeric order.
- Treat explicit goals, scope, dependencies, risks, verification, and definition of done as authoritative.
- Preserve the source path or URL for traceability.
- Local artifacts are not required reading; each issue must remain self-contained.

For a GitHub issue:

```bash
gh issue view <number> --repo <owner/repo> --comments
```

Do not modify or close the original specification issue unless explicitly requested.

## Required workflow

### 1. Build a concise feature brief

Extract only:

- Current state
- Target state
- Why the feature matters
- Locked decisions and invariants
- In scope / out of scope
- Known risks and unresolved decisions
- Expected verification

Do not copy the entire source.

### 2. Inspect the relevant codebase

Codebase inspection is mandatory before decomposition.

Inspect the smallest relevant area deeply enough to verify:

- Current behavior and data flow
- Existing domain vocabulary and architecture
- Relevant modules, routes, schemas, interfaces, components, jobs, and workflows
- Existing tests, fixtures, and focused commands
- ADRs and scoped agent instructions
- Shared files or contracts that create coordination risk
- Existing functionality that changes or eliminates proposed work

Read callers and consumers before treating a symbol as a stable boundary.

Classify findings as:

- **Required** — locked by the approved source.
- **Verified context** — confirmed in the repository and useful to implementation.
- **Guidance** — optional direction the assignee may change.
- **Needs decision** — unresolved conflict or product choice.

Never invent paths, commands, interfaces, or dependencies.

### 3. Decompose into two issue types

#### Parent tracking issue

Create a parent only when two or more implementation issues share one larger outcome.

A parent:

- Explains the complete feature outcome.
- Shows the issue map.
- Tracks child completion.
- Owns no implementation and requires no PR.

#### Implementation issue

An implementation issue:

- Owns one coherent, independently verifiable outcome.
- Fits in one fresh coding-agent context and one focused review.
- Produces exactly one PR.
- Stands alone without the parent or siblings.

### 4. Apply the automatic split test

Split proposed work when any of these are true:

- It contains multiple independently valuable outcomes.
- Its acceptance criteria describe unrelated behaviors.
- Parts have different dependency chains.
- Parts can be safely implemented and reviewed in parallel.
- It combines a shared foundation with feature behavior.
- Safe review would require multiple PRs.

Do not split by file count or technical layer alone. A vertical slice may include schema, backend, UI, and tests when all are required for one observable behavior.

For wide mechanical refactors, use expand-contract:

1. Expand: add the new form beside the old.
2. Migrate: update callers in reviewable batches.
3. Contract: remove the old form after no callers remain.

Each batch is one implementation issue with explicit blockers.

### 5. Build the issue graph

A blocking edge exists only when an issue cannot safely start or cannot be verified until another issue closes.

Do not use blockers for preferred order, convenience, or parent-child grouping.

Record for every issue:

- Parent or children
- Blocked by
- Blocks
- Status: `parallel-ready`, `blocked`, `coordination needed`, or `needs decision`

When multiple issues or non-trivial dependencies exist, include a concise Mermaid graph in the draft.

### 6. Write layered issue bodies

Order implementation issues for progressive reading:

1. **Summary and PR boundary**
2. **Feature context and outcome**
3. **Scope and acceptance criteria**
4. **Implementation context and coordination**
5. **Verification and relationships**

#### Acceptance criteria

Acceptance criteria MUST describe observable outcomes and required invariants.

Do not use coding activities as the primary criteria:

- Create a component
- Add an endpoint
- Update the schema
- Write tests

Place those under implementation context when useful.

Every criterion must be binary enough for a reviewer to mark pass or fail.

#### Implementation guidance

Give the assignee a map, not turn-by-turn directions.

Include:

- Verified modules, systems, interfaces, and tests likely involved
- Contracts and conventions that must be preserved
- Known edge cases and coordination risks
- Required ordering only when compatibility or parallel work demands it

Do not prescribe internal design or implementation sequence unless the source locked it or correctness requires it. Clearly label optional suggestions as guidance.

#### Verification

Use the strongest verified proof available:

1. Exact repository commands
2. Integration or manual scenarios with expected results
3. Relevant existing CI checks

Include exact commands only when verified. Never invent scripts or test names. State the expected result, not merely `run tests`.

### 7. Use Mermaid only when it compresses complexity

Include one concise Mermaid diagram when it explains behavior, architecture, state transitions, system interaction, or dependency placement better than prose.

Do not include a diagram when it merely repeats the scope.

A diagram must:

- Highlight the boundary owned by this PR.
- Show only issue-relevant nodes and edges.
- Distinguish current and new behavior when useful.
- Use GitHub-compatible Mermaid syntax.
- Remain understandable without the source plan.

## Context budget

To prevent bloated issues:

- Summarize the larger feature; do not repeat the full specification.
- Include only codebase findings relevant to this PR.
- Do not list every file discovered.
- Do not repeat dependency information in narrative sections.
- Do not restate acceptance criteria as verification steps.
- Avoid large code snippets. Include only decision-rich contracts, schemas, state machines, or type shapes that prose cannot express precisely.
- Remove any sentence that does not affect scope, correctness, coordination, or proof.

## Draft review format

Before publishing, present:

1. A two-to-four sentence feature summary.
2. Issue count and parent-child structure.
3. A Mermaid issue graph when helpful.
4. Any `Needs decision` conflicts.
5. One compact card per draft issue containing:
   - Draft ID and title
   - Type: parent or implementation
   - One-sentence PR boundary
   - What it delivers
   - In scope / out of scope
   - Blocked by / blocks
   - Parent / children
   - Parallel status and coordination risk
   - Why this is the correct granularity

Ask for approval of the complete graph. Accept requested merges, splits, renamed boundaries, or dependency changes. Do not publish until approved.

## Parent issue template

```markdown
## Summary

<Complete feature outcome and why it matters.>

## Scope

### In scope
- <Feature-level behavior>

### Out of scope
- <Nearby behavior excluded>

## Issue map

<Optional Mermaid diagram showing children and genuine dependency edges.>

## Implementation issues

- `#<issue-number>` — <coherent outcome>

## Done when

- [ ] Every implementation issue is closed.
- [ ] The integrated feature behavior is verified.
- [ ] No `Needs decision` item remains.

## Source

- Source: `<URL or local path for traceability>`
- Original section: `<heading or concern file>`

> Tracking issue only. No implementation PR is required.
```

## Implementation issue template

```markdown
## Summary

<What changes, why it matters, and the exact boundary owned by this PR.>

## Feature context

<Concise larger-feature summary. State what this issue owns and what belongs to sibling issues.>

## Outcome

<Independently verifiable behavior or system state delivered by this PR.>

## Behavior flow

<Optional Mermaid diagram only when it reduces ambiguity.>

## Scope

### In scope
- <Specific behavior or system boundary>

### Out of scope
- <Nearby behavior excluded or assigned elsewhere>

## Acceptance criteria

- [ ] <Observable pass/fail outcome>
- [ ] <Required invariant or compatibility condition>
- [ ] <Relevant edge-case behavior>

## Implementation context

### Verified relevant areas
- `<confirmed module, path, route, schema, interface, or workflow>` — <why it matters>

### Required constraints
- <Locked decision, contract, convention, or compatibility rule>

### Guidance
- <Optional direction, or `None — assignee owns the internal design`.>

### Coordination risks
- <Shared files, interfaces, merge order, or `None known`.>

## Verification

- [ ] Run `<verified command>` and confirm `<expected result>`.
- [ ] Perform `<scenario>` and confirm `<observable result>`.

## Relationships

- Parent: `#<issue-number>` or `None — top-level implementation issue`
- Blocked by: `#<issue-number> — <gating reason>` or `None — parallel-ready`
- Blocks: `#<issue-number> — <reason>` or `None known`

## Delivery contract

- One implementation issue = one PR.
- Use a dedicated branch and sibling worktree; never share a worktree with another issue.
- The PR must reference and resolve this issue only.
- Post verification evidence before closure.

## Source

- Source: `<URL or local path for traceability>`
- Original section: `<heading or concern file>`
```

Omit optional subsections instead of filling them with low-value prose. Keep relationship fields explicit even when the value is `None`.

## Publish after approval

### 1. Reuse existing labels

```bash
gh label list --repo <owner/repo> --limit 200
```

Use existing semantic matches only. Prefer one work-type label, one readiness label, and an existing domain label when useful. Do not create labels unless explicitly requested. Publish without labels when no good match exists.

### 2. Create issues

Create parent issues first, then implementation issues in dependency order.

```bash
gh issue create \
  --repo "<owner/repo>" \
  --title "<issue title>" \
  --body-file "<body-file>"
```

Capture each issue number, URL, and node ID.

### 3. Create parent-child relationships

```bash
PARENT_ID=$(gh issue view <parent-number> --repo "<owner/repo>" --json id --jq .id)
CHILD_ID=$(gh issue view <child-number> --repo "<owner/repo>" --json id --jq .id)

gh api graphql -f query='
mutation {
  addSubIssue(input: {
    issueId: "'"$PARENT_ID"'"
    subIssueId: "'"$CHILD_ID"'"
    replaceParent: true
  }) { subIssue { id } }
}'
```

### 4. Create native blocked-by relationships

```bash
BLOCKED_ID=$(gh issue view <blocked-number> --repo "<owner/repo>" --json id --jq .id)
BLOCKING_ID=$(gh issue view <blocking-number> --repo "<owner/repo>" --json id --jq .id)

gh api graphql -f query='
mutation {
  addBlockedBy(input: {
    issueId: "'"$BLOCKED_ID"'"
    blockingIssueId: "'"$BLOCKING_ID"'"
  }) { clientMutationId }
}'
```

`issueId` is blocked by `blockingIssueId`.

### 5. Replace draft references

After all issues exist, replace draft IDs with real issue numbers:

```bash
gh issue edit <number> \
  --repo "<owner/repo>" \
  --body-file "<updated-body-file>"
```

Do not claim native relationships unless the GraphQL mutations succeeded.

## Final quality check

Before reporting completion, verify:

- Every implementation issue maps to one coherent PR.
- Parent issues own no implementation work.
- Every issue stands alone without the original conversation.
- Every codebase reference and command is verified.
- Acceptance criteria describe outcomes or invariants.
- Verification states observable proof.
- Mermaid diagrams exist only where they improve understanding.
- Every dependency is genuinely blocking.
- Claimed parent-child and blocked-by relationships exist in GitHub.
- Issue bodies use real issue numbers, not draft IDs.
- No original specification issue was modified without permission.

Return issue URLs grouped by execution wave, parallel-ready issues, blocked issues and their blockers, created native relationships, and unresolved `Needs decision` items.
