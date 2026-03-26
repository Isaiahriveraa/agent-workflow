---
description: Review GitHub PR comments, simplify them, and give accept/reject rationale
---

# Review PR Comments

Fetch all review comments from a GitHub PR, translate each into plain English, and give a clear accept or reject recommendation with rationale.

## Arguments

- If a PR number is provided as an argument, use it directly.
- If a PR URL is provided, extract the number from it.
- If no argument is provided, detect the current branch and find the open PR for it using `gh pr view --json number -q .number`.

## Discovery

1. Fetch comments:
   ```bash
   gh api repos/{owner}/{repo}/pulls/{number}/comments
   ```
2. Also fetch the top-level review bodies (some reviewers leave summary comments there):
   ```bash
   gh api repos/{owner}/{repo}/pulls/{number}/reviews
   ```
3. Detect `{owner}/{repo}` from `gh repo view --json nameWithOwner -q .nameWithOwner`.

## Output Format

For each comment, output a numbered entry in this exact format:

```
### {N}. {file}:{line} — {verdict}

**What they said (simplified):**
{1-2 sentence plain English translation of the comment. No jargon. Like you're explaining to a friend.}

**My take — {ACCEPT or REJECT}:**
{2-3 sentences max. Why this matters or doesn't. Reference the actual code/context if relevant.}

**Proposed reply (AI-assisted):**
{A draft reply I can copy-paste into the PR thread. Explain why we agree or disagree, referencing the actual code. Keep it professional but natural — not robotic. If ACCEPT: say what we'll fix and how. If REJECT: explain our reasoning with evidence so the reviewer understands. If MAYBE: propose a middle ground or ask what they'd prefer. The goal is that I can read this, understand the thinking, and post it as-is or tweak it.}
```

Where `{verdict}` is one of:
- **ACCEPT** — the comment is right and we should fix it
- **REJECT** — the comment is wrong, irrelevant, or not worth changing
- **MAYBE** — has a point but needs discussion or is low priority

## Rules

- Group duplicate comments (same body on multiple lines) into a single entry.
- Read the actual files being commented on before giving your verdict. Do not guess.
- Be honest — if Copilot or a reviewer caught a real bug, say so.
- If the comment is about code that predates this PR (existed before the branch), note that.
- Keep it short. No walls of text.
- At the end, give a **Summary** with counts: `X accept, Y reject, Z maybe` and a one-liner on whether any are blocking.

## Anti-patterns

- Do not blindly accept all comments.
- Do not blindly reject all comments.
- Do not repeat the raw comment text — simplify it.
- Do not add filler like "Great suggestion!" or "Thanks for the feedback!"
