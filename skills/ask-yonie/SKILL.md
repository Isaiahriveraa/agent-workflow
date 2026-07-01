---
name: ask-yonie
description: Ask which skill or flow fits your situation. A router over all your skills.
disable-model-invocation: true
---

# Ask Yonie

You don't remember every skill, so ask.

## The main flow: idea → ship

Most work travels this route:

1. **`/skill:grill-with-docs`** — sharpen the idea by interview against the codebase. Writes to plan server glossary and ADRs.
2. **Need a prototype?** → **`/skill:prototype`** — throwaway code to answer a design question. Route findings to plan server.
3. **Need a PRD?** → **`/skill:to-prd`** — synthesize the conversation into a PRD, no interview. Writes to plan server.
4. **Need issues?** → **`/skill:to-issues`** — break the plan/PRD into vertical-slice issues. Writes to plan server.
5. **Need a phased plan?** → **`/skill:blueprint`** or **`/skill:plan`** — decompose into phases with success criteria.
6. **Need discovery first?** → **`/skill:discover`** → **`/skill:research`** → **`/skill:explore`** → **`/skill:design`** → **`/skill:blueprint`**
7. **Ready to build?** → Build it. Use TDD (`/skill:tdd`), review changes (`/skill:review`), commit (`/skill:commit`).

## Debugging & diagnosis

- **Bug or regression?** → **`/skill:diagnose`** — disciplined diagnosis loop: feedback loop → reproduce → hypothesise → fix → regression test.
- **Weird behavior with no repro?** → **`/skill:trace`** — evidence-driven causal tracing with competing hypotheses.

## Code quality & review

- **Quick diff review** → **`/skill:code-critique`** — staff engineer reads your diff, flags issues.
- **Multi-lens review** → **`/skill:persona-critique`** — invents specialized personas for each logical area.
- **Full code review** → **`/skill:code-review`** — 3-wave parallel agent review (quality, security, deps).
- **Two-axis review** → **`/skill:review`** — checks against BOTH coding standards AND the spec/issue.
- **Check design quality** → **`/skill:design-is`** — audit against Dieter Rams' principles.
- **Security audit** → **`/skill:security-review`**.

## Architecture & design

- **Explore architecture friction** → **`/skill:improve-codebase-architecture`** — scan for deepening opportunities, present HTML report.
- **Deep module design vocabulary** → **`/skill:codebase-design`** — reference for designing good interfaces.
- **Domain language** → **`/skill:domain-modeling`** — pin down fuzzy terms, sharpen the domain model.
- **Design a feature** → **`/skill:design`** — vertical-slice decomposition with code generation.

## Planning & execution

- **Interview requirements** → **`/skill:discover`** — one-question-at-a-time interview → FRD.
- **Research the codebase** → **`/skill:research`** — parallel analysis agents → research document.
- **Explore solution options** → **`/skill:explore`** — compare approaches with pros/cons/tradeoffs.
- **Make a phased plan** → **`/skill:blueprint`** or **`/skill:plan`** — vertical-slice phases.
- **Revise a plan** → **`/skill:revise`** — surgically update an existing plan.
- **Split a plan** → **`/skill:split-plan`** — break a big plan into simpler phases.
- **Validate execution** → **`/skill:validate`** — verify plan was correctly executed.

## Decision mapping

- **Loose idea, unknown path** → **`/skill:decision-mapping`** — create investigation tickets, resolve fog of war.

## Session management

- **Handoff to new session** → **`/skill:handoff`** — compact conversation into handoff doc.
- **Resume from handoff** → **`/skill:recall`** — pick up where a handoff left off.
- **Deep interview on requirements** → **`/skill:deep-interview`** — Socratic questioning before planning.

## Testing

- **TDD cycle** → **`/skill:tdd`** — red-green-refactor, one test at a time.
- **Outline test cases** → **`/skill:outline-test-cases`** — discover features, create test-case outline.
- **Write test cases** → **`/skill:write-test-cases`** — generate manual test specs per feature.

## Productivity

- **Reflect on a session** → **`/skill:reflect`** — 5-question Socratic think-aloud.
- **Learning mode** → **`/skill:learning-mode`** — structured learning contract.
- **Ping-pong technique** → **`/skill:ping-pong`** — two AI models debate a plan.
- **Plow ahead** → **`/skill:plow-ahead`** — autonomous progress without routine stops.
- **Ralph** → **`/skill:ralph`** — persistence loop until 100% completion.

## Quick utilities

- **Resolve merge conflicts** → **`/skill:resolving-merge-conflicts`** — structured conflict resolution.
- **Prime a repo** → **`/skill:prime`** — load minimum context before planning.
- **Learn a codebase** → **`/skill:learn-codebase`** — read every source file.
- **What the?** → **`/skill:what-the`** — plain-English breakdown of something technical.
- **Commit** → **`/skill:commit`** — atomic commit messages with single-story enforcement. Splits mixed concerns automatically.
- **PR workflow** → **`/skill:pr-workflow`** — break work into PR-sized chunks.
