---
name: implement
description: "Build one taken ticket from its approved plan, or a direct request at the speed AGENTS.md picks. Use when the user says 'implement this', 'build the next ticket', or approves a plan; moves the ticket's card on the GitHub Project as work progresses."
---

Read `~/.agents/references/workflow.md` from the skill hub and follow it as the authoritative workflow contract, independent of the target repository's working directory.

## Start

- **Direct request:** follow AGENTS.md **Pick the speed before coding**. Full speed plans first with `/skill:plan`; Quick and Small do not. Never invent tickets for it.
- **Ticket:** take an explicit ticket, or the highest-priority Ready ticket whose blocked-by issues are all closed:

  ```sh
  gh project item-list <number> --owner <owner> --format json --query "status:Ready"
  gh issue view <n> --json title,body,state,blockedBy,parent
  ```

  Never fall back to another ticket when the requested one is blocked; say what blocks it. Move the card to In progress. If no approved plan exists for it, write one with `/skill:plan` and wait for approval; approval means build.

Place the work per AGENTS.md **Choose the worktree before implementation**. An open architecture choice inside the plan's scope (see `/skill:research`) stops work until the user answers it; if the answer changes the approach, return the plan for approval.

## Build

Use `/skill:tdd` for every production-code change. Work one behavior at a time: write one focused test through the public interface, watch it fail for the missing behavior, then make the smallest change that passes. Tests assert what a caller or user can observe: returned, saved, emitted, or displayed data and real errors. For UI, operate accessible controls the way a user would and assert the visible result; never pin markup, classes, styles, snapshots, or internal state.

Build the thinnest working path across the UI, application, and data that the ticket needs. If the work reveals a product gap the ticket does not cover, stop and bring it to the user instead of expanding scope.

Run focused tests and typechecking as you go, then the repo's tests, lint, typecheck, and build at the end. Record any check not run and why.

## Finish

1. Run `/skill:code-judgment` on the diff. Code review follows AGENTS.md **Pick the speed before coding**.
2. Present the behavior walkthrough and verification in the **Implementation** report shape from `references/communication.md`, mapped to the ticket's acceptance criteria.
3. Once the user approves the walkthrough, commit with `/skill:commit` (`/skill:commit-review` only for unattended work). Open a PR through `/skill:pr` only when the user asks; it references the issue (`Closes #<n>`) and describes the change on its own, never a private `context/` file.
4. Move the card to In review. It becomes Done only once merged and verified against the acceptance criteria. Never merge, close the issue, or start the next ticket without the user.

On resume, keep the approved plan's baseline and review your own expected diff; do not reset intentional changes. A material change in scope or decisions returns the plan for approval.
