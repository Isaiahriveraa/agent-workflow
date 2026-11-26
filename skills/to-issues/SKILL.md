---
name: to-issues
description: "Use when an approved overview should become GitHub issues. Drafts the split and publishes it after approval."
argument-hint: "[design draft or parent issue] [optional slice]"
shell-timeout: 20
---

# To Issues

Read `~/.agents/references/workflow.md` from the skill hub and follow it as the authoritative workflow contract, independent of the target repository's working directory.

Use the [writing skill's GitHub issue guidance](../writing/SKILL.md#github-issues) to make each draft understandable on its own. See the [calibration example](EXAMPLE.md). An issue says what and why; the plan says how after the issue is taken.

## When to use

- An overview's scope was approved and its slices need issues.
- A published issue needs to be corrected or split.

Unsettled product behavior returns to `/design`. Never start from an implementation plan.

## Workflow

1. **Read the overview.** Use the approved design draft or the parent issue. Reconcile with any existing issues on the Project so reruns update instead of duplicating.
2. **Draft the split.** Write one issue per slice using the workflow's issue format, split rules, and classification rules. Apply the writing skill before showing the drafts. Link the parent for the broader design, but keep the context needed to understand each issue in its body.
3. **Run the CRUD check.** Grid the issues against the overview's domain things and mark create, read, update, delete. Show the grid and list each empty column as a question: a missing issue or a deliberate Won't.
4. **Present the split.** Show a short table (issue, type, suggested priority, suggested effort, blocked by), separated by the release line. Link each local draft in the private review so the user can read the issue before approving it. Include the CRUD questions and any issue that needs a product decision. Ask for approval of the split.
5. **Publish on approval.** Approval of the split is approval to create these issues. Every issue must end up as a sub-issue of a parent (no orphans; see the contract's **No orphan issues** rule). First make sure the parent issue exists, using the completed design and evidence as its body, excluding the private brain spill and local metadata. Do not repeat the design as separate brief and overview sections. Then create each issue in order so "blocked by" numbers resolve:

   ```sh
   gh issue create --title "<title>" --body-file <draft> --parent <parent> --blocked-by <n,...> --project "<project>"
   ```

   Set the native issue Type through GitHub's issue API and show it in Project views. Set Project Status to the not-started option for Ready or Backlog (see the contract's Status mapping), and fill missing values in the existing Priority and Effort fields with suggested estimates using `gh project item-edit`; reuse Size if that is the existing effort field. Preserve the user's existing classifications, field values, and corrections. Leave Start and Target dates blank unless the user supplies them; never clear existing dates or infer new ones. If the token lacks the `project` scope, stop and ask the user to run `gh auth refresh -s project`. Report every created issue with its number; if creation stops partway, report what was created, what failed, and what was not attempted, and reconcile before any retry.

Status is Ready only when the issue passes INVEST, is sized, has settled behavior (or a bounded Research question), and has no unresolved dependency blocking the start; otherwise Backlog. State any unresolved product question under an optional **Open:** label at the end. Keep status, priority, and effort in Project fields, Type on the native issue field, and dependencies in GitHub relationships, not competing copies in issue bodies or labels.

## Drafts

Write drafts in `context/issues/<slug>/NNN-<topic>.md` before publishing. They are private working files: the published issue body never contains a `context/` path, a link to a draft or plan, or local metadata.

## Review checklist

- Each delivery issue is one vertical outcome that one review can cover.
- From the draft alone, a reader can explain what changes, why it matters, and how to verify it. Resolve or flag anything the reader has to guess.
- Every issue has an appropriate native Type. Bugs explain expected versus actual behavior; Features name a new capability; Tasks name the maintenance result. `fix` and `chore` are commit prefixes, not extra issue types.
- Suggested priority and effort use the existing Project fields; dates are supplied by the user, not invented.
- Change, Why, mandatory Flowchart, Done when, and Out of scope are present, without retelling the parent design.
- Done when is the single acceptance checklist: observable Given / When / Then checks, including consequential failures, permissions, and accessibility where relevant. Do not add duplicate edge-case or acceptance-criteria sections.
- Research issues name the question, decision to unblock, agreed timebox, required evidence, and explicit completion criteria instead of promising a product change.
- No frameworks, schemas, data fields, file layout, or task lists.
- Dependencies are real behavior dependencies, not a guessed coding order.
- Facts are verified or labeled as user-reported; open questions are visible.

## Done when

- The user approved the split, and every issue exists as a sub-issue of the parent on the Project with its fields and "blocked by" links set.
- The CRUD gaps were each answered by an issue or a deliberate Won't.
- No published text references a private working file.
