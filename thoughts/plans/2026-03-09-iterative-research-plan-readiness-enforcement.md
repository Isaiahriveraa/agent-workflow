# Iterative Research/Plan Readiness Enforcement

## Overview

Harden the substantial-work workflow so research and planning are critique-driven, parser-validated, and readiness-gated before implementation starts. This plan upgrades the workflow contract itself. It does not introduce a broad memory/indexing subsystem beyond the minimum schema and retrieval hooks needed to support readiness enforcement.

This plan should be implemented first. The indexed learning plan depends on the artifact schema, readiness semantics, and workflow gates defined here.

## Current State Analysis

### What already exists

- Prompt optimization and substantial-work routing already exist in policy:
  - `prompts/system.md`
  - `rules/common/prompt-optimization-routing.md`
  - `rules/common/workflow-router.md`
- Readiness scoring exists, but it is shallow and manually parameterized:
  - `scripts/workflow-router-tools.mjs`
- Planning and implementation commands already mention decision-complete plans and readiness gates:
  - `commands/create-plan.md`
  - `commands/implement_plan.md`
  - `commands/validate_plan.md`
- Artifact retrieval and working-set persistence already exist:
  - `scripts/artifact-tools.mjs`
  - `contexts/artifacts.md`
  - `contexts/state.md`

### What is missing

- No canonical parser/validator for workflow artifacts
- No machine-readable readiness contract for research or plans
- No blocker taxonomy shared across critique, planning, implementation, and validation
- No fail-closed enforcement that prevents malformed or weak substantial plans from reaching implementation
- Artifact selection still prefers explicit selection or heuristic recency/name relevance, not readiness-validity

### Why this needs to change

Right now the system can say “decision-complete” without proving it. Research and planning can be verbose but still weak. The workflow needs structural enforcement, not more aspirational prose.

## Research Basis

### Repo-specific findings

- `scripts/workflow-router-tools.mjs` currently scores only:
  - clarity
  - codebase coverage
  - constraints
  - risks
  - verification
- `scripts/artifact-tools.mjs` currently ranks mostly by explicit working-set selection, term matching, and modification time
- `commands/implement_plan.md` already says to refuse non-decision-complete substantial plans, but there is no parser-backed implementation of that rule

### External patterns worth copying

- OpenAI’s prompt optimizer and evaluation guidance support critique + grading loops over vague “do another round” behavior
  - https://developers.openai.com/api/docs/guides/prompt-optimizer
  - https://developers.openai.com/api/docs/guides/evaluation-best-practices
- Reflexion shows that iterative self-critique improves agent outcomes, but only when critique is structured and actionable
  - https://github.com/noahshinn/reflexion
  - https://arxiv.org/abs/2303.11366
- MemGPT/Letta reinforce the idea that small working memory needs explicit control rather than uncontrolled context growth; for this plan that implies strict readiness and explicit transitions between workflow stages
  - https://research.memgpt.ai/
  - https://docs.letta.com/concepts/letta

## Desired End State

After this plan lands:

- substantial work follows one enforced sequence:
  - optimize prompt -> classify -> research draft -> critique -> refine -> research gate -> plan draft -> critique -> refine -> plan gate -> implement -> validate
- research and plan artifacts are parser-valid or fail closed
- implementation cannot start for substantial work unless the related plan passes a machine-readable readiness gate
- validation checks both code fidelity and workflow fidelity
- legacy substantial artifacts remain readable but must be refreshed before implementation if they lack the new contract

## What We Are Not Doing

- No embeddings or vector search
- No hosted memory or database-backed artifact store
- No rewrite of all existing research/plan artifacts in one migration
- No replacement of project-local runtime state
- No semantic “AI judge” scoring without explicit rule-based fields in v1

## Implementation Approach

Build the enforcement system in five layers:

1. define artifact schema and blocker taxonomy
2. build parser/validator helpers
3. wire helpers into research/planning/implementation/validation commands
4. upgrade artifact selection to consider readiness
5. add migration and tests

## Canonical Contract

### Workflow stages for substantial work

1. prompt optimization
2. substantial-task classification
3. research draft
4. research critique
5. research refinement
6. research readiness grade
7. plan draft
8. plan critique
9. plan refinement
10. plan readiness grade
11. implementation
12. validation

### Blocker classes

Use these exact blocker classes across commands, tests, and validators:

- `blocking_unknown`
- `decision_missing`
- `evidence_weak`
- `verification_missing`
- `dependency_unmodeled`
- `rollout_unspecified`

### Artifact readiness states

Research artifacts must expose:

- `artifact_type: research`
- `substantial`
- `critique_completed`
- `blocking_unknown_count`
- `evidence_level`
- `research_ready_for_planning`
- `related_intake`
- `last_validated`

Plan artifacts must expose:

- `artifact_type: plan`
- `substantial`
- `critique_completed`
- `blocking_unknown_count`
- `dependency_map_present`
- `verification_defined`
- `rollout_defined`
- `plan_ready_for_implementation`
- `related_research`
- `last_validated`

### Anti-gaming rules

Metadata alone never passes readiness.

Require these checks:

- `critique_completed: true` only passes if a critique section or linked critique artifact exists
- `blocking_unknown_count: 0` only passes if blocker resolution is recorded
- `verification_defined: true` only passes if automated and manual verification sections exist where relevant
- `rollout_defined: true` only passes if rollout/compatibility notes exist where relevant

## Phase 1: Parser And Schema Foundation

### Intent

Add one canonical utility that parses workflow artifacts and computes readiness so commands stop re-implementing ad hoc checks.

### Changes Required

- Add `scripts/workflow-artifact-tools.mjs`
- Support at least:
  - `parse`
  - `validate`
  - `grade-research`
  - `grade-plan`
- Validate required frontmatter and required structural sections
- Return machine-readable blocker classes and pass/fail reasons

### Verification

- Valid research artifact parses and grades correctly
- Valid plan artifact parses and grades correctly
- Missing frontmatter fails closed
- Claimed readiness without supporting sections fails closed

## Phase 2: Readiness Rubrics And Workflow Semantics

### Intent

Define the exact criteria for when research is ready for planning and when a plan is ready for implementation.

### Changes Required

- Extend `scripts/workflow-router-tools.mjs` or keep it as the intake classifier and delegate artifact grading to the new helper
- Preserve intake-level task classification in `workflow-router-tools.mjs`
- Move artifact-level grading into the new parser-backed helper

Research readiness passes only if:

- findings include implementation implications
- weak claims are resolved or explicitly downgraded
- blocking unknown count is zero
- interfaces/contracts impacted are identified
- verification implications are identified

Plan readiness passes only if:

- sequencing is explicit
- dependencies are modeled
- interfaces/types/contracts are specified where needed
- failure modes are covered
- verification is defined
- rollout/compatibility impact is defined where needed
- implementation would not need to invent major design decisions

### Verification

- Unit tests for each pass/fail condition
- Tests that third-pass escalation occurs only when blockers remain

## Phase 3: Command Integration

### Intent

Make the human-facing workflow commands consume the same readiness contract.

### Changes Required

- Update `commands/research_codebase.md`
  - require critique/refinement before handoff for substantial work
  - require parser-backed proof of `research_ready_for_planning`
- Update `commands/create-plan.md`
  - require parser-backed research readiness before finalizing a substantial plan
  - require plan critique/refinement before marking ready
- Update `commands/implement_plan.md`
  - require parser-backed `plan_ready_for_implementation`
  - refuse malformed substantial plans
  - route newly discovered blocker classes to `/iterate_plan` or full re-plan
- Update `commands/validate_plan.md`
  - report workflow fidelity, not just code fidelity
- Align GSD equivalents:
  - `commands/gsd/research-phase.md`
  - `commands/gsd/plan-phase.md`
  - `commands/gsd/execute-phase.md`

### Verification

- Contract tests for command refusal behavior
- Scenario tests for critique-driven research and planning flow

## Phase 4: Artifact Selection And Migration

### Intent

Prevent stale or malformed artifacts from being chosen just because they are newer.

### Changes Required

- Update `scripts/artifact-tools.mjs` to prefer:
  1. explicit runtime-state selection
  2. readiness-valid artifact for the current topic
  3. most relevant artifact by topic fit
  4. recency as a tiebreaker only
- Detect legacy substantial artifacts by missing schema markers
- Allow legacy artifacts to remain readable
- Require legacy substantial artifacts to be refreshed before implementation or resume

### Verification

- Ready artifact beats newer non-ready artifact
- Explicit selection still wins
- Legacy substantial artifact blocks implementation but remains inspectable

## Phase 5: Rollout And Validation

### Intent

Roll the change out without breaking active work unexpectedly.

### Changes Required

- Rollout sequence:
  1. soft warnings for missing schema
  2. hard gate for new substantial artifacts
  3. refresh-on-touch for legacy substantial artifacts
  4. full enforcement after migration window
- Update workflow contract tests
- Update SSOT validation where needed so required references remain aligned

### Verification

- `validate:ssot` passes
- workflow contract tests pass
- parser, readiness, artifact selection, and migration tests pass

## Testing Strategy

### Unit Tests

- `workflow-artifact-tools` parse/validate/grade behavior
- blocker taxonomy normalization
- anti-gaming checks

### Integration Tests

- research cannot hand off without parser-backed readiness
- create-plan cannot finalize a substantial plan without ready research
- implement_plan refuses malformed or non-ready substantial plans
- validate_plan reports workflow fidelity misses

### Scenario Tests

1. substantial task with one critique cycle and strong refinement passes
2. weak refinement triggers another pass
3. implementation discovers a new blocker and routes to `/iterate_plan`
4. legacy substantial artifact is readable but blocked for implementation

## Success Criteria

- Substantial work cannot bypass parser-backed research and plan readiness
- Command docs, scripts, and tests agree on one blocker taxonomy
- Artifact selection no longer routes implementation into stale/non-ready plans
- Validation can explain whether a miss came from code execution or planning/research quality

## References

- OpenAI Prompt Optimizer: https://developers.openai.com/api/docs/guides/prompt-optimizer
- OpenAI Evaluation Best Practices: https://developers.openai.com/api/docs/guides/evaluation-best-practices
- Reflexion repo: https://github.com/noahshinn/reflexion
- Reflexion paper: https://arxiv.org/abs/2303.11366
- MemGPT research: https://research.memgpt.ai/
- Letta concepts: https://docs.letta.com/concepts/letta
