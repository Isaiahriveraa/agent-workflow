---
description: Document an architectural decision at decision-time for peer-defensible rationale
---

# Capture Decision

Use this command whenever you make an architectural or implementation choice that affects the system. Document it immediately — before writing the next line of code.

## Why

Decisions captured at decision time are complete. Decisions reconstructed after the fact are missing the branching context. This is how you defend your work.

Every decision entry should answer one question for a peer: "why did you do it this way and not the other way?"

## Trigger

Call this when:
- choosing between two or more approaches
- selecting a library, framework, or tool
- making a tradeoff (speed vs correctness, simplicity vs flexibility)
- designing an API, schema, or interface boundary
- changing existing system behavior
- deviating from the initial plan mid-implementation

## Process

1. Get the current ISO week: `date +%Y-W%V`
2. Read the current week's `decisions.md` at `thoughts/YYYY-Www/decisions.md`
3. Append a new entry using the template below

## Entry Template

```
## Decision: [short title]

**Context:** What triggered this decision? What problem does it solve?

**Chosen:** What approach was selected and why.

**Rejected:** What alternatives were considered and why they were not chosen. Be specific — this is what peers challenge.

**Tradeoff:** What capabilities or outcomes were deprioritised.

**System Fit:** How this connects to the existing system. Which components, data flows, or workflows does it affect.

**Files Changed:**
- path/to/file.ext: change description
```

## Example

```
## Decision: Use SQLite over PostgreSQL for local-first sync

**Context:** Activity tracking needs offline-first writes. User must log activities without internet.

**Chosen:** SQLite via better-sqlite3 for embedded local DB with sync-back capability.

**Rejected:**
- PostgreSQL: requires network, adds latency, breaks offline
- IndexedDB: browser-only, doesn't work in Electron main process

**Tradeoff:** Losing native Postgres features (full-text search, JSON operators). Accepting manual sync logic.

**System Fit:** Replaces in-memory store in ActivityService. Sync layer talks to Postgres when online.
```

## Guardrails

- One entry per distinct decision. Don't bundle unrelated choices.
- Be specific about what was rejected and why. Vague rejections get challenged.
- Capture BEFORE implementing, not after.
- Do not record trivial choices (variable names, formatting, style preferences). Only decisions that materially affect the system.
