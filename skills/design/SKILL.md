---
name: design
description: Turn a user's raw intent into a plain-language design bundle the user reads and approves before planning — a short index plus one walkthrough card per topic. Each card teaches the thinking (state → move → state, why and why-not, the questions asked, one traced example) so the user stays in the loop and learns how the change works. Use when the user wants to explore or specify what should be built before implementation.
disable-model-invocation: true
---

# Design

Turn an idea into a design the user can read, explain out loud, and approve — before any planning or code. This skill is general-purpose: product behavior, backend systems, data flows, APIs, workflows, integrations, and user-facing surfaces.

The design is written for the user, not for an implementer. The code plan comes later from `/plan`.

The work has two moves: pull the user's thoughts out of their head, then write them down simply. Most users arrive with jumbled thoughts; cleaning them up without losing meaning is part of the job.

## What the user gets

One bundle: a short index and one card per topic.

- The index is the map: what we're doing and why, the user's own words, the topics, the order, what depends on what, what can move in parallel, and the status.
- A card is one topic: the problem, what the user wants, the idea in one breath, a walkthrough that builds and uses each piece, one traced example, the thinking behind the decisions, the architecture now → after, what we build now and what we deliberately don't, and how we'll know it works.

Three tests decide whether the design is done:

1. **Explain-back** — the user can close the files and say each topic out loud, without notes. If they can't, the card gets rewritten; the user never gets asked to read harder.
2. **Nothing changed silently** — every requirement, constraint, and preference the user stated is present and still means what they meant.
3. **Grounded** — every claim about current behavior was checked in the repository (cite files, modules, and interfaces; no line numbers); external facts are cited or marked unverified.

There is no length rule. A card is as long as its concern needs; the explain-back test is the gate.

## Output contract

Write exactly one design bundle under `context/designs/<slug>/`:

- `00-index.md` — the map (see below);
- `NN-<topic>.md` — one card per topic.

The bundle is the design source of truth for `/plan`; its topics map one to one to plan concerns. Do not create a second summary file or sidecar. A grill transcript under `context/grill/` is a session record, not part of the design.

The index status is exactly one of:

- **ready-for-plan** — the interview resolved the material decisions and the user said each topic back from memory.
- **blocked** — one or more open material decisions prevent a reliable design; name each blocker and its impact in **Open questions**.

Do not edit application code, routing files, or unrelated artifacts.

## The index: `00-index.md`

- **What we're doing and why** — two or three sentences.
- **Raw intent (your words)** — the user's request cleaned into plain bullets; the user should recognize their own thinking with the noise removed. Never add, drop, or change meaning without labeling the change.
- **Topics** — one line per card, e.g. `01-drafts-survive-closed-tab.md — saved drafts come back when the tab reopens`.
- **Order, dependencies, and parallel work** — the sequence, what depends on what, and what can move at the same time. State each dependency as one plain sentence with its reason (`02 depends on 01 because drafts must persist before they can be restored`); state each parallel group directly (`01 and 03 are independent and can be worked on at the same time`). Topics that share a file or shared contract are sequential even when their behavior is independent — name the file or contract. Dependencies must be acyclic. `/plan` walks the order one topic at a time, against the code as it stands; parallel topics can be planned and delivered at the same time.
- **Open questions** — what is unresolved, with impact and what would resolve it.
- **Status** — `ready-for-plan` or `blocked`.

Initialize the bundle with the generator:

```bash
python3 ~/.agents/scripts/new-artifact.py --type designs "<design title>"
```

Fill the generated scaffold and preserve its frontmatter and headings. If the generator is unavailable, create `context/designs/<slug>/00-index.md` by hand matching the same frontmatter and naming convention, and say so in the index. Report the bundle path when done.

## The topic card: `NN-<topic>.md`

Use these sections, in this order:

1. **The problem** — what is wrong or missing today, in the user's world, plain words.
2. **What I want** — the desired behavior, observable, plain.
3. **The idea** — the approach in one breath. No mechanism yet.
4. **The walkthrough** — build it, then use it, in order. Each step has the same shape:

   - **We're here:** the current state.
   - **The move:** what we do — named if it has a name, with the name explained in the same breath ("this is a debounce: we wait until you stop typing, then save once").
   - **Now we're here:** the state it puts us in.
   - **Why:** why this move. **Why not:** the alternative and why it lost.

   Name a function or piece when it has a real name, and show where each piece gets used later in the walkthrough. This is the learning surface: keep it in plain first-person builder language.
5. **Trace it** — one concrete example, start to finish, state by state.
6. **The questions I asked** — the two to four questions that actually shaped this topic, with their answers ("could this happen twice? → yes, so we clear the draft on send"). Show the thinking to reuse.
7. **Architecture: now → after** — boxes and arrows, small.
8. **Build now / not yet** — the smallest version that solves it, then what we deliberately don't build, each with a revisit-when signal. When the design replaces existing work, also say what we keep, drop, add, and defer.
9. **Edge cases that matter** — real failure, empty, retry, and double-action states; skip the generic list.
10. **How we'll know it works** — plain, observable proof.
11. **Open questions** — only when something is genuinely unresolved.

No real code and no code diffs. Pseudocode-shaped narration in the walkthrough's shape is the point. Cite the files, modules, and interfaces where today's behavior matters.

## Workflow

### 1. Capture the intent

Record what the user asked for in their own words, cleaned up: short plain-language bullets, filler removed, jargon replaced with ordinary words, every requirement, constraint, and preference kept, nothing added. If the request is a wall of speech-to-text, this is where it becomes readable: the user should recognize their own thinking with the noise removed. If it is too unclear to draft, ask the smallest set of framing questions first, one at a time.

### 2. Inspect the repository

Explore the relevant repository areas: what happens today and where it is implemented; the callers, consumers, persistence, integrations, and failure paths that constrain the design; conventions worth preserving. Use targeted reads and searches. Ground every claim in concrete files, modules, and interfaces; separate what you verified from what you assumed.

### 3. Research external evidence when needed

If the design depends on an API, protocol, standard, library behavior, security property, or operational constraint, do focused research first: prefer primary sources (official docs, specs, source, release notes). Record the source, the finding, and the design implication next to the move it supports. If no external research is needed, say why.

### 4. Agree the map, create the bundle

Propose the topic split — names, one line each, order, dependencies, and parallel groups — and get the user's agreement before writing cards. Then create the bundle with the generator and fill the index.

### 5. Write one card at a time (interview + teach)

Follow the `grill-with-docs` skill's interview rules; the card under discussion is the artifact. In short:

- Ask one question at a time, in plain prose; wait for the reply. Never batch questions.
- Start with "walk me through…": one real end-to-end scenario from the user's world.
- Teach before each decision question: one-line recommendation, realistic options with their costs, why — then the question. One concept at a time; do not lecture.
- While deciding, capture the card: the states, the moves and their names, why and why-not, and the questions that actually moved the decision.
- Write in the user's voice — first person, plain words. If you interpret, label it as an interpretation.
- Say the content, don't announce it. No lead-ins like "I can say out loud:" or "this card explains" — the cards already speak in the user's voice, so state each thing directly.
- Explain-back before moving on: ask the user to say the new card out loud from memory, and rewrite whatever they stumble on. This is the learning gate, and it happens per topic, not at the end.
- After each answer, update the card in place and append the Q&A to one `context/grill/` transcript created with:

  ```bash
  python3 ~/.agents/scripts/new-artifact.py --type grill --topic "<short session topic>"
  ```

- If the user's reply is itself a question, answer it and re-ask the same question; that round is not an answer.
- Keep asking until the topic's material decisions are settled or the user says stop. Declined questions go to **Open questions**.

### 6. Standup pass and status

After the last card: the user should be able to explain the whole design out loud, topic by topic, without notes. Fix any card they cannot. Then set the index status — `ready-for-plan` or `blocked` — and report the bundle path; do not repeat the whole design.

## Operating principles

- Keep the meaning, clean the wording. Distill what the user said into short plain sentences; never add, drop, or change meaning without labeling it.
- Write plainly. A reader without your context must understand every line. If a term needs defining before it can be used, use the ordinary word instead.
- Teach while writing. This is the learning surface: name the move, show the state change, ask the real question, explain why and why-not. The user should finish able to explain the design themselves.
- Ask instead of assuming. When an answer would change behavior, scope, architecture, safety, data, compatibility, or acceptance, ask; record unresolved items in **Open questions** with impact and a resolution trigger.
- Inspect before claiming. Cite concrete files, modules, and interfaces without brittle line numbers. An absence of evidence is not evidence of absence.
- Treat external research as evidence, not design judgment. Prefer primary sources; cite them where used.

## Completion checklist

Before finishing, verify that:

- the bundle exists at `context/designs/<slug>/`: `00-index.md` plus one card per topic, no sidecars;
- the index holds the user's words, the topic map, and the order, dependencies, and parallel groups in plain sentences, open questions, and exactly one status;
- every card has the sections above; walkthrough steps are state → move → state with why and why-not; moves with names are named; there is one traced example;
- the user has said each topic back from memory; nothing the user said changed meaning unlabeled;
- claims about current behavior cite files, modules, or interfaces; external facts are cited or marked unverified;
- no application code or routing file was edited, and the grill transcript lives under `context/grill/`;
- the bundle passes the slop check: `python3 ~/.agents/scripts/slop-lint.py context/designs/<slug>/` reports clean, or each remaining hit is deliberate and carries a `slop-lint:disable-*` comment.
