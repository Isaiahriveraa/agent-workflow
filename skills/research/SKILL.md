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

## External services

When the question involves an external service or API, also establish:

1. **SDK first** — whether a first-party SDK exists for our stack, and if so,
   prefer it over hand-rolled HTTP calls: name the package, version, and
   official docs. If there is no SDK, name the API surface we would call
   directly.
2. **Return shapes** — what the operations we need return: key fields and
   their types, pagination, and error shapes. Behavior and contracts, not
   line-by-line internals.
3. **How we would use it** — the smallest integration path: which SDK calls
   or endpoints map to our use case, the auth model, rate limits, and which
   response fields we actually consume.

Record these under **Key Evidence** and **Recommendation & System Impact**, so
the reader can work from the service's behavior and return shapes without
reading its documentation line by line.

## Completion

The human-facing synthesis follows the **Research Mode** protocol in `references/communication.md`: Question, Conclusion, Key Evidence, Options & Tradeoffs, Recommendation, and Remaining Uncertainty. Reference the cited Markdown file in the response.
