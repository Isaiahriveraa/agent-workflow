---
name: research
description: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
---

Spin up a **background agent** to do the research, so you keep working while it
reads.

Its job:

1. Investigate the question against **primary sources** (official docs, source
   code, specs, first-party APIs), not a secondary write-up of them. Follow
   every claim back to the source that owns it.
2. Use the `research` generator profile to create the single Markdown artifact:
   `python3 ~/.agents/scripts/new-artifact.py --type research --topic "<topic>"`
3. Fill in the generated scaffold. It is the structural source of truth;
   preserve its frontmatter and complete it rather than copying a separate
   full Markdown template.
4. Write the findings to that single file, citing each claim's source.
5. Save it where the repo already keeps such notes; match the existing
   convention, and if there is none, use the generated location and say where.

## Completion

The human-facing synthesis follows the **Research Mode** protocol in `references/communication.md`: Question, Conclusion, Key Evidence, Options & Tradeoffs, Recommendation & System Impact, and Remaining Uncertainty. Reference the cited Markdown file in the response.
