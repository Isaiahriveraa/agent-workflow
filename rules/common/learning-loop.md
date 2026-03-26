# Learning Loop

Use this rule when the agent is corrected, rejected by a critic, or fails an eval.

## Trigger Conditions

Run the learning loop when one or more are true:
- the user explicitly says the agent was wrong
- an automated eval fails
- a critic rejects the output
- the same failure pattern appears repeatedly across retries

## Required Flow

1. Detect the failure signal.
2. Diagnose the miss:
   - what was wrong
   - why it happened
   - which failure class it belongs to
3. Apply the smallest local fix for the current task.
4. Write back a durable lesson when the evidence is strong enough with `node $HOME/.agents/scripts/lesson-tools.mjs quick-capture --what "..." --why "..." --rule "..."`.
5. If the miss is systemic, surface a workflow improvement suggestion to the user.

## Writeback Policy

- Agents may auto-write local lessons into learning contexts and task-level lesson artifacts.
- Agents must not silently rewrite core prompts, rules, commands, or capsules.
- System-level workflow changes should be proposed to the user with evidence and expected benefit.

## Lesson Quality Bar

Capture only lessons that are:
- reusable
- evidence-backed
- specific enough to change future behavior

Do not capture:
- temporary debugging chatter
- one-off noise without a clear cause
- speculative lessons without evidence

## Quick Capture

When you detect a correction or learn something worth preserving, use the simplified capture:

```bash
node $HOME/.agents/scripts/lesson-tools.mjs quick-capture \
  --what "description of what happened or was learned" \
  --why "why this matters for future work" \
  --rule "the reusable rule to apply next time"
```

Optional flags: `--kind lesson|preference|failure` (default: lesson), `--confidence low|medium|high`, `--source-artifact /path/to/relevant/file`.

The quality gate evaluates reusability, novelty, durability, and specificity before writing to LanceDB. Low-quality or duplicate lessons are automatically rejected.
