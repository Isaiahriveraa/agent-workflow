---
name: security-review
description: "Security audit workflow. Trigger: 'security review'."
---

# Security Review Skill

**name:** security-review
**description:** "Security audit workflow. Trigger: 'security review'."

## Security-Focused Code Audit

### Check Categories

1. **Input Validation** — Untrusted data sanitization, boundary checks, type coercion
2. **Authentication & Authorization** — Authn/authz correctness, privilege escalation, session management
3. **Secrets Management** — Hardcoded secrets, credential exposure, key rotation, env var handling
4. **Dependency Vulnerabilities** — Outdated packages with known CVEs, supply chain risks
5. **Injection Risks** — SQL, command, XSS, LDAP, XML, template injection vectors
6. **Trust Boundaries** — Data crossing untrusted boundaries, cross-origin policies, CORS
7. **Data Exposure** — PII handling, logging of sensitive data, response leaking internals

### Review Protocol

1. **Scope the attack surface**
   - Identify entry points: API handlers, CLI commands, file parsing, network interfaces
   - Map data flow from untrusted source to sink

2. **Run focused checks per category**
   - Use `ast_grep_search` for common vulnerability patterns (hardcoded secrets, unsafe deserialization, weak RNG)
   - Check dependency manifests for outdated packages
   - Verify auth middleware is applied consistently across protected routes

3. **Findings format**
   - Each finding: `category`, `severity`, `location`, `description`, `remediation`
   - Severity: `critical`, `high`, `medium`, `low`, `informational`
   - Include CVSS-style rationale for critical/high findings

4. **Remediation guidance**
   - Provide concrete fix or reference to secure pattern
   - Do NOT include working exploit code in output
   - Do NOT suggest "just disable security feature X" as a workaround

### Critical Rules

- **Never share secrets or credential locations in output.** Replace any discovered secrets with `[REDACTED]` or `[SECRET]` placeholder.
- **Never demonstrate how to exploit a vulnerability** — describe the risk and remediation only.
- **Flag critical findings immediately** — do not bury in summary.
- If a secret is found, record only that a secret was found and recommend rotation; do not log the secret value.

### Output Structure

```
## Security Audit: [target]

### Critical Findings
- ...

### High Findings
- ...

### Medium Findings
- ...

### Low / Informational
- ...

### Recommendations
- [Priority-ordered list]
```

### Integration

- Triggered by: `security review`, explicit invocation, or as part of `review-work` workflow
- Runs after lsp diagnostics are clean; security review may run in parallel with other specialist reviewers
- Critical/high findings block approval unless explicitly deferred with documented justification
