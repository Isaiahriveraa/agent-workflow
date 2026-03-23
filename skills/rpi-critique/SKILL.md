---
name: rpi-critique
description: Critique a research or plan artifact, then directly revise it to fix all issues found. Does not write a separate critique file — findings drive in-place improvements, and a human-readable summary of what changed and why is printed to the console.
---

# rpi-critique

Adversarially critique a research or plan artifact, then immediately apply improvements to the artifact itself. No critique file is written — the artifact comes out better.

## Invocation

```
/rpi-critique /absolute/path/to/artifact.md
```

If no path is provided, ask: "Which research or plan artifact should I critique? Provide the absolute path."

## Workflow

### Step 1 — Run All Critique Dimensions (internal, no file write)

Read the artifact, determine `artifact_type` from frontmatter, then run the appropriate dimensions silently.

#### Research Artifact Dimensions (7)
1. **Assumption Scan** — Grep codebase and search web to verify or contradict every hedged claim ("assumes", "likely", "may", "should work", "probably")
2. **Evidence Level Audit** — Count file:line citations vs. prose assertions; verify the declared `evidence_level` is supported
3. **Counterevidence Search** — Targeted web searches for known issues, pitfalls, and alternatives to the main approach
4. **Codebase Accuracy Spot-Check** — Verify 3–5 specific file:line claims using Grep/Read
5. **Gap Scan** — Check for missing coverage: security, performance, backwards compatibility, migration path, failure modes
6. **Implementation Implications Review** — Verify `## Implementation Implications` is specific enough to act on
7. **Pre-flight Failures** — Identify the top 3 ways implementation would fail if planning proceeded today

#### Plan Artifact Dimensions (7)
1. **Codebase Reality Check** — Verify every file path and claimed code pattern exists using Glob/Grep/Read
2. **Dependency Availability** — Check package.json / go.mod / pyproject.toml for every new dependency mentioned
3. **Edge Case Mining** — For each phase: failure, malformed input, concurrency, unauthorized access, service unavailability
4. **Approach Validity** — Targeted web searches for migration pitfalls, anti-patterns, breaking changes
5. **Pre-mortem** — Top 5 specific ways this plan fails during implementation
6. **Scope Realism** — Are phases appropriately sized? (>10 files: WARNING, >20 files: BLOCKING)
7. **Required Sections Audit** — Verify all `grade-plan` required sections are present

### Step 2 — Revise the Artifact In-Place

Using the critique findings, directly edit the artifact to fix every BLOCKING issue and address every WARNING. Do not ask for permission — just fix it.

What "fix" means per issue type:
- **Wrong file path / missing section** → correct the path or add the section with real content
- **Contradicted assumption** → rewrite to reflect what the evidence actually shows, or remove it
- **Thin evidence** → add concrete file:line citations; remove unsupported prose
- **Missing coverage** → add the missing section (security, failure modes, migration path, etc.)
- **Vague implementation implication** → rewrite to be specific and actionable
- **Missing edge case** → add it to the relevant phase or failure modes section
- **Scope too large** → split the phase or note the risk explicitly
- **Missing required section** → add it with substantive content drawn from what was researched

ADVISORY items: apply if they clearly strengthen the artifact; skip if they would bloat it.

After revisions, update the artifact frontmatter:
- Set `critique_completed: true`
- Set or increment `critique_cycles: N`
- Re-evaluate and update `research_ready_for_planning` or `plan_ready_for_implementation` based on the improved state
- Update `last_validated` to today's date

### Step 3 — Print a Human-Readable Improvement Summary

After the artifact is revised, print a summary directly to the conversation:

```
## rpi-critique — Improvements Applied

**Artifact:** <filename>
**Critique cycles:** <N>
**Issues found:** <X blocking, Y warnings, Z advisory>
**Issues resolved:** <X blocking fixed, Y warnings addressed>

### What Changed

**[BLOCKING → Fixed]** <short title>
> <1–2 sentences: what the problem was, what was changed, why it matters>

**[WARNING → Addressed]** <short title>
> <1–2 sentences describing the change>

**[ADVISORY → Applied]** <short title>  (only if applied)
> <1–2 sentences>

### Remaining Open Items

**[WARNING — not addressed]** <short title>
> <why it was skipped>

### Readiness After Critique
<research_ready_for_planning: true|false>  or  <plan_ready_for_implementation: true|false>
```

## Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| BLOCKING | Wrong path, missing required section, contradicted assumption | Fix in-place, always |
| WARNING | Vague claim, thin coverage, edge case not addressed | Fix in-place unless it would bloat the artifact |
| ADVISORY | Observation, suggestion, improvement opportunity | Apply only if it clearly strengthens the artifact |

## Degraded Mode

If web search is unavailable, skip web-based dimensions and note this in the summary. All codebase dimensions still run.

## Adapter Notes

In Claude Code, the `rpi-critic` agent may be spawned as a sub-agent. In all other adapters (opencode, codex, openclaw), the critique runs inline — all 7 dimensions execute in the same context, then the artifact is revised directly.
