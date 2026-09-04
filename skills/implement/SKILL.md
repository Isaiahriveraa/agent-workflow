---
name: implement
description: "Implement a piece of work based on a spec, plan, or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Propose your commits using the /commit skill.
Once implementation, verification, and code-review are complete, report back to the user using the **Implementation Mode** protocol in `references/communication.md` (What changed, Before -> After behavior walk, load-bearing decisions, failure boundaries, verification, teach-back, and code details on request).
