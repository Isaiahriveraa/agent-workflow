---
name: frontend-implement
description: "Frontend implementation mode where the main agent is the SOLE implementer of UI code and sub-agents only research, gather context, and propose plans — sub-agents never write code. Use when the user wants a frontend feature or fix built with the main agent doing all editing and sub-agents handling investigation and planning. User-invoked only; never auto-trigger."
disable-model-invocation: true
---

# Frontend Implement

The main agent owns the frontend. It is the only agent that writes, edits, or deletes implementation code in the codebase. Sub-agents are research assistants: they read, search, analyze, and return findings and plan proposals. The one exception: a sub-agent may draft the behavioral tests for the user's described behavior — but the main agent verifies every test and fixes anything wrong.

This is an implementation mode, not a delegation shortcut. If a step can be done by reading files and thinking, the main agent does it. Sub-agents are dispatched only when they add real signal: mapping an unfamiliar codebase, deep-diving a component, or pulling external library docs.

## Roles

| Agent | Role | May write code? |
|---|---|---|
| **Main agent** | Plans and implements all frontend code. Owns every edit and every test. | ✅ implementation + tests |
| **Sub-agents** | Research, gather context, deep-dive, propose plans. May draft behavioral tests. | Behavioral tests only |

Sub-agent types to use (all read-only by design):
- `codebase-locator` — find files/directories/components relevant to the task.
- `explore` — contextual grep: find patterns, conventions, implementations.
- `codebase-analyzer` — deep dive into one component/module end-to-end.
- `librarian` — external references: library docs, OSS examples, best practices.

## Flow

1. **Understand the prompt** — Read the request. Ask the user to clarify anything ambiguous before dispatching anyone.
2. **Delegate context-gathering** — Dispatch read-only sub-agents in parallel to map what exists: relevant files, existing patterns, design tokens, component conventions, and any external library APIs in play. Give each a research-only instruction (template below).
3. **Main agent plans** — Synthesize the findings into a concrete implementation plan yourself. Sub-agent plan proposals are input, not authority — you reconcile them, decide the approach, and state it before editing.
4. **Write the failing behavioral test first (red)** — Before any implementation code, write a test that asserts only the behavior you described, through the public interface: user-visible output, accessible roles/names/labels, returned values, error results. Never assert internals (class names, DOM nesting, private helpers, internal state). Run it and watch it fail. A sub-agent may draft this test; the main agent verifies it asserts exactly the intended behavior and corrects it if it doesn't.
5. **Main agent implements (green)** — Write the minimal frontend code to make the test pass. Match existing patterns and conventions found in Step 2.
6. **Re-dispatch only for gaps** — If you hit something unknown mid-implementation (unfamiliar API, hidden coupling, missing context), dispatch a targeted read-only sub-agent to investigate that one thing, then continue. Never let a sub-agent implement in your place.
7. **Verify without a browser** — Run the repo's linter, typecheck, test suite, and build. The passing tests are the proof that the behavior you described works. **Do NOT run Playwright, browser automation, or visual QA unless the user explicitly instructed it.** If the user wants visual verification, they will invoke `/visual-qa` or `/playwright` themselves.

End of flow: implementation verified, report back to the user. Do not auto-run `/code-review` or `/commit` — the user decides whether to review or commit next. Note that per AGENTS.md Operating Rule 1, frontend tests are temporary verification scaffolding to drive and prove behavior during development; clean them up before committing changes unless the user explicitly requested to retain them.

## Research-only delegation template

Every sub-agent prompt must carry these exact boundaries:

```
RESEARCH ONLY — do not write, edit, or delete any files.
[CONTEXT]: The frontend task I'm working on: <goal>. Files I already know about: <paths>.
[GOAL]: Find <what> so I can implement <feature> myself.
[DOWNSTREAM]: I'll use your findings to decide <the decision>. Return concrete file paths, code patterns, and conventions.
[REQUEST]: <specific searches/reads>. Return findings as a report, not edits. Skip <what's out of scope>.
```

## Rules

- **No delegation of implementation.** Any implementation code that lands in the codebase was written by the main agent. If a sub-agent proposes code, it is a suggestion to read — never paste it in unexamined.
- **Behavior-first TDD.** Every change starts with a failing test that asserts the behavior the user described, through the public interface only — observable output, accessible roles/names/labels, returned values, error results. Never assert internals (class names, DOM nesting, private helpers, internal state). The test comes first (red), then minimal implementation (green).
- **Sub-agents may write tests; the main agent owns them.** A sub-agent may draft the behavioral tests, but the main agent reviews each one — does it assert the user's described behavior, and only that? — and fixes anything wrong before the implementation is complete.
- **Sub-agents return reports.** Findings, paths, patterns, plan proposals, drafted tests. Never an unverified `git add`, never an implementation edit.
- **Plan before editing.** State the approach (which files, which pattern) before the first edit.
- **Match conventions.** Reuse the design system, tokens, and component patterns found in research. Follow the frontend best-practice skills the user has (`frontend-design`, `ui-ux-pro-max`, `impeccable`, `shadcn`, `next-best-practices`, `performance`) as applicable.
- **No Playwright by default.** Verification is lint → typecheck → tests → build. Browser automation only on explicit user instruction.
- **Surgical.** Only touch what the task requires. Leave unrelated files alone.

## Success criteria

- [ ] Main agent understood the prompt (asked only genuinely blocking questions).
- [ ] Read-only sub-agents gathered the needed context; any that wrote files wrote only behavioral tests.
- [ ] A failing behavioral test asserting only the user's described behavior was written first (red), then minimal implementation made it pass (green).
- [ ] Sub-agent-drafted tests (if any) were verified and corrected by the main agent.
- [ ] Main agent stated a plan and implemented the frontend itself.
- [ ] Lint, typecheck, tests, and build pass (or pre-existing failures explicitly noted).
- [ ] No Playwright/browser verification ran without explicit user instruction.
- [ ] No auto-review or auto-commit; control handed back to the user.
