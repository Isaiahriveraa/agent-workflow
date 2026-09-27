---
name: implement
description: "Implement a piece of work based on a spec, plan, or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-judgment to clean the diff, then /code-review to review the frozen result.

Propose your commits using the /commit skill.
Once implementation, verification, and review are complete, report back to the user using the **Implementation Mode** protocol in `references/communication.md` (What changed, Before -> After behavior walk, key decisions, failure boundaries, verification, and code details on request).
