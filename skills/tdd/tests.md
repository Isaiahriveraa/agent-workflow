# Good and Bad Tests

## Choose the guarantee before the assertion

Name what a caller can rely on and the realistic defect the test must catch. Behavior includes returned values, errors, visible state, persisted data, required external effects, and effects that must not occur. It does not require a state change: a pure calculation has a contract too.

Use the caller-facing interface of the unit under test. A unit may contain several collaborating objects; a test per method or class is not the goal. Choose the smallest boundary that can prove the guarantee, not automatically the smallest function or a full end-to-end journey. Include real integration coverage when correctness depends on connections that doubles replace.

Judge each test in both directions:

1. **Would a behavior-preserving refactor keep its assertions green?** If not, it may pin the mechanism rather than the contract. Necessary setup changes do not make a test invalid.
2. **Would a plausible behavioral defect make it fail?** Name the defect: a disconnected click handler, an unauthorized write, an incorrect total, or a duplicate charge. If the test still passes, strengthen its observations or choose a better boundary.

During TDD, run the test and confirm it fails for the intended missing behavior, not a broken fixture or missing import. Retain meaningful regression coverage after the implementation passes.

## Good Tests

**Contract-focused**: Exercise supported interfaces and observe meaningful results. Prefer real deterministic collaborators; use focused doubles for unsafe, expensive, or difficult conditions. See [mocking.md](mocking.md) for boundary guidance.

```typescript
// GOOD: Tests observable behavior
test("user can checkout with valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

Characteristics:

- Tests behavior users/callers care about
- Uses public API only
- Survives internal refactors
- Describes WHAT, not HOW
- One behavior per test; enough assertions to prove it

## Frontend: interact and observe the promised result

Use realistic interactions with rendered controls and accessible semantics. Observe what the user can perceive or do, rather than component state, hook calls, DOM nesting, or CSS classes. Accessible role/name queries are useful for finding controls; they are not the same as pinning every sentence on the page.

| Guarantee | Exercise and observe | Plausible failure |
|---|---|---|
| The navbar offers sign-out | Open the profile controls, activate sign-out, verify its public callback is invoked | The button is present but its handler is disconnected |
| Signing out ends the session | At the application boundary, sign out and verify protected access is no longer available | The callback runs but authentication remains active |
| Invalid input cannot be submitted | Enter invalid data, submit, verify a relevant accessible error and no submission | An error appears but invalid data is submitted anyway |
| A successful save updates the screen | Submit valid data, let the save complete, verify the saved result is visible | A success notification appears without the saved data |

These boundaries prove different things: a component callback assertion does not prove that the server completed the operation. Name only the guarantee the test actually establishes.

### Meaningful text versus incidental copy

Text can be a required output: validation messages, accessible labels, and confirmations communicate behavior. Assert the relevant meaning; require exact wording only when the wording itself is a requirement, such as a specified disclosure. Do not add presence/absence assertions merely to pin an informational copy edit.

For example, verify that invalid input produces an error explaining the email problem, rather than requiring one particular punctuation choice. Do not weaken the check until unrelated errors pass, or match `saved` so broadly that `not saved` also passes. A required error's mere existence may not prove that it describes the right problem.

For a profile menu, preserve coverage that opening it makes sign-out usable and activating it requests sign-out. An assertion about the removed informational sentence does not strengthen that interaction guarantee. If required content is itself the contract, test that content deliberately instead.

## Backend: results, persistence, and external effects

Choose observations that prove the claimed guarantee:

- **Pure output:** a total calculation returns the independently worked expected amount; no state transition is needed.
- **Persistence:** create a record, then retrieve it through the supported read interface. A mocked repository call alone cannot prove persistence.
- **Authorization:** an unauthorized request is rejected and leaves protected data unchanged. An error response alone cannot prove that no write occurred.
- **External effects:** a retry must not charge twice. Counting charges at the payment boundary can be meaningful; counting calls between internal helpers usually is not.

Database inspection is appropriate when stored data is the contract being tested, such as a repository integration test. At an application boundary, prefer its supported read interface when that proves the guarantee without coupling to private storage layout. Do not require a new read API solely to make a test possible.

## Bad Tests

**Implementation-detail tests**: Coupled to internal structure.

```typescript
// BAD: A private helper call does not prove checkout succeeds
// or that payment is correct. The same behavior could use a different helper.
expect(checkoutInternals.calculateTotal).toHaveBeenCalledOnce();
```

Red flags:

- Mocking internal collaborators in a way that fixes their current arrangement
- Testing private methods
- Asserting on call counts/order when they are not part of the required effect
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Inspecting private state or storage layout unrelated to the contract

```typescript
// BRITTLE at the application boundary: pins its private storage layout
test("createUser makes user retrievable", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// GOOD at the application boundary: verifies the promised retrieval behavior
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

**Tautological tests**: Expected values derived from the implementation under test cannot independently establish correctness. Reimplementing the same algorithm in the assertion risks repeating the same defect. Prefer a known literal, worked example, specification, or independently justified property.

```typescript
// BAD: Expected value is recomputed the way the code computes it
test("calculateTotal sums line items", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});

// GOOD: Expected value is an independent, known literal
test("calculateTotal sums line items", () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
});
```

## Testing APIs

When three or more tests reveal stable repeated setup, extract a small factory so each test shows what matters. A testing API is a maintenance aid, not a prerequisite for testing behavior. Hide irrelevant construction details, not decisive inputs, actions, or expected outcomes. Avoid a general framework or helper options for hypothetical callers.

```typescript
// BEFORE: every test repeats the same construction
test("defaults to customer role", () => {
  const user = new User("Alice", "alice@example.com", "customer");
  expect(user.role).toBe("customer");
});

test("admin can moderate", () => {
  const user = new User("Bob", "bob@example.com", "admin");
  expect(canModerate(user)).toBe(true);
});

// AFTER: setup lives in one place
function makeUser(overrides = {}) {
  return new User(
    overrides.name ?? "Test User",
    overrides.email ?? "test@example.com",
    overrides.role ?? "customer"
  );
}

test("defaults to customer role", () => {
  expect(makeUser().role).toBe("customer");
});

test("admin can moderate", () => {
  const user = makeUser({ role: "admin" });
  expect(canModerate(user)).toBe(true);
});
```

Each test calls a one-liner. When `User`'s constructor changes, only `makeUser` needs updating.

## Sources and further reading

These principles synthesize the sources below; they are not quotations or a claim that all testing schools agree on mocks or test scope.

- [Kent Beck — Desirable Unit Tests](https://newsletter.kentbeck.com/p/desirable-unit-tests): behavioral, structure-insensitive tests and competing test qualities.
- [Gerard Meszaros — xUnit Test Patterns: Principles of Test Automation](http://xunitpatterns.com/Principles%20of%20Test%20Automation.html): test through the caller's interface and avoid overspecification; author-hosted online material accompanying the book.
- [Software Engineering at Google — Unit Testing](https://abseil.io/resources/swe-book/html/ch12.html): test behaviors rather than methods, using clear, focused scenarios.
- [Software Engineering at Google — Test Doubles](https://abseil.io/resources/swe-book/html/ch13.html): real implementations, doubles, and state-versus-interaction tradeoffs.
- [Kent C. Dodds — Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details): tests can reject harmless refactors while missing broken interactions.
- [Kent C. Dodds — Common Mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library): meaningful text and accessible queries remain useful. The exact-wording policy above is our synthesis, not a blanket rejection of text assertions.
