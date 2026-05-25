---
description: Systematic debugging workflow — identify, reproduce, fix, and verify bugs
---

# Fix

Follow a systematic debugging process. Do not guess. Use tools to gather evidence at every step.

## Required Discovery

1. **Understand the bug.** Read any error messages, stack traces, or user reports. Identify the symptom precisely.
2. **Locate relevant code.** Use grep, ast-grep, lsp_find_references, and explore agents to trace from the symptom to the likely source.
3. **Read the surrounding context.** Read the affected files, their imports, callers, callees, and tests. Understand how the code is supposed to work before changing it.
4. **Reproduce the bug.** Run the failing test, build, or manual reproduction command. Confirm you can trigger the failure reliably.
5. **Form a hypothesis.** Based on the code and reproduction evidence, state what you think is wrong and why.
6. **Test the hypothesis.** Make the smallest possible change. Run the reproduction again immediately.
7. **Verify the fix.** Run the reproduction scenario, any related tests, and lsp_diagnostics on changed files. Confirm the bug is gone and nothing else broke.

## Rules

- Never make a change without first reproducing the bug.
- Make one change at a time. If a change doesn't fix it, revert it before trying the next approach.
- Do not refactor unrelated code while fixing a bug. Stay focused on the root cause.
- Use lsp_diagnostics on changed files before claiming completion.

## Output

After fixing, report:
- **Root cause**: what was wrong and why it produced the observed symptom
- **Fix**: what changed and why this resolves the root cause (plain language)
- **Verification**: what was run and what passed — reproduction, tests, diagnostics
