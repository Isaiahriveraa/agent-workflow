ADRs are written to the current worktree's context directory:

`{git-root}/context/adr/{YYYY-MM-DD_HH-MM-SS}_{slug}.md`

## Terminal-first writing

Keep ADRs readable at roughly 80 columns in a plain terminal:

- Use short paragraphs and simple headings.
- Use bullets for options and consequences instead of wide tables.
- If a relationship needs a diagram, use a fenced `text` block with ASCII
  characters. Never use a Mermaid code block.
- Keep the decision and its reason visible near the top; optional sections
  should not bury them.

Create them with the helper script:
```bash
python3 ~/.agents/scripts/new-artifact.py --type adr --topic "<decision title>"
```

The script resolves the current git worktree root and writes to `{git-root}/context/adr/`.

## Template

```md
# {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}
```

Example with an ASCII flow:

```text
[Question] -> [Decision] -> [Consequence]
```

That's it. An ADR can be a single paragraph. The value is in recording *that* a decision was made and *why* — not in filling out sections.

## Optional sections

Only include these when they add genuine value. Most ADRs won't need them.

- **Status** frontmatter (`proposed | accepted | deprecated | superseded by adr/<filename>.md`) — useful when decisions are revisited
- **Considered Options** — only when the rejected alternatives are worth remembering
- **Consequences** — only when non-obvious downstream effects need to be called out

## Updating existing ADRs

Before creating a new ADR, scan `context/adr/` for existing ADRs covering the same ground:

1. **Same decision changed?** Update the existing ADR in-place (context, decision, consequences).
2. **New decision supersedes old?** Set old ADR's status to `Superseded by adr/<filename>.md`, reference it in the new ADR.
3. **Don't delete or duplicate.** Superseded ADRs preserve history.

## When to offer an ADR

All three of these must be true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will look at the code and wonder "why on earth did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If a decision is easy to reverse, skip it — you'll just reverse it. If it's not surprising, nobody will wonder why. If there was no real alternative, there's nothing to record beyond "we did the obvious thing."

### What qualifies

- **Architectural shape.** "We're using a monorepo." "The write model is event-sourced, the read model is projected into Postgres."
- **Integration patterns between contexts.** "Ordering and Billing communicate via domain events, not synchronous HTTP."
- **Technology choices that carry lock-in.** Database, message bus, auth provider, deployment target. Not every library — just the ones that would take a quarter to swap out.
- **Boundary and scope decisions.** "Customer data is owned by the Customer context; other contexts reference it by ID only." The explicit no-s are as valuable as the yes-s.
- **Deliberate deviations from the obvious path.** "We're using manual SQL instead of an ORM because X." Anything where a reasonable reader would assume the opposite. These stop the next engineer from "fixing" something that was deliberate.
- **Constraints not visible in the code.** "We can't use AWS because of compliance requirements." "Response times must be under 200ms because of the partner API contract."
- **Rejected alternatives when the rejection is non-obvious.** If you considered GraphQL and picked REST for subtle reasons, record it — otherwise someone will suggest GraphQL again in six months.
