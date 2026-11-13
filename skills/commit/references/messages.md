# Commit Messages

Load when writing commit subjects and bodies.

Use Conventional Commits:

```text
<type>(<scope>): <imperative summary>
```

The scope is optional but preferred when it adds useful precision.

Examples:

```text
feat(review): add inline follow-up prompts
fix(session): reuse agent process per pull request
refactor(tui): isolate question rendering state
test(review): cover follow-up input expansion
docs(agent): document commit approval workflow
```

## Subject Rules

The subject MUST:

* use lowercase Conventional Commit type
* use imperative mood
* describe one logical result
* explain the meaningful outcome
* remain concise
* have no trailing period
* avoid vague verbs such as `update`, `change`, or `modify` when a more precise
  verb exists
* avoid file-name narration
* avoid AI attribution

Aim for 50 characters when practical.

Hard limit: 72 characters.

## One Subject, One Story

The subject and the Purpose MUST NOT contain `and`, `also`, `plus`, `/`, `+`,
or a comma joining two concepts.

Two exceptions are allowed, and each MUST be named in the proposal as
`Indivisible:` with its reason:

1. One indivisible operation that happens to read with a conjunction, such as
   `fix(parser): validate key and value pairs`.
2. A mechanical rename where the old and new names appear together; prefer
   `switch X to Y` over `replace X with Y`.

Bad:

```text
feat(ui): add search and refactor sidebar
```

Better:

```text
feat(search): add artifact filtering
refactor(sidebar): simplify navigation state
```

When a subject or Purpose fails this gate and no exception is claimed, that is
a Failure Condition: do not present the plan.

## Bundling Anti-Patterns

* Concept-list subject — `feat(domain): add contracts, quote freezing, and
  state reducers` names three concepts, so it is three commits.
* Slice bundle — a contract, its logic, and its wiring committed together
  because they were written together; the inventory lists three lines.
* Layer bundle — `refactor: extract helpers, update callers, adjust tests` when
  each part can land independently.
* While-I-was-there — an unrelated fix riding along with a feature.
* Test coupon — tests for unrelated behaviors in one `test:` commit.

Detection is mechanical: run the one-sentence test on both the subject and the
Purpose. Any conjunction or comma list means split before presenting the plan.

## Commit Body

Skip the body when the subject fully explains the change.

Add a body when the reasoning is not obvious, especially for:

* security fixes
* breaking changes
* migrations
* reverts
* non-obvious tradeoffs
* compatibility constraints
* behavior that appears unusual without context

The body should explain why the change exists and any important consequences.

Do not restate the diff.

Wrap body lines near 72 characters.

Example:

```text
fix(session): reuse agent process per pull request

Starting a new process for every question discarded conversational context
and created unnecessary startup overhead.

Keep one process associated with the active pull request until review ends.
```

## Breaking Changes

Use `!` in the header or a `BREAKING CHANGE:` footer:

```text
feat(api)!: replace legacy review endpoint
```

```text
BREAKING CHANGE: clients must send review context through /v2/reviews.
```

Clearly describe migration requirements.
