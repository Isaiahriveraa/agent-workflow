---
description: Document codebase as-is with thoughts directory for historical context
---

# Research Codebase

You are tasked with conducting comprehensive research across the codebase to answer user questions by spawning parallel sub-agents and synthesizing their findings.

## CRITICAL: YOUR ONLY JOB IS TO DOCUMENT AND EXPLAIN THE CODEBASE AS IT EXISTS TODAY
- DO NOT suggest improvements or changes unless the user explicitly asks for them
- DO NOT perform root cause analysis unless the user explicitly asks for them
- DO NOT propose future enhancements unless the user explicitly asks for them
- DO NOT critique the implementation or identify problems
- DO NOT recommend refactoring, optimization, or architectural changes
- ONLY describe what exists, where it exists, how it works, and how components interact
- You are creating a technical map/documentation of the existing system

## Initial Setup:

When this command is invoked, respond with:
```
I'm ready to research the codebase. Please provide your research question or area of interest, and I'll analyze it thoroughly by exploring relevant components and connections.
```

Then wait for the user's research query.

## Steps to follow after receiving the research query:

0. **Load canonical context before research:**
   - Read `~/.agents/contexts/decisions.md`
   - Resolve the current project context with `node ~/.agents/scripts/project-context.mjs current`
   - Read the current project's `research-index.md`
   - Read the current project's `state.md` if you need the current runtime workflow position
   - Load `~/.agents/rules/common/search-first.md`
   - For substantial requests, load `~/.agents/rules/common/workflow-router.md`
   - If this research is the first step of a substantial request, capture the normalized intake artifact with `node $HOME/.agents/scripts/workflow-router-tools.mjs capture`
   - For substantial requests, require at least one critique/refinement cycle before handoff

1. **Read any directly mentioned files first:**
   - If the user mentions specific files (tickets, docs, JSON), read them FULLY first
   - **IMPORTANT**: Use the Read tool WITHOUT limit/offset parameters to read entire files
   - **CRITICAL**: Read these files yourself in the main context before spawning any sub-tasks
   - This ensures you have full context before decomposing the research

2. **Analyze and decompose the research question:**
   - Break down the user's query into composable research areas
   - Take time to ultrathink about the underlying patterns, connections, and architectural implications the user might be seeking
   - Identify specific components, patterns, or concepts to investigate
   - Create a research plan using TodoWrite to track all subtasks
   - Consider which directories, files, or architectural patterns are relevant

3. **Spawn parallel sub-agent tasks for comprehensive research:**
   - Create multiple Task agents to research different aspects concurrently
   - We now have specialized agents that know how to do specific research tasks:

   **For codebase research:**
   - Use the **codebase-locator** agent to find WHERE files and components live
   - Use the **codebase-analyzer** agent to understand HOW specific code works (without critiquing it)
   - Use the **codebase-pattern-finder** agent to find examples of existing patterns (without evaluating them)

   **IMPORTANT**: All agents are documentarians, not critics. They will describe what exists without suggesting improvements or identifying issues.

   **For thoughts directory:**
   - Use the **thoughts-locator** agent to discover what documents exist about the topic
   - Use the **thoughts-analyzer** agent to extract key insights from specific documents (only the most relevant ones)

   **For web research (only if user explicitly asks):**
   - Use the **web-search-researcher** agent for external documentation and resources
   - IF you use web-research agents, instruct them to return LINKS with their findings, and please INCLUDE those links in your final report

   The key is to use these agents intelligently:
   - Start with locator agents to find what exists
   - Then use analyzer agents on the most promising findings to document how they work
   - Run multiple agents in parallel when they're searching for different things
   - Each agent knows its job - just tell it what you're looking for
   - Don't write detailed prompts about HOW to search - the agents already know
   - Remind agents they are documenting, not evaluating or improving

4. **Wait for all sub-agents to complete and synthesize findings:**
   - IMPORTANT: Wait for ALL sub-agent tasks to complete before proceeding
   - Compile all sub-agent results (both codebase and thoughts findings)
   - Prioritize live codebase findings as primary source of truth
   - Use thoughts/ findings as supplementary historical context
   - Connect findings across different components
   - Include specific file paths and line numbers for reference
   - Highlight patterns, connections, and architectural decisions
   - Answer the user's specific questions with concrete evidence

5. **Gather metadata for the research document:**
   - Get today's date: `date +%Y-%m-%d`
   - If inside a git repo, get branch and commit: `git branch --show-current` and `git rev-parse --short HEAD`
   - Filename: `[project root]/.planning/research/YYYY-MM-DD-description.md`
     - In all user-facing responses, report the research artifact using its absolute filesystem path
     - Format: `YYYY-MM-DD-description.md` where:
       - YYYY-MM-DD is today's date
       - description is a brief kebab-case description of the research topic
     - Examples:
       - `2026-02-17-authentication-flow.md`
       - `2026-02-17-rpi-command-structure.md`

6. **Generate research document:**
   - Use the metadata gathered in step 5
   - Structure the document with YAML frontmatter followed by content:
     ```markdown
     ---
     date: [Current date and time with timezone in ISO format]
     git_commit: [Current commit hash, or "n/a" if not in a git repo]
     branch: [Current branch name, or "n/a" if not in a git repo]
     repository: [Repository name, or "n/a" if not in a git repo]
     topic: "[User's Question/Topic]"
     tags: [research, codebase, relevant-component-names]
     status: complete
     last_updated: [Current date in YYYY-MM-DD format]
     ---

     # Research: [User's Question/Topic]

     **Date**: [Current date and time with timezone from step 5]
     **Git Commit**: [Current commit hash from step 5]
     **Branch**: [Current branch name from step 5]
     **Repository**: [Repository name]

     ## Research Question
     [Original user query]

     ## Summary
     [High-level documentation of what was found, answering the user's question by describing what exists]

     ## Detailed Findings

     ### [Component/Area 1]
     - Description of what exists ([file.ext:line](link))
     - How it connects to other components
     - Current implementation details (without evaluation)

     ### [Component/Area 2]
     ...

     ## Code References
     - `path/to/file.py:123` - Description of what's there
     - `another/file.ts:45-67` - Description of the code block

     ## Architecture Documentation
     [Current patterns, conventions, and design implementations found in the codebase]

     ## Historical Context (from thoughts/)
     [Relevant insights from thoughts/ directory with references]
     - `[project root]/.planning/research/something.md` - Historical decision about X

     ## Related Research
     [Links to other research documents in the current project's `.planning/research/` and entries referenced from the current project's `.agents/contexts/research-index.md`]

     ## Open Questions
     [Any areas that need further investigation]
     ```

     For substantial research intended to drive implementation planning, include readiness frontmatter and critique evidence required by `node $HOME/.agents/scripts/workflow-artifact-tools.mjs grade-research`.
     Do not hand off to planning unless parser-backed output proves `research_ready_for_planning: true`.

#### Step 6.5: Adversarial Critique (substantial research only)

For substantial research intended to drive implementation planning:

1. **Run rpi-critique in-place** on the research document:
   - Use the `/rpi-critique` skill with the research document path
   - The skill runs all critique dimensions silently, revises the artifact directly, and prints a human-readable improvement summary
   - No separate critique file is written

2. **After rpi-critique completes**, check the printed summary:
   - If **BLOCKING issues found**: read the summary, verify the in-place fixes were applied, and re-run `/rpi-critique` if the research still fails grading (max 2 revision cycles)
   - If **WARNINGS ONLY**: review the summary; proceed to `grade-research`
   - If **ADVISORY**: proceed to `grade-research`
   - If **HUMAN JUDGMENT REQUIRED** (blocking after 2 cycles): surface the blocking issues to the user and do NOT hand off to planning

3. **After critique**, verify frontmatter updated correctly:
   - `critique_completed: true`
   - `critique_cycles: N` (incremented)
   - `research_ready_for_planning: true|false` (re-evaluated)

**Skip condition**: Skip if this research is non-substantial (exploratory, not intended to drive a plan).
Note frontmatter: `critique_completed: false`, `critique_cycles: 0`.

7. **Add GitHub permalinks (if applicable):**
   - Check if inside a git repo with a remote: `git remote get-url origin 2>/dev/null`
   - If a remote exists and commit is pushed, generate GitHub permalinks:
     - Get repo info: `gh repo view --json owner,name`
     - Create permalinks: `https://github.com/{owner}/{repo}/blob/{commit}/{file}#L{line}`
   - Replace local file references with permalinks in the document where appropriate

8. **Present findings:**
   - Present a concise summary of findings to the user
   - Include key file references for easy navigation
   - State where the research document was saved using the absolute filesystem path
   - If an intake artifact was captured for this workflow, persist it into the current project's working set alongside the selected research artifact
   - For substantial workflows, run `node $HOME/.agents/scripts/workflow-artifact-tools.mjs grade-research --file [absolute research path]` and refuse the planning handoff if it does not pass
   - If the research artifact is intended to drive implementation planning, end the response with this exact standalone block using the saved artifact path:
     ```text
     Next step

     /create-plan /absolute/path/to/research.md
     ```
   - Add or update the matching entry in the current project's `research-index.md` through the helper-backed path: `node $HOME/.agents/scripts/artifact-tools.mjs sync-research --artifact [absolute research path] --topic "[topic]" --date [YYYY-MM-DD] --summary "[summary]" --source-file [absolute path]`
   - Ask if they have follow-up questions or need clarification

9. **Handle follow-up questions:**
   - If the user has follow-up questions, append to the same research document
   - Update the frontmatter field `last_updated` to reflect the update
   - Add `last_updated_note: "Added follow-up research for [brief description]"` to frontmatter
   - Add a new section: `## Follow-up Research [timestamp]`
   - Spawn new sub-agents as needed for additional investigation
   - Continue updating the document

## Important notes:
- Always use parallel Task agents to maximize efficiency and minimize context usage
- Always run fresh codebase research - never rely solely on existing research documents
- The thoughts/ directory provides historical context to supplement live findings
- Focus on finding concrete file paths and line numbers for developer reference
- Research documents should be self-contained with all necessary context
- Each sub-agent prompt should be specific and focused on read-only documentation operations
- Document cross-component connections and how systems interact
- Include temporal context (when the research was conducted)
- Link to GitHub when possible for permanent references
- Keep the main agent focused on synthesis, not deep file reading
- Have sub-agents document examples and usage patterns as they exist
- Explore all of thoughts/ directory, not just research subdirectory
- **CRITICAL**: You and all sub-agents are documentarians, not evaluators
- **REMEMBER**: Document what IS, not what SHOULD BE
- **NO RECOMMENDATIONS**: Only describe the current state of the codebase
- **File reading**: Always read mentioned files FULLY (no limit/offset) before spawning sub-tasks
- **Critical ordering**: Follow the numbered steps exactly
  - ALWAYS read mentioned files first before spawning sub-tasks (step 1)
  - ALWAYS wait for all sub-agents to complete before synthesizing (step 4)
  - ALWAYS gather metadata before writing the document (step 5 before step 6)
  - NEVER write the research document with placeholder values
- **Frontmatter consistency**:
  - Always include frontmatter at the beginning of research documents
  - Keep frontmatter fields consistent across all research documents
  - Update frontmatter when adding follow-up research
  - Use snake_case for multi-word field names (e.g., `last_updated`, `git_commit`)
  - Tags should be relevant to the research topic and components studied
