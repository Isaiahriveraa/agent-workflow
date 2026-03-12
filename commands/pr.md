---
description: Generate a professional GitHub pull request description sized to the actual diff
---

# PR Guidelines

Use the git CLI to prepare a pull request description based on the actual branch diff, not the conversation.

## Operating Rules

- Do not open a PR or push commits without my approval.
- Inspect the branch against the intended base branch first.
- Size the PR before writing it.
- Describe only what is actually in the committed branch diff against the base branch.
- Do not mention local-only files, ignored files, dropped work, or plans/research artifacts unless reviewers can see them in the committed diff and they materially affect the change.
- Do not invent provenance from the conversation. If it is not visible in `git log`, `git diff --stat`, `git diff --name-only`, or the inspected diff, leave it out.
- Keep reviewer-facing text repo-clean: no machine-specific absolute filesystem paths, no local home-directory references, and no host-specific environment details unless the diff explicitly introduces a portable path contract.
- If `.planning/research/`, `thoughts/`, or other artifact directories are not part of the committed diff, do not mention them in the PR body.
- Keep the structure consistent across PRs.
- Scale the amount of explanation to the size and risk of the change.
- Small PRs should be brief and direct.
- Large PRs should be compressed into a few high-signal sections, not a wall of explanation.
- The PR should describe what changed, why it matters, how it was validated, and what reviewers should pay attention to.

## Required Discovery

Before drafting the PR:

1. Check branch state:
   - `git branch --show-current`
   - `git status --short`

2. Inspect the change against base:
   - `git log --oneline <base>..HEAD`
   - `git diff --stat <base>...HEAD`
   - `git diff --name-only <base>...HEAD`
   - If the draft PR text mentions any artifact, command, or file not present in that inspected diff, remove it before returning the PR body.

3. Decide PR size:
   - `small`: 1-2 commits, narrow scope, low reviewer risk
   - `medium`: several related commits, moderate surface area
   - `large`: cross-cutting, architectural, or many files/subsystems

If the branch mixes unrelated stories, stop and say so before writing the PR.

## PR Structure

Always use this structure and only include sections that add signal:

### Title
- One line
- Clear and specific
- Match the branch story, not just the last commit

### Summary
- 1 short paragraph for `small`
- 2-4 bullets for `medium` or `large`
- Focus on user-facing or system-level outcome

### Why
- Include only when the reason is not obvious from the summary
- 1-3 lines max

### Changes
- `small`: 2-4 bullets max
- `medium`: 3-6 bullets max
- `large`: group by area, not by file inventory
- Mention major behavior changes, new contracts, migrations, generators, tests, or risks

### Validation
- List the actual checks that ran
- Keep it short
- Include manual validation only if it mattered

### Risks
- Include only if there is real rollout, migration, compatibility, or reviewer risk
- If risk is negligible, say `Low`

### Review Notes
- Optional
- Use only when reviewers should inspect a specific tradeoff, migration path, or irreversible decision

## Size-Based Output Rules

### Small PR

Use:
- `Title`
- `Summary`
- `Validation`
- `Risks`

Do not add background sections unless they are necessary.
Do not explain obvious implementation details.

### Medium PR

Use:
- `Title`
- `Summary`
- `Changes`
- `Validation`
- `Risks`

Only add `Why` if the motivation is not obvious.

### Large PR

Use:
- `Title`
- `Summary`
- `Why`
- `Changes`
- `Validation`
- `Risks`
- `Review Notes`

Even for large PRs:
- keep bullets tight
- avoid file-by-file narration
- summarize by subsystem or reviewer concern

## Writing Standard

- Professional, direct, and plain.
- No filler.
- No marketing language.
- No “this PR aims to”.
- No “please review”.
- No exaggerated detail for small commits.
- No vague summaries like “misc fixes”.
- Prefer concrete nouns and verbs over abstractions.
- No references to uncommitted plans, local scratch notes, or ignored files.
- No absolute paths from the current machine in the PR body.
- No references to `.planning/research` or `thoughts/` unless those paths are committed and reviewer-relevant in this PR.

## Output Format

When I run `/pr`, return:

1. The proposed PR title
2. The PR size classification: `small`, `medium`, or `large`
3. The full PR description in markdown
4. A one-line note explaining why you chose that amount of detail

## Default Template

Use this exact shell for the final PR body, trimming sections that are not needed by the PR size rules above:

```md
## Summary

[brief summary]

## Why

[only if needed]

## Changes

- [change]

## Validation

- [check]

## Risks

[Low or concrete risk note]

## Review Notes

[only if needed]
```

**NEVER include:**
- AI attribution
- Generated-by footers
- Over-explaining small diffs
- File-by-file changelogs unless explicitly requested
