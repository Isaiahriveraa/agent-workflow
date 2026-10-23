---
name: to-spec
description: Synthesize the current conversation into a local spec draft; publish it as a GitHub Issue only after review and separate approval.
disable-model-invocation: true
---

This skill synthesizes the current conversation and codebase understanding into
a spec. Follow `~/.agents/references/workflow.md`; do not restart discovery or
interview the user again about settled decisions. Record unresolved choices as
open questions rather than inventing policy or treating suggestions as decisions.

## Determining the repo

Identify the repository to ground the draft and before any publication. In priority order:

1. If the first argument is in `owner/repo` format, use it.
2. Otherwise detect from `git remote get-url origin` in the current working directory.
3. If neither works, ask the user for the `owner/repo`.

## Process

### 1. Explore (if needed)

Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the spec, and respect any ADRs in the area you're touching.

### 2. Sketch test seams

Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. The fewer seams across the codebase, the better — the ideal number is one.

Include the proposed seams in the draft review. Ask separately only when a
meaningful unresolved choice needs the user's decision; reuse settled agreement.

### 3. Draft the spec locally

Use the template below and the repository's existing `context/` convention;
otherwise use `context/designs/<feature>/00-index.md`. Reuse an existing brief
instead of creating a competing source of truth. Include only behavior and
decisions supported by the conversation; keep undecided choices explicit. Present
the draft for review. Drafting does not authorize publication or implementation.

### 4. Publish only after separate approval

Only when the user asks to publish the reviewed draft, show the exact repository,
title, label, and issue body and obtain explicit approval of that packet before
calling GitHub. Check for an existing matching issue to avoid duplicates; an
update requires the same exact-content approval. Material changes require renewed
approval. Check repository visibility and do not publish secrets or sensitive
details; resolve any disclosure concern with the user first.

After approval, create the issue:

```bash
gh issue create \
  --repo "<owner/repo>" \
  --title "Spec: <feature name>" \
  --label "spec" \
  --body "<spec body>"
```

Label as `spec` — no triage label needed. This is a spec issue, not an actionable ticket.

<spec-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A numbered list of user stories. Each user story should be in the format:

1. As an <actor>, I want a <feature>, so that <benefit>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated quickly.

Exception: if a prototype produced a snippet that encodes an agreed decision more precisely than prose can (state machine, reducer, schema, type shape), inline it and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits. A prototype alone does not approve a schema or API contract.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this spec.

## Further Notes

Any further notes about the feature.

</spec-template>
