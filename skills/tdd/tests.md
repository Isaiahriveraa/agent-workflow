# Good and Bad Tests

## Good Tests

**Integration-style**: Test through real interfaces, not mocks of internal parts.

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
- One logical assertion per test

## Bad Tests

**Implementation-detail tests**: Coupled to internal structure.

```typescript
// BAD: Tests implementation details
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});
```

Red flags:

- Mocking internal collaborators
- Testing private methods
- Asserting on call counts/order
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Verifying through external means instead of interface

```typescript
// BAD: Bypasses interface to verify
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// GOOD: Verifies through interface
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

**Tautological tests**: Expected value restates the implementation, so the test passes by construction.

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

When setup repeats across tests, extract a factory so each test only shows what makes it unique.

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
