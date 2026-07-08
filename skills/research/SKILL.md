---
name: research
description: Investigate a question against high-trust primary sources via a background subagent, then capture the synthesized findings as a research document on the plan server. Use when the user wants in-depth research on a codebase area, learns a new library, or needs answers to architecture questions before designing changes.
argument-hint: "[free-text research prompt]"
---

# Research

Research is a **two-phase process**: a background subagent does the reading and synthesis while you remain free, then you capture the result as a plan-server document.

**Critical rule — enforce the subagent.** You MUST spawn the subagent. Do NOT do the research yourself. The subagent reads, investigates, and returns synthesized findings; you format and write the final doc. This keeps the main context focused on planning and writing.

## Phase 1: Dispatch the Subagent

Spin up a background agent (use `task` with a thorough prompt). Its job:

1. **Investigate** the question against **primary sources** — official docs, source code, specs, first-party APIs — not secondary write-ups. Follow every claim back to the source that owns it.
2. If the question involves codebase areas, **read the relevant files** and trace the code paths.
3. **Synthesize findings** into a structured response with exact references (`file:line`, URL, section).
4. **Return the synthesized findings** as its final output — a complete research brief the main agent can write into a plan-server document.

The subagent prompt must include:
- The exact research question
- Any known relevant files, areas, or terms to investigate
- The instruction to cite every claim with its source
- The instruction to return STRUCTURED findings (not just a file write — the main agent needs the content to format)

If the question involves understanding third-party docs, the subagent should use web search / read to fetch primary docs. For codebase questions, the subagent should read files and trace paths.

**Wait for the subagent to complete** before proceeding to Phase 2.

## Phase 2: Capture on Plan Server

Once the subagent returns, use its synthesized findings to write a research document on the plan server:

### 1. Gather metadata

```bash
node "${SKILL_DIR}/../_shared/now.mjs"
echo
node "${SKILL_DIR}/../_shared/git-context.mjs"
```

- `now.mjs` prints `<iso>\t<slug>` — copy both fields verbatim
- git-context provides `repo:`, `branch:`, `commit:` labels

### 2. Read the quality standard

```bash
cat "${SKILL_DIR}/../_shared/plan-server-doc-quality.md"
```

Apply the Human-in-the-Loop Checklist before declaring the document complete.

### 3. Write the document

Construct a filename: `<slug>_<brief-kebab-topic>.md` under `research/` in the plan server project directory.

The research document structure:

```markdown
---
date: {ISO timestamp}
author: {author-name}
commit: {commit-hash-or-no-commit}
branch: {branch-name-or-no-branch}
repository: {repo-name}
topic: "{Original research question}"
tags: [research, {relevant-tags}]
status: complete
last_updated: {same ISO timestamp}
last_updated_by: {author-name}
---

# Research: {Topic}

## Research Question

{The original question, restated clearly}

## Summary

{2-4 sentence high-level answer to the research question}

## Findings

### {Finding area 1}

{Key finding with source reference}

### {Finding area 2}

{Key finding with source reference}

...

## References

- `file:line` or URL — what was found there
- `file:line` or URL — what was found there

## Architecture Insights (if applicable)

{Patterns, conventions, design decisions discovered during research}

## Open Questions

{Any remaining unknowns surfaced during research. These feed into design/plan.}

---

{Research artifact path on plan server for linking}
```

Write the file using the plan-server naming convention: `~/Documents/plan-server/projects/{project}/research/{timestamp}_{slug}.md`.
Infer the project from the git repo (basename of `git rev-parse --show-toplevel`).

### 4. Copy path to clipboard

```bash
pbcopy <absolute-path-to-research-file>
```

## Output

The research document lives on the plan server at `research/` and feeds into design, plan, blueprint, or wayfinder as a linked artifact.
