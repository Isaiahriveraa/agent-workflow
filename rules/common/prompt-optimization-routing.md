# Prompt Optimization Routing

Use an internal prompt-optimization pass before acting when the request would benefit from clearer task shaping.

## When To Trigger

Run the internal optimization pass when one or more are true:
- The request is vague, under-specified, or mixes multiple goals.
- The work is multi-step, implementation-heavy, or likely to span research and execution.
- The user is asking for planning, workflow design, handoff generation, or sub-agent delegation.
- The task is substantial enough to warrant RPI:
  - likely to touch 3+ files
  - likely to touch multiple subsystems
  - likely to take more than 30 minutes
- The request changes shared workflow behavior, agent policy, or cross-provider behavior.

## When To Skip

Skip the optimization pass when the request is already narrow and operational:
- simple factual questions
- direct single-file edits with clear scope
- short follow-up fixes
- casual conversation
- mechanical requests where extra structure would add latency without reducing risk

## Internal Optimization Pass

Do this silently unless the user explicitly asks to see the rewritten prompt or invokes `/optimize-prompt`.

1. Extract the task shape:
   - goal
   - relevant context
   - explicit user constraints
   - deliverable
   - validation needs
2. Remove ambiguity:
   - separate instructions from background content
   - convert vague asks into operational outcomes
   - infer only low-risk defaults
3. Add execution guardrails:
   - preserve explicit user choices
   - state non-goals when they prevent scope creep
   - prefer visible artifacts such as assumptions, checklists, or verification notes over hidden reasoning asks

Use the smallest structure that removes uncertainty. Prefer the `prompt-handoff-optimizer` shape:
- `GOAL`
- `CONTEXT`
- `CONSTRAINTS`
- `DELIVERABLE`
- `VALIDATION`

## RPI Routing

If the optimized task is substantial, route it through:
1. research current state
2. score readiness with `node ./scripts/workflow-router-tools.mjs score`
3. create a decision-complete plan
4. implement in phases
5. validate outcomes

The readiness gate must pass before implementation planning or coding can begin:
- threshold: `>= 70/100`
- required minima: clarity `>= 15/25`, codebase coverage `>= 15/25`
- if the score fails, continue research or ask focused questions

Choose the discovery depth with `rules/common/discovery-levels.md`.

## Output Discipline

- Do not show the optimized prompt by default.
- Do not broaden scope while optimizing.
- If the optimization materially changes execution assumptions, state the interpreted task briefly before proceeding.
- If the user asks for prompt rewriting as the deliverable, use `/optimize-prompt` or the `prompt-handoff-optimizer` skill directly.
