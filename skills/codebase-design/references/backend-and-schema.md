# Backend and schema design checks

Use the questions that match the change. Start with business facts and ownership, not tables, services, or pattern names. A local database transaction is often enough; distributed coordination is not a default architecture.

## Behavior and ownership

- What business fact is authoritative, and which module owns changing it? Inspect every actual writer: requests, imports, jobs, administrative tools, and integrations.
- What must remain true after success, failure, and a concurrent request? Put the rule with its owner and enforce it at the narrowest reliable boundary.
- Which rules need database constraints, which need transactional checks, and which need both? Application prechecks alone cannot enforce uniqueness or prevent competing writes.
- Do names match the business meaning in this part of the system? If one term means different things to different owners, clarify it rather than forcing a shared model. Use `domain-modeling` for unresolved terminology; do not mandate aggregates or bounded contexts for routine CRUD.
- Which reads and writes must succeed together? Name the transaction scope. Choose isolation, locking, atomic updates, or conflict handling based on the actual invariant and database guarantees. Test competing operations when concurrency can violate it.
- For a remote effect, what does timeout mean? Do not assume failure means nothing happened. When duplicate delivery or retry is reachable, specify identity, deduplication/idempotency, and how an uncertain outcome is reconciled. A local transaction cannot make a remote charge atomic.

## Separate independent writes before coordinating them

When concurrent requests, jobs, or agents can modify the same file, branch, key, or state object, first ask whether they need one shared authoritative object. Independent facts can have separately owned write targets and be combined when read or reported. Different fields in the same rewritten JSON file are still a shared write target.

When sharing represents a real business invariant, preserve it and enforce coordination structurally with the appropriate database constraint, transaction, atomic conditional update, lock, or single writer. Do not split a canonical fact into independent copies to avoid enforcing consistency. Instructions to workers are not concurrency control. Test the competing operations at the boundary that actually enforces the guarantee.

Adapted from pstack's [Separate Before Serializing Shared State](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md).

## Persisted-data changes

Before editing a schema, inspect real constraints, representative historical rows, query patterns, and the deployment process. A new field is a compatibility decision as well as a type change.

1. **Define meaning and policy.** What do null, missing, duplicate, deleted, or historically invalid values mean? Who decides ambiguous ownership or conflict resolution? Surface missing product policy; do not invent tenants, discard rows, or select winners to make a constraint pass.
2. **Protect the invariant.** Account for every writer, tenant scope, uniqueness, references, and relevant concurrency. Plan constraints and writer changes together. Specify what prevents new invalid rows during a backfill, not just after it finishes.
3. **Check deployment compatibility.** Can old and new applications read and write throughout rollout? If versions overlap, sequence compatible schema expansion, writers/readers, backfill, enforcement, and eventual removal. Explain how old writers remain safe or when they must be retired. A coordinated offline migration may be simpler when downtime is explicitly allowed.
4. **Plan historical-data work.** Name the source of truth for backfilled values, validation, batching where volume warrants it, progress tracking, and safe resumption after partial completion. Check locks, query/index impact, and operational limits when the dataset or availability requirement makes them relevant; do not assume all migrations need an online platform.
5. **Plan recovery.** Distinguish application rollback, retry/resume, forward repair, and restoring lost data. A down migration may reverse structure without restoring meaning or deleted values. Destructive cleanup needs explicit approval and must wait until compatibility and verification permit it.
6. **Prove the transition.** Test the migration on representative old data, including the reachable null/duplicate/invalid cases. Verify mixed-version reads and writes when supported, constraint violations and racing writers, interruption/resumption for a resumable backfill, and the chosen recovery path. Use the real database engine where its behavior matters.

## Example: tenant-scoped customer emails

Do not simply add `tenant_id NOT NULL` and a unique email constraint to populated data. First settle how historical ownership, duplicate emails, and nulls should be treated. Compare extending the current customer owner with separating genuinely different ownership rules; do not create a new service merely because a table changes.

With overlapping app versions, keep additions compatible, make all writers supply or safely derive authoritative tenant identity, and prevent new conflicts while backfilling resolved rows. Validate before enabling the final scoped constraint. Delay removing compatibility code or old columns until old processes are gone. The exact mechanism depends on the database and deployment facts; obtain those facts rather than inventing a universal SQL recipe.

## Keep it small

Do not add CQRS, event sourcing, an outbox, a saga, generic repositories, or service boundaries unless a named requirement or reachable failure needs them. But do not omit a required invariant or recovery path to keep the diagram simple. Record only the decisions and risks that matter for this slice in its existing plan.
