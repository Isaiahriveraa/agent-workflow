---
name: prototype
description: "Resolve an unclear product flow with a lightweight discovery experiment, or compare competing UI directions with finished-quality versions in the project's stack. Use when seeing or trying alternatives will settle uncertainty, not merely because a screen is new. An agreed direction can go directly to authorized production implementation."
---

# Prototype

Read `~/.agents/references/workflow.md` as the authoritative workflow contract.

This skill resolves uncertainty; it is not a mandatory stop before production.
If one direction is agreed and implementation is requested with its gates
satisfied, build production code directly. Showing the actual feature for feedback
does not turn it into a disposable prototype or require a later rewrite. Do not
require a demo for every change.

## Choose fidelity by the question

- **Discovery mode:** use when the user, flow, information, or interaction is
  unsettled. Start with a sketch or storyboard; build one small interactive flow
  only when trying it answers the question. One direction is enough to test a
  hypothesis. Do not require production polish, multiple versions, or a complete
  frontend before learning whether the experience makes sense.
- **Visual-comparison mode:** use when behavior is understood but appearance,
  hierarchy, or motion needs comparison. Follow the finished-quality flow below.
  Existing frontend skills' visual-direction gates use this mode; those gates do
  not make polished comparisons a prerequisite for earlier discovery.

State the question and selected mode. Infer the mode from the uncertainty; ask
only when the choice changes the requested scope materially. A request to discuss
or document an idea is not permission to start an executable prototype.

## Discovery mode

1. **Frame one task.** Name the user, starting situation, intended outcome, and
   assumption this experiment will test. Reuse the design brief when present;
   do not require a ticket, PRD, or production plan to explore an experience.
2. **Use the cheapest adequate representation.** Sketch the steps and visible
   feedback first. If interaction matters, use the project's existing stack for
   a focused throwaway flow in a dedicated prototype worktree through
   `~/.agents/scripts/new-worktree.sh`. Record its files and entry URL. Keep it
   isolated from normal app behavior; no backend integration is required.
3. **Make the task believable, not misleading.** Use realistic content and the
   states needed for the question, including a meaningful empty, failure, or
   recovery state where relevant. Explain fixture data and simulated effects in
   the handoff; do not claim that an unconnected flow proves feasibility.
4. **Observe the walkthrough.** Give the person a task without explaining which
   control to use. Note hesitation, wording confusion, unnecessary steps, and
   whether the intended outcome was reached. Seek representative users when
   practical. If only the owner reviewed it, record that limitation; if nobody
   tried it, say `not tested` rather than inventing validation.
5. **Record the decision and stop.** Update the owning design card with the
   question, artifact link, observations, chosen behavior, and remaining risks.
   Iterate if the result is unclear. Return settled behavior to `/design` or
   `/to-issues`; use visual comparison only if a real visual choice remains.
   Approval of a discovery result does not authorize production implementation,
   a commit, or a PR. Preserve the experiment until cleanup is explicitly approved.

The main agent writes executable UI; sub-agents may research but do not write it.
Keep meaningful interaction tests for executable behavior. Discovery sketches do
not need tests that pin layout. This mode does not relax production TDD or checks.

## Visual-comparison mode

A visual comparison is **throwaway UI that puts several complete directions in front of the user, each built as if it were the shipped product**. It runs at true scale in the target project's own front-end stack — real components, real tokens, real content — so the decision is made by looking at finished-quality versions, not by reading prose.

The UI never announces itself as a prototype: no banner, no toggle bar, no option labels, no "preview" note. The user already knows these are test versions; the chat handover is the one place the versions are explained, and it stays brief and in product terms.

Two things make this a visual comparison rather than a single discovery flow:

1. **Two or more genuinely different, fully built options.** One option is a mock; several turn it into a decision.
2. **One URL per option, with no visible switching UI.** The user opens the versions side by side, feels the difference at full fidelity, and says which fits.

This is the *pre-implementation* gate for an unresolved visual direction, not every frontend change. The main agent builds the prototype and, when implementation is requested and its gates are satisfied, the production change; sub-agents research, they never write UI code. The prototype gets its own throwaway worktree; the approved winning version is rewritten as production code in a fresh worktree created from it. Cleanup after merge requires the normal destructive-action approval.

Not to be confused with `/skill:explain`, which is the hub's reusable browser workspace (Excalidraw whiteboard + live previews) for explaining a design, logic, or schema question that is *not* your app's UI.

### When to run visual comparison

Run when competing UI directions need to be compared before choosing one. Skip when one direction is already agreed, even if it is new or outside an existing design system. If the task or flow itself is unclear, use discovery mode only far enough to understand it.

### Visual-comparison flow

Before defining the options, load `/skill:ui-design` and its relevant references. Apply its consistency guidance while building and checking every direction. Establish whether the choice is within the existing theme or a redesign of the requested surface; do not assume permission to redesign unrelated areas.

1. **Name the question and the options.** Write down the choice that matters and the two or three real options. If you can only think of one, the direction isn't a decision yet — find the alternatives before building.
2. **Build it in its own throwaway worktree.** Every prototype gets a dedicated worktree on a disposable branch — `~/.agents/scripts/new-worktree.sh prototype/<name> <start-point>`, branched from the base the change belongs on — never in the user's working tree. Inside it, the prototype still renders **in place in the real app**, gated by the neutral version parameter `v` that renders one version over the current page (e.g. `?v=1`, `?v=2`): the user judges the direction with the rest of the app around it. Do NOT build a separate page or route for the prototype — a literal new page removes the surrounding context the decision depends on. Serve the app from this worktree so the URLs handed over point at this checkout.
3. **Record its footprint as you build.** Keep a short list of every file, route, flag, and parameter the prototype adds. **Name all source artifacts `prototype`:** every file, component, CSS class, function, and test id the prototype adds carries the word `prototype` — so the winning version is easy to fold in and no trace can hide in production. The only exception is the user-visible version parameter, which stays neutral (`v`); record it in the footprint list so promotion removes it too.
4. **Build every option as the finished product.** Production polish: the project's own front-end stack; real copy and content; real states (hover, empty, loading, error where they occur); responsive. Within an existing theme, reuse its components, tokens, and patterns. For a redesign, commit to each option's proposed design language throughout the requested surface: typography, color, spacing, components, states, and interactions. Do not leave an accidental mixture of old styling and unrelated new treatments. Not a scaled-down mock, not a screenshot, not a wireframe, no placeholder strings or unfinished corners. Each option must run and be complete enough to ship.
5. **Hold everything constant except the thing being decided.** Same content, same data, same surrounding context across options, so the comparison is fair. When the decision is a redesign, the theme and its coordinated visual and interaction choices may differ together; do not freeze old styling inside the redesigned surface. Keep unrelated context unchanged.
6. **Put each option at its own URL.** One version per URL via the neutral `v` parameter — `?v=1`, `?v=2`, `?v=3` — with no toggle bar, picker, or compare UI anywhere in the product. With no parameter, the page must behave exactly as before.
7. **Announce it first, in one line** — what the versions are, in product terms: "three directions for the checkout page — editorial, dense, and playful." No prototype/preview/demo disclaimer.
8. **Hand over every URL.** Give each version's complete URL including the query string (origin + path + `?v=N`) when you announce, so the user can click or Cmd+Enter each one, or open them side by side, and land directly on the version. Never make them assemble a URL from a param name.
9. **Let the user compare and choose.** They open the URLs, judge each at full fidelity, and say which fits. Record which option won and why, then fold the choice back into the plan. If no option wins, keep iterating in the prototype worktree — no production worktree exists yet.
10. **Stop for the production handoff.** Record the chosen direction in the owning design or plan. Selection alone does not authorize implementation or a commit. When implementation is explicitly requested and the matching production plan is approved and fresh, commit the approved prototype state through `/skill:commit` with its approval gates. Then create the production worktree from it: `~/.agents/scripts/new-worktree.sh feat/<name> prototype/<name>`. A new worktree branches from a commit, not uncommitted files. The prototype worktree stays alive as the reference to compare against.
11. **Rewrite the approved version as production code.** In the production worktree, the chosen option is written fresh using the production codebase's own conventions — real names, existing tokens, patterns, and component structure — never by flipping prototype-named artifacts live. No `prototype`-named file, class, or flag survives promotion; the `v` parameter and the unchosen versions are gone. The result looks and behaves like the approved version (see `/skill:frontend-implement`).
12. **Clean up after integration or abandonment.** Review and merge `feat/<name>` only through the normal human gates. Before removing the prototype worktree or branch, name what will be lost and obtain explicit cleanup approval. Then use `~/.agents/scripts/cleanup-worktree.sh --force prototype/<name>` when forced removal is approved; the disposable branch is never itself merged. The production worktree follows normal post-merge cleanup.

Before production edits, run `/implement`'s approval and drift check in the actual
production worktree. Committing the prototype can stale a plan scoped to those
files; if it does, return to `/plan` and obtain renewed approval against that base.
Do not treat prototype selection or the earlier check as a freshness override.

### Visual-comparison guardrails

- **Stay relevant to the requested work.** Every option must be a plausible way to build the specific feature, screen, or change the user asked for in the actual target product. Keep the prototype focused on that scope and its real context; do not add unrelated screens, speculative features, or a separate showcase just to make a direction look impressive. Only include surrounding UI needed to make the requested work understandable and judgeable.
- **Looks shipped, not demoed.** Every version is built to the polish you would ship: real copy and content, real states, responsive layout, every detail intentional. No lorem ipsum, placeholder strings, "Option A" labels, debug outlines, or unfinished corners.
- **Never self-identify.** No banner, badge, watermark, or annotation renders the words prototype, preview, demo, mock, variant, draft, or similar anywhere in the UI.
- **No prototype chrome.** No toggle bar, option picker, or compare page inside the product. Versions are switched only by URL, so each URL shows one complete product.
- **Each version stands alone.** One URL is one coherent product, not a variant slot inside a harness that lists the others.
- **Coherence within, distinction between.** Directions may differ from each other, but each must feel designed as a whole. Apply components and visual treatments purposefully, not repetitively; consistency does not mean the same card or accent everywhere. Use `ui-design` to inspect the rendered screens and states together, not just individual elements in isolation.
- **Honest behavior still applies.** This is presentation, not pretense: do not fake the behavior the decision depends on, and keep the project's lint and typecheck green.
- **Chat stays plain.** Say what each version is and give its URL — no prototype/preview/demo disclaimers.

### Visual-comparison boundaries

- **Throwaway, not production.** No production integrations, persistence, backend bridges, auth, or data wiring unless the question is specifically about one of those. It lives in its own worktree on a disposable branch that is never merged; the production worktree's branch is the only merge path. Even rendering in place, it must be deletable without touching real code — it lives behind one marked surface, not woven through the app.
- **In place still means removable, not entangled.** The in-place prototype must not change normal app behavior: gate it behind a single route, flag, or query parameter, keep its footprint recorded, and never edit production code paths just to make it render.
- **Main agent writes it.** Sub-agents may research the codebase, find patterns, or propose a plan — they do not write the prototype. Same rule as `/skill:frontend-implement`.
- **Match the agreed design scope.** Reuse the existing design system when exploring within it. When exploring a redesign, give each direction a coherent proposed theme within the prototype rather than forcing the old aesthetic onto it. Preserve technical conventions and unchanged surrounding UI; a new theme is not permission for an unrelated redesign or a production-wide design-system replacement.
- **Approval is the gate.** Never fold a prototype into production work before the user has chosen — and when they do choose, the fold happens in the production worktree created from the prototype worktree, never in the prototype worktree itself.

### Visual-comparison success criteria

- [ ] The question and two or more real options were stated before building.
- [ ] Every option is a plausible implementation of the requested work, stays within its scope, and uses only the product context needed to judge it.
- [ ] Every option was built complete, at true scale and finished-product polish, in the project's own stack, in place in the app inside the prototype's own throwaway worktree.
- [ ] Each option runs at its own URL (`?v=N`); the page with no parameter behaves exactly as before.
- [ ] No prototype/preview/demo labeling or chrome appears anywhere in the UI.
- [ ] The prototype's full footprint was recorded, including the `v` parameter, so promotion knew exactly what the prototype had touched.
- [ ] The user got every full URL with the query string, openable in one click.
- [ ] Everything except the decided thing was held constant across options.
- [ ] `ui-design` guided creation and rendered review; every direction has a coherent theme across its requested surface and states, with no accidental style clashes or repetitive treatment of everything alike.
- [ ] The user compared the versions and picked one, and it was folded back into the plan before implementation.
- [ ] The approved state was committed on the throwaway branch, and the production worktree (`feat/<name>`) was created from the prototype worktree.
- [ ] Promoted code follows production conventions, matches the approved version's look and behavior, and leaves no `prototype`-named artifacts or `v` parameter live.
- [ ] After integration, cleanup was explicitly approved before removing the prototype worktree and branch; the production worktree followed normal post-merge cleanup.
