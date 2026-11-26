---
name: research
description: "Use when a factual question or a Research issue needs cited evidence. Investigates the missing facts and does not implement."
---

## Standalone questions and in-mode research

For an explicit question outside a delivery queue, use `~/.agents/profiles/research.md`.
Do not load the coding workflow, create issues, reconcile GitHub state, or spawn
a background agent. Inspect only sources relevant to the question. Return a short
answer with decisive evidence and uncertainty; save a report only when requested
or needed for an agreed ongoing investigation. A bounded research activity inside
Sprint or School returns to that mode without bypassing the human's pending attempt.

The remaining delivery-specific selection and artifact rules apply only when the
request names an issue, such as a Research issue on the Project. In that case,
read `~/.agents/references/workflow.md` as the authoritative contract.

## Select the delivery research scope

An explicit issue or question takes priority; ask only when the scope is genuinely unclear. Read the issue with `gh issue view <n> --json title,body,state,blockedBy,parent` and its comments. Research only that issue's question; never research the backlog. If its blocked-by issues are open, report the blocker instead of researching something else. A Research issue ends in a decision: state the options, the evidence, and the recommendation, and ask the user to choose.

Read the issue and any linked prior research. Before outside documentation, inspect the current relevant local modules, callers, and tests to establish what already exists and which facts are actually missing. Investigate only those gaps for this slice. Reuse existing evidence rather than generating a duplicate without a reason. If no evidence is missing, skip the external pass and report that result. Standalone research on an explicit question needs no issue; inspect relevant local context when available.

Spin up a **background agent** to do the research, so you keep working while it
reads the bounded question. Do not delegate an external pass when existing evidence already answers it.

Its job:

1. Investigate the question against **primary sources** (official docs, source
   code, specs, first-party APIs), not a secondary write-up of them. Follow
   every claim back to the source that owns it.
2. Reuse the linked research artifact when it covers this question. Only for a new evidence topic, use the `research` generator profile to create a single Markdown artifact:
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

## Architecture decisions

Research may list architecture options and suggest one, but it never chooses one. Architecture means a choice that changes module boundaries, public interfaces, data storage or shape, adds a dependency or external service, or is costly to reverse. State any suggestion in **Recommendation & System Impact** as a suggestion, not a decision.

- Record each open architecture choice under **Decision needed from you** with its options, the suggestion, and `**Status:** UNDECIDED`.
- Name each open choice in your reply as a question the user must answer, and say that planning and implementation wait for that answer.
- Write `**Chosen:** <option>` only from the user's own answer, never from an inferred preference.

## Completion

Refresh affected evidence, issue links, and open questions after feedback; distinguish verified facts from assumptions. Post the decision summary on the issue only when the user asks, never a private `context/` path, and do not infer approval to publish, implement, or merge. Research informs one later plan; it does not plan or start delivery.

The human-facing synthesis follows the **Research** report shape in `references/communication.md`: Question, Conclusion, Key Evidence, Options & Tradeoffs, Recommendation, and Remaining Uncertainty. Reference the cited Markdown file in the response.
