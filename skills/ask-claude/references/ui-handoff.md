# UI handoff

Claude owns UI design and implementation: layout, styling, interaction, UI copy, and visual polish. GPT helps the user express what they want, identifies relevant constraints and files, and prepares the handoff. GPT does not produce the UI design or patch itself.

- Capture the desired outcome, what should stay unchanged, relevant screenshots or paths, and how the user will judge the result. Ask only about an unresolved choice that would materially change the work.
- Read [model-routing.md](model-routing.md) if a model or effort needs choosing. Use Sonnet for routine edits within an established pattern and Opus medium for substantial UI work, unless the user overrides the choice.
- For a UI critique or comparison that needs no edits, read [second-opinion.md](second-opinion.md) before calling AskClaude. Claude makes the design recommendations, not GPT.
- For UI implementation, give the user a ready-to-use brief and the recommended Claude model and effort, then have them switch this Pi session to Claude or paste the brief into their Claude Code session. Don't call AskClaude in full mode or switch providers silently. Once Claude is active, the handoff is its task brief; it follows the repo's normal edit and verification rules.
- Only claim Claude saw a rendered UI if it had access to it. Include the steps or screenshots needed to verify the result.
