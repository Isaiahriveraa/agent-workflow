---
name: recall
description: Resume work from a handoff document produced by the handoff command. Reads the handoff, verifies current repo, branch, and state, and continues from where the previous session left off. Use at the start of a new session when the user references a handoff file, says "resume from handoff", "continue from where we left off", or invokes /recall.
argument-hint: [handoff-path]
shell-timeout: 10
---

# Resume Handoff

You are tasked with resuming work from a handoff document through an interactive process. These handoffs contain critical context, learnings, and next steps from previous work sessions that need to be understood and continued.

## Input

`$ARGUMENTS` — path to a handoff document (e.g. `context/handoffs/<filename>.md`). If omitted, the skill lists available handoffs from the current worktree's `context/handoffs/` directory and asks which to resume from.

## Metadata

```!
echo "### recent (read only in case of empty user input)"
echo "recent handoffs:"
# List latest handoffs from the worktree's context directory
GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
find "$GIT_ROOT/context/handoffs" -maxdepth 1 -type f -name '*.md' -print 2>/dev/null | sort -r | head -5
```

## Flow

1. Input → 2. Read & analyze handoff → 3. Synthesize & present → 4. Create action plan → 5. Begin implementation

## Steps

### Step 1: Input Handling

When this command is invoked:

1. **If the path to a handoff document was provided**:
   - If a handoff document path was provided as a parameter, skip the default message
   - Immediately read the handoff document FULLY using the Read tool
   - Immediately read any research or plan documents it links to under `context/`. Read these critical files DIRECTLY using the Read tool - do NOT invoke skills for this initial reading phase.
   - Begin the analysis process by ingesting relevant context from the handoff document, reading additional files it mentions
   - Then propose a course of action to the user and confirm, or ask for clarification on direction.

2. **If no parameters provided**, branch on the `recent handoffs:` listing in the Metadata block:
   - **Empty** — no handoffs exist; tell the user and ask for a path in prose.
   - **Exactly one entry** — confirm with `ask_user_question`: "Resume this handoff?" with options "Resume `<filename>` (Recommended)" and "Pick a different path". Do NOT call `ask_user_question` with a single option (the tool requires ≥2).
   - **Two or more entries** — present the top 4 filenames as `ask_user_question` options (a free-text "Other" row is appended automatically by the tool; do not list it manually).

   Direct invocation alternative: `/skill:recall context/handoffs/<filename>`

### Step 2: Read and Analyze Handoff

1. **Read handoff document completely**:
   - Use the Read tool WITHOUT limit/offset parameters
   - Active Goal and linked plan/artifact references
   - Current State (verified vs assumed)
   - Latest User Intent and any intent corrections
   - Locked Decisions and Do Not Repeat items
   - Work Completed and verification results
   - Relevant Files with their roles
   - Remaining Work (ordered tasks)
   - Resume Here (exact next step)
   - Open Questions or Blockers
   - Verification Status and Success Criteria

2. **Spawn focused research agents**:
   After reading all critical handoff/plan/research documents directly, spawn the agents below in parallel using the Agent tool. Wait for ALL agents to complete before proceeding.

   ```
   Task 1 - Gather artifact context:
   Read all artifacts mentioned in the handoff.
   1. Read plans, research, ADRs, designs, and FRDs listed in "Active Goal" or "Relevant Files"
   2. Read implementation plans referenced
   3. Read any research documents mentioned
   4. Read ADRs linked in Locked Decisions
   5. Extract key requirements and decisions
   Use tools: Read
   Return: Summary of artifact contents and key decisions
   ```

3. **Wait for ALL agents to complete** before proceeding
4. **Verify current state**:
   - Read files from "Work Completed" section completely to validate changes are still present
   - Read files from "Relevant Files" to verify listed paths and roles match current state
   - Use git log or git diff if needed to check commit history since handoff
   - Re-read implementation files mentioned to confirm current state matches handoff expectations
   - Read any new related files discovered during research

### Step 3: Synthesize and Present Analysis

1. **Present comprehensive analysis**:
   ```
   I've analyzed the handoff from {date} by {author}. Here's the current situation:

   **Active Goal:**
   - {Goal from handoff}: {Verified unchanged / Changed}
   - Linked plans/artifacts: {verified accessible}

   **Locked Decisions / Do Not Repeat:**
   - {Decision or rejected approach} - {Still applicable / Avoided}
   - {Another decision} - {Still applicable}

   **Work Completed Status:**
   - {Change 1} - {Verified present/Missing/Modified}
   - {Change 2} - {Verified present/Missing/Modified}

   **Artifacts Reviewed:**
   - {Document 1}: {Key takeaway}
   - {Document 2}: {Key takeaway}

   **Remaining Work:**
   - {Task 1}: {Status from handoff} → {Current verification}
   - {Task 2}: {Status from handoff} → {Current verification}

   **Recommended Next Actions:**
   Based on the handoff's action items and current state:
   1. {Most logical next step based on handoff}
   2. {Second priority action}
   3. {Additional tasks discovered}

   **Potential Issues Identified:**
   - {Any conflicts or regressions found}
   - {Missing dependencies or broken code}

   ```

   Use the `ask_user_question` tool to confirm the approach. Question: "{Summary of recommended next action}. Proceed?". Header: "Resume". Options: "Proceed (Recommended)" (Begin with {recommended action 1}); "Adjust approach" (Change the order or scope of next steps); "Re-analyze" (The codebase has changed — re-verify state first).

### Step 4: Create Action Plan

1. **Create a task list**:
   - Convert action items from handoff into todos
   - Add any new tasks discovered during analysis
   - Prioritize based on dependencies and handoff guidance

2. **Present the plan**:
   ```
   I've created a task list based on the handoff and current analysis:

   {Show todo list}

   Ready to begin with the first task: {task description}?
   ```

### Step 5: Begin Implementation

1. **Start with the first approved task**
2. **Reference learnings from handoff** throughout implementation
3. **Apply patterns and approaches documented** in the handoff
4. **Update progress** as tasks are completed

## Guidelines

1. **Be Thorough in Analysis**:
   - Read the entire handoff document first
   - Verify ALL mentioned changes still exist
   - Check for any regressions or conflicts
   - Read all referenced artifacts

2. **Be Interactive**:
   - Present findings before starting work
   - Get buy-in on the approach
   - Allow for course corrections
   - Adapt based on current state vs handoff state

3. **Leverage Handoff Wisdom**:
   - Pay special attention to "Locked Decisions" and "Do Not Repeat" sections
   - Apply documented patterns and approaches
   - Avoid repeating mistakes mentioned
   - Build on discovered solutions

4. **Track Continuity**:
   - Keep the task list updated to maintain task continuity
   - Reference the handoff document in commits
   - Document any deviations from original plan
   - Consider creating a new handoff when done

5. **Validate Before Acting**:
   - Never assume handoff state matches current state
   - Verify all file references still exist by reading them
   - Check for breaking changes since handoff using git log/diff or by reading modified files
   - Confirm patterns mentioned in "Learnings" are still valid by examining current code
   - Compare handoff timestamps with current git commits to assess how much has changed

## Common Scenarios

### Scenario 1: Clean Continuation
- All changes from handoff are present
- No conflicts or regressions
- Clear "Resume Here" section with exact next step
- Proceed with the action specified in Resume Here

### Scenario 2: Diverged Codebase
- Some changes missing or modified
- New related code added since handoff
- Need to reconcile differences
- Adapt plan based on current state

### Scenario 3: Incomplete Handoff Work
- Tasks marked as "in_progress" in handoff
- Need to complete unfinished work first
- May need to re-understand partial implementations
- Focus on completing before new work

### Scenario 4: Stale Handoff
- Significant time has passed
- Major refactoring has occurred
- Original approach may no longer apply
- Need to re-evaluate strategy

## Example Interaction Flow

```
User: /skill:recall context/handoffs/2026-07-04_12-38-06_webhook-validation.md
Assistant: Let me read and analyze that handoff document...

{Reads handoff completely}
{Spawns research agents}
{Waits for completion}
{Reads identified files}

I've analyzed the handoff from {date}. Here's the current situation...

{Presents analysis}

Shall I proceed with implementing the webhook validation fix, or would you like to adjust the approach?

User: Yes, proceed with the webhook validation
Assistant: {Creates todo list and begins implementation}
```
