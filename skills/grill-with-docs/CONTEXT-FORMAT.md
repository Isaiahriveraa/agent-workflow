The skill writes to the current worktree glossary:
`context/glossary/glossary.md`

## Terminal-first writing

Glossary entries should scan cleanly in a plain terminal:

- Keep definitions to one or two short sentences.
- Use one term per entry with a blank line between entries.
- Keep aliases in `_Avoid_` rather than adding a wide comparison table.
- Use ASCII arrows (`->`) for relationships when needed; do not use Mermaid,
  HTML, or Unicode box-drawing characters.

Use the helper:
```bash
python3 ~/.agents/scripts/new-artifact.py --type glossary --topic "<term>"
```

If no glossary exists, create `context/glossary/glossary.md` lazily.

## Single vs multi-context repos

**Order**:
{A one or two sentence description of the term}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account
```

For relationships, prefer a compact list:

```text
Order
  -> contains one or more Line items
  -> belongs to one Customer
```

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others as aliases to avoid.
- **Flag conflicts explicitly.** If a term is used ambiguously, call it out in "Flagged ambiguities" with a clear resolution.
- **Keep definitions tight.** One or two sentences max. Define what it IS, not what it does.
- **Show relationships.** Use bold term names and express cardinality where obvious.
- **Only include terms specific to this project's context.** General programming concepts (timeouts, error types, utility patterns) don't belong even if the project uses them extensively. Before adding a term, ask: is this a concept unique to this context, or a general programming concept? Only the former belongs.
- **Group terms under subheadings** when natural clusters emerge. If all terms belong to a single cohesive area, a flat list is fine.
- **Write an example dialogue.** A conversation between a dev and a domain expert that demonstrates how the terms interact naturally and clarifies boundaries between related concepts.

## Location resolution

The skill writes to the local context glossary at `context/glossary/glossary.md`.

The local context glossary is the canonical source.

## Single vs multi-context repos

**Single context (most repos):** One file at the resolved path.

**Multiple contexts:** A `CONTEXT-MAP.md` at the repo root lists the contexts, where they live, and how they relate to each other:

```md
# Context Map

## Contexts

- [Ordering](./src/ordering/CONTEXT.md) — receives and tracks customer orders
- [Billing](./src/billing/CONTEXT.md) — generates invoices and processes payments
- [Fulfillment](./src/fulfillment/CONTEXT.md) — manages warehouse picking and shipping

## Relationships

- **Ordering → Fulfillment**: Ordering emits `OrderPlaced` events; Fulfillment consumes them to start picking
- **Fulfillment → Billing**: Fulfillment emits `ShipmentDispatched` events; Billing consumes them to generate invoices
- **Ordering ↔ Billing**: Shared types for `CustomerId` and `Money`
```

The skill infers which structure applies:

- If `CONTEXT-MAP.md` exists, read it to find contexts
- If `context/glossary/glossary.md` exists, single context
- If a root `CONTEXT.md` exists, single legacy context
- If none exist, create lazily
