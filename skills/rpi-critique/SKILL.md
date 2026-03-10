---
name: rpi-critique
description: Brutally critique a research or plan artifact with evidence gathering. Spawns an adversarial critic that challenges assumptions via codebase counter-searches and bounded web research. Use when you want to stress-test a research doc or plan before implementation.
---

# rpi-critique

Adversarially critique a research or implementation plan artifact before it advances in the RPI pipeline.

## Invocation

```
/rpi-critique /absolute/path/to/artifact.md
```

If no path is provided, ask: "Which research or plan artifact should I critique? Provide the absolute path."

## What the Critic Does

Reads the artifact and determines its `artifact_type` (research or plan) from its frontmatter. Then runs the appropriate critique dimensions:

### Research Artifact Dimensions (7)
1. **Assumption Scan** — Grep codebase and search web to verify or contradict every hedged claim ("assumes", "likely", "may", "should work", "probably")
2. **Evidence Level Audit** — Count file:line citations vs. prose assertions; verify the declared `evidence_level` is supported
3. **Counterevidence Search** — Targeted web searches for known issues, pitfalls, and alternatives to the research's main approach
4. **Codebase Accuracy Spot-Check** — Verify 3–5 specific file:line claims from the research using Grep/Read
5. **Gap Scan** — Check for missing coverage: security, performance, backwards compatibility, migration path, failure modes
6. **Implementation Implications Review** — Verify the `## Implementation Implications` section is specific enough to act on
7. **Pre-flight Failures** — State the top 3 ways implementation fails if planning proceeds on this research today

### Plan Artifact Dimensions (7)
1. **Codebase Reality Check** — Verify every file path and claimed code pattern exists using Glob/Grep/Read
2. **Dependency Availability** — Check package.json / go.mod / pyproject.toml for every new dependency mentioned
3. **Edge Case Mining** — For each phase: what happens on failure, malformed input, concurrency, unauthorized access, service unavailability?
4. **Approach Validity** — Targeted web searches for migration pitfalls, anti-patterns, breaking changes in the chosen approach
5. **Pre-mortem** — Top 5 specific ways this plan fails during implementation
6. **Scope Realism** — Are phases appropriately sized? (>10 files: WARNING, >20 files: BLOCKING)
7. **Required Sections Audit** — Verify all `grade-plan` required sections are present

## Severity Levels

| Level | Meaning | Blocks artifact? |
|-------|---------|-----------------|
| BLOCKING | Wrong file path, missing required section, CONTRADICTED assumption | Yes — must be fixed |
| WARNING | Vague claim, thin coverage, edge case not addressed | No — but should be addressed |
| ADVISORY | Observation, suggestion, improvement opportunity | No — optional |

## Output

The critic writes a critique document to:
```
.planning/critique/YYYY-MM-DD-HHMMSS-[artifact-slug]-critique.md
```

The critique document contains:
- Summary (N blocking, M warnings, P advisory)
- Blocking Issues (with evidence and fix instructions)
- Evidence Against Key Assumptions
- Missing Coverage checklist
- Edge Cases Not Addressed (plan mode)
- Pre-mortem (top 3–5 specific failure modes)
- Required Additions

Then returns a structured verdict:
- `## CRITIQUE: BLOCKING ISSUES FOUND` — fix required before proceeding
- `## CRITIQUE: WARNINGS ONLY` — review warnings, then proceed
- `## CRITIQUE: ADVISORY` — clean, proceed
- `## CRITIQUE: HUMAN JUDGMENT REQUIRED` — blocking issues persisted after 2 revision cycles

## Updating the Artifact After Critique

After the critic runs, update the artifact's frontmatter:
1. Set `critique_completed: true`
2. Set or increment `critique_cycles: N`
3. Add the critique document path — **SINGLE LINE ONLY** (the frontmatter parser does not support multi-line YAML):
   ```
   critique_artifacts: ["/absolute/path/to/critique.md"]
   ```

## Degraded Mode

If web search is unavailable, the critic skips web-based dimensions and notes this in the summary. All codebase dimensions still run.

## In Claude Code

In Claude Code, the `rpi-critic` agent is spawned directly:
```
Task(
  prompt="Critique the artifact at [path]. artifact_type: [research|plan]",
  subagent_type="rpi-critic",
  description="Critique artifact"
)
```

In other adapters (OpenCode, Codex, OpenClaw), the skill runs the critique inline without spawning a sub-agent — all 7 dimensions execute in the same context.
