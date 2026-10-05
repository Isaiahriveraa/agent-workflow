---
name: prototype
description: "Build several complete, finished-product-quality directions for a UI in the target project's own front-end stack — each at its own URL, with no prototype chrome — so the user can see and choose before it is written into the app. Use when a visual, interaction, or motion direction has not been seen yet and a verbal decision would be slow or lossy, or when another frontend skill's prototype gate fires."
---

# Prototype

A prototype is **throwaway UI that puts several complete directions in front of the user, each built as if it were the shipped product**. It runs at true scale in the target project's own front-end stack — real components, real tokens, real content — so the decision is made by looking at finished-quality versions, not by reading prose.

The UI never announces itself as a prototype: no banner, no toggle bar, no option labels, no "preview" note. The user already knows these are test versions; the chat handover is the one place the versions are explained, and it stays brief and in product terms.

Two things make it a prototype rather than a mock:

1. **Two or more genuinely different, fully built options.** One option is a mock; several turn it into a decision.
2. **One URL per option, with no visible switching UI.** The user opens the versions side by side, feels the difference at full fidelity, and says which fits.

This is the *pre-implementation* gate for frontend work. The main agent builds the prototype and then builds the production change; sub-agents research, they never write UI code. The prototype gets its own throwaway worktree; on approval the winning version is rewritten as production code in a fresh worktree created from it, and the throwaway one is deleted once the production branch merges.

Not to be confused with `/skill:explain`, which is the hub's reusable browser workspace (Excalidraw whiteboard + live previews) for explaining a design, logic, or schema question that is *not* your app's UI.

## When to run it

Run before implementing when the direction is unproven — anything the user has not seen yet. Skip when the direction is already fixed by an existing design system, or the change is non-visual.

## Flow

1. **Name the question and the options.** Write down the choice that matters and the two or three real options. If you can only think of one, the direction isn't a decision yet — find the alternatives before building.
2. **Build it in its own throwaway worktree.** Every prototype gets a dedicated worktree on a disposable branch — `~/.agents/scripts/new-worktree.sh prototype/<name> <start-point>`, branched from the base the change belongs on — never in the user's working tree. Inside it, the prototype still renders **in place in the real app**, gated by the neutral version parameter `v` that renders one version over the current page (e.g. `?v=1`, `?v=2`): the user judges the direction with the rest of the app around it. Do NOT build a separate page or route for the prototype — a literal new page removes the surrounding context the decision depends on. Serve the app from this worktree so the URLs handed over point at this checkout.
3. **Record its footprint as you build.** Keep a short list of every file, route, flag, and parameter the prototype adds. **Name all source artifacts `prototype`:** every file, component, CSS class, function, and test id the prototype adds carries the word `prototype` — so the winning version is easy to fold in and no trace can hide in production. The only exception is the user-visible version parameter, which stays neutral (`v`); record it in the footprint list so promotion removes it too.
4. **Build every option as the finished product.** Production polish: the project's own front-end language and existing components, tokens, and patterns; real copy and content; real states (hover, empty, loading, error where they occur); responsive. Not a scaled-down mock, not a screenshot, not a wireframe, no placeholder strings or unfinished corners. Each option must run and be complete enough to ship.
5. **Hold everything constant except the thing being decided.** Same content, same data, same surrounding context across options, so the comparison is fair and the only difference is the choice itself.
6. **Put each option at its own URL.** One version per URL via the neutral `v` parameter — `?v=1`, `?v=2`, `?v=3` — with no toggle bar, picker, or compare UI anywhere in the product. With no parameter, the page must behave exactly as before.
7. **Announce it first, in one line** — what the versions are, in product terms: "three directions for the checkout page — editorial, dense, and playful." No prototype/preview/demo disclaimer.
8. **Hand over every URL.** Give each version's complete URL including the query string (origin + path + `?v=N`) when you announce, so the user can click or Cmd+Enter each one, or open them side by side, and land directly on the version. Never make them assemble a URL from a param name.
9. **Let the user compare and choose.** They open the URLs, judge each at full fidelity, and say which fits. Record which option won and why, then fold the choice back into the plan. If no option wins, keep iterating in the prototype worktree — no production worktree exists yet.
10. **On approval, commit the prototype and open the production worktree.** Commit the approved state on the disposable branch — a new worktree branches from a commit, not from uncommitted files — then create the production worktree from it: `~/.agents/scripts/new-worktree.sh feat/<name> prototype/<name>`. The prototype worktree stays alive as the reference to compare against.
11. **Rewrite the approved version as production code.** In the production worktree, the chosen option is written fresh using the production codebase's own conventions — real names, existing tokens, patterns, and component structure — never by flipping prototype-named artifacts live. No `prototype`-named file, class, or flag survives promotion; the `v` parameter and the unchosen versions are gone. The result looks and behaves like the approved version (see `/skill:frontend-implement`).
12. **Merge the production branch, then delete the prototype worktree.** Review and merge `feat/<name>` through the normal flow. Once it is merged, tear the prototype down: `~/.agents/scripts/cleanup-worktree.sh --force prototype/<name>` — the disposable branch is never itself merged, so a forced delete is correct. If the user abandons the direction instead of approving one, delete the prototype worktree the same way; either way it leaves no trace, and the production worktree is torn down by the normal post-merge flow.

## Guardrails

- **Stay relevant to the requested work.** Every option must be a plausible way to build the specific feature, screen, or change the user asked for in the actual target product. Keep the prototype focused on that scope and its real context; do not add unrelated screens, speculative features, or a separate showcase just to make a direction look impressive. Only include surrounding UI needed to make the requested work understandable and judgeable.
- **Looks shipped, not demoed.** Every version is built to the polish you would ship: real copy and content, real states, responsive layout, every detail intentional. No lorem ipsum, placeholder strings, "Option A" labels, debug outlines, or unfinished corners.
- **Never self-identify.** No banner, badge, watermark, or annotation renders the words prototype, preview, demo, mock, variant, draft, or similar anywhere in the UI.
- **No prototype chrome.** No toggle bar, option picker, or compare page inside the product. Versions are switched only by URL, so each URL shows one complete product.
- **Each version stands alone.** One URL is one coherent product, not a variant slot inside a harness that lists the others.
- **Honest behavior still applies.** This is presentation, not pretense: do not fake the behavior the decision depends on, and keep the project's lint and typecheck green.
- **Chat stays plain.** Say what each version is and give its URL — no prototype/preview/demo disclaimers.

## Boundaries

- **Throwaway, not production.** No production integrations, persistence, backend bridges, auth, or data wiring unless the question is specifically about one of those. It lives in its own worktree on a disposable branch that is never merged; the production worktree's branch is the only merge path. Even rendering in place, it must be deletable without touching real code — it lives behind one marked surface, not woven through the app.
- **In place still means removable, not entangled.** The in-place prototype must not change normal app behavior: gate it behind a single route, flag, or query parameter, keep its footprint recorded, and never edit production code paths just to make it render.
- **Main agent writes it.** Sub-agents may research the codebase, find patterns, or propose a plan — they do not write the prototype. Same rule as `/skill:frontend-implement`.
- **Match conventions.** Reuse the design system and component patterns that already exist; the point is to test the direction, not to start a parallel style.
- **Approval is the gate.** Never fold a prototype into production work before the user has chosen — and when they do choose, the fold happens in the production worktree created from the prototype worktree, never in the prototype worktree itself.

## Success criteria

- [ ] The question and two or more real options were stated before building.
- [ ] Every option is a plausible implementation of the requested work, stays within its scope, and uses only the product context needed to judge it.
- [ ] Every option was built complete, at true scale and finished-product polish, in the project's own stack, in place in the app inside the prototype's own throwaway worktree.
- [ ] Each option runs at its own URL (`?v=N`); the page with no parameter behaves exactly as before.
- [ ] No prototype/preview/demo labeling or chrome appears anywhere in the UI.
- [ ] The prototype's full footprint was recorded, including the `v` parameter, so promotion knew exactly what the prototype had touched.
- [ ] The user got every full URL with the query string, openable in one click.
- [ ] Everything except the decided thing was held constant across options.
- [ ] The user compared the versions and picked one, and it was folded back into the plan before implementation.
- [ ] The approved state was committed on the throwaway branch, and the production worktree (`feat/<name>`) was created from the prototype worktree.
- [ ] Promoted code follows production conventions, matches the approved version's look and behavior, and leaves no `prototype`-named artifacts or `v` parameter live.
- [ ] After the production branch merged, the prototype worktree and its branch were deleted; the production worktree was torn down by the normal post-merge flow.
