---
name: code-review
description: "Comprehensive code review workflow. Triggers: 'review code', 'code review', 'code-review'."
---

# Code Review Skill

**name:** code-review
**description:** "Comprehensive code review workflow. Triggers: 'review code', 'code review', 'code-review'."

## Structured Code Review Process

### Review Dimensions

1. **Correctness** — Logic errors, edge cases, contract violations, off-by-one bugs
2. **Performance** — Hot paths, unnecessary allocations, N+1 queries, missing indices
3. **Security** — Injection risks, auth/authz gaps, input validation, secrets exposure
4. **Maintainability** — Coupling, abstraction leaks, dead code, complexity hotspots
5. **Style** — Naming, formatting, idioms, consistency with project conventions
6. **Test Coverage** — Missing coverage, test quality, boundary condition verification

### Review Protocol

1. **Scope the diff**
   - Identify changed files and the nature of changes
   - Determine if review should include adjacent/dependent code
   - Flag any files beyond diff scope that may have latent impact

2. **Run linter/type checker** on changed files before deep review
   - Incorporate any existing diagnostics into findings

3. **Execute dimension review**
   - Run parallel specialist reviewers for targeted dimensions when warranted:
     - `style-reviewer` — formatting, naming, idioms
     - `security-reviewer` — auth, injection, validation
     - `performance-reviewer` — hotspots, memory, latency
     - `api-reviewer` — contract, versioning, backward compatibility

4. **Produce findings**
   - Each finding: location, problem description, severity, recommended fix
   - Severity levels: `critical`, `major`, `minor`, `suggestion`
   - Group by dimension for structured output

5. **Summarize**
   - Overall assessment: `approve`, `request-changes`, `blocking-issues`
   - Actionable next steps for the author

### Compressed Feedback

Use `caveman-review` skill for ultra-compressed, one-line-per-finding output when:
- Review scope is large
- User requests brief output
- Post-commit review with limited feedback budget

Format: `file:line — problem → fix`

### Integration

- Runs after implementation is complete and lsp_diagnostics are clean
- Does not replace pre-commit hooks or CI linting
- Can be invoked mid-implementation for early feedback on risky changes
