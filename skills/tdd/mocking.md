# When to Mock

Prefer real deterministic collaborators. Use focused doubles at the tested unit's external boundaries when real behavior is unsafe, expensive, or difficult to control:

- External APIs (payment, email, etc.)
- Databases (sometimes — prefer test DB)
- Time/randomness
- File system (sometimes)

Avoid mocking internal mechanics:

- Private helpers or implementation state
- Internal collaborators merely to assert their current call sequence
- Real deterministic code that is practical to exercise directly

Ownership alone does not decide whether a double is appropriate: your own adapter may be the boundary to an external service. Assert calls when the interaction itself is required, such as a public component callback or preventing duplicate external charges, not just because a mock records them. A double cannot prove the real integration it replaces; cover that connection separately when it matters. See [tests.md](tests.md) for examples and quality checks.

## Designing for Mockability

At system boundaries, design interfaces that are easy to mock:

### 1. Use dependency injection

Pass external dependencies in rather than creating them internally:

```typescript
// Easy to mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// Hard to mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

### 2. Prefer SDK-style interfaces over generic fetchers

Create specific functions for each external operation instead of one generic function with conditional logic:

```typescript
// GOOD: Each function is independently mockable
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// BAD: Mocking requires conditional logic inside the mock
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

The SDK approach means:
- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which endpoints a test exercises
- Type safety per endpoint
