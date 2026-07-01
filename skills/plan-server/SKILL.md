---
name: plan-server
description: Create a local MDX plan, write it to ~/Documents/plan-server/projects/{project}/plans/, start/verify the plan server, and return the plan URL. Triggers: "/plan-server", "plan this", "create a plan", "make a plan".
argument-hint: "[what to plan]"
shell-timeout: 20
---

# Plan Server

Default path: use the script. It writes valid MDX, adds metadata from the current repo, and writes to `~/Documents/plan-server/projects/{project}/plans/`. Defaults to project `general` unless `--project` is specified. Checks whether the server is running, starts it if needed, and prints the exact plan URL.

```bash
node "${SKILL_DIR}/scripts/plan-server.mjs" "$ARGUMENTS"
```

For a stronger one-shot plan from an agent, pass a concise plan brief as the argument and specify the project:

```bash
node "${SKILL_DIR}/scripts/plan-server.mjs" \
  --title "Dashboard Widgets Refactor" \
  --project koda \
  --tag frontend \
  --tag dashboard \
  --question "Should layout state live in localStorage or the backend?" \
  --question "What fallback is required for browsers without subgrid?" \
  "$ARGUMENTS"
```

To open the created plan in the browser automatically:

```bash
node "${SKILL_DIR}/scripts/plan-server.mjs" --open "$ARGUMENTS"
```

The script accepts prompt text from stdin too:

```bash
printf '%s\n' "$ARGUMENTS" | node "${SKILL_DIR}/scripts/plan-server.mjs" --title "Implementation Plan" --project koda
```


## Script Output

The script prints JSON:

```json
{
  "file": "/Users/isaiahrivera/Documents/plan-server/projects/general/plans/2026-06-19_19-50-01_feature.mdx",
  "id": "2026-06-19_19-50-01_feature",
  "project": "general",
  "url": "http://localhost:3456/project/general/plan/2026-06-19_19-50-01_feature",
  "allPlans": "http://localhost:3456/",
  "server": "already-running",
  "opened": false
}
```

Return the `url` and `file` to the user.

## When To Investigate First

If the request depends on real codebase details, inspect before running the script:

- Read relevant files, routes, tests, and config.
- Use 1-3 focused explore agents only when parallel research will help.
- Feed the synthesized brief into the script.
- Do not invent file paths, statuses, dependencies, or verification commands.

Good script input:

```text
Refactor dashboard widgets so layout is registry-driven, data updates use subscriptions, and existing widget APIs remain compatible. Important files: src/widgets/registry.ts, src/grid/WidgetGrid.tsx, src/data/SubscriptionManager.ts. Verification: npm run build and focused widget tests.
```

## MDX Format

The server reads `.mdx` files from project directories:

```text
~/Documents/plan-server/projects/{project}/plans/
```

Frontmatter is required. `project` field is optional but encouraged:


```yaml
---
title: "Descriptive plan title"
status: draft
created: 2026-06-20
project: "koda"
tags: [frontend, dashboard]
repo: "repo-name"
author: "author"
branch: "branch-name"
commit: "abc1234"
summary: "One-line summary"
---
```

Supported statuses:

```text
draft, review, approved, in-progress, complete
```

Supported custom components:

```mdx
<Steps>
Investigate the current flow.

Implement the change.

Verify the behavior.
</Steps>

<Callout type="warning">
  Risk or blocker text.
</Callout>

<FileTree>
src/
  components/
    Example.tsx
</FileTree>
```

Mermaid diagrams are supported:

````mdx
```mermaid
flowchart LR
  A[Request] --> B[Plan]
```
````

## Open Questions

Use this exact section when the agent needs user input:

```mdx
## Open Questions

- Should the layout be persisted in localStorage or the backend?
- What fallback is required for browsers without CSS subgrid?
- What verification proves this is complete?
```

The website detects bullet items under `## Open Questions` and renders answer boxes. The user can fill them in and click `Copy Prompt`; the copied prompt includes the plan title, each question, and each answer.

## MDX Safety Rules

- Do not write raw `<--` inside MDX. Use `-` or wrap text in a fenced code block.
- Avoid raw `<` unless it starts a real JSX component or is inside a fenced code block.
- Keep file-tree annotations plain, for example `style.css - design system core`.
- If manually writing a plan, run `npm run build` in `~/Documents/plan-server` before claiming it works.

## Manual Fallback

Only use this when the script is unavailable.

1. Determine the project name (default: `general`).
2. Build an id: `<timestamp>_<short-kebab-title>`.
3. Write `~/Documents/plan-server/projects/{project}/plans/<id>.mdx`.
4. Verify:

```bash
cd ~/Documents/plan-server
npm run build
curl -sf http://localhost:3456/api/plans >/dev/null || PORT=3456 node server.js
```

5. Return:

```text
Plan created: ~/Documents/plan-server/projects/{project}/plans/<id>.mdx
View it: http://localhost:3456/project/{project}/plan/<id>
All plans: http://localhost:3456/
```

## Clipboard

After the script creates the plan file, immediately run `bash` with `pbcopy <absolute-path>` (using the `file` value from JSON output, or the path from Step 5) so the user's clipboard has the file path.
