# Legacy code and integration checks

## Safe change in existing code

Read the actual caller path before proposing a new architecture. When behavior is uncertain, add characterization tests through the nearest stable interface that can observe it. Characterization records existing behavior; it does not declare a discovered defect correct forever. Separate an intended behavior correction from a behavior-preserving refactor.

Find the smallest preparatory refactor that makes this change straightforward: move a rule to its owner, expose an explicit input, isolate an effect, or remove an unnecessary pass-through. Compare that with changing the existing owner directly. Avoid a full rewrite or generic framework as the price of adding one behavior.

A seam can be useful with one production implementation: replace a clock, prevent a real payment during tests, or isolate a legacy dependency that cannot otherwise be exercised safely. Name that present purpose. A speculative second provider is not a justification, and a second adapter is not a prerequisite.

## Effect ownership

Keep deterministic calculations separate from persistence or network effects when doing so clarifies the rule. Do not prohibit effects: an application must actually save the order, send the message, or charge the payment. Make clear which module owns the effect and what callers can observe.

- Construct external dependencies where composition belongs; pass them to the owner when substitution or lifecycle control is needed. Do not inject every helper.
- Keep protocol translation in the adapter and business decisions with the business owner. Do not expose transport details that callers do not need.
- State success, rejection, partial progress, and uncertain outcomes when reachable. Preserve enough context for the caller or operator to decide; do not swallow errors or automatically retry a possibly completed non-idempotent effect.
- Name retry identity and reconciliation only where retries or ambiguous delivery are real. Consider an outbox or other coordination mechanism only if the required guarantee crosses the transaction boundary.

## Test at the useful contract

Use focused tests for calculations and state transitions, integration tests for database/adapter guarantees, and a small number of end-to-end tests for assembled behavior. An internal module's contract is a valid test boundary; private fields and incidental call counts are not.

Fakes can test the owner's behavior under rejection or timeout. They cannot prove the provider's protocol, transaction isolation, SQL constraints, or real query semantics. Add verification at those actual boundaries where the requested guarantee depends on them. Do not claim that fewer methods reduce the required behavior coverage.
