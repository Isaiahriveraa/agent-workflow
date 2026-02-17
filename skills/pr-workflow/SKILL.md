---
name: pr-workflow
description: Plan and enforce disciplined PR workflow. Use when starting new work to break into PR-sized chunks, or when changes are getting too large. Helps maintain small, focused PRs.
---

# PR Workflow Discipline

Use this skill when starting new work or when changes are getting too large.

---

## When to Use

- Starting a new feature or project
- Changes span more than 5-7 files
- Work will take more than 1-2 hours
- Need to plan PR boundaries

---

## PR Planning Process

### Step 1: Analyze the Work

Ask:
1. What is the end goal?
2. What are the major components/areas affected?
3. What are the dependencies between tasks?

### Step 2: Break Into PR-Sized Chunks

Each PR should be:
- **Self-contained**: Works on its own, doesn't break the build
- **Focused**: Does ONE thing well
- **Small**: 3-10 files typically (never 50+ files)
- **Testable**: Can be reviewed independently
- **Deployable**: Main branch stays stable

### Step 3: Create PR Roadmap

For each PR, define:
- Branch name (e.g., `feat/phase-1-setup`)
- Clear scope (bullet list of what's included)
- Files affected (estimate)
- Dependencies (what must come before)

---

## Branch Naming Convention

```
feat/description             # New features (e.g., feat/project-setup, feat/hero-section)
fix/issue-description        # Bug fixes (e.g., fix/header-mobile-menu)
refactor/what-changed        # Code improvements
docs/what-documented         # Documentation only
chore/what-updated           # Config, deps, tooling
```

---

## PR Size Guidelines

| Size | Files | Recommendation |
|------|-------|----------------|
| Tiny | 1-2 | Perfect for fixes |
| Small | 3-5 | Ideal PR size |
| Medium | 6-10 | Acceptable for features |
| Large | 11-20 | Consider splitting |
| Huge | 20+ | MUST split |

---

## Red Flags (Stop and Split)

- More than 10 files modified
- Multiple unrelated changes
- "While I'm here, let me also..."
- Can't describe in one sentence
- Review would take > 30 minutes

---

## Workflow Per PR

```
1. Create branch from main
2. Implement ONLY this PR's scope
3. Test locally
4. Create PR with clear description
5. Review and merge to main
6. Delete branch
7. Pull main
8. Repeat for next PR
```

---

## PR Description Template

```markdown
## Summary
[1-2 sentences describing what this PR does]

## Changes
- [Bullet list of changes]

## Testing
- [ ] [How to test]

## Screenshots (if UI)
[Add screenshots for visual changes]
```

---

## Discipline Reminders

Before committing, ask yourself:
- [ ] Is this PR focused on ONE thing?
- [ ] Would a reviewer understand this in < 15 minutes?
- [ ] Does main stay deployable after merge?
- [ ] Am I tempted to add "just one more thing"? (Don't!)

---

## Emergency: PR Getting Too Large

If your current work is getting too big:

1. **Stop** - Don't add more changes
2. **Assess** - What's the smallest shippable unit?
3. **Stash** - `git stash` extra changes
4. **Ship** - Create PR with smallest unit
5. **Continue** - Pop stash, start next PR

---

**Remember**: A 5-file PR merged today > a 50-file PR "almost done"
