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

This is the *pre-implementation* gate for frontend work. The main agent builds the prototype and then builds the production change; sub-agents research, they never write UI code.

Not to be confused with `/skill:explain`, which is the hub's reusable browser workspace (Excalidraw whiteboard + live previews) for explaining a design, logic, or schema question that is *not* your app's UI.

## When to run it

Run before implementing when the direction is unproven — anything the user has not seen yet. Skip when the direction is already fixed by an existing design system, or the change is non-visual.

## Flow

1. **Name the question and the options.** Write down the choice that matters and the two or three real options. If you can only think of one, the direction isn't a decision yet — find the alternatives before building.
2. **Decide where it lives — in place or isolated.** Default to **in place on the current branch, gated by the neutral version parameter `v` that renders one version over the current page** (e.g. `?v=1`, `?v=2`). This is the preferred mechanism, not just one option among equals: the user judges the direction with the rest of the app around it. Do NOT build a separate page or route for the prototype — a literal new page removes the surrounding context the decision depends on. Choose a **throwaway branch or worktree** (`~/.agents/scripts/new-worktree.sh <branch>`) only when the change is large or risky, it would touch shared or production paths, or the user asks for isolation.
3. **Record its footprint as you build.** Keep a short list of every file, route, flag, and parameter the prototype adds. **Name all source artifacts `prototype`:** every file, component, CSS class, function, and test id the prototype adds carries the word `prototype` — so verifying cleanup is one grep for `prototype` across the source tree. The only exception is the user-visible version parameter, which stays neutral (`v`); record it in the footprint list so cleanup removes it too.
4. **Build every option as the finished product.** Production polish: the project's own front-end language and existing components, tokens, and patterns; real copy and content; real states (hover, empty, loading, error where they occur); responsive. Not a scaled-down mock, not a screenshot, not a wireframe, no placeholder strings or unfinished corners. Each option must run and be complete enough to ship.
5. **Hold everything constant except the thing being decided.** Same content, same data, same surrounding context across options, so the comparison is fair and the only difference is the choice itself.
6. **Put each option at its own URL.** One version per URL via the neutral `v` parameter — `?v=1`, `?v=2`, `?v=3` — with no toggle bar, picker, or compare UI anywhere in the product. With no parameter, the page must behave exactly as before.
7. **Announce it first, in one line** — what the versions are, in product terms: "three directions for the checkout page — editorial, dense, and playful." No prototype/preview/demo disclaimer.
8. **Hand over every URL.** Give each version's complete URL including the query string (origin + path + `?v=N`) when you announce, so the user can click or Cmd+Enter each one, or open them side by side, and land directly on the version. Never make them assemble a URL from a param name.
9. **Let the user compare and choose.** They open the URLs, judge each at full fidelity, and say which fits. Record which option won and why, then fold the choice back into the plan.
10. **Implement only after explicit approval.** The approved direction becomes production code written in the normal way (see `/skill:frontend-implement`). **Promoting means rewriting, not relocating:** the chosen option is written fresh using the production codebase's own conventions — real names, existing tokens, patterns, and component structure — never by flipping prototype-named artifacts live. No `prototype`-named file, class, or flag survives promotion.
11. **Clean up on the user's word.** When the user says to clean up the prototype — or once the chosen option is folded in — remove everything in the footprint in one pass and confirm the app's normal paths are unchanged. Keep the chosen option only if the user says to promote it; otherwise the prototype leaves no trace.

## Guardrails

- **Looks shipped, not demoed.** Every version is built to the polish you would ship: real copy and content, real states, responsive layout, every detail intentional. No lorem ipsum, placeholder strings, "Option A" labels, debug outlines, or unfinished corners.
- **Never self-identify.** No banner, badge, watermark, or annotation renders the words prototype, preview, demo, mock, variant, draft, or similar anywhere in the UI.
- **No prototype chrome.** No toggle bar, option picker, or compare page inside the product. Versions are switched only by URL, so each URL shows one complete product.
- **Each version stands alone.** One URL is one coherent product, not a variant slot inside a harness that lists the others.
- **Honest behavior still applies.** This is presentation, not pretense: do not fake the behavior the decision depends on, and keep the project's lint and typecheck green.
- **Chat stays plain.** Say what each version is and give its URL — no prototype/preview/demo disclaimers.

## Boundaries

- **Throwaway, not production.** No production integrations, persistence, backend bridges, auth, or data wiring unless the question is specifically about one of those. Even built in place, it must be deletable without touching real code — it lives behind one marked surface, not woven through the app.
- **In place still means removable, not entangled.** The in-place prototype must not change normal app behavior: gate it behind a single route, flag, or query parameter, keep its footprint recorded, and never edit production code paths just to make it render.
- **Main agent writes it.** Sub-agents may research the codebase, find patterns, or propose a plan — they do not write the prototype. Same rule as `/skill:frontend-implement`.
- **Match conventions.** Reuse the design system and component patterns that already exist; the point is to test the direction, not to start a parallel style.
- **Approval is the gate.** Never fold a prototype into production work before the user has chosen.

## Success criteria

- [ ] The question and two or more real options were stated before building.
- [ ] Every option was built complete, at true scale and finished-product polish, in the project's own stack, placed in place or isolated as chosen and announced.
- [ ] Each option runs at its own URL (`?v=N`); the page with no parameter behaves exactly as before.
- [ ] No prototype/preview/demo labeling or chrome appears anywhere in the UI.
- [ ] The prototype's full footprint was recorded, including the `v` parameter, so cleanup removed it in one pass and left normal app behavior unchanged.
- [ ] The user got every full URL with the query string, openable in one click.
- [ ] Everything except the decided thing was held constant across options.
- [ ] The user compared the versions and picked one, and it was folded back into the plan before implementation.
- [ ] The prototype was cleaned up on request (or promoted) after the decision, leaving no trace.
- [ ] Promoted code follows production conventions with no `prototype`-named artifacts left live.
