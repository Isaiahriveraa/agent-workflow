---
name: code-judgment
description: "Behavior-preserving cleanup of a diff: delete dead and redundant code, apply YAGNI, fix names and comments, tighten module shape, cohesion, and dependencies. Runs after implementation and before code-review so the reviewer verifies a frozen diff."
---

# Code Judgment

The Cleaner stage: make the diff small and readable without changing what it does. This skill edits code; the tests prove nothing moved. It runs **before** `code-review`, which verifies a frozen diff — cleanup must never race the review.

Invoked by `implement`, `issue-delivery`, `spawn`, and `wf` as the step between implementation and review.

## When To Use This Skill

| Use | Don't use |
|---|---|
| After implementation, before `code-review` | To hunt behavior bugs — that's `code-review`'s job |
| When the diff grew past the requirement | Mid-implementation — finish the behavior first |
| When asked to simplify or clean a branch | On generated or vendored code |
| Before a human reads the diff | To re-style what the formatter/linter already owns |

## Scope

Default: the current branch diff against the repo's default branch. Accepts `code-review`'s scope tokens (`working`, `staged`, `modified`, `commit`, a hash, `A..B`) to narrow it. Everything inside the scope is fair game; everything outside is not.

## Hard Constraints

- **Behavior never changes.** Same inputs, same outputs, same side effects, same errors. A caller cannot tell the cleanup happened.
- **Tests are the net.** Never delete or weaken a test to make cleanup pass. Tests that only pin how the UI is built are scaffolding per AGENTS.md **TDD** — flag them under "Left alone"; deleting them is a separate decision.
- **Bugs are reported, not fixed.** A behavior defect goes under "Left alone" for `code-review` and the author; judgment never quietly changes behavior.
- **Green before, green after.** Run the repo's checks (the floor in AGENTS.md **Enforce in tools, not prose**) before the first edit and after every batch. Red means revert the batch — never leave the tree broken.
- **No feature work.** No new dependencies, no config changes, no refactors outside the checklist.
- **No style noise.** The formatter and linter own style.

## The Judgment Checklist

| # | Finding | Signal | Action |
|---|---|---|---|
| 1 | Dead code | Unused export, parameter, flag, or config key; unreachable branch; orphaned helper | Delete it |
| 2 | Speculative generality | One caller behind an abstraction; unused options; an interface with one implementation | Inline or delete; extraction waits for the Rule of Three (AGENTS.md **One source of truth**) |
| 3 | Shallow wrapper | The deletion test: removing it loses no behavior, only indirection | Delete it; call the real thing |
| 4 | Duplicated logic | The same behavior in two places | Point both at one shared helper only when the contract is stable; callers needing flags keep their duplication (duplication beats the wrong abstraction) |
| 5 | Comments | Restates the code, stale, or carries jargon/slop — an AI-slop word (see `scripts/slop-lint.py`), a term only this session uses, an unexplained abbreviation | Delete the restating ones; keep or sharpen only comments explaining non-obvious *why* — and rewrite them in plain words (AGENTS.md **Code explains itself**) |
| 6 | Names | Vague, cryptic, misleading, invented acronym, or jargon the ordinary word already covers | Rename to the project's domain term or the plain word; no shorthand a newcomer cannot read |
| 7 | Module shape | Fat function or file; feature logic in a general module; wrong layer | Split, move, or deepen the interface (AGENTS.md **Architecture is enforced**; use `codebase-design` vocabulary) |
| 8 | Cohesion and coupling | Things that change together live apart; unrelated things bundled; imports crossing layers the wrong way | Move them together; dependencies point one way |
| 9 | Bespoke helper | One shared helper already does this | Use the shared one (AGENTS.md **One source of truth**) |
| 10 | Defensive padding | Fallback for an unreachable state; broad catch; re-validation inside a trusted boundary | Remove it (AGENTS.md **YAGNI**) |
| 11 | Unrequested polish | Anything in the diff serving a request other than this one | Remove it from the diff; queue the idea |
| 12 | Change locality | A plausible next addition of the same kind would scatter edits across files — or force rewriting the implementation | Reshape so the next case lands behind an existing seam: small interface, behavior behind it, dependencies one-way; still no speculative options or flags (AGENTS.md **YAGNI**) |
| 13 | Diff prose | Strings, error messages, CLI help, or changed Markdown that says something a customer or teammate would never say | Rewrite plainly; `python3 ~/.agents/scripts/slop-lint.py` over the changed files flags the words (AGENTS.md **Code explains itself**) |

## Simplicity With Flexibility

Shape the code so adding the next thing extends it instead of forcing a rewrite — without building that next thing now. Concretely: new behavior sits behind a small interface, so a sibling case becomes a new implementation beside it rather than conditionals threaded through existing code; the feature's changes land in one module, not five; dependencies point one way.

This is not license for speculative layers. Options, flags, hooks, and abstractions for cases nobody asked for are the speculative-generality row (AGENTS.md **YAGNI**). The test is the *next change*: name the most plausible next requirement and ask where it lands. "A new module beside this one" means the shape is right; "scattered edits across the codebase" or "throw it away and start over" means fix the shape now, while the change is still in this diff.

## Method

1. Fix the target: read the diff plus the code, callers, tests, and config around it (AGENTS.md **Read before writing**).
2. Run the baseline checks; they must be green before the first edit.
3. Apply the checklist smallest-blast-radius first: deletions, comments, names, then structure. Splits and moves come last — they touch the most.
4. Re-run the checks after each batch. Red → revert that batch and re-examine.
5. Report.

## Output

Short — the cleaned diff is the artifact; the report says why.

```markdown
## Code judgment: <scope>

### Simplified

| Change | Where | Why |
|---|---|---|
| Deleted retry wrapper | src/api.ts:42 | Single caller; no behavior lost (deletion test) |

### Left alone

| Finding | Where | Why |
|---|---|---|
| Suspected off-by-one in pagination | src/list.ts:88 | Behavior — routed to code-review |

### Verification

- Baseline: <checks> — pass
- Final: <checks> — pass
- Diff: <N files, +A/−B> → <N files, +A/−B>
```

## Guardrails

- Judgment edits; `code-review` verifies. Never run both against the same working tree at the same time.
- One batch at a time; after every batch the tree is green again.
- Never touch generated or vendored directories (`node_modules/`, `.git/`, `vendor/`, `dist/`, `build/`).
- If cleanup uncovers a real bug or a decision only the human can make, stop and report it — do not guess.
