# Review Thinking

This is a thinking toolkit for reading a change, finding real risks, and helping its author reason about them. `SKILL.md` governs how much gets said; this file is method, not a checklist to run verbatim.

## Reading the change

- Read it as a story: find the entry point, the state it touches, its side effects, and its exits.
- Look at the diff's shape: is it one concern or several, does it replace the old path or layer on top of it, and is there a seam where a test could fail?
- Read the code at its current state, never only the diff. The surrounding lines often change what a new line means.
- Read outward before forming an opinion: callers, tests, schema, and configuration can define rules the diff does not show.
- Ask what the change assumes about its inputs and its environment: types, permissions, timing, files, services, versions, and failure behavior.
- Trace one ordinary case end to end, then trace the shortest path that could leave the system in a bad state.

## What to walk

- **Boundaries and off-by-one:** A first or last item is skipped, duplicated, or addressed wrongly. Ask what happens at zero, one, the limit, and just beyond it.
- **Empty, absent, or malformed input:** A blank value becomes a valid one, or bad data reaches code that expects good data. Ask what each input looks like when missing, empty, truncated, or wrongly shaped.
- **Error paths and swallowed causes:** The user sees success, a vague error, or a retry after the useful cause was discarded. Ask where every failure goes and whether its cause remains visible and actionable.
- **Ordering, retries, and concurrency:** Work arrives out of order, runs twice, or races with another update. Ask what happens when steps overlap, repeat, or finish in a different order.
- **State with two owners:** Two records, caches, screens, or services disagree about the same fact. Ask which owner changes first and how the other one catches up or recovers.
- **Resource lifecycle:** An open handle, subscription, timer, or cached value outlives its use. Ask what opens it, what closes or invalidates it, and what happens on early exit.
- **Contract drift:** A caller, test, schema, or stored shape expects a different name, type, status, or promise. Ask what existing users rely on and whether this change keeps that promise.
- **Defaults and configuration:** A missing or stale setting selects an unsafe or surprising path. Ask what value wins when configuration is absent, partial, invalid, or overridden.
- **Compatibility and migrations:** Old data or an older client cannot cross the change, or a partial rollout leaves mixed versions. Ask how old and new forms work during upgrade, rollback, and restart.
- **Observability:** A production failure leaves no useful signal, or the signal says the wrong thing. Ask whether logs, metrics, traces, and user-visible errors would reveal this exact break.
- **Test quality:** A test checks the implementation's shape instead of behavior, or would pass through a plausible bug. Ask what behavior it proves and which nearby failure would make it fail.
- **Trust boundaries, authorization, and secrets:** Untrusted input gets trusted, a user reaches another user's data, or sensitive values leak. Ask who can supply each value, whose authority is checked, and where secrets can appear.
- **Hot-path cost:** A common path does needless work, waits, allocates, or grows with data. Ask how cost changes with the usual and worst useful input, and whether the work can repeat.
- **Maintainability:** A name hides intent, nesting hides the main path, or copied code has quietly different meaning. Ask whether the next change can find the rule and change one place without breaking another.

## Smell to defect

- An error branch logs and continues: the cause is swept away and callers see success. Ask where the caller learns that this work failed.
- A catch-all default or `?? []`/`|| 0` fallback: absent and empty are conflated, so the wrong branch is taken quietly. Ask whether missing and empty mean the same thing here.
- A guard or early return sits before the write or await: success is reported before the work lands. Ask what state the caller observes if the work has not finished.
- A lock, transaction, or read-modify-write reads before taking the lock: concurrent changes can be lost. Ask which value wins when two readers update from the same old value.
- A retried call has no idempotency key: a retry can repeat a side effect. Ask what prevents the second attempt from creating or charging twice.
- One fact is stored in two places with no invalidation path: state goes stale and has two owners. Ask which copy changes first and how the other one catches up.
- A constant or copied branch is duplicated with subtly different meaning: the owners can drift. Ask where the rule is defined and which copy should change.
- A boolean or mode parameter is added to an existing function: one seam now has two behaviors. Ask whether both modes preserve the function's original contract.
- A collection only grows, with no paging, cap, or cleanup: memory or work becomes unbounded. Ask what limits it after a long-running process or large input.
- Time, timezone, or floating-point values are compared for equality: boundary or precision differences can choose the wrong path. Ask what tolerance or normalized clock makes this comparison safe.
- A cast, `any`, or parsed payload crosses a boundary without validation: a contract check was skipped. Ask where malformed or newer-shaped data is rejected.
- A test mocks or re-asserts the thing under test: it proves the mock rather than behavior. Ask what real input and observable result would fail if the code were wrong.
- A silent fallback turns a failure into an empty result: failure handling becomes unreachable to the user. Ask how the user can distinguish no results from a broken lookup.
- Authorization uses string comparison or a client-supplied identity: the trust boundary is crossed. Ask which server-owned authority proves who may access this resource.
- A secret or token is written into a log or error: sensitive data crosses an observability boundary. Ask who can read this output and whether the value can be removed or redacted.

## How to judge impact

- Judge a finding by reachability x blast radius x reversibility x how quietly it fails.
- Separate "wrong" from "merely different": a changed design is a defect only when it breaks a stated or relied-on behavior.
- A finding with no reachable scenario is a judgment call, not a defect. Name the missing condition instead of presenting a fear as proof.
- Prefer a concrete path: who supplies the input, which state is reached, what the code does, and what someone observes.
- Order findings so the user fixes the dangerous one first: put reachable, broad, quiet, or hard-to-reverse failures ahead of local and easy-to-recover ones.
- Let evidence set confidence. A clear caller or test can raise confidence; an untested assumption should stay marked as uncertainty.

## Reviewer traps

- Reading only the diff hides callers, old state, and behavior at the edges.
- Anchoring on the author's plan, PR body, or commit message makes the explanation outrank the code.
- Passing tests are evidence that those cases passed, not evidence of correctness everywhere.
- Confusing style with substance spends review attention without showing a user-visible failure.
- Nit-flooding makes the real issue hard to see; group minor concerns or leave them out.
- Saying "looks fine" without naming what was checked gives no useful confidence.
- Checklist theater replaces thought with boxes and misses interactions between risks.
- Reviewing the code you wish had been written judges a different change.
- Stopping at the first finding leaves the rest of the reachable behavior unexamined.

## Asking in review

- Ask about invariants and reachable scenarios rather than preferences: "What must always remain true here?"
- Ask "what happens if ..." with a concrete input, state, or timing rather than a vague challenge.
- Ask for the failing scenario before asserting a conclusion: "Can we walk through the case where this value is absent?"
- Say which reading you are assuming: "I read this as one retry per request; is that the intended limit?"
- Mark uncertainty as uncertainty: "I may be missing a caller, but this looks like it can return success before the write finishes."
- Make the smallest useful request: explain the invariant, add a behavior test, or change the failure handling.

## Guessing and telling

- Hint at the location and aspect, never at the defect or its severity, and never bluff; let the user work from the code in front of them, not memory.
- When they guess, confirm exactly what they got right before stating the gap; a partly-right guess keeps its credit.
- Name the pattern in ordinary domain words, then name the tell they should have noticed and why it is the tell.
- Give one self-check question they can carry to similar code.
- Say whether the same shape appears elsewhere in the repository, or that it was not checked.
- Do not grade or praise at length; after two misses, tell them the answer rather than drawing out the guessing.

## Stopping

- Name what you checked and found sound, such as the main path, boundary cases, callers, and relevant tests.
- State the coverage you did not reach: for example, deployment behavior, old stored data, or production signals.
- Keep unverified suspicions out of the findings list; record them as questions or say what check would settle them.
- Stop when the change's reachable paths have been traced, material risks have evidence, and the remaining unknowns are explicit.
- Hand breadth to `/skill:code-review` when the change is larger than a conversation; do not imitate a wider adversarial review informally.
