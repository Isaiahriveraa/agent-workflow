---
name: tdd
description: Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.
---

# Test-Driven Development

TDD is the red → green loop. This skill is the reference that makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle — consult them before and during the loop, not after.

When exploring the codebase, read the project's domain docs (CONTEXT.md, ADRs if they exist) so test names and interface vocabulary match the project's domain language.

## What a good test is

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification — "user can checkout with valid cart" tells you exactly what capability exists — and survives refactors because it doesn't care about internal structure.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Seams — where tests go

A **seam** is the public boundary you test at: the interface where you observe behavior without reaching inside. Tests live at seams, never against internals.

**Test only at pre-agreed seams.** Before writing any test, write down the seams under test and confirm them with the user. No test is written at an unconfirmed seam. You can't test everything — agreeing the seams up front is how testing effort lands on the critical paths and complex logic instead of every edge case.

Ask: "What's the public interface, and which seams should we test?"

## Anti-patterns

- **Implementation-coupled** — mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: the test breaks when you refactor but behavior hasn't changed.
- **Tautological** — the assertion recomputes the expected value the way the code does (`expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, a constant asserted equal to itself), so it passes by construction and can never disagree with the code. Expected values must come from an independent source of truth — a known-good literal, a worked example, the spec.
- **Horizontal slicing** — writing all tests first, then all implementation. Bulk tests verify _imagined_ behavior: you test the _shape_ of things rather than user-facing behavior, the tests go insensitive to real changes, and you commit to test structure before understanding the implementation. Work in **vertical slices** instead — one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.

## Testing APIs

When three or more tests repeat the same setup — constructing the same object, wiring the same dependencies, seeding the same data — extract it into a **testing API**: a factory function or builder that captures the shared setup behind a simple call.

Testing APIs make tests cheaper to write and maintain:

- Constructor signatures change in one place, not thirty.
- Each test shows only what's unique about it — the setup noise is hidden.
- New tests are trivial to add because the factory offers a path of least resistance.

### Anatomy

Good testing APIs use **sensible defaults** with **explicit overrides**:

```typescript
// Testing API — a factory with defaults
function makeUser(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: "Default User",
    email: "user@example.com",
    role: "customer",
    ...overrides,
  };
}

// Tests only mention what matters
test("admin can delete any post", () => {
  const admin = makeUser({ role: "admin" });
  expect(canDelete(admin, anyPost)).toBe(true);
});

test("customer can delete own post", () => {
  const owner = makeUser();
  const post = makePost({ authorId: owner.id });
  expect(canDelete(owner, post)).toBe(true);
});
```

Default values should be valid but obviously fake — `"Test User"`, `0`, `crypto.randomUUID()`. A test that uses the default shouldn't accidentally conflate the value with something meaningful.

### When to extract

- **3+ tests** repeat the same constructor or setup block → extract.
- **Setup chain** (create user → create cart → add items → create payment method) → extract each step as a factory for composition.
- **`beforeEach` is doing real work** → extract into a named factory. `beforeEach` is for resetting state, not constructing domain objects.

### What NOT to do

- **Don't share test helpers between test files when they encode file-specific assumptions.** Keep them local or in a `test-utils.ts` at the module level. Moving a factory into a shared file means naming it precisely (`makeAdminUser`, not `makeUser`) and committing to its API across consumers.
- **Don't expose test helpers from your library's public API.** They belong in the test suite, not to external consumers.
- **Don't hide the critical value.** If a test is about a specific email address, pass it as an override, not buried in a default.

## Rules of the loop

- **Red before green.** Write the failing test first, then only enough code to pass it. Don't anticipate future tests or add speculative features.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle.
- **Refactoring is not part of the loop.** It belongs to the review stage (see the `code-review` skill), not the red → green implementation cycle.

## Workflow

### 1. Planning

Before writing any code:

- [ ] Confirm with user what interface changes are needed
- [ ] Confirm with user which seams to test (agree the seams)
- [ ] List the behaviors to test (not implementation steps)
- [ ] Get user approval on the plan

### 2. Tracer Bullet (first cycle)

Write ONE test that confirms ONE thing about the system:

```
RED:   Write test for first behavior → test fails
GREEN: Write minimal code to pass → test passes
```

This is your tracer bullet — proves the path works end-to-end.

### 3. Incremental Loop

For each remaining behavior:

```
RED:   Write next test → fails
GREEN: Minimal code to pass → passes
```

One test at a time. Only enough code to pass current test. Don't anticipate future tests.

### 4. Refactor (after all tests pass)

After all tests are green, look for refactoring opportunities:

- [ ] Extract duplication
- [ ] Deepen modules (move complexity behind simple interfaces)
- [ ] Apply SOLID principles where natural
- [ ] Run tests after each refactor step

**Never refactor while RED.** Get to GREEN first.

## Checklist Per Cycle

- [ ] Test describes behavior, not implementation
- [ ] Test uses public interface only
- [ ] Test would survive internal refactor
- [ ] Expected values are independent literals, not recomputed from the code
- [ ] Code is minimal for this test
- [ ] No speculative features added
- [ ] Setup duplication extracted into a testing API when 3+ tests share it
