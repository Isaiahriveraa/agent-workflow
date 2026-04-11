---
description: Create detailed implementation plans through interactive research and iteration
---

# Implementation Plan

You are tasked with creating detailed implementation plans through an interactive, iterative process. You should be skeptical, thorough, and work collaboratively with the user to produce high-quality technical specifications.

## Initial Response

When this command is invoked:

1. **Check if parameters were provided**:
   - If a file path was provided as a parameter, skip the default message
   - Immediately read any provided files FULLY
   - Begin the research process

2. **If no parameters provided**, respond with:
```
I'll create the implementation plan for this work.

I’ll first verify the current state, then turn that into a concrete plan we can implement safely.

Please provide:
1. The task description (or path to a spec/brief file)
2. Any relevant context, constraints, or specific requirements
3. Links to related research or previous implementations

I'll analyze this information and work with you to create a comprehensive plan.

Tip: You can invoke this command with a file directly: `/create-plan /absolute/path/to/project/thoughts/research/2026-02-17-my-research.md`
```

Then wait for the user's input.

## User-Facing Contract

From the user's perspective, this command should feel like:
1. understand the goal
2. verify the codebase reality
3. produce the plan

Keep governance and helper steps mostly internal unless they block progress.
Lead with the planning job, not with the workflow machinery.

## Process Steps

### Step 1: Context Gathering & Initial Analysis

0. **Load canonical context before planning:**
   - Read `~/.agents/contexts/decisions.md`
   - Resolve the current project context with `node ~/.agents/scripts/project-context.mjs current`
   - Read the current project's runtime `research-index.md` if prior research exists
   - Read the current project's runtime `state.md` when the existing workflow position matters
   - Load only the relevant rule cards from `~/.agents/rules/common/`
   - Treat decisions recorded there as authoritative unless the user explicitly changes them
   - Determine strict-workflow activation with `node $HOME/.agents/scripts/workflow-router-tools.mjs activate` when the task shape is not already proven by a graded substantial research artifact
   - For substantial requests, load `~/.agents/rules/common/workflow-router.md`
   - If the task is creative or API-contract-heavy, select and load the relevant capsule before drafting implementation steps
   - For substantial requests backed by research, run `node $HOME/.agents/scripts/workflow-artifact-tools.mjs grade-research --file [research path]` and refuse to finalize a plan unless it passes
- After canonical context is loaded and before plan drafting, run this command to recall relevant memories:
      `agents-memory recall create-plan --query "<brief description of what you're planning>" --filter-relevance`
      This recall attempt is mandatory for command entry. If memory is disabled or returns zero items, that is still a successful attempt — proceed normally. If items are returned, incorporate them as advisory context (lower priority than codebase evidence and explicit decisions).
   - Pass active project identity from `scripts/project-context.mjs` and current artifact focus into the advisory recall request
   - Limit advisory recall to `lesson`, `failure_pattern`, `user_preference`, and `prior_work_summary`, with a bounded `top_k` and explicit score threshold
   - Treat advisory recall as optional input only: empty recall is success, disabled or unavailable recall is still a successful attempt, and explicit research, decisions, and selected artifacts remain authoritative
   - Do not write advisory recall into the current project's runtime `state.md`, `research-index.md`, or active artifact selections
   - Do not pass advisory recall into `scripts/workflow-artifact-tools.mjs`; artifact grading stays bound to canonical files only
   - After readiness scoring, research grading, and the mandatory recall attempt, run `node $HOME/.agents/scripts/workflow-command-decision.mjs evaluate --input ...` to convert that evidence into one command strategy before drafting or finalizing the plan
   - Obey the helper-backed strategy: `continue` may draft/finalize the plan, `do_more_research` must continue research, `run_critic` must complete critique/refinement before the plan is treated as ready, and `request_user_decision` must stop for the blocking decision

1. **Read all mentioned files immediately and FULLY**:
   - Research documents
   - Related implementation plans
   - Any spec or brief files mentioned
   - **IMPORTANT**: Use the Read tool WITHOUT limit/offset parameters to read entire files
   - **CRITICAL**: DO NOT spawn sub-tasks before reading these files yourself in the main context
   - **NEVER** read files partially - if a file is mentioned, read it completely

2. **Spawn initial research tasks to gather context**:
   Before asking the user any questions, use specialized agents to research in parallel:

   - Use the **codebase-locator** agent to find all files related to the task
   - Use the **codebase-analyzer** agent to understand how the current implementation works
   - If relevant, use the **thoughts-locator** agent to find any existing thoughts documents about this feature

   These agents will:
   - Find relevant source files, configs, and tests
   - Trace data flow and key functions
   - Return detailed explanations with file:line references

3. **Read all files identified by research tasks**:
   - After research tasks complete, read ALL files they identified as relevant
   - Read them FULLY into the main context
   - This ensures you have complete understanding before proceeding

4. **Analyze and verify understanding**:
   - Cross-reference the requirements with actual code
   - Identify any discrepancies or misunderstandings
   - Note assumptions that need verification
   - Determine true scope based on codebase reality
   - Identify whether capsule-specific context, references, anti-patterns, or grading criteria are still missing
   - Classify the discovery depth using `~/.agents/rules/common/discovery-levels.md`
   - Use router activation as the authority for whether substantial-task routing is required; do not treat the RPI path as discretionary when the router says the task is substantial
   - Score readiness with `node $HOME/.agents/scripts/workflow-router-tools.mjs score`
   - If readiness is below threshold, do more research or ask focused questions before writing the plan

5. **Present informed understanding and focused questions**:
   ```
   Based on the task and my research of the codebase, I understand we need to [accurate summary].

   I've found that:
   - [Current implementation detail with file:line reference]
   - [Relevant pattern or constraint discovered]
   - [Potential complexity or edge case identified]

   Questions that my research couldn't answer:
   - [Specific technical question that requires human judgment]
   - [Business logic clarification]
   - [Design preference that affects implementation]
   ```

   Only ask questions that you genuinely cannot answer through code investigation.

### Step 2: Research & Discovery

After getting initial clarifications:

1. **If the user corrects any misunderstanding**:
   - DO NOT just accept the correction
   - Spawn new research tasks to verify the correct information
   - Read the specific files/directories they mention
   - Only proceed once you've verified the facts yourself

2. **Create a research todo list** using TodoWrite to track exploration tasks

3. **Spawn parallel sub-tasks for comprehensive research**:
   - Create multiple Task agents to research different aspects concurrently
   - Use the right agent for each type of research:

   **For deeper investigation:**
   - **codebase-locator** - To find more specific files
   - **codebase-analyzer** - To understand implementation details
   - **codebase-pattern-finder** - To find similar features we can model after

   **For historical context:**
   - **thoughts-locator** - To find any research, plans, or decisions about this area
   - **thoughts-analyzer** - To extract key insights from the most relevant documents

   Each agent knows how to:
   - Find the right files and code patterns
   - Identify conventions and patterns to follow
   - Look for integration points and dependencies
   - Return specific file:line references
   - Find tests and examples

3. **Wait for ALL sub-tasks to complete** before proceeding

4. **Present findings and design options**:
   ```
   Based on my research, here's what I found:

   **Current State:**
   - [Key discovery about existing code]
   - [Pattern or convention to follow]

   **Design Options:**
   1. [Option A] - [pros/cons]
   2. [Option B] - [pros/cons]

   **Open Questions:**
   - [Technical uncertainty]
   - [Design decision needed]

   Which approach aligns best with your vision?
   ```

5. **Readiness gate before plan writing**:
   - Do not write the implementation plan until the readiness gate passes
   - Default thresholds:
     - total `>= 70/100`
     - clarity `>= 15/25`
     - codebase coverage `>= 15/25`
   - If the gate fails, keep researching or ask targeted questions instead of drafting implementation steps
   - For substantial workflows, do not treat prose alone as sufficient: require parser-backed research readiness before finalizing the plan

### Step 3: Plan Structure Development

Once aligned on approach:

1. **Create initial plan outline**:
   ```
   Here's my proposed plan structure:

   ## Overview
   [1-2 sentence summary]

   ## Implementation Phases:
   1. [Phase name] - [what it accomplishes]
   2. [Phase name] - [what it accomplishes]
   3. [Phase name] - [what it accomplishes]

   Does this phasing make sense? Should I adjust the order or granularity?
   ```

For substantial work, do not stop at a top-level phase outline. The default artifact shape is:
- one parent plan that explains sequencing, dependencies, and end-state alignment
- one child plan per implementation phase with decision-complete detail for that phase
- a `Phase Plan Index` in the parent plan linking every phase to its child plan

Before drafting the parent plan, force one explicit alignment pass:
- restate the original user prompt in operational terms
- ask whether the current approach is truly what the user wants or merely the bare minimum implementation
- convert that answer into an `Original Prompt Alignment` section
- add a `Research Sufficiency` section stating whether the research is actually enough to support implementation

For redesign and other creative work, do not finalize the plan unless the planning packet includes:
- objective
- audience
- visual direction
- references
- banned patterns
- differentiation target
- required states

Treat missing child phase plans or a missing redesign packet as blocking plan-quality failures, not optional improvements.

2. **Get feedback on structure** before writing details

### Step 4: Detailed Plan Writing

After structure approval:

1. **Write the plan** to `[project root]/thoughts/plans/YYYY-MM-DD-description.md`
   - In all user-facing responses, include the final plan location as an absolute filesystem path
   - Format: `YYYY-MM-DD-description.md` where:
     - YYYY-MM-DD is today's date (get it via `date +%Y-%m-%d`)
     - description is a brief kebab-case description
   - Examples:
     - `/absolute/path/to/.agents/thoughts/plans/2026-02-17-improve-error-handling.md`
     - `/absolute/path/to/.agents/thoughts/plans/2026-02-17-rpi-workflow-integration.md`

2. **Use this template structure**:

````markdown
# [Feature/Task Name] Implementation Plan

## Overview

[Brief description of what we're implementing and why]

## Current State Analysis

[What exists now, what's missing, key constraints discovered]

## Desired End State

[A Specification of the desired end state after this plan is complete, and how to verify it]

### Key Discoveries:
- [Important finding with file:line reference]
- [Pattern to follow]
- [Constraint to work within]

## What We're NOT Doing

[Explicitly list out-of-scope items to prevent scope creep]

## Implementation Approach

[High-level strategy and reasoning]

## Phase 1: [Descriptive Name]

### Overview
[What this phase accomplishes]

### Changes Required:

#### 1. [Component/File Group]
**File**: `path/to/file.ext`
**Changes**: [Summary of changes]

```[language]
// Specific code to add/modify
```

### Success Criteria:

#### Automated Verification:
- [ ] Tests pass: `make test` or equivalent
- [ ] Type checking passes: `npm run typecheck` or equivalent
- [ ] Linting passes: `make lint` or equivalent

#### Manual Verification:
- [ ] Feature works as expected when tested
- [ ] Edge case handling verified manually
- [ ] No regressions in related features

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: [Descriptive Name]

[Similar structure with both automated and manual success criteria...]

---

## Testing Strategy

### Unit Tests:
- [What to test]
- [Key edge cases]

### Integration Tests:
- [End-to-end scenarios]

### Manual Testing Steps:
1. [Specific step to verify feature]
2. [Another verification step]
3. [Edge case to test manually]

## Learning Loop Hooks

- What failure signals should trigger diagnosis during implementation
- Which learning contexts or lesson artifacts may be updated if a verified miss occurs
- What workflow improvements should be suggested to the user instead of silently applied

## Performance Considerations

[Any performance implications or optimizations needed]

## Migration Notes

[If applicable, how to handle existing data/systems]

## References

- Related research: `[project root]/thoughts/research/[relevant].md`
- Similar implementation: `[file:line]`
````

For substantial plans, include readiness frontmatter and critique evidence required by `node $HOME/.agents/scripts/workflow-artifact-tools.mjs grade-plan`.
Do not mark the plan ready or hand it to implementation unless parser-backed output proves `plan_ready_for_implementation: true`.
For substantial plans, `plan_ready_for_implementation: true` also requires:
- `Original Prompt Alignment`
- `Research Sufficiency`
- `Phase Plan Index`
- one linked child phase plan per explicit implementation phase

Steps to take before critique on substantial plans:
- run `node $HOME/.agents/scripts/workflow-plan-tools.mjs sync-child-plans --parent [absolute parent plan path]` to generate or refresh the child phase-plan set
- verify the plan produced one child plan per explicit phase
- treat the parent-plus-child artifact set as the critique packet; do not critique only the parent shell first

### Step 4.5: Adversarial Critique (substantial plans only)

For plans where `substantial: true` (classified by `node $HOME/.agents/scripts/workflow-router-tools.mjs classify` or activated by `node $HOME/.agents/scripts/workflow-router-tools.mjs activate`):

1. **Run rpi-critique in-place** on the draft plan:
   - Use the `/rpi-critique` skill with the draft plan path
   - The skill runs all critique dimensions silently, revises the artifact directly, and prints a human-readable improvement summary
   - No separate critique file is written

2. **After rpi-critique completes**, check the printed summary:
   - If **BLOCKING issues found**: read the summary, verify the in-place fixes were applied, and re-run `/rpi-critique` if the plan still fails grading (max 2 revision cycles)
   - If **WARNINGS ONLY**: review the summary; proceed to Step 5
   - If **ADVISORY**: proceed to Step 5
   - If **HUMAN JUDGMENT REQUIRED** (blocking after 2 cycles): surface the blocking issues to the user and do NOT proceed to Step 5

3. **After critique**, verify frontmatter updated correctly:
   - `critique_completed: true`
   - `critique_cycles: N` (incremented)
   - `plan_ready_for_implementation: true|false` (re-evaluated)

**Skip condition**: If `substantial: false` from the classifier, skip this step and note in the plan
frontmatter: `critique_completed: false`, `critique_cycles: 0`.

### Step 5: Review

1. **Present the draft plan location**:
   ```
   I've created the initial implementation plan at:
   `[project root]/thoughts/plans/YYYY-MM-DD-description.md`

   Please review it and let me know:
   - Are the phases properly scoped?
   - Are the success criteria specific enough?
   - Any technical details that need adjustment?
   - Missing edge cases or considerations?
   ```
   When presenting the plan, separate what the codebase proves, what advisory memory suggests, what is inferred, and what is newly proposed.
   For substantial workflows, run `node $HOME/.agents/scripts/workflow-artifact-tools.mjs grade-plan --file [absolute plan path]` before presenting the plan as implementation-ready.
   Treat a substantial plan as non-ready if it lacks child phase plans, if it is not tied back to the original prompt strongly enough, or if a redesign plan is missing the required creative packet.
   If a graded draft still fails because critique/refinement evidence is missing, rerun `node $HOME/.agents/scripts/workflow-command-decision.mjs evaluate --input ...` and route the outcome to `run_critic` instead of presenting the draft as ready.
   Then end the response with this exact standalone block using the saved plan path:
   ```text
   Next step

   /implement_plan /absolute/path/to/.agents/thoughts/plans/YYYY-MM-DD-description.md
   ```

2. **Iterate based on feedback** - be ready to:
   - Add missing phases
   - Adjust technical approach
   - Clarify success criteria (both automated and manual)
   - Add/remove scope items

3. **Continue refining** until the user is satisfied

## Important Guidelines

1. **Be Skeptical**:
   - Question vague requirements
   - Identify potential issues early
   - Ask "why" and "what about"
   - Don't assume - verify with code

2. **Be Interactive**:
   - Don't write the full plan in one shot
   - Get buy-in at each major step
   - Allow course corrections
   - Work collaboratively

3. **Be Thorough**:
   - Read all context files COMPLETELY before planning
   - Research actual code patterns using parallel sub-tasks
   - Include specific file paths and line numbers
   - Write measurable success criteria with clear automated vs manual distinction
   - Prefer `make` targets when available; otherwise use the project's actual test/lint commands

4. **Be Practical**:
   - Focus on incremental, testable changes
   - Consider migration and rollback
   - Think about edge cases
   - Include "what we're NOT doing"

5. **Track Progress**:
   - Use TodoWrite to track planning tasks
   - Update todos as you complete research
   - Mark planning tasks complete when done

6. **No Open Questions in Final Plan**:
   - If you encounter open questions during planning, STOP
   - Research or ask for clarification immediately
   - Do NOT write the plan with unresolved questions
   - The implementation plan must be complete and actionable
   - Every decision must be made before finalizing the plan

## Success Criteria Guidelines

**Always separate success criteria into two categories:**

1. **Automated Verification** (can be run by execution agents):
   - Commands that can be run: `make test`, `npm run lint`, etc.
   - Specific files that should exist
   - Code compilation/type checking
   - Automated test suites

2. **Manual Verification** (requires human testing):
   - UI/UX functionality
   - Performance under real conditions
   - Edge cases that are hard to automate
   - User acceptance criteria

**Format example:**
```markdown
### Success Criteria:

#### Automated Verification:
- [ ] All unit tests pass: `go test ./...`
- [ ] No linting errors: `golangci-lint run`
- [ ] API endpoint returns 200: `curl localhost:8080/api/new-endpoint`

#### Manual Verification:
- [ ] New feature appears correctly in the UI
- [ ] Performance is acceptable with 1000+ items
- [ ] Error messages are user-friendly
```

## Common Patterns

### For Database Changes:
- Start with schema/migration
- Add store methods
- Update business logic
- Expose via API
- Update clients

### For New Features:
- Research existing patterns first
- Start with data model
- Build backend logic
- Add API endpoints
- Implement UI last

### For Refactoring:
- Document current behavior
- Plan incremental changes
- Maintain backwards compatibility
- Include migration strategy

## Sub-task Spawning Best Practices

When spawning research sub-tasks:

1. **Spawn multiple tasks in parallel** for efficiency
2. **Each task should be focused** on a specific area
3. **Provide detailed instructions** including:
   - Exactly what to search for
   - Which directories to focus on
   - What information to extract
   - Expected output format
4. **Be specific about directories** — never use generic terms when you can name the actual path
5. **Specify read-only tools** to use
6. **Request specific file:line references** in responses
7. **Wait for all tasks to complete** before synthesizing
8. **Verify sub-task results**:
   - If a sub-task returns unexpected results, spawn follow-up tasks
   - Cross-check findings against the actual codebase
   - Don't accept results that seem incorrect

## Verification Command Selection

When writing `Automated Verification` sections:
- Prefer actual repo commands from `~/.agents/contexts/verification.md`
- Refresh them with `node $HOME/.agents/scripts/verification-tools.mjs plan` when needed
- Treat examples like `make test` or `npm run lint` as placeholders unless they match the repo's real commands

## Workflow State Integration

After writing the final plan:
- Resolve the current project context with `node ~/.agents/scripts/project-context.mjs current`
- Update the current project's runtime `state.md`
- Set `## Current Workflow` to `planning`
- Set `## Current Phase` to `plan created`
- Set `## Next Step` to the recommended execution entry point
- Set `## Related Plan` to the plan path you created

If the plan used new or existing research artifacts:
- Add or update the matching entry in the current project's runtime `research-index.md` with the helper-backed path in `scripts/artifact-tools.mjs` instead of freeform manual editing
