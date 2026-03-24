# Agent Catalog

Use this file to track the workflow expert agents that act as the hub's control plane for continuity, critique response, artifact gating, parity, routing, evals, and tool integration.

## Agent Classes
- workflow experts: agents that maintain the workflow system itself
- product engineering experts: agents focused on application delivery work
- research/review experts: agents focused on analysis, review, and validation

## Workflow Experts
- `continuity-manager`
  - trigger: session drift, handoff flow design, runtime-state correctness, artifact working-set issues
  - scope: project-local sessions, shared handoffs, continuity helpers, runtime state docs/tests
  - deliverable: continuity findings or implementation guidance with exact file references
- `workflow-router-auditor`
  - trigger: substantial work that may be skipping optimize -> research -> plan -> implement -> validate
  - scope: workflow gate compliance, readiness evidence, route correctness
  - deliverable: audit summary with pass/fail routing findings
- `critique-responder`
  - trigger: critique findings, checker feedback, refinement cycles after artifact review
  - scope: critique-to-fix mapping, artifact revisions, response matrices
  - deliverable: revised artifact plus a finding-resolution summary
- `artifact-gatekeeper`
  - trigger: artifact promotion decisions, grade ambiguity, inconsistent critique/refinement evidence
  - scope: readiness criteria, grade results, critique evidence, advancement decisions
  - deliverable: `advance`, `revise`, or `human-judgment-required` with evidence
- `adapter-parity-auditor`
  - trigger: adapter drift, capability ambiguity, cross-CLI behavior mismatch
  - scope: manifest parity contracts, adapter docs, generated bridge expectations
  - deliverable: parity matrix findings with native vs bridged vs unsupported status
- `eval-engineer`
  - trigger: workflow regression risk, parity validation work, scenario test design
  - scope: workflow eval design, scenario coverage, regression gaps
  - deliverable: eval plan or verification findings tied to concrete tests
- `trace-grader`
  - trigger: trajectory-quality questions, delegation drift, tool-use trace review
  - scope: execution traces, handoffs, delegation paths, checkpoint quality
  - deliverable: trace-grade findings or a trace rubric with explicit criteria
- `failure-analyst`
  - trigger: explicit user correction, critic rejection, repeated misses, lesson promotion work
  - scope: failure diagnosis, reusable lesson extraction, workflow improvement suggestion drafting
  - deliverable: diagnosis summary with lesson candidates and evidence
- `tooling-integrator`
  - trigger: MCP, approvals, permission surfaces, tool wiring, external helper integration
  - scope: tool integration contracts and their operational boundaries
  - deliverable: integration guidance or implementation notes with explicit constraints
- `expert-agent-router`
  - trigger: substantial tasks that need delegation but do not clearly map to one expert
  - scope: routing workflow tasks to the correct specialist set
  - deliverable: recommended agent assignment with reasoning and scope boundaries

## Routing Defaults
- continuity issue -> `continuity-manager`
- parity or adapter mismatch -> `adapter-parity-auditor`
- workflow-gate or RPI compliance issue -> `workflow-router-auditor`
- critique-response or revision loop issue -> `critique-responder`
- artifact promotion or readiness decision -> `artifact-gatekeeper`
- eval, scenario, or regression design -> `eval-engineer`
- trace-quality or delegation-loop issue -> `trace-grader`
- repeated failures or learning-loop work -> `failure-analyst`
- MCP, permissions, or tool-surface work -> `tooling-integrator`
- unclear specialist choice -> `expert-agent-router`

## Infrastructure

- `model-router`
  - type: library + CLI (`scripts/model-router.mjs`)
  - purpose: contextual model tier selection for subagent tasks
  - input: task description, optional budget/context/override signals
  - output: `{ tier, model, alias, provider, confidence, reason }`
  - integration: Claude Code Agent `model:` param, OpenCode per-agent config, Codex/Antigravity session-level
  - rule card: `rules/common/model-routing.md`
  - contract: `scripts/model-router-contract.mjs`

## Constraints
- Prefer workflow experts before broad persona agents for workflow-system work.
- Keep expert scopes narrow and non-overlapping where possible.
- Delegate only when the expert materially reduces ambiguity or risk.
