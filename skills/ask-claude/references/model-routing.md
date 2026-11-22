## Pick model and effort

Honor the user's explicit model alias or ID and any explicit effort first. When choosing for them, use only the model and effort pairs below. Start at the lower effort for the chosen model unless the task fits the higher-effort row. If no model is named, pick the least expensive model that fits the question:

| Model | `thinking` | Use for |
| --- | --- | --- |
| `haiku` | `medium` | Quick, bounded checks: summarize a snippet, sanity-check one claim, or compare a few labels. |
| `haiku` | `high` | A self-contained comparison where Claude needs to weigh several constraints, but doesn't need to dig through the repo. |
| `sonnet` | `medium` | Default for focused diff reviews, debugging hypotheses, and routine UI edits within an established pattern. |
| `sonnet` | `high` | A review or diagnosis that needs to connect evidence across several files, but doesn't warrant Opus. |
| `opus` | `low` | A hard, consequential problem where a focused second opinion needs deeper reasoning: stalled debugging, a subtle invariant, or an architectural tradeoff with expensive consequences. |
| `opus` | `medium` | Substantive UI design, implementation, or critique: visual hierarchy, interaction, or comparing design directions. Use Haiku for a label check and Sonnet for routine edits within an established UI pattern. |

For an explicit Opus request without effort, use medium for substantive UI work and low otherwise. For an unlisted model ID with no effort request, omit `thinking`. If the requested model or effort is rejected, report the error instead of silently substituting. Do not treat `thinking: off` as a guarantee that Claude reasoning is disabled.

Always pass `model`: the installed AskClaude bridge defaults to `opus` when omitted; omission does not inherit the model selected in a separate Claude Code session. If the user asks to use their Claude Code startup model but hasn't named it, ask for the model shown by `/model` there rather than guessing or changing their settings.
