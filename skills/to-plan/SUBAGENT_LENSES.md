# To-Plan Optional Subagent Lenses

This catalog defines conditional specialist agents for implementation plans that are large, risky, domain-specific, weakly verified, or intended for multi-agent execution.

Use this file only after the core plan draft exists. Do not spawn every lens. Select only lenses whose trigger matches repository evidence or the user's request.

## Selection Rules

Run optional lenses when at least one is true:

- the plan has 6+ implementation tasks;
- implementation is expected to be delegated to multiple agents;
- the plan touches authentication, authorization, billing, secrets, production infrastructure, public APIs, persisted data, schema migrations, queues, webhooks, background jobs, or user-facing flows;
- the plan includes blocked assumptions, rollback risk, or high-risk edge cases;
- the user explicitly asks for extra plan review or specialist subagents.

Do not run lenses for small, local, low-risk implementation plans. The plan author's own reasoning is enough.

## Output Contract

Each selected lens returns only one of:

- `ready to execute`;
- `revise plan: {severity} — {smallest concrete plan change}`.

Allowed severities:

- `blocker`
- `scope-risk`
- `verification-risk`
- `migration-risk`
- `security-risk`
- `performance-risk`
- `ux-risk`
- `ops-risk`
- `handoff-risk`

Selected lens agents must not:

- add broad best-practice advice;
- expand scope without correctness, security, reliability, or handoff justification;
- request new dependencies unless the user already allowed them;
- re-litigate locked decisions;
- produce standalone reports that are not folded into the plan.

If a lens returns `revise plan`, update the same plan draft or artifact before final response. The returned plan URL must point to the authoritative revised plan.

## Lens Catalog

### Testing / Verification

**Trigger:** Non-trivial behavior, unclear proof, external integration, async flow, UI flow, bug fix, or plan verification that only says "tests pass".

**Role:** Verification strategist.

**Finds:** Missing regression tests, weak done criteria, untestable acceptance criteria, missing negative cases, missing branch/edge coverage, manual-only proof where automated proof is available.

**Plan sections it may change:**

- `## Work Breakdown`
- `## Testing and Verification`
- `## Risks and Edge Cases`
- `## Definition of Done`

**Prompt:**

```text
Review this implementation plan only for verification quality.
Find missing or weak tests, ambiguous evidence, untestable done criteria, and behavior not covered by verification.
Return only `ready to execute` or `revise plan: {severity} — {smallest concrete plan change}`.
Do not suggest broad best practices.
```

### Implementability / Agent Handoff

**Trigger:** Multi-agent execution, 6+ tasks, cross-module work, shared-file conflicts, public API changes, or handoff to `/implement`.

**Role:** Implementation handoff reviewer.

**Finds:** Tasks too vague to execute, missing file/symbol references, hidden dependencies, unsafe parallelization, shared-file conflicts, missing sequencing, blocked assumptions hidden inside tasks.

**Plan sections it may change:**

- `## Work Breakdown`
- `## Execution Map`
- `## Assumptions`
- `## Open Questions`
- `## Definition of Done`

**Prompt:**

```text
Review this plan as the coding agent who must implement it without rereading the source conversation.
Find any task that lacks enough file, symbol, dependency, or verification detail to execute safely.
Return only `ready to execute` or `revise plan: {severity} — {smallest concrete plan change}`.
```

### Data / Migration / Backward Compatibility

**Trigger:** Database schema, persisted state, event format, queue payload, API contract, config shape, cache/index behavior, or old/new code coexistence.

**Role:** Data and compatibility reviewer.

**Finds:** Migration order hazards, rollback gaps, nullable/default pitfalls, data backfill needs, idempotency gaps, stale cache/index risk, event/API version compatibility.

**Plan sections it may change:**

- `## Implementation Strategy`
- `## Work Breakdown`
- `## Execution Map`
- `## Risks and Edge Cases`
- `## Testing and Verification`

**Prompt:**

```text
Review this plan only for data, migration, compatibility, rollback, and deployment-order risks.
Find cases where old and new code/data may coexist unsafely.
Return only `ready to execute` or `revise plan: {severity} — {smallest concrete plan change}`.
```

### Performance / Scale

**Trigger:** Hot paths, query changes, large collections, background jobs, batch processing, file processing, network fan-out, caching, rendering performance, or explicit latency/speed goals.

**Role:** Performance reviewer.

**Finds:** N+1 queries, repeated computation, avoidable allocation/copying, blocking I/O, missing pagination/batching, cache invalidation risk, absent performance verification.

**Plan sections it may change:**

- `## Implementation Strategy`
- `## Work Breakdown`
- `## Risks and Edge Cases`
- `## Testing and Verification`

**Prompt:**

```text
Review this plan only for performance, scale, allocation, query, and latency risks.
Return only `ready to execute` or `revise plan: {severity} — {smallest concrete plan change}`.
Do not suggest speculative optimization.
```

### UX / Accessibility

**Trigger:** User-facing UI, forms, navigation, tables, dashboards, onboarding, mobile/responsive behavior, modals, loading/error/empty states, or copy visible to users.

**Role:** UX and accessibility reviewer.

**Finds:** Missing loading/error/empty states, keyboard/focus traps, missing labels, screen reader gaps, contrast/responsive risks, unclear user feedback.

**Plan sections it may change:**

- `## Target State`
- `## Work Breakdown`
- `## Testing and Verification`
- `## Risks and Edge Cases`
- `## Definition of Done`

**Prompt:**

```text
Review this plan only for user-facing UX and accessibility implementation gaps.
Find missing states, keyboard/focus behavior, labels, responsive behavior, and user-visible error handling.
Return only `ready to execute` or `revise plan: {severity} — {smallest concrete plan change}`.
```

### Operations / Observability

**Trigger:** Production rollout, infrastructure, workers, cron, queues, webhooks, billing, auth, deployments, background jobs, third-party APIs, or behavior that needs production diagnosis.

**Role:** Operations reviewer.

**Finds:** Unsafe rollout order, missing rollback path, no production diagnosis path, missing logs/metrics at critical boundaries, alert/runbook gaps, noisy or sensitive logs.

**Plan sections it may change:**

- `## Implementation Strategy`
- `## Work Breakdown`
- `## Execution Map`
- `## Testing and Verification`
- `## Risks and Edge Cases`
- `## Definition of Done`

**Prompt:**

```text
Review this plan only for rollout, observability, production diagnosis, and rollback risks.
Return only `ready to execute` or `revise plan: {severity} — {smallest concrete plan change}`.
Avoid generic monitoring advice.
```

## Selection Examples

- Small single-file bug fix: no optional lenses.
- Billing retry bug: Testing / Verification, Data / Migration / Backward Compatibility, Operations / Observability.
- Public API refactor: Implementability / Agent Handoff, Data / Migration / Backward Compatibility, Testing / Verification.
- Dashboard redesign: UX / Accessibility, Testing / Verification, Performance / Scale if data-heavy.
- Multi-agent backend feature: Implementability / Agent Handoff plus any domain-specific lens triggered by the affected systems.
