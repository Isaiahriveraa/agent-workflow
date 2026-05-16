---
description: Explain the current project state in plain English with tradeoffs and a system-level ASCII diagram
---

# Project Story

Use this command when you need a simple, interview-ready explanation of the project:

- where it is right now
- whether it is finished or still in progress
- what still needs to happen
- how to explain the build to a non-expert
- what tradeoffs were considered and why the system was built this way
- a system-level ASCII diagram of how it works

This is a read-only summary command. It should explain the project as it exists today, not propose a new plan.

## Process

1. Resolve the current project context with:
   - `node ~/.agents/scripts/project-context.mjs current`
2. Read the current project's runtime state if it exists:
   - `.omx/state/contexts/state.md`
   - `.omx/state/contexts/session-index.md`
   - `.omx/state/contexts/research-index.md`
3. If an active session exists, read its artifact.
4. Read the minimum repo surface needed to ground the explanation:
   - `README.md` if present
   - root entry files such as `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, or equivalent
   - top-level directories and main entry points
5. Determine the actual project status from evidence:
   - if work is still underway, say what is in progress and what remains
   - if the project is effectively complete and matches the vision, say that clearly
   - if the evidence is mixed, explain the mismatch plainly
6. Summarize the system in simple language and include the tradeoffs that shaped the build.

## Output

Return the explanation in this shape:

```text
PROJECT STORY
- Status: [done | in progress | blocked | unclear]
- One-line summary: [plain-English summary of what the project does]
- Current state: [what is finished, what is active, what is left]
- Why it was built this way: [the main tradeoffs and design choices]
- What to say in an interview: [simple explanation someone can repeat]

SYSTEM MAP
[compact ASCII diagram of the system]

TRADEOFFS
- [tradeoff 1] -> [why it was chosen]
- [tradeoff 2] -> [what it bought us]

NEXT STEPS
- [if in progress, the next concrete piece of work]
- [if done, the next sensible follow-up or no further work needed]
```

## Diagram Rules

- Use a compact ASCII diagram.
- Show the main flow from input to processing to storage/retrieval to output.
- Include only the major moving parts the project evidence proves.
- Do not invent architecture that the repo does not support.
- If the project has multiple major paths, show the primary one and note the others briefly.

Example:

```text
[User / Client]
      |
      v
[UI or CLI]
      |
      v
[Core App / Services] -----> [Storage]
      |                          |
      v                          v
[External APIs / Integrations]  [State / Cache]
      |
      v
[Result / Output]
```

## Guardrails

- Keep the explanation simple enough to repeat out loud.
- Prefer plain language over technical jargon.
- Make the current status explicit instead of implying it.
- If something is unknown, say so rather than guessing.
- Do not turn this into a plan or a critique unless the user asks for that separately.
