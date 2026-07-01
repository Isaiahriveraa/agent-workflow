---
name: to-prd
description: Turn the current conversation into a PRD and publish it to the plan server — no interview, just synthesis of what you've already discussed.
disable-model-invocation: true
---

This skill takes the current conversation context and codebase understanding and produces a PRD. Do NOT interview the user — just synthesize what you already know.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain vocabulary throughout the PRD, and respect any ADRs in the area you're touching.

2. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. The fewer seams across the codebase, the better — the ideal number is one.

Check with the user that these seams match their expectations.

3. Write the PRD using the template below, then publish it to the plan server. Infer the project name from the git repo (basename of `git rev-parse --show-toplevel`).

```bash
python3 ~/.agents/scripts/new-artifact.py --project <project> --type prd --topic "<feature name>"
```

Fill in the generated file with the full PRD content.

<prd-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A numbered list of user stories:

1. As an <actor>, I want a <feature>, so that <benefit>

This list should be extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision.

## Testing Decisions

A list of testing decisions:

- What makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (similar types of tests in the codebase)

## Out of Scope

What is explicitly out of scope for this PRD.

## Further Notes

Any further notes about the feature.

</prd-template>
