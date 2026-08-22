---
name: later
description: Record a future improvement idea as a short markdown note in the project's future/ folder, organized by topic (security, architecture, performance, testing, operations, ...). Each note follows a Problem / How we could fix it / Rationale template so it can be scanned and tackled later. Use when the user says "later: <idea>", "note this for later", or wants to capture a future improvement without implementing it.
argument-hint: "[topic:] idea"
disable-model-invocation: true
---
# Record a Future Improvement (later)

Turns a "we should do this someday" idea into a tiny, scannable note so it survives the session without polluting the codebase. This is a capture mechanism — never implement the fix.

## Input

The improvement idea the user stated, optionally prefixed with a topic:

- `security: session secret should come from an env var`
- `add rate limiting to the API`
- `performance: lazy-load the events page`

## Steps

### 1. Locate the future folder

Check in order:

1. `<project-root>/future/`
2. `<parent-of-project>/future/` — one umbrella folder shared by related repos (e.g. `~/Documents/Github/iuga/future/`)

If no `future/` folder exists in either spot, **ask the user where it should live** — never guess a location.

### 2. Determine the topic

- Topic = the subfolder the idea belongs to: `security`, `architecture`, `performance`, `testing`, `operations`, ...
- Use the topic prefix if the user provided one.
- If the idea doesn't map clearly to a topic, ask ONE question offering topic options.
- Create the topic folder if it doesn't exist.

### 3. Write the note

Filename: kebab-case slug of the idea (e.g. `session-secret-hardcoded.md`).

Template — keep it SHORT (aim under 25 lines) so the user can tell at a glance whether to tackle it:

```md
# <Title>

## Problem
<What's wrong today — where in the code, what breaks>

## How we could fix it
<Concrete approach — files, libraries, steps>

## Rationale
<Why we need it — what happens if we don't>
```

### 4. Report

Return the full path of the created note, e.g. `future/security/session-secret-hardcoded.md`.

## Rules

- One concern per file. If the idea contains multiple concerns, split them into separate files.
- Never implement the fix — this command only captures the idea.
- Reference real file paths and line numbers when known; the notes are most useful when grounded in the actual code.