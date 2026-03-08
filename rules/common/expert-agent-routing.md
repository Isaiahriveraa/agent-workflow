# Expert Agent Routing

Use this rule before delegating substantial workflow-system tasks.

## When To Trigger
- The task changes continuity behavior, parity behavior, routing behavior, eval coverage, or tool integration.
- The task is about the workflow hub itself rather than application delivery in another repo.
- The best specialist is not obvious from the request alone.

## Routing Order
1. Read `contexts/agent-catalog.md`.
2. Decide whether the task is:
   - continuity
   - parity
   - workflow gating
   - eval design
   - tool integration
3. Choose the narrowest workflow expert that covers the task.
4. Use multiple experts only when their scopes are clearly disjoint.
5. If the task is narrow and operational rather than workflow-system work, stay local instead of delegating.

## Helper

Use `node ./scripts/expert-agent-routing-tools.mjs route --input "<task>"` when the route is not obvious from the request text alone.

The helper is intentionally conservative:
- one matched category -> route directly to that expert
- multiple matched categories -> route to `expert-agent-router`
- no workflow-system signal -> stay local

## Default Mappings
- continuity drift -> `continuity-manager`
- adapter capability drift -> `adapter-parity-auditor`
- RPI/readiness/gate drift -> `workflow-router-auditor`
- regression or scenario coverage -> `eval-engineer`
- MCP/permissions/tool-surface integration -> `tooling-integrator`
- ambiguous workflow delegation -> `expert-agent-router`

## Constraints
- Do not default to broad persona agents when a workflow expert cleanly fits the task.
- Do not create duplicate expert agents for the same workflow surface.
- Stay local when delegation would add latency without reducing uncertainty.

## Representative Task Shapes
- `resume-handoff`, `resume-session`, checkpoint, or working-set drift -> `continuity-manager`
- capability matrix drift or cross-CLI native vs bridged confusion -> `adapter-parity-auditor`
- skipped optimize -> research -> plan -> implement -> validate flow -> `workflow-router-auditor`
- regression, scenario, or behavioral workflow coverage -> `eval-engineer`
- MCP, approvals, sandbox, or helper-script boundary work -> `tooling-integrator`
- mixed continuity + parity + eval/tooling work -> `expert-agent-router`
