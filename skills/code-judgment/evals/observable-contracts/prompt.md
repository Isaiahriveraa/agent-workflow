---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Clean the month-card tests in fixture.mjs. The exact supplied fixture text must render unchanged. The toggle needs a native button, an accessible name and expanded state, plus a control relationship to its panel. The collapsed panel must remain in document flow so cards below do not jump when expanded. The source geometry assertion is currently the only protection for this requirement; no browser test runner or equivalent coverage is available. Everything in this fixture is in scope. The user approves deletion of redundant scaffolding for this task, not loss of guarantees. Apply any safe simplifications, run the tests, and save fixture.mjs plus a report with coverage evidence. Do not install dependencies.

Input files: fixture.mjs
