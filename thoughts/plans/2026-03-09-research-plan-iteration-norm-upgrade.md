# Research/Plan Iteration and Indexed Learning Upgrade

## Overview

Upgrade the workflow system so substantial work is driven by two things working together:

1. enforced multi-pass research and planning with explicit readiness gates
2. indexed learning retrieval so the agent loads only the most relevant prior lessons, taste constraints, failure patterns, and implementation guidance for the current task

The target workflow becomes:

`optimize prompt -> classify task -> retrieve targeted indexed context -> research draft -> critique -> refined research -> research readiness gate -> plan draft -> critique -> refined plan -> plan readiness gate -> implement -> validate -> capture indexed learnings`

This is not just a prompt change. It is a workflow contract, artifact contract, indexing system, retrieval policy, and validation system change.

## Why The Current Model Is Not Good Enough

The current workflow has four structural problems:

1. it treats “more rounds” as a proxy for quality
2. it stores lessons too generically, which makes retrieval noisy and context-heavy
3. it does not have a canonical parser/validator for workflow artifact readiness
4. it selects artifacts mostly by recency and filename heuristics instead of readiness and relevance

The result is predictable:

- research can be verbose but still weak
- plans can be long but still force implementation-time guessing
- lessons can accumulate but still be hard to retrieve at the right time
- user taste feedback can be remembered vaguely but not routed precisely

## Desired End State

After this upgrade:

- substantial work cannot proceed to implementation without passing explicit research and plan readiness gates
- research and plan artifacts have a canonical machine-readable structure
- prior learnings are indexed by domain, workflow stage, artifact type, failure class, UI taste pattern, and relevance signals
- context assembly pulls a minimal, high-signal set of indexed learnings instead of loading generic global files blindly
- validation checks both code correctness and workflow fidelity
- new learnings are captured into targeted indexes instead of one overloaded bucket

## Core Product Decision

Indexing should be part of this plan, not a separate future feature.

Reason:

- the iteration upgrade depends on better retrieval to be useful
- critique quality improves only if the agent can load the right prior failures and taste constraints at the right moment
- without indexing, a larger lesson corpus becomes context pollution
- without indexing, “learning loop” quality will degrade as the repo grows

This plan should therefore cover both:

- iteration enforcement
- indexed learning and retrieval

## Scope

### In Scope

- canonical iteration contract for substantial work
- research readiness and plan readiness gates
- canonical artifact schema and parsing utilities
- indexed learning registry and retrieval rules
- taste/index routing for frontend and design-sensitive work
- workflow command integration
- artifact selection updates
- migration and compatibility policy
- tests, rollout, and operational metrics

### Out Of Scope

- semantic vector search
- external database or hosted retrieval system
- rewriting all historical plans and research docs in one batch
- auto-injecting every indexed lesson into every task
- replacing repo-local runtime state with a global runtime store

## System Model

### Workflow Layers Affected

1. Rules
   - canonical workflow and iteration policy
2. Commands
   - research, planning, implementation, validation, GSD parity
3. Scripts
   - schema parsing, readiness scoring, indexed retrieval, artifact selection
4. Contexts
   - split learning/taste/failure knowledge into indexed surfaces
5. Tests
   - workflow-contract, parser, readiness, migration, and scenario coverage

### User Behavior We Are Optimizing

We are optimizing for this operator loop:

1. user gives a substantial request
2. agent assembles only the context that matters
3. research explains what exists and what it implies
4. plan is specific enough that implementation does not invent architecture mid-flight
5. implementation pauses only for true unknowns, not because the plan was vague
6. validation catches both code misses and workflow misses
7. lessons learned become easier to reuse next time

## Canonical Workflow Contract

### Substantial Work Flow

For substantial work, the required order becomes:

1. prompt optimization
2. task classification
3. indexed context retrieval
4. research draft
5. critique
6. refined research
7. research readiness gate
8. plan draft
9. critique
10. refined plan
11. plan readiness gate
12. implement
13. validate
14. capture indexed learnings

### Explicit Iterative Research Contract

For substantial work, research should explicitly follow this loop:

1. Research Draft
   - broad discovery
   - current-state mapping
   - initial findings
   - initial implementation implications

2. Research Critique
   - identify weak claims
   - identify missing evidence
   - identify missing edge cases
   - identify vague implementation implications
   - classify blockers

3. Research Refinement
   - deepen only the weak areas found in critique
   - resolve or downgrade weak claims
   - tighten implementation implications
   - update blocker status

4. Research Readiness Grade
   - pass to planning only if `research_ready_for_planning` is true
   - if not, run another targeted refinement pass

Research should not advance just because “two rounds happened.”
It advances only when critique-backed refinement produces a passing readiness grade.

### Explicit Iterative Planning Contract

For substantial work, planning should explicitly follow this loop:

1. Plan Draft
   - phase structure
   - implementation sequencing
   - dependency map
   - verification outline

2. Plan Critique
   - identify decision gaps
   - identify missing dependencies
   - identify interface/contract ambiguity
   - identify missing failure-mode coverage
   - identify rollout/compatibility gaps

3. Plan Refinement
   - tighten phase scope
   - add subphases where needed
   - resolve ambiguous sequencing
   - add missing verification and rollout details

4. Plan Readiness Grade
   - pass to implementation only if `plan_ready_for_implementation` is true
   - if not, run another targeted refinement pass

The plan should therefore remain explicitly iterative, but the iterations need to be quality-gated rather than just counted.

### Minimum Iteration Policy

Do not gate by round count alone.

Required minimum:

- at least one critique cycle for research
- at least one critique cycle for planning
- a second refinement pass only when the readiness rubric still fails

Operationally this means:

- draft -> critique -> refine -> grade

not just:

- round count >= 2

### Optional Third Pass Rule

A third pass is mandatory when any of these remain after the first refinement:

- blocker classes still present
- evidence still weak
- verification still underspecified
- sequencing still ambiguous
- the next implementation agent would still have to make design decisions

If those conditions are gone, a third pass is unnecessary.

### Readiness Gates

Split readiness into two explicit gates:

1. `research_ready_for_planning`
2. `plan_ready_for_implementation`

Do not overload one `implementation_ready` concept across both artifact types.

## Indexed Learning System

### Problem

The current learning model is too flat:

- `contexts/lessons-learned.md`
- `contexts/failure-patterns.md`
- `contexts/user-taste.md`

These are useful, but as they grow they will become broad recall surfaces instead of precise retrieval inputs.

### Solution

Create an indexed learning layer with two parts:

1. a lightweight registry/index that points to relevant learnings
2. targeted source documents grouped by domain and retrieval purpose

### Indexed Learning Categories

Create or formalize these indexed categories:

1. Backend learnings
   - API contracts
   - auth/authz
   - database/query/schema
   - validation/error handling
   - background jobs/integrations

2. Frontend learnings
   - layout/component composition
   - state/data-fetching patterns
   - accessibility issues
   - responsive issues
   - performance/bundle/render issues

3. UI taste learnings
   - disliked card styles
   - overused layout patterns
   - typography preferences
   - spacing density preferences
   - repeated “AI-looking” motifs to avoid

4. Workflow learnings
   - research misses
   - planning misses
   - implementation drift patterns
   - validation blind spots
   - handoff/resume failures

5. Failure-class learnings
   - context assembly miss
   - planning miss
   - tool-use miss
   - verification miss
   - creative/taste miss
   - API contract miss

### Proposed Files

- `contexts/learning-index.md`
- `contexts/taste-index.md`
- `contexts/failure-patterns.md` stays as the canonical failure taxonomy
- `contexts/lessons/backend.md`
- `contexts/lessons/frontend.md`
- `contexts/lessons/ui-taste.md`
- `contexts/lessons/workflow.md`

The index files should point to the deeper lesson files, not duplicate them.

### Learning Index Entry Shape

Each indexed entry should include:

- `id`
- `title`
- `category`
- `sub_category`
- `applies_to`
- `workflow_stage`
- `task_signals`
- `tags`
- `confidence`
- `source_artifact`
- `last_confirmed`
- `retrieval_priority`
- `summary`

Example categories for `applies_to`:

- backend
- frontend
- ui
- workflow
- full-stack

Example values for `workflow_stage`:

- intake
- research
- planning
- implementation
- validation
- handoff

### Taste Index Entry Shape

UI taste needs its own index because it behaves differently from failure learnings.

Each taste entry should include:

- `id`
- `pattern`
- `preference_type`
- `signal_strength`
- `avoid_or_prefer`
- `affected_surface`
- `examples`
- `source_feedback`
- `last_confirmed`

Examples:

- repeated card grid style should be avoided
- heavy shadowed marketing cards are disliked
- denser information layouts are preferred for product UIs
- typography should feel more intentional and less template-like

### Retrieval Policy

Before substantial work, retrieve only indexed entries that match:

1. domain relevance
2. workflow stage relevance
3. task signal relevance
4. confidence threshold
5. recency or confirmation strength

Default retrieval budget:

- max 3 workflow lessons
- max 3 domain lessons
- max 3 failure-pattern entries
- max 3 taste entries for design-sensitive work

This keeps retrieval bounded and prevents context bloat.

### Why This Matters

This directly addresses your concern:

- backend lessons should not drown frontend lessons
- general lessons should not crowd out taste-specific feedback
- frontend taste feedback should not be mixed into all planning work
- the system needs to know what is relevant before loading context

## Artifact Schema Upgrade

### Requirement

Add a canonical parser/validator layer before changing commands.

Without this, commands will drift and metadata will be easy to spoof.

### New Script Surface

Add a new helper, likely:

- `scripts/workflow-artifact-tools.mjs`

Responsibilities:

- parse artifact frontmatter
- validate required fields by artifact type
- compute derived readiness state
- expose structured JSON for commands/tests
- reject malformed or incomplete artifacts fail-closed

### Research Artifact Fields

Research artifacts should include:

- `artifact_type: research`
- `topic`
- `substantial`
- `critique_completed`
- `critique_artifacts` or `critique_sections`
- `blocking_unknown_count`
- `blocking_unknowns_resolved`
- `evidence_level`
- `research_ready_for_planning`
- `related_intake`
- `last_validated`

### Plan Artifact Fields

Plan artifacts should include:

- `artifact_type: plan`
- `topic`
- `substantial`
- `critique_completed`
- `critique_artifacts` or `critique_sections`
- `blocking_unknown_count`
- `dependency_map_present`
- `verification_defined`
- `rollout_defined`
- `plan_ready_for_implementation`
- `related_research`
- `last_validated`

### Anti-Gaming Rules

Metadata alone never passes a gate.

Require evidence-backed structure:

- if `critique_completed: true`, a critique section or linked critique artifact must exist
- if `blocking_unknown_count: 0`, prior blockers must show how they were resolved
- if `verification_defined: true`, verification sections must actually exist
- if `rollout_defined: true`, rollout or compatibility notes must actually exist

## Readiness Model

### Research Gate Rubric

Research is ready for planning only if all of these pass:

1. findings are tied to implementation implications
2. weak claims are either resolved or explicitly downgraded
3. reuse vs build-new decisions are identified
4. blocking unknowns are zero
5. evidence quality meets threshold
6. affected interfaces/contracts are identified
7. verification implications are identified

### Plan Gate Rubric

Plan is ready for implementation only if all of these pass:

1. phases are actionable and sequenced
2. dependencies and prerequisites are explicit
3. interfaces/types/contracts are specified where relevant
4. failure modes and edge cases are covered
5. automated and manual verification are defined
6. rollout/compatibility notes exist where needed
7. implementation would not need to invent major decisions

### Blocker Classes

Standardize blocker taxonomy:

- `blocking_unknown`
- `decision_missing`
- `evidence_weak`
- `verification_missing`
- `dependency_unmodeled`
- `rollout_unspecified`

These classes should be used by critique, readiness grading, validation, and lesson capture.

## Command Changes

### `commands/research_codebase.md`

Add requirements for substantial work:

- load indexed learning context before drafting research
- produce a critique section or linked critique artifact
- include implementation implications, not just findings
- surface blocker classes explicitly
- refuse planning handoff until `research_ready_for_planning` is true

Research output should include:

- what changed after critique
- what this means for implementation
- blockers by blocker class
- evidence level and why
- retrieved indexed learnings used
- why another refinement pass is or is not needed

### `commands/create-plan.md`

Require:

- loading indexed workflow/domain/taste learnings before planning
- reading structured research readiness, not raw prose alone
- plan draft -> critique -> refined plan -> graded readiness
- dependency modeling, not just hierarchical numbering

Each substantial phase should specify:

- intent
- implementation changes
- interfaces/types/contracts affected
- dependencies/prereqs
- failure modes/edge cases
- automated verification
- manual verification
- rollout/compat impact

### `commands/implement_plan.md`

Require:

- parser-backed validation that `plan_ready_for_implementation` is true
- evidence that related research passed the prior gate
- refusal to start from malformed or legacy substantial plans unless refreshed
- `/iterate_plan` or full re-plan when new blocker classes emerge mid-implementation

### `commands/validate_plan.md`

Extend validation to check:

- code fidelity
- workflow fidelity
- whether the required critique cycle happened
- whether readiness was justified
- whether implementation introduced unplanned design decisions
- whether new reusable lessons should be captured into the relevant index

### GSD Flow

Align:

- `commands/gsd/research-phase.md`
- `commands/gsd/plan-phase.md`
- `commands/gsd/execute-phase.md`

So plain RPI and GSD use the same readiness and indexed retrieval contract.

## Artifact Selection Upgrade

### Problem

The current working-set selection prefers “latest” or filename relevance, which is too shallow for the new workflow.

### Required Change

Update artifact selection so it prefers:

1. explicit active selection from runtime state
2. highest readiness-valid artifact for the current topic
3. most relevant artifact by indexed topic match
4. most recent artifact only as a tiebreaker

### Affected Surface

Update:

- `scripts/artifact-tools.mjs`

So it can:

- parse readiness metadata
- filter out malformed artifacts
- prioritize ready research/plan artifacts
- avoid routing implementation into stale but newer docs

## Migration And Compatibility

### Rollout Policy

Use phased rollout:

#### Phase 1: schema and soft warnings

- add parser and indexes
- commands warn on missing readiness metadata
- validation reports missing fields but does not hard-stop all legacy artifacts

#### Phase 2: hard gate for new substantial artifacts

- new substantial research/plans must use the new schema
- implementation blocks on new malformed artifacts

#### Phase 3: refresh-on-touch for legacy artifacts

- if a legacy substantial artifact is reopened, iterated, or resumed, it must be upgraded

#### Phase 4: full enforcement

- substantial legacy artifacts without refresh are treated as non-ready

### Legacy Handling

Do not break all old artifacts at once.

Instead:

- detect `legacy_artifact: true` implicitly by missing schema markers
- allow read-only inspection
- require refresh before implementation/resume for substantial work

## Tests

### Parser And Schema Tests

- research artifact parse success/failure
- plan artifact parse success/failure
- fail-closed behavior on malformed frontmatter
- anti-gaming checks for missing critique/evidence sections

### Readiness Tests

- research gate passes only when implications + blockers + evidence criteria pass
- plan gate passes only when dependencies + verification + rollout criteria pass
- blocker class handling is consistent across commands

### Retrieval And Indexing Tests

- backend task retrieves backend lessons, not UI taste lessons
- frontend design task retrieves taste index + frontend lessons
- workflow task retrieves workflow lessons and failure patterns
- retrieval budget stays bounded

### Command Contract Tests

- `research_codebase` refuses handoff when research gate fails
- `create-plan` refuses finalization when research is not gate-ready
- `implement_plan` refuses malformed or non-ready substantial plans
- `validate_plan` reports workflow fidelity failures clearly

### Artifact Selection Tests

- ready artifact beats newer non-ready artifact
- explicit working-set selection beats heuristic selection
- malformed artifacts are ignored or flagged

### Scenario Tests

- substantial backend task with retrieved prior API failure lessons
- frontend task with indexed taste constraints preventing repetitive card output
- implementation discovery creates blocker class and routes to `/iterate_plan`
- validation promotes a reusable lesson into the correct indexed category

## Success Metrics

Do not measure this project by “number of rounds.”

Track:

- implementation interruptions caused by planning ambiguity
- validation failures caused by missing edge-case coverage
- number of re-plans per substantial task
- resume-session success without clarification
- percentage of substantial tasks using parser-validated ready artifacts
- percentage of retrieved lessons later referenced in critique or validation
- repeated UI taste misses after indexed taste retrieval

## Implementation Phases

## Phase 1: Canonical Schema And Readiness Foundation

### Intent

Create the parser, schema, readiness model, and blocker taxonomy that every other layer will use.

### Changes Required

- add `scripts/workflow-artifact-tools.mjs`
- define research and plan schema contracts
- define blocker classes and readiness outputs
- add parser/readiness tests

### Verification

- parser tests pass
- readiness tests pass
- malformed artifacts fail closed

## Phase 2: Indexed Learning And Taste Retrieval

### Intent

Introduce targeted learning indexes so context assembly becomes relevance-driven instead of broad and generic.

### Changes Required

- add `contexts/learning-index.md`
- add `contexts/taste-index.md`
- split lessons into backend/frontend/ui/workflow surfaces as needed
- add retrieval helper logic
- define retrieval budget and ranking

### Verification

- retrieval tests pass
- bounded retrieval behavior is enforced
- frontend tasks pull taste entries only when relevant

## Phase 3: Command Integration

### Intent

Make research, planning, implementation, and validation consume the same readiness and index contract.

### Changes Required

- update `research_codebase`
- update `create-plan`
- update `implement_plan`
- update `validate_plan`
- align GSD commands

### Verification

- command contract tests pass
- scenario tests show proper refusal and reroute behavior

## Phase 4: Artifact Selection And Migration

### Intent

Make runtime artifact selection prefer relevant, ready artifacts and add phased migration for legacy docs.

### Changes Required

- update `scripts/artifact-tools.mjs`
- add legacy detection
- add ready-artifact preference logic
- document migration behavior

### Verification

- working-set selection tests pass
- legacy substantial artifacts trigger refresh-on-touch correctly

## Phase 5: Metrics And Learning Loop Tightening

### Intent

Verify that the system is actually reducing misses and improving output quality.

### Changes Required

- add lightweight metrics capture points where appropriate
- connect validation outcomes to indexed lesson promotion
- review whether retrieval categories are producing useful signal

### Verification

- metrics are observable
- lesson promotion routes to the correct index category

## Risks And Trade-Offs

### Risk: Over-structuring the workflow

If the contract gets too rigid, the agent may spend too much time satisfying forms instead of thinking.

Mitigation:

- keep the parser strict on readiness-critical fields only
- keep critique rubrics short and operational
- use bounded retrieval budgets

### Risk: Index sprawl

Too many learning files can become another form of clutter.

Mitigation:

- use index files as routing layers
- keep deep lesson files category-scoped
- promote only durable, evidence-backed lessons

### Risk: Legacy artifact friction

Hard-gating all old artifacts immediately will slow real work.

Mitigation:

- phased rollout
- refresh-on-touch policy
- read-only compatibility for old artifacts

## Recommendation

Treat indexed learning as a required part of the iteration upgrade.

Do not ship “multi-pass refinement” without:

- a schema/parser layer
- split readiness gates
- targeted lesson/taste indexing
- readiness-aware artifact selection

Otherwise the system will become more ceremonial, not more effective.
