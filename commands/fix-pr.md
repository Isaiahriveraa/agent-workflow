---
description: Investigate a merge conflict and recommend a resolution before any edits
---

# Fix PR

Use this command when the user wants help with a merge conflict or conflicted pull request and wants evidence-based analysis before any resolution is applied.

This command is analysis-first.
Do not edit conflict files until the analysis has been shared and the user approves the approach.

## Required Discovery

Before recommending any resolution:

1. Inspect repository state.
   - Identify the current branch.
   - Identify the target branch if one is available.
   - Check merge or rebase status.
   - List conflicted files and conflict regions.
   - Use git metadata and repository state, not just conflict markers.
2. Inspect the surrounding codebase.
   - Read the files containing conflicts.
   - Read nearby implementation code, tests, and related modules.
   - Trace call sites, imports, types, and recent branch intent when it helps explain the change.
   - Look for docs, source-of-truth files, or patterns that clarify the intended behavior.
3. Determine what each side is trying to do.
   - Explain what the current branch is trying to change.
   - Explain what the other branch is trying to change.
   - Describe why the conflict happened in plain language.
4. Classify the relationship between the changes.
   - Say whether the changes are compatible, overlapping, redundant, or contradictory.
   - Call out real tradeoffs and risks.
5. Propose resolution options only after inspection.
   - Prefer preserving both changes when they are compatible.
   - Prefer simplifying duplicated logic when both sides solve the same problem.
   - Prefer re-implementing the intent more cleanly if both versions are messy.
   - Choose one side only when there is strong evidence it is the correct source of truth.
6. Recommend a path forward.
   - Base the recommendation on repository evidence, not guesswork.
   - If certainty is low, say so explicitly and explain what additional inspection or validation is needed.
7. Do not edit conflict files immediately.
   - First produce the analysis and recommendation.
   - Only proceed to resolution edits after the analysis is shared and the user approves the approach.

## Output

Return a discussion-ready conflict analysis with these sections:

- Plain-English summary
- What each side is trying to do
- Why the conflict happened
- Main risks and tradeoffs
- Evidence-based resolution options
- Recommended path forward
- Uncertainty / validation needed before applying the fix

## Constraints

- Preserve user intent.
- Do not invent facts about the repository.
- Do not treat conflict markers alone as sufficient evidence.
- Do not propose a final resolution without researching the surrounding code.
- Be explicit about uncertainty when the repository does not clearly support one answer.
- Optimize for correctness, maintainability, and professional engineering judgment.
- Keep the analysis simple enough for collaborative review before any merge-conflict resolution is applied.

## Validation

Before finishing, verify that:

- The analysis reflects the actual conflict state, not generic merge advice.
- Recommendations reference repository evidence such as usage patterns, tests, types, or architectural consistency.
- Low-confidence cases are called out honestly.
- The output is suitable for review before any edits are made.

## Notes

- If the repository does not have an active conflict, say so and ask for the relevant branch, PR, or file paths.
- If a later resolution phase is requested, treat this analysis as the gating step before edits.
