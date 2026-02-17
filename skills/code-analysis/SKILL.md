---
name: code-analysis
description: Analyze codebase structure, patterns, and reusables before implementation. Use when starting new work, exploring unfamiliar code, or beginning a feature.
---

# Code Analysis (Phase 1)

Before ANY implementation, complete these steps:

---

## 1. Analyze Structure
- What is the project structure?
- What conventions are used (naming, file organization, patterns)?
- What architectural patterns are established?

## 2. Identify Reusables
- What utilities already exist?
- What hooks/helpers can be reused?
- What should NOT be reinvented?

## 3. Map Dependencies
- What does this feature depend on?
- What will depend on this feature?
- Should we refactor existing code or extend it?

## 4. Clarify Requirements
- Ask focused questions to the user
- Validate assumptions before proceeding
- Confirm edge cases and error handling requirements

---

## Output

Before proceeding to implementation, summarize:

1. **Existing patterns** to follow
2. **Reusable code** identified
3. **Dependencies** mapped
4. **Questions resolved**

Only proceed to Phase 2 (Planning) after analysis is complete.
