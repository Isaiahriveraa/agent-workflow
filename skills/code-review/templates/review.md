<!-- Emitted by code-review SKILL.md Step 7/10. Placeholders in {braces} are filled at emission; section-omission rules live inline in SKILL.md. -->
---
type: code-review
date: {date}
author: {author}
repository: {repository}
branch: {branch}
commit: {commit}
scope: "{resolved_scope}"
status: {status}
baseline: {baseline_status}
verified_findings: {verified}
weakened_findings: {weakened}
rejected_candidates: {rejected}
review_mode: {review_mode}
tags: [code-review]
---

# Code Review — {resolved_scope}

**Status:** `{verdict}` · **Baseline:** {baseline_passed} passed, {baseline_failed} failed · **Candidates:** {candidates_total} total → {verified} verified, {weakened} weakened, {rejected} rejected · **Mode:** {review_mode}

---

## Critical

### {ID} — {title}

**Evidence:** `{file}:{line}` — `{code}`

**Trigger:** {trigger}

**Trace:**
1. {step1}
2. {step2}
3. {step3}
4. {step4}
5. {step5}

**Impact:** {impact}

**Regression test:** {regression_test}

---

## Important

### {ID} — {title}

**Evidence:** `{file}:{line}` — `{code}`

**Trigger:** {trigger}

**Trace:**
1. {step1}
2. {step2}
3. {step3}
4. {step4}
5. {step5}

**Impact:** {impact}

**Regression test:** {regression_test}

---

## Suggestions

### {ID} — {title}

**Evidence:** `{file}:{line}` — `{code}`

**Trigger:** {trigger}

**Impact:** {impact}

---

