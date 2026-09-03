---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the *active* discipline — challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise.

## Storage

### Glossary
Glossary entries belong to the current worktree's local context directory:

```
{git-root}/context/
├── glossary/glossary.md       ← domain glossary
└── ...
```

### ADRs (Architecture Decision Records)
ADRs belong to the current worktree's context directory:

```
{git-root}/context/adr/{YYYY-MM-DD_HH-MM-SS}_{slug}.md
```

Create files lazily — only when you have something to write. Use the helper script:

```bash
# Create a glossary entry
python3 ~/.agents/scripts/new-artifact.py --type glossary --topic "<term>"

# Create an ADR under {git-root}/context/adr/
python3 ~/.agents/scripts/new-artifact.py --type adr --topic "<decision title>"
```

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with existing language in the project's glossary, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update glossary inline

When a term is resolved, update the local context glossary right there. Don't batch these up — capture them as they happen.

The glossary should be totally devoid of implementation details. Do not treat it as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:
1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR.

### Create ADRs with simple names

- **Filename**: `{YYYY-MM-DD_HH-MM-SS}_{slug}.md` — timestamped slug
- **Title**: Plain readable title
- **H1**: `# Short readable title`
- **Content**: Status, Context, Decision, Consequences

### Update existing ADRs when decisions change

Before creating a new ADR, scan `context/adr/`:

1. Does any existing ADR cover the same decision? If so, **update it in-place** instead of creating a duplicate.
2. Does the new decision **contradict or supersede** an existing ADR? If so:
   - Set the **old ADR's status** to `Superseded by adr/<filename>.md`
   - Add a note in the old ADR's Consequences section
   - Add a "Supersedes adr/<filename>.md" reference in the new ADR's Context section
3. **Don't delete ADRs** — superseded decisions are valuable historical context.

This keeps the ADR set accurate without losing history.

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR.
