---
name: research
description: Investigate missing facts against local code and primary sources, recording cited evidence in the repo. Use for "research next item" without a target, a selected ticket's evidence gaps, an explicit research question, or requested docs/API reading legwork.
---

Read `~/.agents/references/workflow.md` from the skill hub and follow it as the authoritative workflow contract, independent of the target repository's working directory.

## Select the research scope

An explicit ticket or question takes priority. Otherwise use the unique initiative indicated by the conversation and repository artifacts; ask only when choosing between initiatives would materially change scope. Reconcile queue claims against current code, tests, and GitHub before running, from the target git repository:

```sh
python3 ~/.agents/scripts/workflow.py select context/issues/<slug>/000-index.md
# For an explicit ticket:
python3 ~/.agents/scripts/workflow.py select context/issues/<slug>/000-index.md --target <id>
```

The index is the sole execution queue. Resolve an explicit ticket path or issue to its queue ID; never fall back to another item if that target is blocked. Select one ready ticket with all dependencies done and no active PR; do not research the backlog. The CLI cannot prove completion or safe parallel work. If tickets do not exist, choose the next not-implemented design outcome by dependencies and default priority and use `/skill:to-issues` to draft the necessary local ticket as preparation authorized by this research request. Review it against agreed intent before marking it ready; do not bypass unresolved behavior decisions. This does not authorize publication. If no item is eligible, report its blocker rather than researching a different scope.

Read the selected card, ticket, and linked prior research. Before outside documentation, inspect the current relevant local modules, callers, and tests to establish what already exists and which facts are actually missing. Investigate only those gaps for this slice. Reuse linked evidence; update the queue's Research link when needed, rather than generating a timestamped duplicate without a reason. If no evidence is missing, skip the external pass and report that result. Standalone research on an explicit question remains valid without a design or queue; inspect relevant local context when available.

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

Refresh affected evidence, ticket links, and open questions after feedback; distinguish verified facts from assumptions. Keep queue changes within the shared contract and do not infer approval to publish, implement, or merge. Research informs one later plan; it does not plan or start delivery.

The human-facing synthesis follows the **Research Mode** protocol in `references/communication.md`: Question, Conclusion, Key Evidence, Options & Tradeoffs, Recommendation, and Remaining Uncertainty. Reference the cited Markdown file in the response.
