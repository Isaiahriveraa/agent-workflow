---
name: code-review-basics
description: Review code for SOLID, DRY, type safety, error handling, and readability. Use when you need a local review rubric or a lightweight fallback review skill.
---

# Code Review (SOLID + Quality)

Review code against these standards before committing:

---

## SOLID Principles

- **S**ingle Responsibility: Does each unit do ONE thing?
- **O**pen/Closed: Open for extension, closed for modification?
- **L**iskov Substitution: Can subtypes substitute base types?
- **I**nterface Segregation: No unused interface methods?
- **D**ependency Inversion: Depend on abstractions, not concretions?

---

## DRY Check

- Any duplicated logic?
- Should anything be extracted to utils/hooks?
- Any copy-pasted code blocks?
- Any repeated magic numbers/strings?

---

## Type Safety

- Strict TypeScript enabled?
- No `any` types?
- All inputs validated at boundaries?
- All edge cases properly typed?

---

## Error Handling

- All errors caught and handled?
- Meaningful error messages?
- No silent failures?
- Graceful degradation where appropriate?

---

## Readability

- Clear variable/function names?
- Comments explain WHY (not what)?
- No clever tricks or obscure patterns?
- Self-documenting code?

---

## Final Checklist

- [ ] All SOLID principles followed
- [ ] No code duplication
- [ ] Type-safe implementation
- [ ] Errors handled properly
- [ ] Code is readable
- [ ] Linter clean (zero warnings)
- [ ] All tests pass
- [ ] Ready to commit
