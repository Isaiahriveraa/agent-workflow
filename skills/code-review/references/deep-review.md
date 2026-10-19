# Deep Review

Read only with `--deep`, after Step 4 and before Step 6 in `review-process.md`.

### Step 5: Triggered Deep Review (`--deep` only)

Deep mode does not mean "spawn every specialist." Dispatch only the specialists whose mechanical trigger appears in the diff. Each specialist remains independent and receives the patch plus only the context required for its domain.

#### Security Specialist
Trigger when changes touch:
- HTTP, RPC, IPC, webhook, or CLI trust boundaries
- authentication or authorization
- query construction
- command/process execution
- filesystem paths
- deserialization or dynamic evaluation
- secrets or cryptography
- outbound hosts, URLs, or sockets
- raw HTML or explicit-trust rendering

Spawn the `security-reviewer` subagent — a registered agent type whose instructions live in `~/.agents/agents/security-reviewer.md` — with this context. If the runtime cannot resolve it by name, spawn a generic subagent with that file's content as its prompt and the same block:

```text
Patch: .git/code-review.patch
Changed files: .git/code-review.changed-files
Minimal context: .git/code-review.context.txt
```

#### Concurrency Specialist
Trigger when changes touch:
- shared mutable state
- async handlers or callbacks
- queues, retries, or replay
- locks, transactions, or multi-step writes
- caches or singleton initialization
- background jobs or event consumers

Every race finding must include:
```text
operation 1
operation 2
possible interleaving
missing or ineffective ordering primitive
observable failure
```

Reject speculative timing claims without a concrete interleaving.

#### Persistence and Compatibility Specialist
Trigger when changes touch:
- schemas or migrations
- repositories, DAOs, models, or serialized storage
- public API types or protocol messages
- durable queues or caches
- rollback or recovery behavior

Check forward and reverse paths, old and new representations, and compatibility with already persisted data.

#### Dependency Specialist
Trigger only when a manifest or lockfile changed.
Check exact added, removed, or selected versions for:
- unexpected transitive changes
- incompatible constraints
- duplicate or conflicting versions
- removed features used by changed code
- repository policy or license conflicts
- known advisories affecting the selected version

Advisory findings require authoritative source links and the exact affected range.
