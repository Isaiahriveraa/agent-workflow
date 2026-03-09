# Indexed Learning And Agent Memory Retrieval

## Overview

Introduce a local-first indexed learning and retrieval system so the agent loads only the most relevant prior lessons, taste constraints, and failure patterns for the current task.

This plan is intentionally separate from readiness enforcement. It assumes the workflow already has parser-backed artifact contracts and readiness gates. Its goal is not to make the workflow stricter; its goal is to make context assembly smarter and smaller.

## Current State Analysis

### What already exists

- Flat durable learning surfaces:
  - `contexts/lessons-learned.md`
  - `contexts/failure-patterns.md`
  - `contexts/user-taste.md`
- Task-level lesson artifact capture and queued writeback:
  - `scripts/lesson-tools.mjs`
  - `thoughts/lessons/README.md`
- Existing reusable indexes for other artifact types:
  - `contexts/research-index.md`
  - `contexts/session-index.md`
- Capsule memory policies already separate some behavior by task class:
  - `capsules/creative-redesign/memory-policy.md`
  - `capsules/api-workflow/memory-policy.md`

### What is missing

- No learning index that routes which lessons to load
- No distinction between backend, frontend, workflow, and taste learnings at retrieval time
- No retrieval budget to prevent lesson sprawl from flooding context
- No promotion path that writes lessons into domain-specific stores
- No scoring/ranking helper for lesson relevance

### Why this needs to change

Flat memory works only while the corpus is tiny. As learnings grow, the system needs indexing and scoped retrieval or it will either:

- overload context with irrelevant lessons
- stop loading lessons because broad loading is too expensive

## Research Basis

### Repo-specific findings

- `scripts/lesson-tools.mjs` captures lessons and can optionally update `user-taste.md`, but it does not assign domain/stage metadata
- `contexts/user-taste.md` already behaves like a compact high-priority preference surface, which should remain small
- `contexts/research-index.md` proves the repo already accepts the “index file points to richer artifacts” pattern
- Memory-policy files already show domain-specific triggers for learning capture, which is the right seam for category-specific promotion

### External patterns worth copying

- Letta separates always-visible core memory blocks from external memory. This repo should copy that pattern by keeping compact core taste/policy memory always available and retrieving larger lesson sets only when relevant.
  - https://docs.letta.com/guides/core-concepts/memory/memory-blocks
  - https://docs.letta.com/guides/agents/memory/
- LangMem and LangGraph support background extraction plus scoped memory retrieval. That maps well to “capture lessons after failures, retrieve lessons before work.”
  - https://github.com/langchain-ai/langmem
  - https://blog.langchain.com/semantic-search-for-langgraph-memory
  - https://docs.langchain.com/langgraph-platform/semantic-search
- Mem0’s practical model is multi-scope memory: user, session, and agent. For this repo, the analogous scopes are domain, workflow stage, and user taste.
  - https://github.com/mem0ai/mem0
  - https://mem0.ai/openmemory
- Graphiti/Zep show that evolving knowledge benefits from better retrieval structure and temporal handling. v1 here should stay file-native, but the architecture should leave a seam for richer retrieval later.
  - https://github.com/getzep/graphiti
- Voyager demonstrates a reusable skill-library pattern. That is useful inspiration for future reusable workflow recipes, but not the primary v1 memory model.
  - https://github.com/MineDojo/Voyager
  - https://arxiv.org/abs/2305.16291

## Desired End State

After this plan lands:

- learning retrieval is scoped and selective
- backend tasks load backend/workflow/failure learnings, not irrelevant UI taste learnings
- design-heavy tasks load frontend/taste/workflow learnings in a bounded budget
- lesson capture promotes durable lessons into category-specific stores plus lightweight indexes
- `user-taste.md` stays compact and high-priority rather than becoming the entire memory system
- the retrieval helper remains local-first and deterministic in v1, but can be upgraded later to semantic retrieval without changing the command contract

## What We Are Not Doing

- No vector DB
- No embedding generation pipeline
- No external graph database
- No semantic search in v1
- No universal always-load behavior for all lessons
- No replacement of research/session indexes

## Information Architecture

### Compact always-loaded surfaces

These remain small and high-priority:

- `contexts/decisions.md`
- `contexts/failure-patterns.md`
- `contexts/user-taste.md`

### Indexed routing surfaces

Add:

- `contexts/learning-index.md`
- `contexts/taste-index.md`

These files should act as routing layers, not full memory dumps.

### Domain lesson stores

Add:

- `contexts/lessons/backend.md`
- `contexts/lessons/frontend.md`
- `contexts/lessons/workflow.md`
- `contexts/lessons/ui-taste.md`

The index files point to these stores and their entries.

## Retrieval Model

### Retrieval categories

Every indexed lesson must declare:

- category
- sub-category
- applies-to surface
- workflow stage
- task signals
- confidence
- source artifact
- last confirmed
- retrieval priority

### V1 categories

Use these top-level categories:

- `backend`
- `frontend`
- `workflow`
- `ui-taste`

Use these stage values:

- `intake`
- `research`
- `planning`
- `implementation`
- `validation`
- `handoff`

### Retrieval budget

Default maximum retrieval per substantial task:

- 3 workflow lessons
- 3 domain lessons
- 3 failure-pattern entries
- 3 taste entries for design-sensitive work only

This budget should be enforced by the helper, not left to prompt discipline alone.

### Ranking order

Rank retrieved lessons by:

1. exact domain match
2. exact workflow-stage match
3. task-signal match
4. confidence
5. recency / confirmation strength

Only use filename recency as a tiebreaker.

## Data Contract

### Learning index entry shape

Each index entry must include:

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

### Taste index entry shape

Each taste entry must include:

- `id`
- `pattern`
- `preference_type`
- `signal_strength`
- `avoid_or_prefer`
- `affected_surface`
- `examples`
- `source_feedback`
- `last_confirmed`

### Promotion rules

Promotion should work like this:

- a failure-backed reusable lesson writes a task artifact under `thoughts/lessons/`
- the promotion helper categorizes it into the correct domain lesson store
- the index file receives or updates a routing entry
- if the lesson is a durable user taste constraint, also update `contexts/user-taste.md`

## Implementation Approach

Build the memory system in five layers:

1. define index schema and category taxonomy
2. add lesson/taste index files and domain lesson stores
3. extend lesson capture/promotion tooling
4. add retrieval helper and budget enforcement
5. integrate retrieval into planning/research/validation flows

## Phase 1: Index Schema And Storage Split

### Intent

Create the new learning storage layout without changing retrieval behavior yet.

### Changes Required

- Add `contexts/learning-index.md`
- Add `contexts/taste-index.md`
- Add the domain lesson stores
- Document entry templates and allowed categories

### Verification

- Schema validation tests pass
- All new files have stable headings/templates

## Phase 2: Lesson Capture And Promotion

### Intent

Extend lesson capture so lessons can be promoted into indexed storage instead of only broad global files.

### Changes Required

- Extend `scripts/lesson-tools.mjs`
- Support category/stage metadata in capture payloads
- Add promotion behavior that updates:
  - domain lesson store
  - index file
  - compact surfaces when appropriate
- Preserve queued writeback behavior

### Verification

- capture writes task artifact plus index metadata
- queued flush still works
- taste lessons route differently from backend/workflow lessons

## Phase 3: Retrieval Helper

### Intent

Add one helper that computes the smallest relevant set of lessons for a task.

### Changes Required

- Add `scripts/learning-index-tools.mjs`
- Support at least:
  - `suggest`
  - `rank`
  - `validate-entry`
  - `promote`
- Inputs:
  - task domain
  - workflow stage
  - optional task signals
  - design-sensitive flag
- Outputs:
  - ranked lesson paths/entries
  - bounded retrieval set
  - reason codes for why each lesson matched

### Verification

- backend task retrieves backend/workflow/failure lessons only
- frontend design task retrieves frontend/taste/workflow lessons
- retrieval budget is enforced

## Phase 4: Workflow Integration

### Intent

Load indexed lessons where they actually improve work quality.

### Changes Required

- Update `commands/research_codebase.md`
  - retrieve workflow/domain lessons before drafting substantial research
- Update `commands/create-plan.md`
  - retrieve workflow/domain lessons and taste lessons when relevant
- Update `commands/validate_plan.md`
  - surface candidate lessons for promotion after verified misses
- Update capsule memory-policy docs if needed to point to new promotion flows

### Verification

- substantial planning loads relevant lessons before drafting
- design-sensitive tasks load taste index entries
- validation can promote a new lesson into the correct category

## Phase 5: Future-Proofing Seam

### Intent

Keep the design upgradeable without adding semantic retrieval in v1.

### Changes Required

- Keep retrieval helper interfaces provider-agnostic
- Make ranking modular so a later semantic scorer can be added
- Document future upgrade path:
  - embeddings
  - semantic search
  - graph/temporal retrieval

### Verification

- helper APIs do not assume markdown-only internals at the call boundary
- command contracts do not need to change when ranking internals evolve

## Testing Strategy

### Unit Tests

- index entry validation
- taste entry validation
- promotion routing
- retrieval ranking
- bounded retrieval budget

### Integration Tests

- lesson capture updates the correct domain store and index
- queued lesson flush preserves index updates
- create-plan/research_codebase can consume retrieved lessons without broad loading

### Scenario Tests

1. backend API task loads prior API contract and verification lessons
2. frontend redesign task loads taste dislikes and frontend lessons, not backend lessons
3. repeated generic card output promotes a taste lesson and updates taste index
4. validation miss promotes a workflow lesson into the workflow lesson store

## Success Criteria

- learning retrieval is category-aware and bounded
- compact top-level files remain small
- lesson promotion becomes more precise instead of more verbose
- frontend taste memory stops getting mixed into unrelated work
- the retrieval API is ready for future semantic upgrades without forcing them now

## References

- Letta memory blocks: https://docs.letta.com/guides/core-concepts/memory/memory-blocks
- Letta memory overview: https://docs.letta.com/guides/agents/memory/
- LangMem repo: https://github.com/langchain-ai/langmem
- LangGraph memory blog: https://blog.langchain.com/semantic-search-for-langgraph-memory
- LangGraph semantic search docs: https://docs.langchain.com/langgraph-platform/semantic-search
- Mem0 repo: https://github.com/mem0ai/mem0
- OpenMemory: https://mem0.ai/openmemory
- Graphiti repo: https://github.com/getzep/graphiti
- Voyager repo: https://github.com/MineDojo/Voyager
- Voyager paper: https://arxiv.org/abs/2305.16291
