# Model Routing

Use this rule to select the optimal model tier for subagent tasks based on complexity, budget, and CLI context.

## Workflow Tier vs Model Tier

These are independent dimensions:

- **Workflow tier** (from `workflow-router-tools.mjs`): Process complexity — should I research, plan, critique first?
- **Model tier** (from `model-router.mjs`): Reasoning complexity — which model handles this best?

A trivial workflow step can need a deep model (e.g., "just review this auth code for vulnerabilities" — trivial process, deep reasoning). Do not conflate them.

## Three Model Tiers

### fast
Simple reads, greps, single-file edits, formatting, typos, lint fixes.
- **Claude Code**: `haiku`
- **OpenCode**: `anthropic/claude-haiku-4-5-20251001`
- **Codex CLI**: `gpt-5.4-nano`

### balanced
Tests, bug fixes, refactors, code review, bounded implementations, config changes, schema migrations.
- **Claude Code**: `sonnet`
- **OpenCode**: `anthropic/claude-sonnet-4-6`
- **Codex CLI**: `gpt-5.4-mini`

### deep
Architecture, system design, security review, performance optimization, cross-system work, multi-file refactors, unknown-root-cause debugging, planning, research, critique.
- **Claude Code**: `opus`
- **OpenCode**: `anthropic/claude-opus-4-6`
- **Codex CLI**: `gpt-5.4`

## How To Use

### Library import (preferred — <5ms, no startup overhead)

```js
import { route } from './scripts/model-router.mjs';

const result = route({
  taskDescription: 'write unit tests for the auth module',
  // optional:
  fileCount: 3,
  workflowTier: 2,
  contextRemaining: 75,
  budgetMode: 'normal'
});

// result.tier    → 'balanced'
// result.model   → 'claude-sonnet-4-6'
// result.alias   → 'sonnet'
```

### CLI invocation (fallback for shell scripts)

```bash
node scripts/model-router.mjs route --input "design auth architecture"
# Returns JSON: { tier, model, alias, provider, confidence, reason, ... }
```

### Claude Code Agent tool integration

```
model: route({ taskDescription: "..." }).alias
# → passes model: "haiku", "sonnet", or "opus" to the Agent tool
```

## Signal Floors

Certain task types have a minimum tier regardless of dampeners:

| Signal | Minimum tier |
|---|---|
| security review / security audit | balanced |
| architecture / system design | balanced |
| performance optimization | balanced |

"quick security review" can never route below `balanced`.

## Budget Controls

| Condition | Effect |
|---|---|
| `contextRemaining < 30%` | Force `fast` |
| `contextRemaining < 50%` | Cap at `balanced` |
| `AGENTS_MODEL_BUDGET=economy` | Cap at `balanced` |
| `AGENTS_MODEL_BUDGET=minimum` | Force `fast` |

## Override Precedence

Resolution order: **floor > override > budget > classification**

- `AGENTS_MODEL_TIER_FLOOR` — never go below this tier
- `AGENTS_MODEL_TIER_OVERRIDE` — force this tier (floor still applies)

## Custom Model Maps

Create `~/.agents/config/model-router.json` to override default model mappings:

```json
{
  "lastUpdated": "2026-03-24",
  "providerMaps": {
    "opencode": {
      "fast": { "model": "openrouter/free", "alias": null },
      "balanced": { "model": "openrouter/qwen3-coder-480b:free", "alias": null },
      "deep": { "model": "anthropic/claude-opus-4-6", "alias": null }
    }
  }
}
```

The file is gitignored. If `lastUpdated` is >90 days old, the router emits a warning.
