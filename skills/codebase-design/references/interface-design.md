# Interface design

Design the contract around what today's callers need to do. A smaller signature helps only if it makes the operation easier to use correctly.

1. **Start at the call site.** Sketch the same caller action with two designs that place work or decisions differently. Show the common call, its result, and what happens on a reachable failure. Compare what the caller must set up, remember, or handle.
2. **Write the promise before the body.** Draft the signature and the caller-facing comment. State the inputs, results, guarantees, effects, and failures that matter. Include units, ordering, durability, or resource lifetimes when callers rely on them. Do not describe storage or transport details they do not need. Follow [Code Clarity](../../../references/code-clarity.md) and the repository's comment format.
3. **Make today's common path simple.** Keep defaults and sequencing with the owner when it can decide safely. Shape operations around what the module owns. Do not add options for hypothetical callers or require several calls to do one ordinary job.

For example, a text buffer can expose `delete(start, end)` instead of separate commands for backspace, Delete, and removing a selection. The caller still needs to know the offset units and whether `end` is included. Those are promises, not internal details.

If the comment needs many caveats, try moving a responsibility rather than dropping the caveats. A signature can stay the same while its contract changes: `save(record)` returning before the write is durable differs from returning after it commits. Test the guarantee through the caller's interface.
