---
description: Simple front door for the full discover -> research -> design -> plan -> implement -> validate workflow
---

# RPI

Use this command as the simple user-facing entrypoint for substantial work.

## Default Behavior

When the user invokes `/rpi`, keep the interaction simple and obvious:
- one short explanation of the workflow
- one current phase at a time
- one clear next action

Do not dump the full internal governance stack on the user unless it blocks progress.

**Every phase produces a document or artifact. Before diving into the details, load the caveman skill and explain the big picture first. Always keep Yonie in the loop.**

## Initial Response

If no task or artifact path was provided, respond with:

```text
Give me the task and I'll run it through discover, research, design, plan, implementation, and validation.

You can paste the task directly or give me an absolute path to an existing research or plan artifact.
```

Then wait for input.

If the user already supplied a task or artifact path, start immediately.

## Orchestration Rules

1. Treat `/rpi` as the simple frontend, not a second workflow system.
2. Use `node ~/.agents/scripts/workflow-router-tools.mjs activate` to classify the task before choosing depth.
3. Follow the router result exactly:
   - Tier 1: do not force full RPI; explain that the task is lightweight and proceed directly
   - Tier 2: route to focused planning, then implementation, then validation
   - Tier 3: run the full strict workflow
4. If the router output indicates `ambiguityDetected: true` or `recommendedResearchEntry: brainstorm`, insert a `Discover` phase before `Research`.
5. Keep user-facing updates phase-based:
   - `Discover` — what are we doing and why
   - `Research` — what exists and what's possible
   - `Design` — how it should work at a high level
   - `Plan` — concrete steps to build it
   - `Implement` — build it
   - `Validate` — does it work
6. Keep internal rigor:
   - prompt optimization when required
   - clarification/discover when required
   - readiness gating when required
   - critique cycles when required
   - artifact grading when required
   - memory recall when required
7. Do not expose every internal helper step unless the user asks or a gate fails.

When a discover phase is required, route through `commands/rpi-brainstorm.md` and do not start `research_codebase.md` until Yonie understands and agrees with the high-level direction.

## Document Explanation Contract (CRITICAL)

Every time you produce a workflow document or artifact, follow this sequence **without exception**:

### Step 1 — Caveman Skill: Big Picture First

Before showing the document, load the caveman skill and explain the big picture in 3-5 terse sentences:
- **What this is**: "This is a research doc about the auth system"
- **Why it matters**: "We need to know how auth works before we can add SSO"
- **What it says at a high level**: "Current system uses JWT tokens stored in httpOnly cookies. No refresh token rotation. We need to add that."
- **What comes next**: "After this, we'll design the new auth flow, then plan the implementation"

Use the caveman skill (caveman-full mode) — short sentences, no filler, no jargon unless necessary. Assume Yonie knows the domain but needs the map, not the satellite image.

### Step 2 — Confirm Understanding

Ask: "Does that make sense so far? Any questions before I walk through the details?"

**Do not proceed to details until Yonie confirms they understand the big picture.**

### Step 3 — Details on Demand

Only after Yonie confirms the high-level picture, offer:
- "Want me to walk through the details?"
- Or "The document covers [specific areas] — which part do you want to dive into?"

If Yonie says no, that's fine. Move to the next phase.

### Step 4 — Loop Back Between Phases

At every phase transition, give a 1-2 line status:
```
Discover done: we're building a CLI task tracker — tracks todos from the terminal, stores in SQLite.
Next up: Research — I'll look at similar tools and what SQLite patterns exist in our codebase.
```

This keeps Yonie oriented in the workflow without having to ask "where are we."

## Phase Flow

### Discover

**Goal**: Establish shared understanding of what we're building and why — before any codebase research or implementation.

This is the first phase for any non-trivial task. Do not skip it.

**What happens**:
- Clarify the problem Yonie wants to solve
- Name the goals, constraints, and what's out of scope
- Identify what success looks like (concrete, not vague)
- Identify what systems or areas will be touched (at a file/module level, not implementation details)

**Output**: A short intake brief (no more than a paragraph or two). Written in plain language.

**Big-picture explain**: Before showing the brief, load the caveman skill and explain:
- "We're building X. It does Y. The main constraint is Z. Here's why we're doing it this way."

**Gate**: Do not proceed to Research until Yonie can paraphrase what we're building and why.

If the request is still too vague to produce a brief, route through `commands/rpi-brainstorm.md` first.

### Research

**Goal**: Understand current state — what exists, what patterns are in use, what the codebase says about the problem.

**What happens**:
- Explore the codebase for existing patterns, implementations, and constraints
- Check official docs for unfamiliar libraries
- Produce a research artifact summarizing findings

**Output**: A research artifact (what exists, relevant patterns, constraints, unknowns).

**Big-picture explain**: Before showing the artifact:
- "Here's what I found. The codebase currently does X using Y pattern. The main thing we need to know is Z."

**Gate**: Do not proceed to Design until Yonie understands the research findings at a high level.

### Design

**Goal**: Determine how the solution should work at a high level — architecture, component boundaries, data flow, key interfaces.

**What happens**:
- Sketch the architecture: components, boundaries, how data flows
- Identify key interfaces and contracts
- Name tradeoffs and why you're choosing one approach over another
- Keep it at the component/module level, not line-by-line

**Output**: A design artifact (architecture sketch, component diagram in text, key decisions).

**Big-picture explain**: Before showing the design:
- "Here's the architecture. Component A talks to B through C. Data flows D -> E -> F. The big tradeoff is X vs Y — I'm picking X because Z."

**Gate**: Do not proceed to Plan until Yonie understands and agrees with the design direction.

### Plan

**Goal**: Concrete steps to build it — what changes, in what order, with what tests.

**What happens**:
- Break the design into implementable steps
- Order by dependency (foundation first, features on top)
- Define testing strategy for each step
- Identify risks and edge cases

**Output**: A plan artifact (numbered steps, files to change, test strategy, verification criteria).

**Big-picture explain**: Before showing the plan:
- "The plan has N steps. Step 1 sets up the data layer. Step 2 builds the API. Step 3 wires the UI. Each step has tests. Estimated impact: M files."

**Gate**: Do not proceed to Implement unless:
1. Yonie has reviewed and agreed to the plan
2. Edge cases and risks are named
3. Test strategy is defined
4. Yonie can explain the plan in their own words

### Implement

**Goal**: Build it, one step at a time.

**What happens**:
- Execute each step from the plan
- One focused change at a time
- Write test first (TDD) for non-trivial logic
- Verify: diagnostics clean, tests pass
- Mark step complete, move to next

**Output**: Working code, passing tests.

**Big-picture explain**: At the start of implementation:
- "Starting implementation. Step 1: setting up the data layer — creating the schema and repository. This is the foundation everything else builds on."

Between steps:
- "Step 1 done. Schema created, repository passing tests. Step 2 next: API routes."

**Constraints**:
- Max ~50 lines or 2 files changed per step without explicit confirmation
- Each step must leave the codebase in a working state
- No type suppressions, no empty catches, no `any`

### Validate

**Goal**: Confirm it works and matches the plan.

**What happens**:
- Run all tests
- Run diagnostics
- Compare result against plan's success criteria
- Report: what was built, what passed, what needs Yonie's eyes

**Output**: Validation report.

**Big-picture explain**: Before showing results:
- "Validation complete. All N tests pass. Diagnostics clean. The feature does X, Y, Z as planned. One thing still needs your manual check: [specific thing]."

**Gate**: If validation fails → fix or revert. Do not declare complete until it passes.

## User-Facing Style Contract

Prefer this shape when announcing the workflow:

```text
RPI flow for this task:
1. Discover — figure out what we're building and why
2. Research — look at what exists and what's possible
3. Design — sketch how it should work at a high level
4. Plan — concrete steps to build it
5. Implement — build it step by step
6. Validate — confirm it works

Starting with Discover.
```

When a phase is not needed (e.g., trivial task), omit it. But always explain the shortcut:
```text
This is straightforward enough that we can skip Discover and Research.
Starting with Design.
```

Each phase handoff should be 1-2 lines max. Use the caveman skill for phase summaries.

## Guardrails

- Do not create a parallel artifact format for `/rpi`
- Do not bypass `rpi-brainstorm` when ambiguity is still blocking clean discovery
- Do not bypass `research_codebase`, `create-plan`, `implement_plan`, or `validate_plan` when they are required by the router
- Do not weaken readiness, critique, grading, or validation requirements for substantial work
- **Do not show a document without first loading the caveman skill and explaining its big picture.** This is the most important rule.
- Do not make `/rpi` Claude-first or adapter-specific; it remains provider-agnostic
- Do not auto-run git branch, push, or PR actions unless the user explicitly asks
